import { useState } from "react"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const STEPS = ["Location", "Confirm Order", "Payment", "Track Delivery"]

const SILK_ROAD_MOMO = "0543883608"
const SILK_ROAD_MOMO_NAME = "Silk Road GH"

export default function Checkout({ cart, rate, onClose, initialOrder, siteSettings }) {
  const paymentMode = siteSettings?.paymentMode || "manual"
  const deliveryFee = siteSettings?.deliveryFee ?? 10

  // ── Hydrate all state from initialOrder when reopening ─────────────────────
  const [step, setStep] = useState(initialOrder ? 3 : 0)
  const [orderId] = useState(initialOrder?.id || generateOrderId())
  const [location, setLocation] = useState(initialOrder?.location || null)
  const [locLoading, setLocLoading] = useState(false)
  const [locBlocked, setLocBlocked] = useState(false)
  const [locError, setLocError] = useState(null)
  const [manualLocation, setManualLocation] = useState(initialOrder?.manualLocation || "")
  const [landmark, setLandmark] = useState(initialOrder?.landmark || "")
  const [extraInfo, setExtraInfo] = useState(initialOrder?.extraInfo || "")
  const [contactInfo, setContactInfo] = useState(initialOrder?.contactInfo || "")
  const [deliveryMethod, setDeliveryMethod] = useState(initialOrder?.deliveryMethod || "pickup")
  const [delivered, setDelivered] = useState(initialOrder?.delivered ?? null)
  const [paymentRef, setPaymentRef] = useState(initialOrder?.paymentRef || null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Manual mode
  const [payerName, setPayerName] = useState(initialOrder?.payerName || "")
  const [payerPhone, setPayerPhone] = useState(initialOrder?.payerPhone || "")

  // Paystack
  const [paystackLoading, setPaystackLoading] = useState(false)

  // Promo
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState(
    initialOrder?.promoCode
      ? { code: initialOrder.promoCode, type: "percentage", value: 0 }
      : null
  )
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState("")
  const [promoSuccess, setPromoSuccess] = useState("")

  const subtotal = initialOrder?.subtotal
    || cart.reduce((sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty, 0)

  const getDiscount = () => {
    if (!appliedPromo) return initialOrder?.discount || 0
    if (appliedPromo.type === "percentage") return Math.round(subtotal * appliedPromo.value / 100)
    if (appliedPromo.type === "fixed") return Math.min(appliedPromo.value, subtotal)
    if (appliedPromo.type === "free_delivery") return deliveryFee
    return 0
  }

  const discount = getDiscount()
  const deliveryCharge = deliveryMethod === "rider"
    ? (appliedPromo?.type === "free_delivery" ? 0 : deliveryFee)
    : 0
  const total = initialOrder?.total
    || Math.max(0, subtotal - (appliedPromo?.type !== "free_delivery" ? discount : 0) + deliveryCharge)
  const cut = Math.round(total * 0.08)

  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  // ── Promo ──────────────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) { setPromoError("Please enter a promo code."); return }
    setPromoLoading(true); setPromoError(""); setPromoSuccess("")
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
      } else {
        setPromoError(data.message || "Invalid or expired promo code.")
        setAppliedPromo(null)
      }
    } catch {
      const DEMO = [
        { code: "WELCOME10", type: "percentage", value: 10 },
        { code: "KNUST20",   type: "percentage", value: 20 },
        { code: "FREESHIP",  type: "free_delivery", value: 0 },
      ]
      const found = DEMO.find(p => p.code === promoInput.trim().toUpperCase())
      if (found) {
        setAppliedPromo(found)
        const disc = found.type === "percentage" ? `${found.value}% off` : "Free delivery"
        setPromoSuccess(`✅ Code applied — ${disc}!`)
      } else {
        setPromoError("Invalid or expired promo code.")
        setAppliedPromo(null)
      }
    }
    setPromoLoading(false)
  }

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoInput(""); setPromoError(""); setPromoSuccess("") }

  // ── Location ───────────────────────────────────────────────────────────────
  const detectLocation = () => {
    setLocLoading(true); setLocError(null); setLocBlocked(false)
    if (!navigator.geolocation) { setLocLoading(false); setLocError("geolocation_unsupported"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }); setLocLoading(false) },
      (err) => {
        setLocLoading(false)
        if (err.code === 1) { setLocBlocked(true); setLocError("blocked") }
        else if (err.code === 2) setLocError("unavailable")
        else setLocError("timeout")
      },
      { timeout: 10000 }
    )
  }

  const mapEmbedUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`
    : manualLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(manualLocation + " " + landmark)}&output=embed`
      : null

  const locErrors = {
    blocked:                 { icon: "🚫", title: "Location Blocked",      msg: "Your browser is blocking location access. Enter manually below." },
    unavailable:             { icon: "📡", title: "Location Unavailable",   msg: "Could not get your location. Try again or enter manually." },
    timeout:                 { icon: "⏱️", title: "Location Timed Out",     msg: "Taking too long. Enter manually below." },
    geolocation_unsupported: { icon: "⚠️", title: "GPS Not Supported",      msg: "Enter your location manually." },
    no_phone:                { icon: "📞", title: "Contact Missing",        msg: "Please provide a contact for the seller." },
    no_location:             { icon: "📍", title: "Location Missing",       msg: "Please auto-detect or enter your location." },
  }

  const ErrorBanner = ({ type }) => {
    const e = locErrors[type]
    if (!e) return null
    return (
      <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px" }}>
        <div style={{ fontWeight: "700", color: "#fcd34d", marginBottom: "6px", fontSize: "14px" }}>{e.icon} {e.title}</div>
        <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.6", margin: 0 }}>{e.msg}</p>
        {!["no_phone", "no_location"].includes(type) && (
          <button onClick={detectLocation} style={{ marginTop: "10px", background: "#78350f", border: "1px solid #92400e", color: "#fcd34d", padding: "9px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>↻ Try Again</button>
        )}
      </div>
    )
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // ── Persist order to backend ───────────────────────────────────────────────
  const persistOrder = async (ref, extra = {}) => {
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
            paymentMethod: paymentMode === "automated" ? "paystack" : "manual_momo",
            ...extra,
          }),
        })
      }
    } catch {}
  }

  // ── Build complete order snapshot (full persistence fix) ───────────────────
  const buildOrderSnapshot = (ref, extra = {}) => ({
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
    delivered: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    ...extra,
  })

  // ── Manual MoMo ────────────────────────────────────────────────────────────
  const handleSubmitManualPayment = async () => {
    if (!payerName.trim()) { alert("Please enter your name."); return }
    if (!payerPhone.trim()) { alert("Please enter your MoMo number."); return }
    setSubmitting(true)
    const ref = `MOMO-${orderId}`
    setPaymentRef(ref)
    await persistOrder(ref, { payerName, payerPhone })
    saveOrder(buildOrderSnapshot(ref, {
      payerName,
      payerPhone,
      paymentMethod: "manual_momo",
      status: "Pending Confirmation",
    }))
    setSubmitting(false)
    setStep(3)
  }

  // ── Paystack ───────────────────────────────────────────────────────────────
  const loadPaystackScript = () => new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return }
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })

  const handlePaystackPay = async () => {
    if (!PAYSTACK_KEY) { alert("Paystack key not configured."); return }
    setPaystackLoading(true)
    try {
      await loadPaystackScript()
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: `order-${orderId}@silkroadgh.com`,
        amount: Math.round(total * 100),
        currency: "GHS",
        ref: `PS-${orderId}-${Date.now()}`,
        metadata: { orderId, custom_fields: [{ display_name: "Order ID", variable_name: "order_id", value: orderId }] },
        callback: (response) => handlePaystackSuccess(response),
        onClose: () => setPaystackLoading(false),
      })
      handler.openIframe()
    } catch {
      alert("Could not load payment system. Check your connection and try again.")
      setPaystackLoading(false)
    }
  }

  const handlePaystackSuccess = async (response) => {
    const ref = response.reference
    setPaymentRef(ref)
    setSubmitting(true)
    await persistOrder(ref)
    saveOrder(buildOrderSnapshot(ref, {
      paymentMethod: "paystack",
      status: "Paid",
    }))
    setSubmitting(false)
    setPaystackLoading(false)
    setStep(3)
  }

  // ── Confirm / Cancel delivery ──────────────────────────────────────────────
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
    width: "100%", background: "#161616", border: "1px solid #1e1e1e", color: "#fff",
    padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>Checkout</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "8px" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", margin: "0 auto 4px", background: step >= i ? "#c8a97e" : "#161616", border: `2px solid ${step >= i ? "#c8a97e" : "#222"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: step >= i ? "#000" : "#444" }}>
                {step > i ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "10px", color: step === i ? "#c8a97e" : "#444", fontWeight: "600" }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px" }}>

          {/* ── STEP 0: Location ── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📍 Delivery Location</h2>

              <div>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>DELIVERY METHOD</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { id: "pickup", label: "📍 Campus Pickup", desc: "Free" },
                    { id: "rider",  label: "🛵 Rider Delivery", desc: `₵${deliveryFee}` },
                  ].map(opt => (
                    <div key={opt.id} onClick={() => setDeliveryMethod(opt.id)}
                      style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1.5px solid ${deliveryMethod === opt.id ? "#c8a97e" : "#222"}`, background: deliveryMethod === opt.id ? "#c8a97e0f" : "#161616", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: deliveryMethod === opt.id ? "#c8a97e" : "#888" }}>{opt.label}</div>
                      <div style={{ fontSize: "11px", color: deliveryMethod === opt.id ? "#c8a97e" : "#444", marginTop: "4px" }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={detectLocation}
                  style={{ flex: 1, background: location ? "#064e3b" : "#161616", border: `1px solid ${location ? "#065f46" : "#222"}`, color: location ? "#6ee7b7" : "#c8a97e", padding: "13px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                  {locLoading ? "⏳ Detecting..." : location ? "✅ Auto-Detected" : "📍 Auto-Detect"}
                </button>
                <button onClick={() => { setLocation(null); setLocBlocked(true); setLocError(null) }}
                  style={{ flex: 1, background: locBlocked ? "#1e3a5f" : "#161616", border: `1px solid ${locBlocked ? "#1d4ed8" : "#222"}`, color: locBlocked ? "#93c5fd" : "#888", padding: "13px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                  ✏️ Enter Manually
                </button>
              </div>

              {locError && <ErrorBanner type={locError} />}

              {locBlocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR LOCATION</div>
                    <textarea placeholder="e.g. Mensah Sarbah Hall, Room 204, UG Legon..." value={manualLocation} onChange={e => setManualLocation(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>NEAREST LANDMARK</div>
                    <input placeholder="e.g. Opposite the main library..." value={landmark} onChange={e => setLandmark(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              {mapEmbedUrl && (
                <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
                  <div style={{ background: "#161616", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e" }}>
                    <span style={{ fontSize: "12px", color: "#c8a97e", fontWeight: "700" }}>📍 LIVE MAP</span>
                    {location && <span style={{ fontSize: "11px", color: "#444" }}>{location.lat}, {location.lng}</span>}
                  </div>
                  <iframe src={mapEmbedUrl} width="100%" height="220" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Delivery Location" />
                </div>
              )}

              <div>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>EXTRA DETAILS FOR SELLER</div>
                <textarea placeholder="e.g. Call when you arrive, knock twice..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR CONTACT (for the seller)</div>
                <input placeholder="e.g. 0241234567, @yourinstagram..." value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={inputStyle} />
                <div style={{ fontSize: "11px", color: "#444", marginTop: "8px" }}>Shared with seller after payment.</div>
              </div>

              <button className="btn-gold" onClick={() => {
                if (!contactInfo.trim()) { setLocError("no_phone"); return }
                if (!location && !manualLocation.trim()) { setLocError("no_location"); return }
                setLocError(null); setStep(1)
              }} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 1: Confirm Order ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>✅ Confirm Your Order</h2>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {cart.map((item, i) => (
                  <div key={item._id || item.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#555" }}>Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>₵{((item.price || item.dailyRate || 0) * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Promo */}
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700" }}>🎟️ PROMO CODE</div>
                {!appliedPromo ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input placeholder="Enter promo code..." value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError("") }} onKeyDown={e => e.key === "Enter" && handleApplyPromo()} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={handleApplyPromo} disabled={promoLoading}
                      style={{ background: "#c8a97e", border: "none", padding: "12px 20px", borderRadius: "10px", fontWeight: "700", cursor: promoLoading ? "not-allowed" : "pointer", fontSize: "13px", whiteSpace: "nowrap", opacity: promoLoading ? 0.7 : 1, color: "#000", fontFamily: "inherit" }}>
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7" }}>🎟️ {appliedPromo.code}</div>
                      <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
                        {appliedPromo.type === "percentage" ? `${appliedPromo.value}% off` : appliedPromo.type === "fixed" ? `₵${appliedPromo.value} off` : "Free delivery"}
                      </div>
                    </div>
                    <button onClick={handleRemovePromo} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", minHeight: "auto" }}>Remove</button>
                  </div>
                )}
                {promoError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {promoError}</div>}
                {promoSuccess && <div style={{ fontSize: "12px", color: "#6ee7b7" }}>{promoSuccess}</div>}
              </div>

              {/* Delivery summary */}
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "9px" }}>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "4px" }}>DELIVERY DETAILS</div>
                <div>🛵 Method: <span style={{ color: "#c8a97e" }}>{deliveryMethod === "rider" ? `Rider Delivery (+₵${deliveryFee})` : "Campus Pickup (Free)"}</span></div>
                {location ? <div>📍 <span style={{ color: "#c8a97e" }}>{location.lat}, {location.lng}</span></div>
                  : <><div>📍 <span style={{ color: "#c8a97e" }}>{manualLocation}</span></div>{landmark && <div>🗺️ {landmark}</div>}</>}
                {extraInfo && <div>📝 {extraInfo}</div>}
                <div>📞 {contactInfo}</div>
              </div>

              {/* Totals */}
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                  <span>Subtotal</span><span>₵{subtotal.toLocaleString()}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
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
                    <span>🎟️ Free delivery</span><span>-₵{deliveryFee}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                  <span>Platform fee (8%)</span><span>₵{cut}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                  <span>Total</span><span>₵{total.toLocaleString()} (${toUSD(total)})</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button className="btn-gold" onClick={() => setStep(2)} style={{ flex: 2, padding: "13px", borderRadius: "12px", fontSize: "15px" }}>Proceed to Pay →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment — Manual MoMo ── */}
          {step === 2 && paymentMode === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📱 MTN Mobile Money</h2>

              <div style={{ background: "#ffd700", borderRadius: "16px", padding: "22px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#554400", marginBottom: "6px" }}>SEND THIS EXACT AMOUNT</div>
                <div style={{ fontSize: "36px", fontWeight: "800", color: "#1a1a00", letterSpacing: "-0.02em" }}>₵{total.toLocaleString()}</div>
                <div style={{ fontSize: "13px", color: "#554400", marginTop: "4px" }}>${toUSD(total)} USD</div>
              </div>

              <div style={{ background: "#161616", borderRadius: "16px", padding: "22px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", letterSpacing: ".06em" }}>SEND TO THIS NUMBER</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111", borderRadius: "12px", padding: "16px 18px" }}>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: ".03em" }}>{SILK_ROAD_MOMO}</div>
                    <div style={{ fontSize: "12px", color: "#444", marginTop: "4px" }}>{SILK_ROAD_MOMO_NAME}</div>
                  </div>
                  <button onClick={() => copyToClipboard(SILK_ROAD_MOMO)}
                    style={{ background: copied ? "#064e3b" : "#1a1a1a", border: `1px solid ${copied ? "#065f46" : "#2a2a2a"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "9px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
                <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#fcd34d", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontWeight: "700" }}>⚠️ Steps:</div>
                  <div>1. Dial *170# on your MTN phone</div>
                  <div>2. Choose Transfer Money → MoMo User</div>
                  <div>3. Enter number: <strong>{SILK_ROAD_MOMO}</strong></div>
                  <div>4. Enter amount: <strong>₵{total.toLocaleString()}</strong></div>
                  <div>5. Use Order ID as reference: <strong style={{ fontFamily: "monospace" }}>{orderId}</strong></div>
                  <div>6. Come back here and confirm below</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8" }}>After sending, confirm your payment:</div>
                <div>
                  <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR NAME</div>
                  <input placeholder="e.g. Kwame Asante" value={payerName} onChange={e => setPayerName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>MOMO NUMBER YOU SENT FROM</div>
                  <input placeholder="e.g. 0241234567" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#555", lineHeight: "1.7" }}>
                🔒 Once we confirm your payment, the seller will be notified. This usually takes under 5 minutes during business hours.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button onClick={handleSubmitManualPayment} disabled={submitting}
                  style={{ flex: 2, background: "#c8a97e", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", opacity: submitting ? 0.7 : 1, color: "#000", fontFamily: "inherit" }}>
                  {submitting ? "⏳ Submitting..." : "✅ I've Sent the Money"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment — Automated Paystack ── */}
          {step === 2 && paymentMode === "automated" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>📱 MTN Mobile Money</h2>
              <p style={{ color: "#888", fontSize: "14px" }}>Pay instantly via Paystack. You'll get a prompt on your phone.</p>

              <div style={{ background: "#ffd700", borderRadius: "16px", padding: "22px", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "32px" }}>⚡</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a00" }}>Automated Payment</div>
                  <div style={{ fontSize: "12px", color: "#554400" }}>Secured by Paystack · Instant escrow</div>
                </div>
              </div>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>🛵 Delivery</span><span>₵{deliveryCharge}</span></div>
                )}
                {appliedPromo && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#6ee7b7" }}>
                    <span>🎟️ {appliedPromo.code}</span>
                    <span>-₵{appliedPromo.type === "free_delivery" ? deliveryFee : discount}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #222", paddingTop: "8px" }}>
                  <span>Paying now</span>
                  <span style={{ color: "#c8a97e", fontWeight: "800", fontSize: "17px" }}>₵{total.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "12px" }}>💰 Funds held in escrow until you confirm delivery</div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button onClick={handlePaystackPay} disabled={paystackLoading}
                  style={{ flex: 2, background: "#ffd700", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: paystackLoading ? "not-allowed" : "pointer", fontSize: "15px", color: "#000", opacity: paystackLoading ? 0.7 : 1, fontFamily: "inherit" }}>
                  {paystackLoading ? "⏳ Loading..." : `Pay ₵${total.toLocaleString()} Now`}
                </button>
              </div>

              {submitting && <div style={{ textAlign: "center", fontSize: "13px", color: "#555" }}>⏳ Saving your order...</div>}
            </div>
          )}

          {/* ── STEP 3: Track Delivery ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>

              {delivered === null && (
                <>
                  <div style={{ fontSize: "56px" }}>
                    {initialOrder?.status === "Pending Confirmation" || paymentMode === "manual" ? "⏳" : "✅"}
                  </div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#c8a97e" }}>
                    {initialOrder?.status === "Pending Confirmation"
                      ? "Payment Submitted!"
                      : paymentMode === "automated" ? "Payment Successful!" : "Payment Submitted!"}
                  </h2>
                  <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.7" }}>
                    {paymentMode === "automated"
                      ? "Your money is held securely in escrow. Confirm delivery when your order arrives."
                      : "We're confirming your MoMo payment. Once confirmed, the seller will be notified."}
                  </p>

                  <div style={{ background: "#161616", border: "1px solid #c8a97e33", borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                    <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".06em" }}>ORDER DETAILS</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#555" }}>Total</span>
                      <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{total.toLocaleString()}</span>
                    </div>
                    {(payerPhone || initialOrder?.payerPhone) && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span style={{ color: "#555" }}>From number</span>
                          <span style={{ color: "#888" }}>{payerPhone || initialOrder?.payerPhone}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span style={{ color: "#555" }}>Name</span>
                          <span style={{ color: "#888" }}>{payerName || initialOrder?.payerName}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#555" }}>Delivery</span>
                      <span style={{ color: "#888" }}>{(deliveryMethod || initialOrder?.deliveryMethod) === "rider" ? "🛵 Rider Delivery" : "📍 Campus Pickup"}</span>
                    </div>
                    {(appliedPromo || initialOrder?.promoCode) && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#555" }}>Promo</span>
                        <span style={{ color: "#6ee7b7" }}>🎟️ {appliedPromo?.code || initialOrder?.promoCode}</span>
                      </div>
                    )}
                    {(paymentRef || initialOrder?.paymentRef) && (
                      <div style={{ fontSize: "11px", color: "#333", marginTop: "4px" }}>Ref: {paymentRef || initialOrder?.paymentRef}</div>
                    )}
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  {mapEmbedUrl && (
                    <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
                      <iframe src={mapEmbedUrl} width="100%" height="180" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Delivery Location" />
                    </div>
                  )}

                  <button onClick={handleConfirmDelivery}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "15px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
                    ✅ {paymentMode === "automated" ? "Confirm Delivery — Release Payment to Seller" : "I Received My Order"}
                  </button>

                  <button onClick={handleCancelDelivery}
                    style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "14px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                    ❌ Cancel — Refund My Money
                  </button>

                  <button onClick={onClose}
                    style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", padding: "8px", minHeight: "auto" }}>
                    Close — I'll check back later
                  </button>
                </>
              )}

              {delivered === true && (
                <>
                  <div style={{ fontSize: "56px" }}>🎉</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#6ee7b7" }}>Order Complete!</h2>
                  <p style={{ color: "#888", fontSize: "14px" }}>Payment released to seller. Silk Road kept ₵{cut} (8%) as platform fee.</p>
                  <button className="btn-gold" onClick={onClose} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Marketplace</button>
                </>
              )}

              {delivered === false && (
                <>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Order Cancelled</h2>
                  <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.7" }}>
                    Your refund of <strong style={{ color: "#fca5a5" }}>₵{total.toLocaleString()}</strong> will be processed within 24 hours.
                  </p>
                  <button className="btn-gold" onClick={onClose} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Marketplace</button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
