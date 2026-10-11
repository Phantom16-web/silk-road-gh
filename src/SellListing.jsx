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
  fit: "cover",
  zoom: 1,
  positionX: 50,
  positionY: 50,
  background: "#f3f0ea",
}

const IMAGE_BACKGROUNDS = [
  { label: "Cream", value: "#f3f0ea" },
  { label: "White", value: "#ffffff" },
  { label: "Dark", value: "#1a1a1a" },
  { label: "Gold", value: "#c8a97e" },
]

const GOLD = "#c8a97e"

// ── Image Processing ────────────────────────────────────────────────────────

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Could not load this image. Please choose another one."))
    }

    image.src = objectUrl
  })
}

function drawEditedImage(canvas, image, settings) {
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Your browser could not process this image.")
  }

  canvas.width = IMAGE_WIDTH
  canvas.height = IMAGE_HEIGHT

  // Fill the complete frame with the chosen background.
  ctx.fillStyle = settings.background
  ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT)

  const imageWidth = image.naturalWidth
  const imageHeight = image.naturalHeight

  if (!imageWidth || !imageHeight) {
    throw new Error("This image has invalid dimensions.")
  }

  const scaleX = IMAGE_WIDTH / imageWidth
  const scaleY = IMAGE_HEIGHT / imageHeight

  const baseScale =
    settings.fit === "cover"
      ? Math.max(scaleX, scaleY)
      : Math.min(scaleX, scaleY)

  const scale = baseScale * settings.zoom
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale

  // The position sliders determine where the image sits in the frame.
  const drawX = (IMAGE_WIDTH - drawWidth) * (settings.positionX / 100)
  const drawY = (IMAGE_HEIGHT - drawHeight) * (settings.positionY / 100)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  ctx.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  )
}

async function renderEditedImage(file, settings, createFile = false) {
  const image = await loadImageFromFile(file)

  const canvas = document.createElement("canvas")
  drawEditedImage(canvas, image, settings)

  const previewUrl = canvas.toDataURL("image/jpeg", 0.92)

  if (!createFile) {
    return { previewUrl }
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      result => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error("Could not export the edited image."))
        }
      },
      "image/jpeg",
      0.92
    )
  })

  const originalName = file.name.replace(/\.[^.]+$/, "") || "listing-photo"

  const editedFile = new File(
    [blob],
    `${originalName}-edited.jpg`,
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  )

  return {
    file: editedFile,
    previewUrl,
  }
}

// ── Shared Styles ───────────────────────────────────────────────────────────

const buttonBase = {
  fontFamily: "inherit",
  borderRadius: "9px",
  fontWeight: "600",
  cursor: "pointer",
}

const secondaryButton = {
  ...buttonBase,
  background: "#1e1e1e",
  border: "1px solid #333",
  color: "#c8a97e",
  padding: "10px 14px",
  fontSize: "13px",
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: "12px",
        color: "#888",
        fontWeight: "600",
        marginBottom: "8px",
        textTransform: "uppercase",
        letterSpacing: ".06em",
      }}
    >
      {children}
    </div>
  )
}

// ── Image Editor ────────────────────────────────────────────────────────────

function ImageEditor({
  originalPreview,
  editedPreview,
  settings,
  onSettingsChange,
  onReset,
  onChooseImage,
  onTakePhoto,
  inputRef,
  onFileChange,
  error,
}) {
  const change = (field, value) => {
    onSettingsChange(previous => ({
      ...previous,
      [field]: value,
    }))
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div>
        <SectionLabel>Listing photo</SectionLabel>

        <div
          style={{
            color: "#777",
            fontSize: "12px",
            lineHeight: "1.6",
            marginBottom: "12px",
          }}
        >
          Choose a photo, then adjust how it appears on the marketplace.
          Your original photo stays unchanged while you edit.
        </div>

        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={onFileChange}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onChooseImage}
            style={secondaryButton}
          >
            📁 Choose from Device
          </button>

          <button
            type="button"
            onClick={onTakePhoto}
            style={secondaryButton}
          >
            📸 Take a Photo
          </button>
        </div>
      </div>

      {originalPreview && (
        <>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <SectionLabel>Live marketplace preview</SectionLabel>

              <span
                style={{
                  fontSize: "11px",
                  color: "#6ee7b7",
                  background: "#064e3b33",
                  borderRadius: "20px",
                  padding: "5px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                4:3 frame
              </span>
            </div>

            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                background: settings.background,
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #333",
                position: "relative",
              }}
            >
              {editedPreview ? (
                <img
                  src={editedPreview}
                  alt="Edited listing preview"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#777",
                    fontSize: "13px",
                  }}
                >
                  Preparing preview…
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              This preview shows the edited image that will be uploaded.
            </div>
          </div>

          <div
            style={{
              background: "#181818",
              border: "1px solid #292929",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#f0ede8",
                  }}
                >
                  Adjust your photo
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#777",
                    marginTop: "4px",
                  }}
                >
                  The default settings are optimized for a marketplace card.
                </div>
              </div>

              <button
                type="button"
                onClick={onReset}
                style={{
                  ...buttonBase,
                  background: "transparent",
                  border: "1px solid #444",
                  color: "#c8a97e",
                  padding: "8px 10px",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                }}
              >
                ↺ Reset
              </button>
            </div>

            {/* Fit mode */}
            <div>
              <SectionLabel>Image display</SectionLabel>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {[
                  {
                    value: "cover",
                    title: "Fill frame",
                    description: "Fills the card; edges may be cropped.",
                  },
                  {
                    value: "contain",
                    title: "Show whole image",
                    description: "Keeps the whole image visible.",
                  },
                ].map(option => {
                  const selected = settings.fit === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => change("fit", option.value)}
                      style={{
                        ...buttonBase,
                        padding: "12px",
                        textAlign: "left",
                        border: `1px solid ${
                          selected ? GOLD : "#333"
                        }`,
                        background: selected ? "#c8a97e18" : "#202020",
                        color: selected ? GOLD : "#aaa",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          marginBottom: "5px",
                        }}
                      >
                        {option.title}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          lineHeight: "1.5",
                          color: selected ? "#d7c3a8" : "#777",
                          fontWeight: "400",
                        }}
                      >
                        {option.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Zoom */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <SectionLabel>Zoom</SectionLabel>

                <span
                  style={{
                    color: GOLD,
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  {settings.zoom.toFixed(2)}×
                </span>
              </div>

              <input
                aria-label="Image zoom"
                type="range"
                min="1"
                max="2"
                step="0.05"
                value={settings.zoom}
                onChange={event =>
                  change("zoom", Number(event.target.value))
                }
                style={{
                  width: "100%",
                  accentColor: GOLD,
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                <span>Normal</span>
                <span>Zoom in</span>
              </div>
            </div>

            {/* Horizontal position */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <SectionLabel>Horizontal position</SectionLabel>

                <span style={{ fontSize: "11px", color: GOLD }}>
                  {settings.positionX}%
                </span>
              </div>

              <input
                aria-label="Horizontal image position"
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.positionX}
                onChange={event =>
                  change("positionX", Number(event.target.value))
                }
                style={{
                  width: "100%",
                  accentColor: GOLD,
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                <span>Left</span>
                <span>Centered at 50%</span>
                <span>Right</span>
              </div>
            </div>

            {/* Vertical position */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <SectionLabel>Vertical position</SectionLabel>

                <span style={{ fontSize: "11px", color: GOLD }}>
                  {settings.positionY}%
                </span>
              </div>

              <input
                aria-label="Vertical image position"
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.positionY}
                onChange={event =>
                  change("positionY", Number(event.target.value))
                }
                style={{
                  width: "100%",
                  accentColor: GOLD,
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                <span>Top</span>
                <span>Centered at 50%</span>
                <span>Bottom</span>
              </div>
            </div>

            {/* Background */}
            <div>
              <SectionLabel>Background</SectionLabel>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                {IMAGE_BACKGROUNDS.map(background => {
                  const selected =
                    settings.background === background.value

                  return (
                    <button
                      key={background.value}
                      type="button"
                      title={background.label}
                      aria-label={`${background.label} background`}
                      aria-pressed={selected}
                      onClick={() =>
                        change("background", background.value)
                      }
                      style={{
                        ...buttonBase,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        background: "transparent",
                        border: "none",
                        color: selected ? GOLD : "#888",
                        padding: "0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background: background.value,
                          border: selected
                            ? `3px solid ${GOLD}`
                            : "2px solid #444",
                          boxSizing: "border-box",
                          boxShadow: selected
                            ? "0 0 0 2px #c8a97e33"
                            : "none",
                        }}
                      />

                      <span style={{ fontSize: "11px" }}>
                        {background.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div
                style={{
                  color: "#666",
                  fontSize: "11px",
                  lineHeight: "1.5",
                  marginTop: "10px",
                }}
              >
                The background is most visible when using “Show whole image”
                with photos that do not fill the frame.
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          style={{
            background: "#7f1d1d22",
            border: "1px solid #7f1d1d",
            borderRadius: "8px",
            padding: "10px",
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

// ── Webcam Modal ────────────────────────────────────────────────────────────

function WebcamModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [captured, setCaptured] = useState(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported by this browser.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play()
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
        setError("No camera found on this device.")
      } else {
        setError("Could not access camera: " + err.message)
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

    if (!video.videoWidth || !video.videoHeight) {
      setError("The camera is not ready yet. Please try again.")
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")

    if (!ctx) {
      setError("Could not capture the photo.")
      return
    }

    ctx.drawImage(video, 0, 0)

    setCaptured(canvas.toDataURL("image/jpeg", 0.92))
  }

  const handleUse = () => {
    if (!canvasRef.current || !captured) return

    canvasRef.current.toBlob(blob => {
      if (!blob) {
        setError("Could not prepare the captured photo.")
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
              color: "#666",
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
                  background: GOLD,
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Close
              </button>
            </div>
          ) : captured ? (
            <>
              <img
                src={captured}
                alt="Captured"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  display: "block",
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setCaptured(null)}
                  style={{
                    ...buttonBase,
                    flex: 1,
                    background: "#1e1e1e",
                    border: "1px solid #333",
                    color: "#aaa",
                    padding: "12px",
                  }}
                >
                  🔄 Retake
                </button>

                <button
                  onClick={handleUse}
                  style={{
                    ...buttonBase,
                    flex: 2,
                    background: GOLD,
                    border: "none",
                    color: "#000",
                    padding: "12px",
                    fontSize: "14px",
                  }}
                >
                  ✅ Use This Photo
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
                  aspectRatio: "16 / 9",
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
                    objectFit: "cover",
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
                      color: "#666",
                      fontSize: "13px",
                    }}
                  >
                    ⏳ Starting camera...
                  </div>
                )}
              </div>

              <canvas
                ref={canvasRef}
                style={{ display: "none" }}
              />

              <button
                onClick={handleCapture}
                disabled={!ready}
                style={{
                  ...buttonBase,
                  background: ready ? GOLD : "#1e1e1e",
                  border: "none",
                  color: ready ? "#000" : "#555",
                  padding: "14px",
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

// ── Main Listing Component ──────────────────────────────────────────────────

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

  const [editedPhotoPreview, setEditedPhotoPreview] = useState(null)
  const [imageProcessing, setImageProcessing] = useState(false)

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

  const toggleDelivery = deliveryOption => {
    setForm(previous => ({
      ...previous,
      delivery: previous.delivery.includes(deliveryOption)
        ? previous.delivery.filter(item => item !== deliveryOption)
        : [...previous.delivery, deliveryOption],
    }))
  }

  const resetImageSettings = () => {
    setImageSettings({ ...DEFAULT_IMAGE_SETTINGS })
  }

  const handlePhoto = event => {
    const file = event.target.files?.[0]

    // Allow selecting the same file again later.
    event.target.value = ""

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrors(previous => ({
        ...previous,
        photo: "Please select a valid image.",
      }))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm(previous => ({
        ...previous,
        photo: file,
        photoPreview: reader.result,
      }))

      setImageSettings({ ...DEFAULT_IMAGE_SETTINGS })
      setEditedPhotoPreview(null)

      setErrors(previous => ({
        ...previous,
        photo: null,
      }))
    }

    reader.onerror = () => {
      setErrors(previous => ({
        ...previous,
        photo: "Could not read this image. Please try another file.",
      }))
    }

    reader.readAsDataURL(file)
  }

  const handleWebcamCapture = (file, dataUrl) => {
    setForm(previous => ({
      ...previous,
      photo: file,
      photoPreview: dataUrl,
    }))

    setImageSettings({ ...DEFAULT_IMAGE_SETTINGS })
    setEditedPhotoPreview(null)

    setErrors(previous => ({
      ...previous,
      photo: null,
    }))

    setShowWebcam(false)
  }

  // Keep the preview synchronized with the editor settings.
  useEffect(() => {
    if (!form.photo) {
      setEditedPhotoPreview(null)
      setImageProcessing(false)
      return
    }

    let cancelled = false

    setImageProcessing(true)

    renderEditedImage(form.photo, imageSettings)
      .then(result => {
        if (!cancelled) {
          setEditedPhotoPreview(result.previewUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditedPhotoPreview(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImageProcessing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [form.photo, imageSettings])

  const validate = () => {
    const nextErrors = {}

    if (!form.photo) {
      nextErrors.photo = "Please upload a photo."
    }

    if (!form.title.trim()) {
      nextErrors.title = "Please enter a title."
    }

    if (listingType === "product") {
      if (!form.price || Number(form.price) <= 0) {
        nextErrors.price = "Please enter a valid price."
      }

      if (!form.category) {
        nextErrors.category = "Please select a category."
      }

      if (!form.condition) {
        nextErrors.condition = "Please select a condition."
      }

      if (!form.desc.trim()) {
        nextErrors.desc = "Please add a description."
      }

      if (form.delivery.length === 0) {
        nextErrors.delivery =
          "Please select at least one delivery option."
      }
    }

    if (listingType === "rent") {
      if (!form.dailyRate || Number(form.dailyRate) <= 0) {
        nextErrors.dailyRate = "Please enter a valid daily rate."
      }

      if (!form.maxDays || Number(form.maxDays) <= 0) {
        nextErrors.maxDays = "Please enter valid maximum rental days."
      }

      if (!form.category) {
        nextErrors.category = "Please select a category."
      }

      if (!form.condition) {
        nextErrors.condition = "Please select a condition."
      }

      if (!form.desc.trim()) {
        nextErrors.desc = "Please add a description."
      }

      if (
        form.accountability &&
        (
          form.accountabilityPct === "" ||
          Number(form.accountabilityPct) < 0 ||
          Number(form.accountabilityPct) > 100
        )
      ) {
        nextErrors.accountabilityPct =
          "Enter an accountability percentage between 0 and 100."
      }
    }

    if (listingType === "service") {
      if (!form.price || Number(form.price) <= 0) {
        nextErrors.price = "Please enter a valid price."
      }

      if (!form.category) {
        nextErrors.category = "Please select a service category."
      }

      if (!form.desc.trim()) {
        nextErrors.desc = "Please add a description."
      }

      if (!form.liveSession) {
        if (!form.contactMethod.trim()) {
          nextErrors.contactMethod =
            "Please enter your contact method."
        }

        if (!form.contactDetail.trim()) {
          nextErrors.contactDetail =
            "Please enter your contact detail."
        }
      }
    }

    setErrors(nextErrors)

    return nextErrors
  }

  const handlePreview = () => {
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) return

    setPublishError("")
    setStep(2)
  }

  const handlePublish = async () => {
    if (!user) {
      onRequestAuth(() => setStep(3))
      return
    }

    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setStep(1)
      return
    }

    setPublishing(true)
    setPublishError("")

    try {
      if (!form.photo) {
        throw new Error("Please choose a listing photo.")
      }

      // Export the user's edits into a real image file.
      // The backend receives this processed file, not the original.
      const editedImage = await renderEditedImage(
        form.photo,
        imageSettings,
        true
      )

      const formData = new FormData()

      formData.append("image", editedImage.file)

      const listingData = {
        type: listingType,
        title: form.title,
        desc: form.desc,
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
        setPublishing(false)
        return
      }

      // Show the actual exported image on the success screen.
      setEditedPhotoPreview(editedImage.previewUrl)
      setStep(3)
    } catch (error) {
      setPublishError(
        error?.message ||
        "Something went wrong. Please try again."
      )
    } finally {
      setPublishing(false)
    }
  }

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

  // ── STEP 0: Choose Listing Type ───────────────────────────────────────────

  if (step === 0) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000cc",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={onClose}
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
          onClick={event => event.stopPropagation()}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #1e1e1e",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: "700" }}>
              Create a Listing
            </span>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#666",
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
                <div
                  key={option.type}
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
                    transition: "border .2s",
                  }}
                  onMouseEnter={event => {
                    event.currentTarget.style.borderColor = "#c8a97e55"
                  }}
                  onMouseLeave={event => {
                    event.currentTarget.style.borderColor = "#2a2a2a"
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
                        color: "#f0ede8",
                        marginBottom: "4px",
                      }}
                    >
                      {option.title}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#666",
                      }}
                    >
                      {option.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      marginLeft: "auto",
                      color: "#555",
                      fontSize: "18px",
                    }}
                  >
                    →
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#1a1a1a",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "13px",
                color: "#666",
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

  // ── STEP 1: Listing Details and Image Editor ──────────────────────────────

  if (step === 1) {
    return (
      <>
        {showWebcam && (
          <WebcamModal
            onCapture={handleWebcamCapture}
            onClose={() => setShowWebcam(false)}
          />
        )}

        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000000cc",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={onClose}
        >
          <div
            style={{
              background: "#111",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "92vh",
              overflowY: "auto",
              border: "1px solid #1e1e1e",
            }}
            onClick={event => event.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #1e1e1e",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#111",
                zIndex: 1,
              }}
            >
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
                  color: "#666",
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
              {/* Photo editor */}
              <ImageEditor
                originalPreview={form.photoPreview}
                editedPreview={editedPhotoPreview}
                settings={imageSettings}
                onSettingsChange={setImageSettings}
                onReset={resetImageSettings}
                onChooseImage={() => fileInputRef.current?.click()}
                onTakePhoto={() => setShowWebcam(true)}
                inputRef={fileInputRef}
                onFileChange={handlePhoto}
                error={errors.photo}
              />

              <ErrorMsg field="photo" />

              {/* Title */}
              <div>
                <SectionLabel>Title</SectionLabel>

                <input
                  placeholder={
                    listingType === "product"
                      ? "e.g. Calculus Textbook 8th Edition"
                      : listingType === "rent"
                        ? "e.g. Canon EOS M50 Camera"
                        : "e.g. Mathematics Private Lessons"
                  }
                  value={form.title}
                  onChange={event => update("title", event.target.value)}
                  style={inputStyle("title")}
                />

                <ErrorMsg field="title" />
              </div>

              {/* Price */}
              {(listingType === "product" || listingType === "service") && (
                <div>
                  <SectionLabel>Price (GHS ₵)</SectionLabel>

                  <input
                    placeholder="e.g. 150"
                    type="number"
                    min="0"
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

              {/* Rental details */}
              {listingType === "rent" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <SectionLabel>Daily Rate (₵)</SectionLabel>

                    <input
                      placeholder="e.g. 80"
                      type="number"
                      min="0"
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
                    <SectionLabel>Max Days</SectionLabel>

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
                <SectionLabel>Category</SectionLabel>

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
                        ...buttonBase,
                        padding: "7px 14px",
                        borderRadius: "100px",
                        border: `1.5px solid ${
                          form.category === category ? GOLD : "#2a2a2a"
                        }`,
                        background: form.category === category
                          ? "#c8a97e22"
                          : "#1a1a1a",
                        color: form.category === category
                          ? GOLD
                          : "#888",
                        fontSize: "12px",
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
                  <SectionLabel>Condition</SectionLabel>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {["Excellent", "Good", "Fair"].map(condition => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => update("condition", condition)}
                        style={{
                          ...buttonBase,
                          flex: 1,
                          padding: "10px",
                          border: `1.5px solid ${
                            form.condition === condition ? GOLD : "#2a2a2a"
                          }`,
                          background: form.condition === condition
                            ? "#c8a97e22"
                            : "#1a1a1a",
                          color: form.condition === condition
                            ? GOLD
                            : "#888",
                          fontSize: "13px",
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
                <SectionLabel>Description</SectionLabel>

                <textarea
                  placeholder={
                    listingType === "product"
                      ? "Describe your item — condition details, what's included, why you're selling..."
                      : listingType === "rent"
                        ? "Describe the item — what's included, any rules for renters..."
                        : "Describe your service — what's included, your experience, turnaround time..."
                  }
                  value={form.desc}
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
                  <SectionLabel>Delivery Options</SectionLabel>

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
                          ...buttonBase,
                          flex: 1,
                          minWidth: "120px",
                          padding: "12px 10px",
                          border: `1.5px solid ${
                            form.delivery.includes(value) ? GOLD : "#2a2a2a"
                          }`,
                          background: form.delivery.includes(value)
                            ? "#c8a97e22"
                            : "#1a1a1a",
                          color: form.delivery.includes(value)
                            ? GOLD
                            : "#888",
                          fontSize: "13px",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <ErrorMsg field="delivery" />
                </div>
              )}

              {/* Rental accountability deposit */}
              {listingType === "rent" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <SectionLabel>Accountability Deposit</SectionLabel>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.accountability}
                      aria-label="Enable accountability deposit"
                      onClick={() =>
                        update("accountability", !form.accountability)
                      }
                      style={{
                        width: "40px",
                        height: "22px",
                        background: form.accountability ? GOLD : "#2a2a2a",
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
                          top: "3px",
                          left: form.accountability ? "20px" : "3px",
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
                        min="0"
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
                        }}
                      >
                        ⚠️ Renter pays this percentage on top of the rental
                        fee. Refund terms should be clearly explained.
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
                    <SectionLabel>Service Type</SectionLabel>

                    <div style={{ display: "flex", gap: "10px" }}>
                      {[
                        ["online", "🌐 Online"],
                        ["in-person", "📍 In-Person"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => update("serviceDelivery", value)}
                          style={{
                            ...buttonBase,
                            flex: 1,
                            padding: "12px",
                            border: `1.5px solid ${
                              form.serviceDelivery === value ? GOLD : "#2a2a2a"
                            }`,
                            background: form.serviceDelivery === value
                              ? "#c8a97e22"
                              : "#1a1a1a",
                            color: form.serviceDelivery === value
                              ? GOLD
                              : "#888",
                            fontSize: "13px",
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
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                          }}
                        >
                          Enable Live Session
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            color: "#555",
                            marginTop: "4px",
                          }}
                        >
                          For tutoring, lessons, or services needing a video call
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
                          width: "40px",
                          height: "22px",
                          background: form.liveSession ? GOLD : "#2a2a2a",
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
                            top: "3px",
                            left: form.liveSession ? "20px" : "3px",
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
                          color: "#555",
                        }}
                      >
                        Contact details revealed to the buyer only according
                        to the platform's payment and access rules.
                      </div>

                      <div>
                        <SectionLabel>Contact Method</SectionLabel>

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
                        <SectionLabel>Contact Detail</SectionLabel>

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
                        <SectionLabel>Note for Buyer (Optional)</SectionLabel>

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

              {imageProcessing && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    textAlign: "center",
                  }}
                >
                  Preparing your image preview…
                </div>
              )}

              <button
                onClick={handlePreview}
                style={{
                  ...buttonBase,
                  background: GOLD,
                  border: "none",
                  color: "#000",
                  padding: "14px",
                  fontSize: "15px",
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

  // ── STEP 2: Listing Preview ───────────────────────────────────────────────

  if (step === 2) {
    const previewImage = editedPhotoPreview || form.photoPreview

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000cc",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#111",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "92vh",
            overflowY: "auto",
            border: "1px solid #1e1e1e",
          }}
          onClick={event => event.stopPropagation()}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #1e1e1e",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              background: "#111",
              zIndex: 1,
            }}
          >
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
                color: "#666",
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
            <div>
              <SectionLabel>
                How it looks on the marketplace
              </SectionLabel>

              <div
                style={{
                  background: "#18181c",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #2a2a2a",
                  width: "100%",
                  maxWidth: "300px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    background: imageSettings.background,
                  }}
                >
                  <img
                    src={previewImage}
                    alt="Listing preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>

                <div style={{ padding: "12px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: GOLD,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    {form.category}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#f0ede8",
                      marginBottom: "4px",
                    }}
                  >
                    {form.title}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      marginBottom: "6px",
                    }}
                  >
                    by {user?.name || "You"} · {form.condition || "N/A"}
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: GOLD,
                    }}
                  >
                    {listingType === "rent"
                      ? `₵${form.dailyRate}/day`
                      : `₵${form.price}`}
                  </div>

                  <button
                    style={{
                      marginTop: "8px",
                      width: "100%",
                      background: GOLD,
                      border: "none",
                      padding: "7px",
                      borderRadius: "7px",
                      fontWeight: "700",
                    }}
                  >
                    {listingType === "product"
                      ? "Add to Cart"
                      : listingType === "rent"
                        ? "Rent This"
                        : "Book Now"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                style={{
                  ...buttonBase,
                  marginTop: "12px",
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: GOLD,
                  padding: "10px 14px",
                  fontSize: "12px",
                }}
              >
                ✏️ Adjust Photo or Edit Details
              </button>
            </div>

            <div>
              <SectionLabel>Full listing summary</SectionLabel>

              <div
                style={{
                  background: "#1a1a1a",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  border: "1px solid #1e1e1e",
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
                  listingType === "rent"
                    ? [
                        "Daily Rate",
                        `₵${form.dailyRate}/day · Max ${form.maxDays} days`,
                      ]
                    : ["Price", `₵${form.price}`],
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
                        form.liveSession ? "✅ Enabled" : "❌ Disabled",
                      ]
                    : null,
                  listingType === "service" && !form.liveSession
                    ? [
                        "Contact",
                        `${form.contactMethod} · ${form.contactDetail}`,
                      ]
                    : null,
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        gap: "12px",
                        fontSize: "13px",
                      }}
                    >
                      <span
                        style={{
                          color: "#555",
                          minWidth: "120px",
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
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div
              style={{
                background: "#064e3b22",
                border: "1px solid #065f46",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "13px",
                color: "#6ee7b7",
              }}
            >
              💰 Silk Road GH takes 8% only when you make a sale. Listing is
              completely free.
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
                👤 You'll need a free account to publish. It only takes a minute.
              </div>
            )}

            {publishError && (
              <div
                style={{
                  background: "#7f1d1d22",
                  border: "1px solid #7f1d1d",
                  borderRadius: "10px",
                  padding: "12px",
                  fontSize: "13px",
                  color: "#fca5a5",
                }}
              >
                🚫 {publishError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  ...buttonBase,
                  flex: 1,
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: "#aaa",
                  padding: "13px",
                  fontSize: "14px",
                }}
              >
                ← Edit
              </button>

              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  ...buttonBase,
                  flex: 2,
                  background: GOLD,
                  border: "none",
                  color: "#000",
                  padding: "13px",
                  fontSize: "15px",
                  cursor: publishing ? "wait" : "pointer",
                  opacity: publishing ? 0.7 : 1,
                }}
              >
                {publishing
                  ? "⏳ Preparing & Publishing..."
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
    const successImage = editedPhotoPreview || form.photoPreview

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000cc",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#111",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "440px",
            border: "1px solid #1e1e1e",
            padding: "40px 32px",
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
              border: `2px solid ${GOLD}`,
              background: imageSettings.background,
            }}
          >
            <img
              src={successImage}
              alt="Published listing"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          <div style={{ fontSize: "42px" }}>🎉</div>

          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: GOLD,
              margin: 0,
            }}
          >
            Listing Live!
          </h2>

          <p
            style={{
              color: "#888",
              fontSize: "14px",
              lineHeight: "1.6",
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
              color: "#888",
            }}
          >
            <div>
              Type:{" "}
              <span style={{ color: GOLD, fontWeight: "600" }}>
                {listingType === "product"
                  ? "Product"
                  : listingType === "rent"
                    ? "Rental"
                    : "Service"}
              </span>
            </div>

            <div style={{ marginTop: "4px" }}>
              Price:{" "}
              <span style={{ color: GOLD, fontWeight: "600" }}>
                {listingType === "rent"
                  ? `₵${form.dailyRate}/day`
                  : `₵${form.price}`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              ...buttonBase,
              background: GOLD,
              border: "none",
              padding: "13px 28px",
              fontSize: "15px",
              width: "100%",
              color: "#000",
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
