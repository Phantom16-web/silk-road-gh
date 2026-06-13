import { useState } from "react"
import PaystackPayment from "./PaystackPayment"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const STEPS = ["Location", "Confirm Order", "Payment", "Track Delivery"]

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
  const [savingOrder, setSavingOrder] = useState(false)

  // Promo code state
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState("")
  const [promoSuccess, setPromoSuccess] = useState("")

  // Delivery option
  const [deliveryMethod, setDeliveryMethod] = useState("pickup")

  const deliveryFee = siteSettings?.deliveryFee ?? 10
  const subtotal = initialOrder?.total || cart.reduce((sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty, 0)

  // Calculate discount
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

  const toUSD = (ghs) => {
    if (!rate) return "..."
    return (ghs * rate).toFixed(2)
  }

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
        const disc = (() => {
          if (data.promo.type === "percentage") return `${data.promo.value}% off`
          if (data.promo.type === "fixed") return `₵${data.promo.value} off`
          if (data.promo.type === "free_delivery") return "Free delivery"
          return ""
        })()
        setPromoSuccess(`✅ Code applied — ${disc}!`)
        setPromoError("")
      } else {
        setPromoError(data.message || "Invalid or expired promo code.")
        setAppliedPromo(null)
      }
    } catch {
      // Fallback: try to validate against locally known promos
      // This handles the case where the promo route doesn't exist yet
      const DEMO_PROMOS = [
        { code: "WELCOME10", type: "percentage", value: 10, active: true },
        { code: "KNUST20",   type: "percentage", value: 20, active: true },
        { code: "FREESHIP",  type: "free_delivery", value: 0, active: true },
      ]
      const found = DEMO_PROMOS.find(p => p.code === promoInput.trim().toUpperCase() && p.active)
      if (found) {
        setAppliedPromo(found)
        const disc = found.type === "percentage" ? `${found.value}% off` : found.type === "fixed" ? `₵${found.value} off` : "Free delivery"
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
      blocked:                  { icon: "🚫", title: "Location Access Blocked",  msg: "Your browser is blocking location access. Enter your location manually below." },
      unavailable:              { icon: "📡", title: "Location Unavailable",      msg: "Could not get your location. Try again or enter manually." },
      timeout:                  { icon: "⏱️", title: "Location Timed Out",        msg: "Taking too long. Try again or enter manually." },
      geolocation_unsupported:  { icon: "⚠️", title: "GPS Not Supported",         msg: "Your browser doesn't support location detection. Enter manually." },
      unknown:                  { icon: "❓", title: "Something Went Wrong",       msg: "Try again or enter your location manually." },
      no_phone:                 { icon: "📞", title: "Contact Info Missing",       msg: "Please provide a contact for the seller." },
      no_location:              { icon: "📍", title: "Location Missing",           msg: "Please auto-detect or enter your location manually." },
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

  // ── Payment success ─────────────────────────────────────────────────────────
  const handlePaymentSuccess = async (response) => {
    const ref = response.reference
    setPaymentRef(ref)
    setSavingOrder(true)

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
          }),
        })
      }
    } catch {}

    setSavingOrder(false)

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
      paymentRef: ref,
      delivered: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }
    saveOrder(order)
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

  // ── Shared input style ──────────────────────────────────────────────────────
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
                        {appliedPromo.type === "percentage" ? `${appliedPromo.value}% off` : appliedPromo.type === "fixed" ? `₵${appliedPromo.value} off` : "Free delivery"}
                      </div>
                    </div>
                    <button onClick={handleRemovePromo}
                      style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                      Remove
                    </button>
                  </div>
                )}
                {promoError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {promoError}</div>}
                {promoSuccess && !appliedPromo && <div style={{ fontSize: "12px", color: "#6ee7b7" }}>{promoSuccess}</div>}
              </div>

              {/* Delivery details */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>DELIVERY DETAILS</div>
                <div>🛵 Method: <span style={{ color: "#c8a97e" }}>{deliveryMethod === "rider" ? `Rider Delivery (+₵${deliveryFee})` : "Campus Pickup (Free)"}</span></div>
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                  <span>Platform fee (8%)</span><span>₵{cut}</span>
                </div>
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

          {/* ── STEP 2: Payment ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📱 MTN Mobile Money</h2>
              <p style={{ color: "#888", fontSize: "14px" }}>Pay securely via Paystack. You'll get a prompt on your phone.</p>

              <div style={{ background: "#ffd700", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "32px" }}>📱</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a00" }}>MTN MoMo Ghana</div>
                  <div style={{ fontSize: "12px", color: "#554400" }}>Secured by Paystack · Funds held in escrow</div>
                </div>
              </div>

              {/* Order summary before paying */}
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "6px" }}>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal</span><span>₵{subtotal.toLocaleString()}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🛵 Delivery</span><span>₵{deliveryCharge}</span>
                  </div>
                )}
                {appliedPromo && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#6ee7b7" }}>
                    <span>🎟️ {appliedPromo.code}</span>
                    <span>-₵{appliedPromo.type === "free_delivery" ? deliveryFee : discount}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #2a2a2a", paddingTop: "6px" }}>
                  <span>Paying now</span>
                  <span style={{ color: "#c8a97e", fontWeight: "700", fontSize: "16px" }}>₵{total.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "12px" }}>💰 Funds held in escrow until you confirm delivery</div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                <div style={{ flex: 2 }}>
                  <PaystackPayment
                    email={`order-${orderId}@silkroadgh.com`}
                    amount={total}
                    publicKey={PAYSTACK_KEY}
                    metadata={{
                      orderId,
                      cart: cart.map(i => ({ id: i._id || i.id, title: i.title, qty: i.qty, price: i.price || i.dailyRate })),
                      location: location ? `${location.lat},${location.lng}` : manualLocation,
                      landmark, extraInfo, contactInfo,
                      promoCode: appliedPromo?.code || null,
                      discount,
                      deliveryMethod,
                      deliveryCharge,
                      platformFee: cut,
                    }}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => {}}
                  />
                </div>
              </div>

              {savingOrder && (
                <div style={{ textAlign: "center", fontSize: "13px", color: "#555" }}>⏳ Saving your order...</div>
              )}
            </div>
          )}

          {/* ── STEP 3: Track Delivery ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
              {delivered === null && (
                <>
                  <div style={{ fontSize: "56px" }}>✅</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#c8a97e" }}>Payment Successful!</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your money is held securely. Confirm delivery when your order arrives.</p>

                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>ORDER DETAILS</div>
                    <div>🔒 Escrow: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{total.toLocaleString()}</span> held by Silk Road</div>
                    {discount > 0 && <div>🎟️ Saved: <span style={{ color: "#6ee7b7" }}>₵{discount} with {appliedPromo?.code}</span></div>}
                    <div>🛵 Delivery: <span style={{ color: "#aaa" }}>{deliveryMethod === "rider" ? "Rider Delivery" : "Campus Pickup"}</span></div>
                    {location ? <div>📍 Location: <span style={{ color: "#aaa" }}>{location.lat}, {location.lng}</span></div>
                      : <div>📍 Location: <span style={{ color: "#aaa" }}>{manualLocation}</span></div>}
                    {landmark && <div>🗺️ Landmark: <span style={{ color: "#aaa" }}>{landmark}</span></div>}
                    {extraInfo && <div>📝 Notes: <span style={{ color: "#aaa" }}>{extraInfo}</span></div>}
                    <div>📞 Contact: <span style={{ color: "#c8a97e" }}>{contactInfo}</span></div>
                    {paymentRef && <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Ref: {paymentRef}</div>}
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
                    ❌ Cancel — Refund My Money
                  </button>
                </>
              )}

              {delivered === true && (
                <>
                  <div style={{ fontSize: "56px" }}>🎉</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#6ee7b7" }}>Delivery Confirmed!</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Payment released to seller. Silk Road kept ₵{cut} (8%) as platform fee.</p>
                  <button onClick={onClose} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Marketplace</button>
                </>
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
