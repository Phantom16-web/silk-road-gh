import { useState, useRef, useCallback, useEffect } from "react"
import { createListing } from "./api"

const CATEGORIES_PRODUCT = [
  "Books", "Electronics", "Clothing", "Housing", "Food",
  "Sports", "Art", "Furniture", "Music", "Misc",
]

const CATEGORIES_SERVICE = [
  "Lessons", "Photography", "Cleaning", "Design",
  "Entertainment", "Career", "Other",
]

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 900

const DEFAULT_IMAGE_SETTINGS = {
  fit: "contain",
  zoom: 1,
  positionX: 50,
  positionY: 50,
  background: "#f3f0ea",
}

const IMAGE_BACKGROUNDS = [
  { name: "Warm Ivory", value: "#f3f0ea" },
  { name: "White", value: "#ffffff" },
  { name: "Soft Grey", value: "#e5e7eb" },
  { name: "Dark", value: "#18181c" },
  { name: "Black", value: "#000000" },
]

// ── Image processing ────────────────────────────────────────────────────────
// Produces a real JPEG image using the seller's selected presentation.
// The exported file is what gets uploaded to the existing listing API.

function processProductImage(source, settings) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject(new Error("No image was selected."))
      return
    }

    const image = new Image()

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = IMAGE_WIDTH
        canvas.height = IMAGE_HEIGHT

        const context = canvas.getContext("2d")

        if (!context) {
          reject(new Error("Image editing is not supported by this browser."))
          return
        }

        context.fillStyle = settings.background
        context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT)

        const sourceWidth = image.naturalWidth
        const sourceHeight = image.naturalHeight

        if (!sourceWidth || !sourceHeight) {
          reject(new Error("The selected image could not be processed."))
          return
        }

        const scaleX = IMAGE_WIDTH / sourceWidth
        const scaleY = IMAGE_HEIGHT / sourceHeight

        const baseScale = settings.fit === "cover"
          ? Math.max(scaleX, scaleY)
          : Math.min(scaleX, scaleY)

        const scale = baseScale * settings.zoom

        const drawWidth = sourceWidth * scale
        const drawHeight = sourceHeight * scale

        const drawX =
          (IMAGE_WIDTH - drawWidth) * (settings.positionX / 100)

        const drawY =
          (IMAGE_HEIGHT - drawHeight) * (settings.positionY / 100)

        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"

        context.drawImage(
          image,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        )

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error("Could not export the edited image."))
              return
            }

            const file = new File(
              [blob],
              "silk-road-product.jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            )

            const preview = canvas.toDataURL("image/jpeg", 0.92)

            resolve({ file, preview })
          },
          "image/jpeg",
          0.92
        )
      } catch (error) {
        reject(error)
      }
    }

    image.onerror = () => {
      reject(new Error("Could not read the selected image."))
    }

    image.src = source
  })
}

// ── Webcam Modal ────────────────────────────────────────────────────────────

function WebcamModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [captured, setCaptured] = useState(null)
  const [capturing, setCapturing] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this browser.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setReady(true)
          } catch {
            setError("Could not start the camera preview.")
          }
        }
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError(
          "Camera access denied. Please allow camera access in your browser settings."
        )
      } else if (err.name === "NotFoundError") {
        setError("No camera was found on this device.")
      } else {
        setError("Could not access the camera: " + err.message)
      }
    }
  }, [])

  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext("2d")

    if (!context) return

    context.drawImage(video, 0, 0)

    setCaptured(canvas.toDataURL("image/jpeg", 0.92))
  }

  const handleUse = () => {
    if (!canvasRef.current || !captured || capturing) return

    setCapturing(true)

    canvasRef.current.toBlob(blob => {
      if (!blob) {
        setCapturing(false)
        setError("Could not save the photo. Please try again.")
        return
      }

      const file = new File(
        [blob],
        "webcam-photo.jpg",
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      )

      stopCamera()
      onCapture(file, captured)
    }, "image/jpeg", 0.92)
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000ee",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#111",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          border: "1px solid #1e1e1e",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1e1e1e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "700" }}>
            📸 Take a Photo
          </span>

          <button
            onClick={handleClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "22px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {error ? (
            <div
              style={{
                background: "#7f1d1d22",
                border: "1px solid #7f1d1d",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                📷
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#fca5a5",
                  lineHeight: "1.6",
                }}
              >
                {error}
              </div>

              <button
                onClick={handleClose}
                style={{
                  marginTop: "12px",
                  background: "#c8a97e",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          ) : captured ? (
            <>
              <img
                src={captured}
                alt="Captured product"
                style={{
                  width: "100%",
                  maxHeight: "360px",
                  objectFit: "contain",
                  background: "#18181c",
                  borderRadius: "10px",
                  display: "block",
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setCaptured(null)}
                  style={{
                    flex: 1,
                    background: "#1e1e1e",
                    border: "1px solid #333",
                    color: "#aaa",
                    padding: "12px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  🔄 Retake
                </button>

                <button
                  onClick={handleUse}
                  disabled={capturing}
                  style={{
                    flex: 2,
                    background: "#c8a97e",
                    border: "none",
                    color: "#000",
                    padding: "12px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: capturing ? "wait" : "pointer",
                  }}
                >
                  {capturing ? "Saving..." : "✅ Use This Photo"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  background: "#000",
                  borderRadius: "10px",
                  overflow: "hidden",
                  aspectRatio: "16/9",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                {!ready && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#000",
                      color: "#888",
                      fontSize: "13px",
                    }}
                  >
                    ⏳ Starting camera...
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} style={{ display: "none" }} />

              <button
                onClick={handleCapture}
                disabled={!ready}
                style={{
                  background: ready ? "#c8a97e" : "#1e1e1e",
                  border: "none",
                  color: ready ? "#000" : "#555",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: ready ? "pointer" : "not-allowed",
                  fontSize: "15px",
                }}
              >
                📸 Capture Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Image Studio ────────────────────────────────────────────────────────────

function ImageStudio({
  image,
  settings,
  onSettingsChange,
  onChooseImage,
  onTakePhoto,
  inputRef,
  error,
}) {
  const changeSetting = (field, value) => {
    onSettingsChange(previous => ({
      ...previous,
      [field]: value,
    }))
  }

  const resetSettings = () => {
    onSettingsChange({ ...DEFAULT_IMAGE_SETTINGS })
  }

  const rangeStyle = {
    width: "100%",
    accentColor: "#c8a97e",
    cursor: "pointer",
  }

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    color: "#aaa",
    fontWeight: "600",
    marginBottom: "8px",
  }

  const buttonStyle = active => ({
    flex: 1,
    background: active ? "#c8a97e22" : "#1a1a1a",
    border: `1px solid ${active ? "#c8a97e" : "#333"}`,
    color: active ? "#c8a97e" : "#aaa",
    borderRadius: "9px",
    padding: "11px 8px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "inherit",
  })

  return (
    <div
      style={{
        background: "#151515",
        border: `1px solid ${error ? "#991b1b" : "#292929"}`,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#f0ede8",
            }}
          >
            🖼️ Image Studio
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#777",
              marginTop: "4px",
              lineHeight: "1.5",
            }}
          >
            Make your product photo look its best.
          </div>
        </div>

        {image && (
          <button
            type="button"
            onClick={resetSettings}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#c8a97e",
              borderRadius: "8px",
              padding: "7px 10px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reset
          </button>
        )}
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={onChooseImage}
      />

      {!image ? (
        <div
          style={{
            border: "1px dashed #444",
            borderRadius: "12px",
            padding: "30px 16px",
            textAlign: "center",
            background: "#111",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>
            📷
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#eee",
              marginBottom: "6px",
            }}
          >
            Add your product photo
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#777",
              marginBottom: "16px",
              lineHeight: "1.5",
            }}
          >
            Your image will appear in a clean, consistent frame.
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={buttonStyle(false)}
            >
              📁 Choose Image
            </button>

            <button
              type="button"
              onClick={onTakePhoto}
              style={buttonStyle(false)}
            >
              📸 Take Photo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Live editing preview */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              overflow: "hidden",
              borderRadius: "10px",
              background: settings.background,
              border: "1px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={image}
              alt="Product image being edited"
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: settings.fit,
                objectPosition: `${settings.positionX}% ${settings.positionY}%`,
                transform: `scale(${settings.zoom})`,
                transformOrigin: `${settings.positionX}% ${settings.positionY}%`,
                display: "block",
                userSelect: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                background: "#000000b8",
                border: "1px solid #ffffff22",
                color: "#fff",
                padding: "6px 9px",
                borderRadius: "7px",
                fontSize: "10px",
                fontWeight: "700",
                pointerEvents: "none",
              }}
            >
              LIVE PREVIEW
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={buttonStyle(false)}
            >
              🔄 Change Image
            </button>

            <button
              type="button"
              onClick={onTakePhoto}
              style={buttonStyle(false)}
            >
              📸 Take Photo
            </button>
          </div>

          {/* Image fitting */}
          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>IMAGE FIT</label>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => changeSetting("fit", "contain")}
                style={buttonStyle(settings.fit === "contain")}
              >
                ⊞ Fit Entire Image
              </button>

              <button
                type="button"
                onClick={() => changeSetting("fit", "cover")}
                style={buttonStyle(settings.fit === "cover")}
              >
                ▣ Fill Frame
              </button>
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "11px",
                lineHeight: "1.5",
                marginTop: "8px",
              }}
            >
              {settings.fit === "contain"
                ? "The complete photo remains visible. Background space is filled with your selected colour."
                : "The frame is filled edge-to-edge. Some parts of the original photo may be cropped."}
            </div>
          </div>

          {/* Zoom */}
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                ZOOM
              </label>

              <span style={{ fontSize: "12px", color: "#c8a97e" }}>
                {Math.round(settings.zoom * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={settings.zoom}
              onChange={e =>
                changeSetting("zoom", Number(e.target.value))
              }
              style={rangeStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "#666",
              }}
            >
              <span>Normal</span>
              <span>Zoom in</span>
            </div>
          </div>

          {/* Horizontal position */}
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                HORIZONTAL POSITION
              </label>

              <span style={{ fontSize: "12px", color: "#c8a97e" }}>
                {settings.positionX}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.positionX}
              onChange={e =>
                changeSetting("positionX", Number(e.target.value))
              }
              style={rangeStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "#666",
              }}
            >
              <span>Left</span>
              <span>Centre</span>
              <span>Right</span>
            </div>
          </div>

          {/* Vertical position */}
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                VERTICAL POSITION
              </label>

              <span style={{ fontSize: "12px", color: "#c8a97e" }}>
                {settings.positionY}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.positionY}
              onChange={e =>
                changeSetting("positionY", Number(e.target.value))
              }
              style={rangeStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "#666",
              }}
            >
              <span>Top</span>
              <span>Centre</span>
              <span>Bottom</span>
            </div>
          </div>

          {/* Background */}
          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>BACKGROUND COLOUR</label>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {IMAGE_BACKGROUNDS.map(background => (
                <button
                  key={background.value}
                  type="button"
                  title={background.name}
                  aria-label={background.name}
                  aria-pressed={settings.background === background.value}
                  onClick={() =>
                    changeSetting("background", background.value)
                  }
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: background.value,
                    border: settings.background === background.value
                      ? "3px solid #c8a97e"
                      : "2px solid #444",
                    outline: settings.background === background.value
                      ? "2px solid #c8a97e55"
                      : "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                />
              ))}
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#777",
                marginTop: "9px",
              }}
            >
              {IMAGE_BACKGROUNDS.find(
                item => item.value === settings.background
              )?.name || "Custom background"}
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              background: "#064e3b22",
              border: "1px solid #065f463f",
              borderRadius: "10px",
              padding: "12px",
              color: "#a7f3d0",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            ✓ Your adjustments will be applied to the image before it is
            uploaded. You can change them at any time before publishing.
          </div>
        </>
      )}

      {error && (
        <div
          style={{
            marginTop: "10px",
            color: "#fca5a5",
            fontSize: "12px",
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

// ── Main SellListing Component ───────────────────────────────────────────────

export default function SellListing({ user, onRequestAuth, onClose }) {
  const [listingType, setListingType] = useState(null)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    photo: null,
    photoPreview: null,
    title: "",
    price: "",
    category: "",
    desc: "",
    condition: "",
    delivery: [],
    dailyRate: "",
    maxDays: "",
    accountability: false,
    accountabilityPct: "",
    serviceDelivery: "online",
    liveSession: false,
    contactMethod: "",
    contactDetail: "",
    contactNote: "",
  })

  const [imageSettings, setImageSettings] = useState({
    ...DEFAULT_IMAGE_SETTINGS,
  })

  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [showWebcam, setShowWebcam] = useState(false)
  const fileInputRef = useRef(null)

  const update = (field, value) => {
    setForm(previous => ({
      ...previous,
      [field]: value,
    }))
  }

  const toggleDelivery = value => {
    setForm(previous => ({
      ...previous,
      delivery: previous.delivery.includes(value)
        ? previous.delivery.filter(item => item !== value)
        : [...previous.delivery, value],
    }))
  }

  // ── Image selection ───────────────────────────────────────────────────────

  const acceptImage = (file, preview) => {
    setForm(previous => ({
      ...previous,
      photo: file,
      photoPreview: preview,
    }))

    setImageSettings({ ...DEFAULT_IMAGE_SETTINGS })

    setErrors(previous => ({
      ...previous,
      photo: null,
    }))

    setPublishError("")
  }

  const handlePhoto = event => {
    const file = event.target.files?.[0]

    // Allow selecting the same image again later.
    event.target.value = ""

    if (!file) return

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ]

    if (!allowedTypes.includes(file.type)) {
      setErrors(previous => ({
        ...previous,
        photo: "Please select a JPEG, PNG, WebP, GIF or AVIF image.",
      }))
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrors(previous => ({
        ...previous,
        photo: "Please select an image smaller than 15 MB.",
      }))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setErrors(previous => ({
          ...previous,
          photo: "Could not read the selected image.",
        }))
        return
      }

      acceptImage(file, reader.result)
    }

    reader.onerror = () => {
      setErrors(previous => ({
        ...previous,
        photo: "Could not read the selected image.",
      }))
    }

    reader.readAsDataURL(file)
  }

  const handleWebcamCapture = (file, dataUrl) => {
    acceptImage(file, dataUrl)
    setShowWebcam(false)
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const validationErrors = {}

    if (!form.photoPreview || !form.photo) {
      validationErrors.photo = "Please upload a product photo."
    }

    if (!form.title.trim()) {
      validationErrors.title = "Please enter a title."
    }

    if (listingType === "product") {
      if (!form.price || Number(form.price) <= 0) {
        validationErrors.price = "Please enter a valid price."
      }

      if (!form.category) {
        validationErrors.category = "Please select a category."
      }

      if (!form.condition) {
        validationErrors.condition = "Please select a condition."
      }

      if (!form.desc.trim()) {
        validationErrors.desc = "Please add a description."
      }

      if (form.delivery.length === 0) {
        validationErrors.delivery =
          "Please select at least one delivery option."
      }
    }

    if (listingType === "rent") {
      if (!form.dailyRate || Number(form.dailyRate) <= 0) {
        validationErrors.dailyRate = "Please enter a valid daily rate."
      }

      if (!form.maxDays || Number(form.maxDays) <= 0) {
        validationErrors.maxDays = "Please enter valid maximum rental days."
      }

      if (!form.category) {
        validationErrors.category = "Please select a category."
      }

      if (!form.condition) {
        validationErrors.condition = "Please select a condition."
      }

      if (!form.desc.trim()) {
        validationErrors.desc = "Please add a description."
      }

      if (form.accountability) {
        const percentage = Number(form.accountabilityPct)

        if (
          form.accountabilityPct === "" ||
          !Number.isFinite(percentage) ||
          percentage <= 0 ||
          percentage > 100
        ) {
          validationErrors.accountabilityPct =
            "Enter a deposit percentage between 1 and 100."
        }
      }
    }

    if (listingType === "service") {
      if (!form.price || Number(form.price) <= 0) {
        validationErrors.price = "Please enter a valid price."
      }

      if (!form.category) {
        validationErrors.category = "Please select a service category."
      }

      if (!form.desc.trim()) {
        validationErrors.desc = "Please add a description."
      }

      if (!form.liveSession) {
        if (!form.contactMethod.trim()) {
          validationErrors.contactMethod =
            "Please enter your contact method."
        }

        if (!form.contactDetail.trim()) {
          validationErrors.contactDetail =
            "Please enter your contact details."
        }
      }
    }

    return validationErrors
  }

  const handlePreview = () => {
    const validationErrors = validate()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setPublishError("")
    setStep(2)
  }

  // ── Publishing ────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (publishing) return

    if (!user) {
      onRequestAuth(() => setStep(3))
      return
    }

    const validationErrors = validate()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setStep(1)
      return
    }

    setPublishing(true)
    setPublishError("")

    try {
      // Convert the seller's image settings into an actual image file.
      const processedImage = await processProductImage(
        form.photoPreview,
        imageSettings
      )

      const formData = new FormData()

      formData.append("image", processedImage.file)

      const listingData = {
        type: listingType,
        title: form.title.trim(),
        desc: form.desc.trim(),
        category: form.category,

        ...(listingType === "product" && {
          price: Number(form.price),
          condition: form.condition,
          delivery: form.delivery,
        }),

        ...(listingType === "rent" && {
          dailyRate: Number(form.dailyRate),
          maxDays: Number(form.maxDays),
          condition: form.condition,
          accountability: form.accountability,
          accountabilityPct: form.accountability
            ? Number(form.accountabilityPct)
            : 0,
        }),

        ...(listingType === "service" && {
          price: Number(form.price),
          serviceDelivery: form.serviceDelivery,
          liveSession: form.liveSession,
          contactMethod: form.contactMethod,
          contactDetail: form.contactDetail,
          contactNote: form.contactNote,
        }),
      }

      formData.append("data", JSON.stringify(listingData))

      const data = await createListing(formData)

      if (data?.message) {
        setPublishError(data.message)
        return
      }

      // Display the same processed image that was uploaded.
      setForm(previous => ({
        ...previous,
        photo: processedImage.file,
        photoPreview: processedImage.preview,
      }))

      setStep(3)
    } catch (error) {
      console.error("Listing publication failed:", error)

      setPublishError(
        error?.message === "Could not read the selected image." ||
        error?.message === "Could not export the edited image." ||
        error?.message === "Image editing is not supported by this browser."
          ? error.message
          : "Something went wrong while publishing. Please try again."
      )
    } finally {
      setPublishing(false)
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────

  const ErrorMsg = ({ field }) =>
    errors[field] ? (
      <div
        style={{
          fontSize: "12px",
          color: "#fca5a5",
          marginTop: "5px",
        }}
      >
        ⚠️ {errors[field]}
      </div>
    ) : null

  const inputStyle = field => ({
    width: "100%",
    background: "#1e1e1e",
    border: `1px solid ${errors[field] ? "#991b1b" : "#333"}`,
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  })

  const sectionLabel = {
    fontSize: "12px",
    color: "#888",
    fontWeight: "600",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: ".06em",
  }

  const modalStyle = {
    position: "fixed",
    inset: 0,
    background: "#000000cc",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  }

  const panelStyle = {
    background: "#111",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "92vh",
    overflowY: "auto",
    border: "1px solid #1e1e1e",
  }

  const headerStyle = {
    padding: "20px 24px",
    borderBottom: "1px solid #1e1e1e",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    background: "#111",
    zIndex: 1,
  }

  // ── STEP 0: Listing type ──────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div style={modalStyle} onClick={onClose}>
        <div
          style={{ ...panelStyle, maxWidth: "480px" }}
          onClick={event => event.stopPropagation()}
        >
          <div style={headerStyle}>
            <span style={{ fontSize: "18px", fontWeight: "700" }}>
              Create a Listing
            </span>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: "28px 24px" }}>
            <p
              style={{
                color: "#888",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              What are you listing on Silk Road GH?
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[
                {
                  type: "product",
                  icon: "🛒",
                  title: "Sell a Product",
                  desc: "Textbooks, electronics, clothing, furniture and more.",
                },
                {
                  type: "rent",
                  icon: "📦",
                  title: "Rent an Item",
                  desc: "Cameras, bikes, gadgets — earn while you're not using them.",
                },
                {
                  type: "service",
                  icon: "🛠️",
                  title: "Offer a Service",
                  desc: "Tutoring, design, cleaning, photography and more.",
                },
              ].map(option => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setListingType(option.type)
                    setStep(1)
                  }}
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "18px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    textAlign: "left",
                    color: "#f0ede8",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <div style={{ fontSize: "32px" }}>
                    {option.icon}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        marginBottom: "4px",
                      }}
                    >
                      {option.title}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        lineHeight: "1.5",
                      }}
                    >
                      {option.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      marginLeft: "auto",
                      color: "#777",
                      fontSize: "18px",
                    }}
                  >
                    →
                  </div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#1a1a1a",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "13px",
                color: "#888",
                textAlign: "center",
              }}
            >
              🔒 Free to list. Silk Road GH only takes 8% when you make a sale.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 1: Listing details and Image Studio ──────────────────────────────

  if (step === 1) {
    return (
      <>
        {showWebcam && (
          <WebcamModal
            onCapture={handleWebcamCapture}
            onClose={() => setShowWebcam(false)}
          />
        )}

        <div style={modalStyle} onClick={onClose}>
          <div
            style={panelStyle}
            onClick={event => event.stopPropagation()}
          >
            <div style={headerStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setStep(0)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ←
                </button>

                <span style={{ fontSize: "17px", fontWeight: "700" }}>
                  {listingType === "product"
                    ? "🛒 Sell a Product"
                    : listingType === "rent"
                      ? "📦 Rent an Item"
                      : "🛠️ Offer a Service"}
                </span>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "22px",
              }}
            >
              {/* Image Studio */}
              <ImageStudio
                image={form.photoPreview}
                settings={imageSettings}
                onSettingsChange={setImageSettings}
                inputRef={fileInputRef}
                onChooseImage={handlePhoto}
                onTakePhoto={() => setShowWebcam(true)}
                error={errors.photo}
              />

              <ErrorMsg field="photo" />

              {/* Title */}
              <div>
                <div style={sectionLabel}>Title</div>

                <input
                  placeholder={
                    listingType === "product"
                      ? "e.g. Calculus Textbook 8th Edition"
                      : listingType === "rent"
                        ? "e.g. Canon EOS M50 Camera"
                        : "e.g. Mathematics Private Lessons"
                  }
                  value={form.title}
                  maxLength={120}
                  onChange={event => update("title", event.target.value)}
                  style={inputStyle("title")}
                />

                <ErrorMsg field="title" />
              </div>

              {/* Product or service price */}
              {(listingType === "product" || listingType === "service") && (
                <div>
                  <div style={sectionLabel}>Price (GHS ₵)</div>

                  <input
                    placeholder="e.g. 150"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={event => update("price", event.target.value)}
                    style={inputStyle("price")}
                  />

                  {form.price && Number(form.price) > 0 && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6ee7b7",
                        marginTop: "5px",
                      }}
                    >
                      You'll receive: ₵
                      {(Number(form.price) * 0.92).toFixed(2)}
                      {" "}after the 8% platform fee
                    </div>
                  )}

                  <ErrorMsg field="price" />
                </div>
              )}

              {/* Rental pricing */}
              {listingType === "rent" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={sectionLabel}>Daily Rate (₵)</div>

                    <input
                      placeholder="e.g. 80"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.dailyRate}
                      onChange={event =>
                        update("dailyRate", event.target.value)
                      }
                      style={inputStyle("dailyRate")}
                    />

                    <ErrorMsg field="dailyRate" />
                  </div>

                  <div>
                    <div style={sectionLabel}>Max Days</div>

                    <input
                      placeholder="e.g. 7"
                      type="number"
                      min="1"
                      step="1"
                      value={form.maxDays}
                      onChange={event =>
                        update("maxDays", event.target.value)
                      }
                      style={inputStyle("maxDays")}
                    />

                    <ErrorMsg field="maxDays" />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <div style={sectionLabel}>Category</div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {(listingType === "service"
                    ? CATEGORIES_SERVICE
                    : CATEGORIES_PRODUCT
                  ).map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => update("category", category)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "100px",
                        border: `1.5px solid ${
                          form.category === category ? "#c8a97e" : "#333"
                        }`,
                        background: form.category === category
                          ? "#c8a97e22"
                          : "#1a1a1a",
                        color: form.category === category
                          ? "#c8a97e"
                          : "#aaa",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "12px",
                        fontFamily: "inherit",
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <ErrorMsg field="category" />
              </div>

              {/* Condition */}
              {(listingType === "product" || listingType === "rent") && (
                <div>
                  <div style={sectionLabel}>Condition</div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {["Excellent", "Good", "Fair"].map(condition => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => update("condition", condition)}
                        style={{
                          flex: 1,
                          padding: "10px 6px",
                          borderRadius: "10px",
                          border: `1.5px solid ${
                            form.condition === condition
                              ? "#c8a97e"
                              : "#333"
                          }`,
                          background: form.condition === condition
                            ? "#c8a97e22"
                            : "#1a1a1a",
                          color: form.condition === condition
                            ? "#c8a97e"
                            : "#aaa",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "12px",
                          fontFamily: "inherit",
                        }}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>

                  <ErrorMsg field="condition" />
                </div>
              )}

              {/* Description */}
              <div>
                <div style={sectionLabel}>Description</div>

                <textarea
                  placeholder={
                    listingType === "product"
                      ? "Describe your item — its condition, what's included, and why you're selling..."
                      : listingType === "rent"
                        ? "Describe the item, what's included, and any rental rules..."
                        : "Describe your service, your experience, and turnaround time..."
                  }
                  value={form.desc}
                  maxLength={5000}
                  onChange={event => update("desc", event.target.value)}
                  rows={4}
                  style={{
                    ...inputStyle("desc"),
                    resize: "vertical",
                  }}
                />

                <ErrorMsg field="desc" />
              </div>

              {/* Delivery options */}
              {listingType === "product" && (
                <div>
                  <div style={sectionLabel}>Delivery Options</div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      ["Pickup", "📍 Campus Pickup"],
                      ["Rider", "🛵 Rider Delivery"],
                      ["Shipping", "📦 Shipping"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleDelivery(value)}
                        style={{
                          flex: "1 1 120px",
                          padding: "12px 10px",
                          borderRadius: "10px",
                          border: `1.5px solid ${
                            form.delivery.includes(value)
                              ? "#c8a97e"
                              : "#333"
                          }`,
                          background: form.delivery.includes(value)
                            ? "#c8a97e22"
                            : "#1a1a1a",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: form.delivery.includes(value)
                            ? "#c8a97e"
                            : "#aaa",
                          textAlign: "center",
                          fontFamily: "inherit",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <ErrorMsg field="delivery" />
                </div>
              )}

              {/* Rental deposit */}
              {listingType === "rent" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={sectionLabel}>
                      Accountability Deposit
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.accountability}
                      aria-label="Enable accountability deposit"
                      onClick={() =>
                        update("accountability", !form.accountability)
                      }
                      style={{
                        width: "44px",
                        height: "24px",
                        background: form.accountability
                          ? "#c8a97e"
                          : "#333",
                        border: "none",
                        borderRadius: "20px",
                        position: "relative",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: form.accountability ? "24px" : "4px",
                          width: "16px",
                          height: "16px",
                          background: "#fff",
                          borderRadius: "50%",
                          transition: "left .2s",
                        }}
                      />
                    </button>
                  </div>

                  {form.accountability && (
                    <div>
                      <input
                        placeholder="Damage deposit % e.g. 50"
                        type="number"
                        min="1"
                        max="100"
                        value={form.accountabilityPct}
                        onChange={event =>
                          update("accountabilityPct", event.target.value)
                        }
                        style={inputStyle("accountabilityPct")}
                      />

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#fcd34d",
                          marginTop: "5px",
                          lineHeight: "1.5",
                        }}
                      >
                        ⚠️ The renter pays this percentage on top of the rental
                        fee. Deposit handling and refund eligibility remain
                        subject to your rental policies.
                      </div>

                      <ErrorMsg field="accountabilityPct" />
                    </div>
                  )}
                </div>
              )}

              {/* Service settings */}
              {listingType === "service" && (
                <>
                  <div>
                    <div style={sectionLabel}>Service Type</div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      {[
                        ["online", "🌐 Online"],
                        ["in-person", "📍 In-Person"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            update("serviceDelivery", value)
                          }
                          style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            border: `1.5px solid ${
                              form.serviceDelivery === value
                                ? "#c8a97e"
                                : "#333"
                            }`,
                            background: form.serviceDelivery === value
                              ? "#c8a97e22"
                              : "#1a1a1a",
                            color: form.serviceDelivery === value
                              ? "#c8a97e"
                              : "#aaa",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "13px",
                            fontFamily: "inherit",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={sectionLabel}>
                          Enable Live Session
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            color: "#777",
                            lineHeight: "1.5",
                          }}
                        >
                          For tutoring, lessons, or services needing a video call.
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.liveSession}
                        aria-label="Enable live session"
                        onClick={() =>
                          update("liveSession", !form.liveSession)
                        }
                        style={{
                          width: "44px",
                          height: "24px",
                          background: form.liveSession
                            ? "#c8a97e"
                            : "#333",
                          border: "none",
                          borderRadius: "20px",
                          position: "relative",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "4px",
                            left: form.liveSession ? "24px" : "4px",
                            width: "16px",
                            height: "16px",
                            background: "#fff",
                            borderRadius: "50%",
                            transition: "left .2s",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {!form.liveSession && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#777",
                          lineHeight: "1.5",
                        }}
                      >
                        Contact details are intended to be revealed to the
                        buyer only after payment, according to your existing
                        application rules.
                      </div>

                      <div>
                        <div style={sectionLabel}>Contact Method</div>

                        <input
                          placeholder="e.g. WhatsApp, Phone, Instagram, Email..."
                          value={form.contactMethod}
                          onChange={event =>
                            update("contactMethod", event.target.value)
                          }
                          style={inputStyle("contactMethod")}
                        />

                        <ErrorMsg field="contactMethod" />
                      </div>

                      <div>
                        <div style={sectionLabel}>Contact Detail</div>

                        <input
                          placeholder="e.g. +233 24 567 8901, @yourhandle..."
                          value={form.contactDetail}
                          onChange={event =>
                            update("contactDetail", event.target.value)
                          }
                          style={inputStyle("contactDetail")}
                        />

                        <ErrorMsg field="contactDetail" />
                      </div>

                      <div>
                        <div style={sectionLabel}>
                          Note for Buyer (Optional)
                        </div>

                        <input
                          placeholder="e.g. Message me first with your requirements..."
                          value={form.contactNote}
                          onChange={event =>
                            update("contactNote", event.target.value)
                          }
                          style={inputStyle("contactNote")}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={handlePreview}
                style={{
                  background: "#c8a97e",
                  color: "#111",
                  border: "none",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontFamily: "inherit",
                  marginTop: "4px",
                }}
              >
                Preview Listing →
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── STEP 2: Listing preview ───────────────────────────────────────────────

  if (step === 2) {
    const displayedPrice = listingType === "rent"
      ? `₵${form.dailyRate}/day`
      : `₵${form.price}`

    return (
      <div style={modalStyle} onClick={onClose}>
        <div
          style={{
            ...panelStyle,
            maxWidth: "600px",
          }}
          onClick={event => event.stopPropagation()}
        >
          <div style={headerStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ←
              </button>

              <span style={{ fontSize: "17px", fontWeight: "700" }}>
                Preview Your Listing
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Marketplace card */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: "12px",
                }}
              >
                How it looks on the marketplace
              </div>

              <div
                style={{
                  background: "#18181c",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #2a2a2a",
                  maxWidth: "300px",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    background: imageSettings.background,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={form.photoPreview}
                    alt={form.title || "Product preview"}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div style={{ padding: "14px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#c8a97e",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "5px",
                    }}
                  >
                    {form.category}
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#f0ede8",
                      marginBottom: "5px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {form.title}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#777",
                      marginBottom: "8px",
                    }}
                  >
                    by {user?.name || "You"}
                    {form.condition ? ` · ${form.condition}` : ""}
                  </div>

                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "#c8a97e",
                    }}
                  >
                    {displayedPrice}
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      width: "100%",
                      background: "#c8a97e",
                      color: "#111",
                      padding: "9px",
                      borderRadius: "7px",
                      fontWeight: "700",
                      fontSize: "12px",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    {listingType === "product"
                      ? "Add to Cart"
                      : listingType === "rent"
                        ? "Rent This"
                        : "Book Now"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#777",
                  marginTop: "10px",
                  lineHeight: "1.6",
                }}
              >
                Your edited image is exported at 1200 × 900 pixels.
                The published image will use this processed version.
              </div>
            </div>

            {/* Listing summary */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: "12px",
                }}
              >
                Full Listing Summary
              </div>

              <div
                style={{
                  background: "#1a1a1a",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  border: "1px solid #252525",
                }}
              >
                {[
                  [
                    "Type",
                    listingType === "product"
                      ? "🛒 Product for Sale"
                      : listingType === "rent"
                        ? "📦 Rental Item"
                        : "🛠️ Service",
                  ],
                  ["Title", form.title],
                  [
                    listingType === "rent" ? "Daily Rate" : "Price",
                    listingType === "rent"
                      ? `₵${form.dailyRate}/day · Max ${form.maxDays} days`
                      : `₵${form.price}`,
                  ],
                  ["Category", form.category],
                  form.condition
                    ? ["Condition", form.condition]
                    : null,
                  ["Description", form.desc],
                  listingType === "product"
                    ? ["Delivery", form.delivery.join(", ")]
                    : null,
                  listingType === "rent" && form.accountability
                    ? ["Deposit", `${form.accountabilityPct}%`]
                    : null,
                  listingType === "service"
                    ? [
                        "Service Type",
                        form.serviceDelivery === "online"
                          ? "🌐 Online"
                          : "📍 In-Person",
                      ]
                    : null,
                  listingType === "service"
                    ? [
                        "Live Session",
                        form.liveSession ? "Enabled" : "Disabled",
                      ]
                    : null,
                  listingType === "service" && !form.liveSession
                    ? [
                        "Contact",
                        `${form.contactMethod} · ${form.contactDetail}`,
                      ]
                    : null,
                  [
                    "Image Fit",
                    imageSettings.fit === "contain"
                      ? "Entire image"
                      : "Fill frame",
                  ],
                  ["Image Zoom", `${Math.round(imageSettings.zoom * 100)}%`],
                  [
                    "Image Background",
                    IMAGE_BACKGROUNDS.find(
                      background =>
                        background.value === imageSettings.background
                    )?.name || "Custom",
                  ],
                ].filter(Boolean).map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    <span
                      style={{
                        color: "#777",
                        minWidth: "105px",
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </span>

                    <span
                      style={{
                        color: "#f0ede8",
                        flex: 1,
                        overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: "#c8a97e",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🎨 Adjust Photo or Edit Listing
              </button>
            </div>

            <div
              style={{
                background: "#064e3b22",
                border: "1px solid #065f46",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "13px",
                color: "#6ee7b7",
                lineHeight: "1.6",
              }}
            >
              💰 Silk Road GH takes 8% only when you make a sale.
              Listing is completely free.
            </div>

            {!user && (
              <div
                style={{
                  background: "#78350f22",
                  border: "1px solid #92400e",
                  borderRadius: "10px",
                  padding: "14px",
                  fontSize: "13px",
                  color: "#fcd34d",
                }}
              >
                👤 You'll need a free account to publish.
              </div>
            )}

            {publishError && (
              <div
                role="alert"
                style={{
                  background: "#7f1d1d22",
                  border: "1px solid #7f1d1d",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  color: "#fca5a5",
                  overflowWrap: "anywhere",
                }}
              >
                🚫 {publishError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setStep(1)}
                disabled={publishing}
                style={{
                  flex: 1,
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: "#aaa",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: publishing ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              >
                ← Edit
              </button>

              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  flex: 2,
                  background: publishing ? "#806b4f" : "#c8a97e",
                  color: "#111",
                  border: "none",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  cursor: publishing ? "wait" : "pointer",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              >
                {publishing
                  ? "⏳ Processing & Publishing..."
                  : user
                    ? "🚀 Publish Listing"
                    : "🔐 Sign Up & Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 3: Success ───────────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div style={modalStyle} onClick={onClose}>
        <div
          style={{
            ...panelStyle,
            maxWidth: "440px",
            padding: "36px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
          onClick={event => event.stopPropagation()}
        >
          <div
            style={{
              width: "100px",
              aspectRatio: "4 / 3",
              borderRadius: "12px",
              overflow: "hidden",
              border: "2px solid #c8a97e",
              background: "#18181c",
            }}
          >
            <img
              src={form.photoPreview}
              alt="Published listing"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div style={{ fontSize: "44px" }}>🎉</div>

          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#c8a97e",
              margin: 0,
            }}
          >
            Listing Published!
          </h2>

          <p
            style={{
              color: "#aaa",
              fontSize: "14px",
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            <strong style={{ color: "#f0ede8" }}>
              {form.title}
            </strong>{" "}
            has been submitted successfully to Silk Road GH.
          </p>

          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "10px",
              padding: "14px",
              width: "100%",
              boxSizing: "border-box",
              fontSize: "13px",
              color: "#aaa",
              lineHeight: "1.8",
            }}
          >
            <div>
              Type:{" "}
              <span style={{ color: "#c8a97e", fontWeight: "600" }}>
                {listingType === "product"
                  ? "Product"
                  : listingType === "rent"
                    ? "Rental"
                    : "Service"}
              </span>
            </div>

            <div>
              Price:{" "}
              <span style={{ color: "#c8a97e", fontWeight: "600" }}>
                {listingType === "rent"
                  ? `₵${form.dailyRate}/day`
                  : `₵${form.price}`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#c8a97e",
              color: "#111",
              border: "none",
              padding: "13px 28px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "15px",
              fontFamily: "inherit",
              width: "100%",
            }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  return null
}
