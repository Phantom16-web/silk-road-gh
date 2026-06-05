import { useState, useRef, useCallback } from "react"
import { createListing } from "./api"

const CATEGORIES_PRODUCT = ["Books", "Electronics", "Clothing", "Housing", "Food", "Sports", "Art", "Furniture", "Music", "Misc"]
const CATEGORIES_SERVICE = ["Lessons", "Photography", "Cleaning", "Design", "Entertainment", "Career", "Other"]

// ── Webcam Modal ─────────────────────────────────────────────────────────────
function WebcamModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [captured, setCaptured] = useState(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setReady(true)
        }
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access in your browser settings.")
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.")
      } else {
        setError("Could not access camera: " + err.message)
      }
    }
  }, [])

  useState(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  })

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCaptured(dataUrl)
  }

  const handleUse = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      const file = new File([blob], "webcam-photo.jpg", { type: "image/jpeg" })
      onCapture(file, captured)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }, "image/jpeg", 0.9)
  }

  const handleRetake = () => setCaptured(null)

  const handleClose = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "480px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: "700" }}>📸 Take a Photo</span>
          <button onClick={handleClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error ? (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
              <div style={{ fontSize: "13px", color: "#fca5a5", lineHeight: "1.6" }}>{error}</div>
              <button onClick={handleClose}
                style={{ marginTop: "12px", background: "#c8a97e", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                OK
              </button>
            </div>
          ) : captured ? (
            <>
              <img src={captured} alt="Captured" style={{ width: "100%", borderRadius: "10px", display: "block" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleRetake}
                  style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                  🔄 Retake
                </button>
                <button onClick={handleUse}
                  style={{ flex: 2, background: "#c8a97e", border: "none", color: "#000", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                  ✅ Use This Photo
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: "relative", background: "#000", borderRadius: "10px", overflow: "hidden", aspectRatio: "16/9" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {!ready && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
                    <div style={{ color: "#666", fontSize: "13px" }}>⏳ Starting camera...</div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <button onClick={handleCapture} disabled={!ready}
                style={{ background: ready ? "#c8a97e" : "#1e1e1e", border: "none", color: ready ? "#000" : "#555", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: ready ? "pointer" : "not-allowed", fontSize: "15px" }}>
                📸 Capture Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SellListing({ user, onRequestAuth, onClose }) {
  const [listingType, setListingType] = useState(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    photo: null, photoPreview: null, title: "", price: "", category: "", desc: "",
    condition: "", delivery: [],
    dailyRate: "", maxDays: "", accountability: false, accountabilityPct: "",
    serviceDelivery: "online", liveSession: false,
    contactMethod: "", contactDetail: "", contactNote: "",
  })
  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [showWebcam, setShowWebcam] = useState(false)
  const fileInputRef = useRef(null)

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const toggleDelivery = (d) => setForm(f => ({
    ...f, delivery: f.delivery.includes(d) ? f.delivery.filter(x => x !== d) : [...f.delivery, d]
  }))

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { setErrors(ev => ({ ...ev, photo: "Please select a valid image." })); return }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, photo: file, photoPreview: reader.result }))
      setErrors(ev => ({ ...ev, photo: null }))
    }
    reader.readAsDataURL(file)
  }

  const handleWebcamCapture = (file, dataUrl) => {
    setForm(f => ({ ...f, photo: file, photoPreview: dataUrl }))
    setErrors(ev => ({ ...ev, photo: null }))
    setShowWebcam(false)
  }

  const validate = () => {
    const e = {}
    if (!form.photoPreview) e.photo = "Please upload a photo."
    if (!form.title.trim()) e.title = "Please enter a title."
    if (listingType === "product") {
      if (!form.price) e.price = "Please enter a price."
      if (!form.category) e.category = "Please select a category."
      if (!form.condition) e.condition = "Please select a condition."
      if (!form.desc.trim()) e.desc = "Please add a description."
      if (form.delivery.length === 0) e.delivery = "Please select at least one delivery option."
    }
    if (listingType === "rent") {
      if (!form.dailyRate) e.dailyRate = "Please enter a daily rate."
      if (!form.maxDays) e.maxDays = "Please enter max rental days."
      if (!form.category) e.category = "Please select a category."
      if (!form.condition) e.condition = "Please select a condition."
      if (!form.desc.trim()) e.desc = "Please add a description."
      if (form.accountability && !form.accountabilityPct) e.accountabilityPct = "Please enter accountability %."
    }
    if (listingType === "service") {
      if (!form.price) e.price = "Please enter a price."
      if (!form.category) e.category = "Please select a service category."
      if (!form.desc.trim()) e.desc = "Please add a description."
      if (!form.liveSession) {
        if (!form.contactMethod.trim()) e.contactMethod = "Please enter your contact method."
        if (!form.contactDetail.trim()) e.contactDetail = "Please enter your contact detail."
      }
    }
    return e
  }

  const handlePreview = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setStep(2)
  }

  const handlePublish = async () => {
    if (!user) { onRequestAuth(() => setStep(3)); return }
    setPublishing(true)
    setPublishError("")
    try {
      const formData = new FormData()
      formData.append("image", form.photo)
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
          accountabilityPct: form.accountability ? Number(form.accountabilityPct) : 0,
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
      if (data.message) { setPublishError(data.message); setPublishing(false); return }
      setStep(3)
    } catch { setPublishError("Something went wrong. Please try again.") }
    setPublishing(false)
  }

  const ErrorMsg = ({ field }) => errors[field]
    ? <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors[field]}</div>
    : null

  const inputStyle = (field) => ({
    width: "100%", background: "#1e1e1e",
    border: `1px solid ${errors[field] ? "#991b1b" : "#333"}`,
    color: "#fff", padding: "12px 16px", borderRadius: "10px",
    fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  })

  // ── STEP 0 ────────────────────────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "480px", border: "1px solid #1e1e1e", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>Create a Listing</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "28px 24px" }}>
          <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>What are you listing on Silk Road GH?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { type: "product", icon: "🛒", title: "Sell a Product", desc: "Textbooks, electronics, clothing, furniture and more." },
              { type: "rent", icon: "📦", title: "Rent an Item", desc: "Cameras, bikes, gadgets — earn while you're not using them." },
              { type: "service", icon: "🛠️", title: "Offer a Service", desc: "Tutoring, design, cleaning, photography and more." },
            ].map(opt => (
              <div key={opt.type} onClick={() => { setListingType(opt.type); setStep(1) }}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", transition: "border .2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#c8a97e55"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}>
                <div style={{ fontSize: "32px" }}>{opt.icon}</div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "4px" }}>{opt.title}</div>
                  <div style={{ fontSize: "13px", color: "#666" }}>{opt.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#555", fontSize: "18px" }}>→</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "20px", background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#666", textAlign: "center" }}>
            🔒 Free to list. Silk Road GH only takes 8% when you make a sale.
          </div>
        </div>
      </div>
    </div>
  )

  // ── STEP 1 ────────────────────────────────────────────────────────────────
  if (step === 1) return (
    <>
      {showWebcam && <WebcamModal onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />}
      <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
        <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>

          <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => setStep(0)} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "18px" }}>←</button>
              <span style={{ fontSize: "17px", fontWeight: "700" }}>
                {listingType === "product" ? "🛒 Sell a Product" : listingType === "rent" ? "📦 Rent an Item" : "🛠️ Offer a Service"}
              </span>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Photo upload */}
            <div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>Photo</div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{ width: "90px", height: "90px", borderRadius: "12px", background: "#1a1a1a", border: `2px solid ${form.photoPreview ? "#c8a97e" : errors.photo ? "#991b1b" : "#2a2a2a"}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  onClick={() => fileInputRef.current.click()}>
                  {form.photoPreview
                    ? <img src={form.photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "28px" }}>📷</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhoto} style={{ display: "none" }} />
                  <button onClick={() => fileInputRef.current.click()}
                    style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}>
                    📁 Choose from Device
                  </button>
                  <button onClick={() => setShowWebcam(true)}
                    style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}>
                    📸 Take a Photo
                  </button>
                </div>
              </div>
              <ErrorMsg field="photo" />
            </div>

            {/* Title */}
            <div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Title</div>
              <input
                placeholder={listingType === "product" ? "e.g. Calculus Textbook 8th Edition" : listingType === "rent" ? "e.g. Canon EOS M50 Camera" : "e.g. Mathematics Private Lessons"}
                value={form.title} onChange={e => update("title", e.target.value)} style={inputStyle("title")} />
              <ErrorMsg field="title" />
            </div>

            {/* Price */}
            {(listingType === "product" || listingType === "service") && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Price (GHS ₵)</div>
                <input placeholder="e.g. 150" type="number" value={form.price} onChange={e => update("price", e.target.value)} style={inputStyle("price")} />
                {form.price && <div style={{ fontSize: "12px", color: "#6ee7b7", marginTop: "5px" }}>You'll receive: ₵{Math.round(form.price * 0.92)} after 8% platform fee</div>}
                <ErrorMsg field="price" />
              </div>
            )}

            {/* Rent — daily rate + max days */}
            {listingType === "rent" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Daily Rate (₵)</div>
                  <input placeholder="e.g. 80" type="number" value={form.dailyRate} onChange={e => update("dailyRate", e.target.value)} style={inputStyle("dailyRate")} />
                  <ErrorMsg field="dailyRate" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Max Days</div>
                  <input placeholder="e.g. 7" type="number" value={form.maxDays} onChange={e => update("maxDays", e.target.value)} style={inputStyle("maxDays")} />
                  <ErrorMsg field="maxDays" />
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(listingType === "service" ? CATEGORIES_SERVICE : CATEGORIES_PRODUCT).map(c => (
                  <button key={c} onClick={() => update("category", c)}
                    style={{ padding: "7px 14px", borderRadius: "100px", border: `1.5px solid ${form.category === c ? "#c8a97e" : "#2a2a2a"}`, background: form.category === c ? "#c8a97e22" : "#1a1a1a", color: form.category === c ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
                    {c}
                  </button>
                ))}
              </div>
              <ErrorMsg field="category" />
            </div>

            {/* Condition */}
            {(listingType === "product" || listingType === "rent") && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Condition</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["Excellent", "Good", "Fair"].map(c => (
                    <button key={c} onClick={() => update("condition", c)}
                      style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1.5px solid ${form.condition === c ? "#c8a97e" : "#2a2a2a"}`, background: form.condition === c ? "#c8a97e22" : "#1a1a1a", color: form.condition === c ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                      {c}
                    </button>
                  ))}
                </div>
                <ErrorMsg field="condition" />
              </div>
            )}

            {/* Description */}
            <div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Description</div>
              <textarea
                placeholder={listingType === "product" ? "Describe your item — condition details, what's included, why you're selling..." : listingType === "rent" ? "Describe the item — what's included, any rules for renters..." : "Describe your service — what's included, your experience, turnaround time..."}
                value={form.desc} onChange={e => update("desc", e.target.value)} rows={4}
                style={{ ...inputStyle("desc"), resize: "vertical" }} />
              <ErrorMsg field="desc" />
            </div>

            {/* Delivery options */}
            {listingType === "product" && (
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Delivery Options</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[["Pickup", "📍 Campus Pickup"], ["Rider", "🛵 Rider Delivery"], ["Shipping", "📦 Shipping"]].map(([v, l]) => (
                    <div key={v} onClick={() => toggleDelivery(v)}
                      style={{ flex: 1, minWidth: "120px", padding: "12px 10px", borderRadius: "10px", border: `1.5px solid ${form.delivery.includes(v) ? "#c8a97e" : "#2a2a2a"}`, background: form.delivery.includes(v) ? "#c8a97e22" : "#1a1a1a", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: form.delivery.includes(v) ? "#c8a97e" : "#888", textAlign: "center" }}>
                      {l}
                    </div>
                  ))}
                </div>
                <ErrorMsg field="delivery" />
              </div>
            )}

            {/* Accountability */}
            {listingType === "rent" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>Accountability Deposit</div>
                  <div onClick={() => update("accountability", !form.accountability)}
                    style={{ width: "40px", height: "22px", background: form.accountability ? "#c8a97e" : "#2a2a2a", borderRadius: "20px", position: "relative", cursor: "pointer", transition: "background .2s" }}>
                    <div style={{ position: "absolute", top: "3px", left: form.accountability ? "20px" : "3px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
                  </div>
                </div>
                {form.accountability && (
                  <div>
                    <input placeholder="Damage deposit % e.g. 50" type="number" value={form.accountabilityPct} onChange={e => update("accountabilityPct", e.target.value)} style={inputStyle("accountabilityPct")} />
                    <div style={{ fontSize: "12px", color: "#fcd34d", marginTop: "5px" }}>⚠️ Renter pays this % on top of rental fee. Refunded if returned undamaged.</div>
                    <ErrorMsg field="accountabilityPct" />
                  </div>
                )}
              </div>
            )}

            {/* Service type */}
            {listingType === "service" && (
              <>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Service Type</div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {[["online", "🌐 Online"], ["in-person", "📍 In-Person"]].map(([v, l]) => (
                      <button key={v} onClick={() => update("serviceDelivery", v)}
                        style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1.5px solid ${form.serviceDelivery === v ? "#c8a97e" : "#2a2a2a"}`, background: form.serviceDelivery === v ? "#c8a97e22" : "#1a1a1a", color: form.serviceDelivery === v ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>Enable Live Session</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>For tutoring, lessons or any service needing a video call</div>
                    </div>
                    <div onClick={() => update("liveSession", !form.liveSession)}
                      style={{ width: "40px", height: "22px", background: form.liveSession ? "#c8a97e" : "#2a2a2a", borderRadius: "20px", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: "3px", left: form.liveSession ? "20px" : "3px", width: "16px", height: "16px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
                    </div>
                  </div>
                </div>
                {!form.liveSession && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#555" }}>Contact details revealed to buyer only after payment.</div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>CONTACT METHOD</div>
                      <input placeholder="e.g. WhatsApp, Phone, Instagram, Email..." value={form.contactMethod} onChange={e => update("contactMethod", e.target.value)} style={inputStyle("contactMethod")} />
                      <ErrorMsg field="contactMethod" />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>CONTACT DETAIL</div>
                      <input placeholder="e.g. +233 24 567 8901, @yourhandle..." value={form.contactDetail} onChange={e => update("contactDetail", e.target.value)} style={inputStyle("contactDetail")} />
                      <ErrorMsg field="contactDetail" />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>NOTE FOR BUYER (optional)</div>
                      <input placeholder="e.g. Message me first with your requirements..." value={form.contactNote} onChange={e => update("contactNote", e.target.value)} style={inputStyle("contactNote")} />
                    </div>
                  </div>
                )}
              </>
            )}

            <button onClick={handlePreview}
              style={{ background: "#c8a97e", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit", marginTop: "4px" }}>
              Preview Listing →
            </button>

          </div>
        </div>
      </div>
    </>
  )

  // ── STEP 2 — Preview ─────────────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "600px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setStep(1)} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "18px" }}>←</button>
            <span style={{ fontSize: "17px", fontWeight: "700" }}>Preview Your Listing</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Card preview */}
          <div>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "12px" }}>How it looks on the marketplace</div>
            <div style={{ background: "#18181c", borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a2a", maxWidth: "240px" }}>
              <img src={form.photoPreview} alt="Preview" style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{form.category}</div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", marginBottom: "4px" }}>{form.title}</div>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>by {user?.name || "You"} · {form.condition || "N/A"}</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#c8a97e" }}>
                  {listingType === "rent" ? `₵${form.dailyRate}/day` : `₵${form.price}`}
                </div>
                <button style={{ marginTop: "8px", width: "100%", background: "#c8a97e", border: "none", padding: "7px", borderRadius: "7px", fontWeight: "700", fontSize: "12px" }}>
                  {listingType === "product" ? "Add to Cart" : listingType === "rent" ? "Rent This" : "Book Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "12px" }}>Full listing summary</div>
            <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", border: "1px solid #1e1e1e" }}>
              {[
                ["Type", listingType === "product" ? "🛒 Product for Sale" : listingType === "rent" ? "📦 Rental Item" : "🛠️ Service"],
                ["Title", form.title],
                listingType === "rent" ? ["Daily Rate", `₵${form.dailyRate}/day · Max ${form.maxDays} days`] : ["Price", `₵${form.price}`],
                ["Category", form.category],
                form.condition ? ["Condition", form.condition] : null,
                ["Description", form.desc],
                listingType === "product" ? ["Delivery", form.delivery.join(", ")] : null,
                listingType === "rent" && form.accountability ? ["Deposit", `${form.accountabilityPct}%`] : null,
                listingType === "service" ? ["Type", form.serviceDelivery === "online" ? "🌐 Online" : "📍 In-Person"] : null,
                listingType === "service" ? ["Live Session", form.liveSession ? "✅ Enabled" : "❌ Disabled"] : null,
                listingType === "service" && !form.liveSession ? ["Contact", `${form.contactMethod} · ${form.contactDetail}`] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                  <span style={{ color: "#555", minWidth: "120px", fontWeight: "600" }}>{label}</span>
                  <span style={{ color: "#f0ede8", flex: 1 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#6ee7b7" }}>
            💰 Silk Road GH takes 8% only when you make a sale. Listing is completely free.
          </div>

          {!user && (
            <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#fcd34d" }}>
              👤 You'll need a free account to publish. It only takes a minute.
            </div>
          )}

          {publishError && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>
              🚫 {publishError}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>← Edit</button>
            <button onClick={handlePublish} style={{ flex: 2, background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
              {publishing ? "⏳ Publishing..." : user ? "🚀 Publish Listing" : "🔐 Sign Up & Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── STEP 3 — Success ──────────────────────────────────────────────────────
  if (step === 3) return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "440px", border: "1px solid #1e1e1e", padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: "3px solid #c8a97e" }}>
          <img src={form.photoPreview} alt="Listing" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ fontSize: "48px" }}>🎉</div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#c8a97e" }}>Listing Live!</h2>
        <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.6" }}>
          <strong style={{ color: "#f0ede8" }}>{form.title}</strong> is now visible to students on Silk Road GH.
        </p>
        <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", width: "100%", fontSize: "13px", color: "#888" }}>
          <div>Type: <span style={{ color: "#c8a97e", fontWeight: "600" }}>{listingType === "product" ? "Product" : listingType === "rent" ? "Rental" : "Service"}</span></div>
          <div style={{ marginTop: "4px" }}>Price: <span style={{ color: "#c8a97e", fontWeight: "600" }}>{listingType === "rent" ? `₵${form.dailyRate}/day` : `₵${form.price}`}</span></div>
        </div>
        <button onClick={onClose} style={{ background: "#c8a97e", border: "none", padding: "13px 28px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit", width: "100%" }}>
          Back to Marketplace
        </button>
      </div>
    </div>
  )
}