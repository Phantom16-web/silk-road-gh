import { useState } from "react"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const STEPS = ["Location", "Confirm Order", "Payment", "Track Delivery"]

// Your personal MoMo number — change this to yours
const SILK_ROAD_MOMO = "0543883608"
const SILK_ROAD_MOMO_NAME = "Silk Road GH"

export default function Checkout({ cart, rate, onClose, initialOrder, siteSettings }) {
  const [step, setStep] = useState(initialOrder ? 3 : 0)
  const [location, setLocation] = useState(initialOrder?.location || null)
  const [locLoading, setLocLoading] = useState(false)
  const [locBlocked, setLocBlocked] = useState(false)
  const [locError, setLocError] = useState(null)
  const [manualLocation, setManualLocation] = useState(initialOrder?.manualLocation || "")
  const [landmark, setLandmark] = useState(initialOrder?.landmark || "")
  const [extraInfo, setExtraInfo] = useState(initialOrder?.extraInfo || "")
  const [contactInfo, setContactInfo] = useState(initialOrder?.contactInfo || "")
  const [delivered, setDelivered] = useState(initialOrder?.delivered || null)
  const [paymentRef, setPaymentRef] = useState(initialOrder?.paymentRef || null)
  const [orderId] = useState(initialOrder?.id || generateOrderId())
  const [payerName, setPayerName] = useState("")
  const [payerPhone, setPayerPhone] = useState("")
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Promo code state
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState("")
  const [promoSuccess, setPromoSuccess] = useState("")

  // Delivery method
  const [deliveryMethod, setDeliveryMethod] = useState("pickup")

  const deliveryFee = siteSettings?.deliveryFee ?? 10
  const subtotal = initialOrder?.total || cart.reduce((sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty, 0)

  const getDiscount = () => {
    if (!appliedPromo) return 0
    if (appliedPromo.type === "percentage") return Math.round(subtotal * appliedPromo.value / 100)
    if (appliedPromo.type === "fixed") return Math.min(appliedPromo.value, subtotal)
    if (appliedPromo.type === "free_delivery") return deliveryFee
    return 0
  }

  const discount = getDiscount()
  const deliveryCharge = deliveryMethod === "rider"
    ? (appliedPromo?.type === "free_delivery" ? 0 : deliveryFee)
    : 0
  const total = Math.max(0, subtotal - (appliedPromo?.type !== "free_delivery" ? discount : 0) + deliveryCharge)
  const cut = Math.round(total * 0.08)

  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  // ── Promo validation ────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) { setPromoError("Please enter a promo code."); return }
    setPromoLoading(true)
    setPromoError("")
    setPromoSuccess("")
    try {
      const res = await fetch(`${API_URL}/promos/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.valid && data.promo) {
        setAppliedPromo(data.promo)
        const disc = data.promo.type === "percentage" ? `${data.promo.value}% off`
          : data.promo.type === "fixed" ? `₵${data.promo.value} off` : "Free delivery"
        setPromoSuccess(`✅ Code applied — ${disc}!`)
        setPromoError("")
      } else {
        setPromoError(data.message || "Invalid or expired promo code.")
        setAppliedPromo(null)
      }
    } catch {
      const DEMO_PROMOS = [
        { code: "WELCOME10", type: "percentage", value: 10, active: true },
        { code: "KNUST20",   type: "percentage", value: 20, active: true },
        { code: "FREESHIP",  type: "free_delivery", value: 0, active: true },
      ]
      const found = DEMO_PROMOS.find(p => p.code === promoInput.trim().toUpperCase() && p.active)
      if (found) {
        setAppliedPromo(found)
        const disc = found.type === "percentage" ? `${found.value}% off`
          : found.type === "fixed" ? `₵${found.value} off` : "Free delivery"
        setPromoSuccess(`✅ Code applied — ${disc}!`)
        setPromoError("")
      } else {
        setPromoError("Invalid or expired promo code.")
        setAppliedPromo(null)
      }
    }
    setPromoLoading(false)
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoInput("")
    setPromoError("")
    setPromoSuccess("")
  }

  // ── Location ────────────────────────────────────────────────────────────────
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
      blocked:                 { icon: "🚫", title: "Location Access Blocked",  msg: "Your browser is blocking location access. Enter your location manually below." },
      unavailable:             { icon: "📡", title: "Location Unavailable",      msg: "Could not get your location. Try again or enter manually." },
      timeout:                 { icon: "⏱️", title: "Location Timed Out",        msg: "Taking too long. Try again or enter manually." },
      geolocation_unsupported: { icon: "⚠️", title: "GPS Not Supported",         msg: "Your browser doesn't support location detection. Enter manually." },
      unknown:                 { icon: "❓", title: "Something Went Wrong",       msg: "Try again or enter your location manually." },
      no_phone:                { icon: "📞", title: "Contact Info Missing",       msg: "Please provide a contact for the seller." },
      no_location:             { icon: "📍", title: "Location Missing",           msg: "Please auto-detect or enter your location manually." },
    }
    const e = errors[type]
    if (!e) return null
    return (
      <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "14px" }}>
        <div style={{ fontWeight: "700", color: "#fcd34d", marginBottom: "6px", fontSize: "14px" }}>{e.icon} {e.title}</div>
        <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6", margin: 0 }}>{e.msg}</p>
        {!["no_phone", "no_location"].includes(type) && (
          <button onClick={detectLocation}
            style={{ marginTop: "10px", background: "#78350f", border: "1px solid #92400e", color: "#fcd34d", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
            ↻ Try Again
          </button>
        )}
      </div>
    )
  }

  // ── Copy to clipboard ───────────────────────────────────────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Submit manual payment ───────────────────────────────────────────────────
  const handleSubmitPayment = async () => {
    if (!payerName.trim()) return alert("Please enter your name.")
    if (!payerPhone.trim()) return alert("Please enter your MoMo number.")
    setSubmitting(true)

    const ref = `MOMO-${orderId}`
    setPaymentRef(ref)

    // Save order to backend
    try {
      const token = localStorage.getItem("silkroad_token")
      if (token && cart.length > 0) {
        const firstItem = cart[0]
        await fetch(`${API_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            listingId: firstItem._id || firstItem.id,
            sellerId: firstItem.seller?._id || firstItem.seller,
            type: "product",
            amount: total,
            paystackRef: ref,
            location: location ? `${location.lat},${location.lng}` : manualLocation,
            landmark,
            extraInfo,
            contactInfo,
            promoCode: appliedPromo?.code || null,
            discount,
            deliveryMethod,
            payerName,
            payerPhone,
            paymentMethod: "manual_momo",
          }),
        })
      }
    } catch {}

    // Save to localStorage
    const order = {
      id: orderId,
      type: "buy",
      total,
      subtotal,
      discount,
      promoCode: appliedPromo?.code || null,
      deliveryMethod,
      deliveryCharge,
      cart,
      location,
      manualLocation,
      landmark,
      extraInfo,
      contactInfo,
      payerName,
      payerPhone,
      paymentRef: ref,
      paymentMethod: "manual_momo",
      status: "Pending Confirmation",
      delivered: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    }
    saveOrder(order)
    setSubmitting(false)
    setPaymentSubmitted(true)
    setStep(3)
  }

  const handleConfirmDelivery = async () => {
    setDelivered(true)
    updateOrder(orderId, { delivered: true, expiresAt: Date.now() })
    try {
      const token = localStorage.getItem("silkroad_token")
      if (token && paymentRef) {
        await fetch(`${API_URL}/orders/confirm-by-ref`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paystackRef: paymentRef }),
        })
      }
    } catch {}
  }

  const handleCancelDelivery = () => {
    setDelivered(false)
    updateOrder(orderId, { delivered: false, expiresAt: Date.now() })
  }

  const inputStyle = {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff",
    padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
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

          {/* ── STEP 0: Location ── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📍 Delivery Location</h2>
              <p style={{ fontSize: "13px", color: "#666", marginTop: "-8px" }}>Share your location with the seller.</p>

              {/* Delivery method */}
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px" }}>DELIVERY METHOD</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { id: "pickup", label: "📍 Campus Pickup", desc: "Free" },
                    { id: "rider",  label: "🛵 Rider Delivery", desc: `₵${deliveryFee}` },
                  ].map(opt => (
                    <div key={opt.id} onClick={() => setDeliveryMethod(opt.id)}
                      style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1.5px solid ${deliveryMethod === opt.id ? "#c8a97e" : "#2a2a2a"}`, background: deliveryMethod === opt.id ? "#c8a97e11" : "#1a1a1a", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: deliveryMethod === opt.id ? "#c8a97e" : "#aaa" }}>{opt.label}</div>
                      <div style={{ fontSize: "11px", color: deliveryMethod === opt.id ? "#c8a97e" : "#555", marginTop: "4px" }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={detectLocation}
                  style={{ flex: 1, background: location ? "#064e3b" : "#1e1e1e", border: `1px solid ${location ? "#065f46" : "#333"}`, color: location ? "#6ee7b7" : "#c8a97e", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                  {locLoading ? "⏳ Detecting..." : location ? "✅ Auto-Detected" : "📍 Auto-Detect"}
                </button>
                <button onClick={() => { setLocation(null); setLocBlocked(true); setLocError(null) }}
                  style={{ flex: 1, background: locBlocked ? "#1e3a5f" : "#1e1e1e", border: `1px solid ${locBlocked ? "#1d4ed8" : "#333"}`, color: locBlocked ? "#93c5fd" : "#aaa", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                  ✏️ Enter Manually
                </button>
              </div>

              {locError && <ErrorBanner type={locError} />}

              {locBlocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR LOCATION</div>
                    <textarea placeholder="e.g. Mensah Sarbah Hall, Room 204, University of Ghana, Legon..." value={manualLocation} onChange={e => setManualLocation(e.target.value)} rows={3}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>NEAREST LANDMARK</div>
                    <input placeholder="e.g. Opposite the main library..." value={landmark} onChange={e => setLandmark(e.target.value)} style={inputStyle} />
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
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR CONTACT (for the seller)</div>
                <input placeholder="e.g. 0241234567, @yourinstagram..." value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={inputStyle} />
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

          {/* ── STEP 1: Confirm Order ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>✅ Confirm Your Order</h2>

              {/* Cart items */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {cart.map((item, i) => (
                  <div key={item._id || item.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>₵{((item.price || item.dailyRate || 0) * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>🎟️ PROMO CODE</div>
                {!appliedPromo ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      placeholder="Enter promo code..."
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError("") }}
                      onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={handleApplyPromo} disabled={promoLoading}
                      style={{ background: "#c8a97e", border: "none", padding: "12px 18px", borderRadius: "10px", fontWeight: "700", cursor: promoLoading ? "not-allowed" : "pointer", fontSize: "13px", whiteSpace: "nowrap", opacity: promoLoading ? 0.7 : 1 }}>
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#064e3b22", border: "1px solid #065f46", borderRadius: "8px", padding: "10px 14px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7" }}>🎟️ {appliedPromo.code}</div>
                      <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
                        {appliedPromo.type === "percentage" ? `${appliedPromo.value}% off`
                          : appliedPromo.type === "fixed" ? `₵${appliedPromo.value} off` : "Free delivery"}
                      </div>
                    </div>
                    <button onClick={handleRemovePromo}
                      style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                      Remove
                    </button>
                  </div>
                )}
                {promoError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {promoError}</div>}
              </div>

              {/* Delivery info */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>DELIVERY DETAILS</div>
                <div>🛵 Method: <span style={{ color: "#c8a97e" }}>{deliveryMethod === "rider" ? `Rider Delivery (+₵${deliveryFee})` : "Campus Pickup (Free)"}</span></div>
                {location ? <div>📍 <span style={{ color: "#c8a97e" }}>{location.lat}, {location.lng}</span></div>
                  : <><div>📍 <span style={{ color: "#c8a97e" }}>{manualLocation}</span></div>{landmark && <div>🗺️ <span style={{ color: "#aaa" }}>{landmark}</span></div>}</>}
                {extraInfo && <div>📝 <span style={{ color: "#aaa" }}>{extraInfo}</span></div>}
                <div>📞 <span style={{ color: "#aaa" }}>{contactInfo}</span></div>
              </div>

              {/* Order total */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                  <span>Subtotal</span><span>₵{subtotal.toLocaleString()}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                    <span>🛵 Rider delivery</span><span>₵{deliveryCharge}</span>
                  </div>
                )}
                {appliedPromo && discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6ee7b7" }}>
                    <span>🎟️ {appliedPromo.code} discount</span><span>-₵{discount}</span>
                  </div>
                )}
                {appliedPromo?.type === "free_delivery" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6ee7b7" }}>
                    <span>🎟️ {appliedPromo.code} — Free delivery</span><span>-₵{deliveryFee}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "700", color: "#c8a97e", borderTop: "1px solid #2a2a2a", paddingTop: "8px" }}>
                  <span>Total</span><span>₵{total.toLocaleString()} (${toUSD(total)})</span>
                </div>
                {appliedPromo && (
                  <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#6ee7b7" }}>
                    🎉 You're saving ₵{appliedPromo.type === "free_delivery" ? deliveryFee : discount} with code {appliedPromo.code}!
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(0)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                <button onClick={() => setStep(2)} style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Proceed to Pay →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Manual MoMo Payment ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📱 MTN Mobile Money</h2>

              {/* Amount to send */}
              <div style={{ background: "#ffd700", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#554400", marginBottom: "6px" }}>SEND THIS EXACT AMOUNT</div>
                <div style={{ fontSize: "36px", fontWeight: "800", color: "#1a1a00" }}>₵{total.toLocaleString()}</div>
                <div style={{ fontSize: "13px", color: "#554400", marginTop: "4px" }}>${toUSD(total)} USD</div>
              </div>

              {/* MoMo details */}
              <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", border: "1px solid #2a2a2a", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", letterSpacing: ".06em" }}>SEND TO THIS NUMBER</div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111", borderRadius: "10px", padding: "14px 16px" }}>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: ".04em" }}>{SILK_ROAD_MOMO}</div>
                    <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>{SILK_ROAD_MOMO_NAME}</div>
                  </div>
                  <button onClick={() => copyToClipboard(SILK_ROAD_MOMO)}
                    style={{ background: copied ? "#064e3b" : "#1e1e1e", border: `1px solid ${copied ? "#065f46" : "#333"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>

                <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fcd34d", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontWeight: "700" }}>⚠️ Important — before you send:</div>
                  <div>1. Dial *170# on your MTN phone</div>
                  <div>2. Choose Transfer Money → MoMo User</div>
                  <div>3. Enter number: <strong>{SILK_ROAD_MOMO}</strong></div>
                  <div>4. Enter amount: <strong>₵{total.toLocaleString()}</strong></div>
                  <div>5. Use your Order ID as reference: <strong style={{ fontFamily: "monospace" }}>{orderId}</strong></div>
                  <div>6. Come back here and fill in your details below</div>
                </div>
              </div>

              {/* Buyer confirmation form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8" }}>After sending, confirm your payment:</div>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR NAME</div>
                  <input placeholder="e.g. Kwame Asante" value={payerName} onChange={e => setPayerName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>MTN MOMO NUMBER YOU SENT FROM</div>
                  <input placeholder="e.g. 0241234567" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#666", lineHeight: "1.7" }}>
                🔒 Once we confirm your payment, your order will be processed and the seller will be notified. This usually takes under 5 minutes during business hours.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                <button onClick={handleSubmitPayment} disabled={submitting}
                  style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "⏳ Submitting..." : "✅ I've Sent the Money"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Track ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
              {delivered === null && (
                <>
                  <div style={{ fontSize: "56px" }}>⏳</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#c8a97e" }}>Payment Submitted!</h2>
                  <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.7" }}>
                    We're confirming your MoMo payment of <strong style={{ color: "#c8a97e" }}>₵{total.toLocaleString()}</strong>. Once confirmed, the seller will be notified immediately.
                  </p>

                  <div style={{ background: "#1a1a1a", border: "1px solid #c8a97e44", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".06em" }}>PAYMENT DETAILS</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Amount sent</span>
                      <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>From number</span>
                      <span style={{ color: "#aaa" }}>{payerPhone}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Name</span>
                      <span style={{ color: "#aaa" }}>{payerName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#666" }}>Delivery</span>
                      <span style={{ color: "#aaa" }}>{deliveryMethod === "rider" ? "🛵 Rider Delivery" : "📍 Campus Pickup"}</span>
                    </div>
                    {appliedPromo && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#666" }}>Promo</span>
                        <span style={{ color: "#6ee7b7" }}>🎟️ {appliedPromo.code} saved ₵{appliedPromo.type === "free_delivery" ? deliveryFee : discount}</span>
                      </div>
                    )}
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#fcd34d", lineHeight: "1.7", textAlign: "left" }}>
                    <div style={{ fontWeight: "700", marginBottom: "6px" }}>📋 What happens next:</div>
                    <div>1. We verify your MoMo payment (under 5 mins)</div>
                    <div>2. Seller is notified to prepare your order</div>
                    <div>3. You'll be contacted at <strong>{contactInfo}</strong></div>
                    <div>4. Confirm delivery below when it arrives</div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={handleConfirmDelivery}
                      style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                      ✅ I Received My Order
                    </button>
                    <button onClick={handleCancelDelivery}
                      style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                      ❌ Cancel & Refund
                    </button>
                  </div>

                  <button onClick={onClose}
                    style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", padding: "8px" }}>
                    Close — I'll check back later
                  </button>
                </>
              )}

              {delivered === true && (
                <>
                  <div style={{ fontSize: "56px" }}>🎉</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#6ee7b7" }}>Order Complete!</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Thank you for using Silk Road GH. Payment will be released to the seller.</p>
                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#666" }}>
                    💰 Platform fee: ₵{cut} (8%) · Seller receives: ₵{total - cut}
                  </div>
                  <button onClick={onClose} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Marketplace</button>
                </>
              )}

              {delivered === false && (
                <>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Order Cancelled</h2>
                  <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.7" }}>
                    Your refund of <strong style={{ color: "#fca5a5" }}>₵{total.toLocaleString()}</strong> will be sent back to <strong>{payerPhone}</strong> within 24 hours.
                  </p>
                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#666", lineHeight: "1.7" }}>
                    If you don't receive your refund within 24 hours, contact us on WhatsApp at {siteSettings?.contactPhone || "054 388 3608"}.
                  </div>
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
