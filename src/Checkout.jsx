import { useState } from "react"
import PaystackPayment from "./PaystackPayment"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const STEPS = ["Location", "Confirm Order", "Payment", "Track Delivery"]
// ── Rating + Report Component ─────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const stars = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(star => {
        const full = (hovered ?? value) >= star
        const half = (hovered ?? value) >= star - 0.5 && (hovered ?? value) < star
        return (
          <div key={star} style={{ position: "relative", width: "36px", height: "36px", cursor: "pointer" }}>
            {/* Empty star */}
            <span style={{ fontSize: "32px", color: "#333", position: "absolute" }}>☆</span>
            {/* Half fill */}
            {half && (
              <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute", overflow: "hidden", width: "50%" }}>★</span>
            )}
            {/* Full fill */}
            {full && (
              <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute" }}>★</span>
            )}
            {/* Half star hit zone */}
            <div
              style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%" }}
              onMouseEnter={() => setHovered(star - 0.5)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(star - 0.5)}
            />
            {/* Full star hit zone */}
            <div
              style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%" }}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(star)}
            />
          </div>
        )
      })}
      <span style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e", marginLeft: "8px" }}>
        {(hovered ?? value) > 0 ? (hovered ?? value) : ""}
      </span>
    </div>
  )
}

const REPORT_REASONS = [
  "Item not as described",
  "Never delivered",
  "Rude or threatening behaviour",
  "Fake listing",
  "Item was damaged",
  "Wrong item sent",
  "Other",
]

function RatingAndReport({ orderId, sellerName, onClose }) {
  const [rating, setRating] = useState(0)
  const [rated, setRated] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportError, setReportError] = useState("")

  // Load existing rating if any
  useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}")
      if (saved[orderId]) {
        setRating(saved[orderId])
        setRated(true)
      }
    } catch {}
  })

  const handleRate = () => {
    if (rating === 0) return
    const saved = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}")
    saved[orderId] = rating
    localStorage.setItem("silkroad_ratings", JSON.stringify(saved))
    setRated(true)
  }

  const handleChangeRating = () => {
    setRated(false)
  }

  const handleReport = () => {
    if (!reportReason) { setReportError("Please select a reason."); return }
    // In real app this would POST to backend complaints
    const reports = JSON.parse(localStorage.getItem("silkroad_reports") || "[]")
    reports.push({ orderId, sellerName, reason: reportReason, date: new Date().toISOString() })
    localStorage.setItem("silkroad_reports", JSON.stringify(reports))
    setReportSubmitted(true)
  }

  if (reportSubmitted) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
      <div style={{ fontSize: "48px" }}>📋</div>
      <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#f0ede8" }}>Report Submitted</h3>
      <p style={{ fontSize: "14px", color: "#888" }}>Our team will review your report and get back to you. Thank you for helping keep Silk Road GH safe.</p>
      <button onClick={onClose} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Marketplace</button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Success banner */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎉</div>
        <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Delivery Confirmed!</h3>
        <p style={{ fontSize: "13px", color: "#888" }}>Payment has been released to {sellerName}.</p>
      </div>

      {/* Rating */}
      {!showReport && (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>⭐ Rate {sellerName}</div>

          {!rated ? (
            <>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <div style={{ fontSize: "12px", color: "#c8a97e" }}>
                  {rating <= 1 ? "Very poor" : rating <= 2 ? "Poor" : rating <= 3 ? "Average" : rating <= 4 ? "Good" : "Excellent!"}
                </div>
              )}
              <button
                onClick={handleRate}
                disabled={rating === 0}
                style={{ background: rating > 0 ? "#c8a97e" : "#1e1e1e", border: `1px solid ${rating > 0 ? "#c8a97e" : "#333"}`, color: rating > 0 ? "#000" : "#555", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: rating > 0 ? "pointer" : "not-allowed", fontSize: "14px", fontFamily: "inherit" }}>
                Submit Rating
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <StarRating value={rating} onChange={() => {}} />
              </div>
              <div style={{ fontSize: "13px", color: "#6ee7b7" }}>✅ Rating saved — you can change it anytime while your order ID is active.</div>
              <button onClick={handleChangeRating}
                style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                ✏️ Change Rating
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report seller */}
      {!showReport ? (
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose}
            style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
            Back to Marketplace
          </button>
          <button onClick={() => setShowReport(true)}
            style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            🚩 Report
          </button>
        </div>
      ) : (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", border: "1px solid #7f1d1d", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {sellerName}</div>
          <div style={{ fontSize: "13px", color: "#888" }}>Select the reason for your report:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {REPORT_REASONS.map(reason => (
              <div key={reason} onClick={() => setReportReason(reason)}
                style={{ padding: "10px 14px", borderRadius: "8px", background: reportReason === reason ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === reason ? "#991b1b" : "#2a2a2a"}`, cursor: "pointer", fontSize: "13px", color: reportReason === reason ? "#fca5a5" : "#888", fontWeight: reportReason === reason ? "600" : "400", transition: "all .15s" }}>
                {reason}
              </div>
            ))}
          </div>
          {reportError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {reportError}</div>}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { setShowReport(false); setReportError("") }}
              style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "11px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleReport}
              style={{ flex: 2, background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
              Submit Report
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
export default function Checkout({ cart, rate, onClose, initialOrder }) {
  const [step, setStep] = useState(initialOrder ? 3 : 0)
  const [location, setLocation] = useState(initialOrder?.location || null)
  const [locLoading, setLocLoading] = useState(false)
  const [locBlocked, setLocBlocked] = useState(false)
  const [locError, setLocError] = useState(null)
  const [manualLocation, setManualLocation] = useState(initialOrder?.manualLocation || "")
  const [landmark, setLandmark] = useState(initialOrder?.landmark || "")
  const [extraInfo, setExtraInfo] = useState(initialOrder?.extraInfo || "")
  const [contactInfo, setContactInfo] = useState(initialOrder?.contactInfo || "")
  const [email, setEmail] = useState("")
  const [delivered, setDelivered] = useState(initialOrder?.delivered || null)
  const [paymentRef, setPaymentRef] = useState(initialOrder?.paymentRef || null)
  const [orderId] = useState(initialOrder?.id || generateOrderId())

  const total = initialOrder?.total || cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cut = Math.round(total * 0.08)

  const toUSD = (ghs) => {
    if (!rate) return "..."
    return (ghs * rate).toFixed(2)
  }

  const detectLocation = () => {
    setLocLoading(true)
    setLocError(null)
    setLocBlocked(false)
    if (!navigator.geolocation) { setLocLoading(false); setLocError("geolocation_unsupported"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })
        setLocBlocked(false); setLocError(null); setLocLoading(false)
      },
      (err) => {
        setLocLoading(false)
        if (err.code === 1) { setLocBlocked(true); setLocError("blocked") }
        else if (err.code === 2) setLocError("unavailable")
        else if (err.code === 3) setLocError("timeout")
        else setLocError("unknown")
      },
      { timeout: 10000 }
    )
  }

  const mapEmbedUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`
    : manualLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(manualLocation + " " + landmark)}&output=embed`
      : null

  const ErrorBanner = ({ type }) => {
    const errors = {
      blocked: { icon: "🚫", title: "Location Access Blocked", msg: "Your browser or device is blocking Silk Road from accessing your location. No worries — describe your location in detail below." },
      unavailable: { icon: "📡", title: "Location Unavailable", msg: "Silk Road couldn't get your location right now. Try again or enter your location manually." },
      timeout: { icon: "⏱️", title: "Location Timed Out", msg: "It's taking too long to get your location. Try again or describe your location below." },
      geolocation_unsupported: { icon: "⚠️", title: "GPS Not Supported", msg: "Your browser doesn't support location detection. Please describe your location below." },
      unknown: { icon: "❓", title: "Something Went Wrong", msg: "Silk Road ran into an issue. Please try again or enter your location manually." },
      no_phone: { icon: "📞", title: "Contact Info Missing", msg: "Please provide a contact the seller can reach you on before continuing." },
      no_location: { icon: "📍", title: "Location Missing", msg: "Please either auto-detect your location or enter it manually before continuing." },
      no_email: { icon: "📧", title: "Email Missing", msg: "Please provide your email address so Paystack can send you a payment receipt." },
    }
    const e = errors[type]
    if (!e) return null
    return (
      <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "14px" }}>
        <div style={{ fontWeight: "700", color: "#fcd34d", marginBottom: "6px", fontSize: "14px" }}>{e.icon} {e.title}</div>
        <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6", margin: 0 }}>{e.msg}</p>
        {!["no_phone", "no_location", "no_email"].includes(type) && (
          <button onClick={detectLocation} style={{ marginTop: "10px", background: "#78350f", border: "1px solid #92400e", color: "#fcd34d", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
            ↻ Try Again
          </button>
        )}
      </div>
    )
  }

  const handlePaymentSuccess = (response) => {
    const ref = response.reference
    setPaymentRef(ref)

    // Save order to localStorage with 24hr expiry
    const order = {
      id: orderId,
      type: "buy",
      total,
      cart,
      location,
      manualLocation,
      landmark,
      extraInfo,
      contactInfo,
      paymentRef: ref,
      delivered: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }
    saveOrder(order)
    setStep(3)
  }

  const handleConfirmDelivery = () => {
    setDelivered(true)
    updateOrder(orderId, { delivered: true, expiresAt: Date.now() }) // expire immediately on confirm
  }

  const handleCancelDelivery = () => {
    setDelivered(false)
    updateOrder(orderId, { delivered: false, expiresAt: Date.now() })
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>Checkout</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", gap: "8px" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", margin: "0 auto 4px", background: step >= i ? "#c8a97e" : "#1e1e1e", border: `2px solid ${step >= i ? "#c8a97e" : "#333"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: step >= i ? "#000" : "#555" }}>
                {step > i ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "10px", color: step === i ? "#c8a97e" : "#555", fontWeight: "600" }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px" }}>

          {/* STEP 0 — Location */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📍 Delivery Location</h2>
              <p style={{ fontSize: "13px", color: "#666", marginTop: "-8px" }}>Choose how you want to share your location with the seller.</p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={detectLocation}
                  style={{ flex: 1, background: location ? "#064e3b" : "#1e1e1e", border: `1px solid ${location ? "#065f46" : "#333"}`, color: location ? "#6ee7b7" : "#c8a97e", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  {locLoading ? "⏳ Detecting..." : location ? "✅ Auto-Detected" : "📍 Auto-Detect"}
                </button>
                <button onClick={() => { setLocation(null); setLocBlocked(true); setLocError(null) }}
                  style={{ flex: 1, background: locBlocked ? "#1e3a5f" : "#1e1e1e", border: `1px solid ${locBlocked ? "#1d4ed8" : "#333"}`, color: locBlocked ? "#93c5fd" : "#aaa", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  ✏️ Enter Manually
                </button>
              </div>

              {locError && <ErrorBanner type={locError} />}

              {locBlocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR LOCATION</div>
                    <textarea placeholder="e.g. Mensah Sarbah Hall, Room 204, University of Ghana, Legon..." value={manualLocation} onChange={e => setManualLocation(e.target.value)} rows={3}
                      style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>NEAREST LANDMARK</div>
                    <input placeholder="e.g. Opposite the main library..." value={landmark} onChange={e => setLandmark(e.target.value)}
                      style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
              )}

              {mapEmbedUrl && (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a2a" }}>
                  <div style={{ background: "#1a1a1a", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2a2a" }}>
                    <span style={{ fontSize: "12px", color: "#c8a97e", fontWeight: "700" }}>📍 LIVE MAP</span>
                    {location && <span style={{ fontSize: "11px", color: "#555" }}>{location.lat}, {location.lng}</span>}
                  </div>
                  <iframe src={mapEmbedUrl} width="100%" height="220" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Delivery Location" />
                </div>
              )}

              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>EXTRA DETAILS FOR SELLER</div>
                <textarea placeholder="e.g. Call when you arrive, knock twice..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} rows={3}
                  style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR CONTACT (for the seller)</div>
                <input placeholder="e.g. 0241234567, @yourinstagram..." value={contactInfo} onChange={e => setContactInfo(e.target.value)}
                  style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: "11px", color: "#555", marginTop: "6px" }}>Shared with seller after payment.</div>
              </div>

              <button onClick={() => {
                if (!contactInfo.trim()) { setLocError("no_phone"); return }
                if (!location && !manualLocation.trim()) { setLocError("no_location"); return }
                setLocError(null); setStep(1)
              }} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 1 — Confirm Order */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>✅ Confirm Your Order</h2>

              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>₵{(item.price * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>DELIVERY DETAILS</div>
                {location ? <div>📍 <span style={{ color: "#c8a97e" }}>{location.lat}, {location.lng}</span></div>
                  : <><div>📍 <span style={{ color: "#c8a97e" }}>{manualLocation}</span></div>{landmark && <div>🗺️ <span style={{ color: "#aaa" }}>{landmark}</span></div>}</>}
                {extraInfo && <div>📝 <span style={{ color: "#aaa" }}>{extraInfo}</span></div>}
                <div>📞 <span style={{ color: "#aaa" }}>{contactInfo}</span></div>
              </div>

              {mapEmbedUrl && (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a2a" }}>
                  <iframe src={mapEmbedUrl} width="100%" height="160" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Delivery Location" />
                </div>
              )}

              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                  <span>Subtotal</span><span>₵{total.toLocaleString()} (${toUSD(total)})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                  <span>Platform fee (8%)</span><span>₵{cut} (${toUSD(cut)})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px", fontWeight: "700", color: "#c8a97e", borderTop: "1px solid #2a2a2a", paddingTop: "8px" }}>
                  <span>Total</span><span>₵{total.toLocaleString()} (${toUSD(total)})</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(0)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                <button onClick={() => setStep(2)} style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Proceed to Pay →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — Payment */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📱 MTN Mobile Money</h2>
              <p style={{ color: "#888", fontSize: "14px" }}>Pay securely via Paystack. You'll be prompted to complete payment on your phone.</p>

              <div style={{ background: "#ffd700", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "32px" }}>📱</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a00" }}>MTN MoMo Ghana</div>
                  <div style={{ fontSize: "12px", color: "#554400" }}>Secured by Paystack · Funds held in escrow</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR EMAIL</div>
                <input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: "11px", color: "#555", marginTop: "5px" }}>Required by Paystack to send your payment receipt.</div>
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#888" }}>
                <div>Amount: <span style={{ color: "#c8a97e", fontWeight: "700", fontSize: "16px" }}>₵{total.toLocaleString()}</span> <span style={{ color: "#555" }}>(${toUSD(total)})</span></div>
                <div style={{ marginTop: "6px", fontSize: "12px" }}>💰 Funds held securely in escrow until you confirm delivery</div>
              </div>

              {locError === "no_email" && <ErrorBanner type="no_email" />}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                <div style={{ flex: 2 }}>
                  {email.trim() && email.includes("@") ? (
                    <PaystackPayment
                      email={email}
                      amount={total}
                      publicKey={PAYSTACK_KEY}
                      metadata={{ cart, location, manualLocation, landmark, extraInfo, contactInfo, platformFee: cut }}
                      onSuccess={handlePaymentSuccess}
                      onClose={() => setLocError(null)}
                    />
                  ) : (
                    <button onClick={() => setLocError("no_email")}
                      style={{ width: "100%", background: "#ffd700", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#000" }}>
                      Pay ₵{total.toLocaleString()} with MoMo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Track Delivery */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
              {delivered === null && (
                <>
                  <div style={{ fontSize: "56px" }}>✅</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#c8a97e" }}>Payment Successful!</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your money is held securely. Confirm delivery when your order arrives.</p>

                  {/* Order ID Banner */}
                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>ORDER DETAILS</div>
                    <div>🔒 Escrow: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{total.toLocaleString()}</span> held by Silk Road</div>
                    {location ? <div>📍 Location: <span style={{ color: "#aaa" }}>{location.lat}, {location.lng}</span></div>
                      : <div>📍 Location: <span style={{ color: "#aaa" }}>{manualLocation}</span></div>}
                    {landmark && <div>🗺️ Landmark: <span style={{ color: "#aaa" }}>{landmark}</span></div>}
                    {extraInfo && <div>📝 Notes: <span style={{ color: "#aaa" }}>{extraInfo}</span></div>}
                    <div>📞 Contact shared with seller: <span style={{ color: "#c8a97e" }}>{contactInfo}</span></div>
                    {paymentRef && <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Paystack Ref: {paymentRef}</div>}
                  </div>

                  {mapEmbedUrl && (
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a2a" }}>
                      <iframe src={mapEmbedUrl} width="100%" height="180" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Delivery Location" />
                    </div>
                  )}

                  <button onClick={handleConfirmDelivery}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ✅ Confirm Delivery — Release Payment to Seller
                  </button>

                  <button onClick={handleCancelDelivery}
                    style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ❌ Cancel Delivery — Refund My Money
                  </button>
                </>
              )}

              {delivered === true && (
               <RatingAndReport
                orderId={orderId}
                sellerName={cart[0]?.seller || "the seller"}
                onClose={onClose}
               />
              )}

              {delivered === false && (
                <>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Delivery Cancelled</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your refund of ₵{total.toLocaleString()} has been submitted.</p>
                  <button onClick={onClose} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Marketplace</button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}