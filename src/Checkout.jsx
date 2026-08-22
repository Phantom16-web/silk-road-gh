import { useState, useEffect, useRef } from "react"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner, OtpPoller } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SILK_ROAD_MOMO      = "0543883608"
const SILK_ROAD_MOMO_NAME = "Silk Road GH"
const STEPS = ["Location", "Confirm Order", "Payment", "Track"]

function isMongoId(str) {
  return str && /^[a-f\d]{24}$/i.test(String(str))
}

export default function Checkout({ cart, rate, onClose, initialOrder, siteSettings }) {
  const [step, setStep]                     = useState(initialOrder ? 3 : 0)
  const [location, setLocation]             = useState(initialOrder?.location || null)
  const [locLoading, setLocLoading]         = useState(false)
  const [locBlocked, setLocBlocked]         = useState(false)
  const [locError, setLocError]             = useState(null)
  const [manualLocation, setManualLocation] = useState(initialOrder?.manualLocation || "")
  const [landmark, setLandmark]             = useState(initialOrder?.landmark || "")
  const [extraInfo, setExtraInfo]           = useState(initialOrder?.extraInfo || "")
  const [contactInfo, setContactInfo]       = useState(initialOrder?.contactInfo || "")
  const [payerName, setPayerName]           = useState(initialOrder?.payerName || "")
  const [payerPhone, setPayerPhone]         = useState(initialOrder?.payerPhone || "")
  const [delivered, setDelivered]           = useState(initialOrder?.delivered ?? null)
  const [paymentRef, setPaymentRef]         = useState(initialOrder?.paymentRef || null)
  const [orderId]                           = useState(initialOrder?.id || generateOrderId())
  const [saving, setSaving]                 = useState(false)
  const [copied, setCopied]                 = useState(false)

  // deliveryMethod — read from saved order or default to pickup
  const [deliveryMethod, setDeliveryMethod] = useState(
    initialOrder?.deliveryMethod || "pickup"
  )

  const [promoCode, setPromoCode]       = useState("")
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoError, setPromoError]     = useState("")
  const [promoLoading, setPromoLoading] = useState(false)

  // OTP state — populated when rider marks delivered
  const [deliveryOtp, setDeliveryOtp] = useState(null)

  const deliveryFee = siteSettings?.deliveryFee || 10
  const subtotal    = initialOrder?.subtotal || cart.reduce((s, i) => s + (i.price || i.dailyRate || 0) * i.qty, 0)
  const discount    = promoApplied?.type === "percentage"    ? Math.round(subtotal * promoApplied.value / 100)
                    : promoApplied?.type === "fixed"         ? promoApplied.value
                    : promoApplied?.type === "free_delivery" ? deliveryFee
                    : 0
  const total       = Math.max(0, subtotal + (deliveryMethod === "rider" && promoApplied?.type !== "free_delivery" ? deliveryFee : deliveryMethod === "rider" ? 0 : 0) - (promoApplied?.type !== "free_delivery" ? discount : 0))
  const platformFee = Math.round(subtotal * 0.08)
  const toUSD       = (ghs) => rate ? (ghs / rate).toFixed(2) : "..."

  const detectLocation = () => {
    setLocLoading(true); setLocError(null); setLocBlocked(false)
    if (!navigator.geolocation) { setLocLoading(false); setLocError("unsupported"); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })
        setLocLoading(false); setLocError(null); setLocBlocked(false)
      },
      err => {
        setLocLoading(false)
        if (err.code === 1) setLocBlocked(true)
        setLocError(err.code === 1 ? "blocked" : err.code === 2 ? "unavailable" : err.code === 3 ? "timeout" : "unknown")
      },
      { timeout: 10000 }
    )
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true); setPromoError(""); setPromoApplied(null)
    try {
      const res  = await fetch(`${API_URL}/promos/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.valid) setPromoApplied(data.promo || data)
      else setPromoError(data.message || "Invalid promo code.")
    } catch {
      const DEMOS = {
        WELCOME10: { type: "percentage",    value: 10 },
        FREEDEL:   { type: "free_delivery", value: 0  },
      }
      const found = DEMOS[promoCode.trim().toUpperCase()]
      if (found) setPromoApplied({ ...found, code: promoCode.trim().toUpperCase() })
      else setPromoError("Invalid promo code.")
    }
    setPromoLoading(false)
  }

  const handlePay = async () => {
    if (!payerName.trim())  { alert("Please enter your name."); return }
    if (!payerPhone.trim()) { alert("Please enter your MoMo number."); return }
    setSaving(true)

    const ref = `MOMO-${orderId}`

    // ── CRITICAL: always save deliveryMethod with the order ──
    const order = {
      id:             orderId,
      type:           "buy",
      cart,
      total,
      subtotal,
      platformFee,
      deliveryFee:    deliveryMethod === "rider" ? deliveryFee : 0,
      discount,
      promoCode:      promoApplied?.code || null,
      location,
      manualLocation,
      landmark,
      extraInfo,
      contactInfo,
      payerName,
      payerPhone,
      deliveryMethod, // ← always saved
      paymentMethod:  "manual_momo",
      paymentRef:     ref,
      status:         "Pending Confirmation",
      delivered:      null,
      createdAt:      Date.now(),
      expiresAt:      Date.now() + 48 * 60 * 60 * 1000,
    }
    saveOrder(order)

    try {
      const firstItem   = cart[0]
      const listingId   = firstItem?._id && isMongoId(firstItem._id) ? firstItem._id : null
      const rawSellerId = firstItem?.seller?._id || firstItem?.seller
      const sellerId    = rawSellerId && isMongoId(String(rawSellerId)) ? String(rawSellerId) : null

      if (listingId || sellerId) {
        const res = await fetch(`${API_URL}/orders`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            listingId,
            sellerId,
            localOrderId:  orderId,
            type:          "product",
            amount:        total,
            paystackRef:   ref,
            location:      location ? `${location.lat},${location.lng}` : manualLocation,
            landmark,
            extraInfo,
            contactInfo,
            payerName,
            payerPhone,
            promoCode:     promoApplied?.code || null,
            discount,
            deliveryMethod,
            paymentMethod: "manual_momo",
          }),
        })
        const data = await res.json()
        if (data.orderId || data._id) {
          updateOrder(orderId, { backendOrderId: data.orderId || data._id })
        }
      }
    } catch (err) { console.warn("Backend save failed:", err.message) }

    setSaving(false)
    setPaymentRef(ref)
    setStep(3)
  }

  const handleConfirmDelivery = () => {
    setDelivered(true)
    updateOrder(orderId, { delivered: true, status: "Completed" })
  }

  const handleCancelDelivery = () => {
    setDelivered(false)
    updateOrder(orderId, { delivered: false, status: "Cancelled" })
  }

  const copyMomo = () => {
    navigator.clipboard.writeText(SILK_ROAD_MOMO).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const mapEmbedUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`
    : manualLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(manualLocation + " " + landmark)}&output=embed`
      : null

  const inp = {
    width: "100%", background: "#161616", border: "1px solid #1e1e1e",
    color: "#fff", padding: "12px 16px", borderRadius: "10px",
    fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "540px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>
            {step === 0 ? "📍 Your Location" : step === 1 ? "✅ Confirm Order" : step === 2 ? "💳 Payment" : "📦 Track Order"}
          </span>
          {step < 3 && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
          )}
        </div>

        {/* Steps */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "4px" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", margin: "0 auto 4px", background: step >= i ? "#c8a97e" : "#1a1a1a", border: `2px solid ${step >= i ? "#c8a97e" : "#222"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: step >= i ? "#000" : "#444" }}>
                {step > i ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "10px", color: step === i ? "#c8a97e" : "#444", fontWeight: step === i ? "700" : "400" }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ── STEP 0 — Location ── */}
          {step === 0 && (
            <>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={detectLocation}
                  style={{ flex: 1, background: location ? "#064e3b" : "#161616", border: `1px solid ${location ? "#065f46" : "#1e1e1e"}`, color: location ? "#6ee7b7" : "#c8a97e", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
                  {locLoading ? "⏳ Detecting..." : location ? "✅ GPS Detected" : "📍 Auto-Detect GPS"}
                </button>
                <button onClick={() => { setLocation(null); setLocBlocked(true); setLocError(null) }}
                  style={{ flex: 1, background: locBlocked ? "#1e3a5f" : "#161616", border: `1px solid ${locBlocked ? "#1d4ed8" : "#1e1e1e"}`, color: locBlocked ? "#93c5fd" : "#888", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
                  ✏️ Enter Manually
                </button>
              </div>

              {locError && locError !== "blocked" && (
                <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fcd34d" }}>
                  ⚠️ {locError === "unavailable" ? "Could not get location. Enter manually."
                      : locError === "timeout"     ? "Timed out. Enter manually."
                      : locError === "unsupported" ? "GPS not supported. Enter manually."
                      : "Could not get location. Enter manually."}
                </div>
              )}

              {locBlocked && (
                <>
                  <div>
                    <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR LOCATION</div>
                    <textarea placeholder="e.g. Mensah Sarbah Hall, Room 204, University of Ghana, Legon" value={manualLocation} onChange={e => setManualLocation(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>NEAREST LANDMARK</div>
                    <input placeholder="e.g. Opposite the main library" value={landmark} onChange={e => setLandmark(e.target.value)} style={inp} />
                  </div>
                </>
              )}

              {mapEmbedUrl && (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
                  <div style={{ background: "#161616", padding: "8px 14px", borderBottom: "1px solid #1e1e1e" }}>
                    <span style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700" }}>📍 YOUR LOCATION</span>
                  </div>
                  <iframe src={mapEmbedUrl} width="100%" height="200" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Location" />
                </div>
              )}

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>DELIVERY METHOD</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["pickup", "📍 Pickup (Free)"], ["rider", `🛵 Rider (₵${siteSettings?.deliveryFee || 10})`]].map(([val, label]) => (
                    <button key={val} onClick={() => setDeliveryMethod(val)}
                      style={{ flex: 1, background: deliveryMethod === val ? "#c8a97e18" : "#161616", border: `1.5px solid ${deliveryMethod === val ? "#c8a97e" : "#1e1e1e"}`, color: deliveryMethod === val ? "#c8a97e" : "#888", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>EXTRA DETAILS FOR SELLER</div>
                <textarea placeholder="e.g. Call when you arrive, third floor..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} rows={2} style={{ ...inp, resize: "none" }} />
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR CONTACT (for seller)</div>
                <input placeholder="Phone or Instagram the seller can reach you on" value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={inp} />
              </div>

              <button className="btn-gold" onClick={() => {
                if (!location && !manualLocation.trim()) { setLocError("blocked"); setLocBlocked(true); return }
                setLocError(null); setStep(1)
              }} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                Continue →
              </button>
            </>
          )}

          {/* ── STEP 1 — Confirm ── */}
          {step === 1 && (
            <>
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>ORDER SUMMARY</div>
                {cart.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8" }}>{item.title}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>₵{((item.price || item.dailyRate || 0) * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>PROMO CODE</div>
                {promoApplied ? (
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7" }}>🎟️ {promoApplied.code}</div>
                      <div style={{ fontSize: "12px", color: "#555" }}>Saving ₵{discount}</div>
                    </div>
                    <button onClick={() => { setPromoApplied(null); setPromoCode("") }} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", minHeight: "auto" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input placeholder="Enter promo code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                      style={{ ...inp, flex: 1, fontFamily: "monospace" }} />
                    <button onClick={handleApplyPromo} disabled={promoLoading}
                      style={{ background: "#c8a97e", border: "none", padding: "12px 18px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", color: "#000", fontFamily: "inherit" }}>
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {promoError && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "6px" }}>⚠️ {promoError}</div>}
              </div>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                  <span>Subtotal</span><span>₵{subtotal.toLocaleString()}</span>
                </div>
                {deliveryMethod === "rider" && promoApplied?.type !== "free_delivery" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                    <span>Rider delivery</span><span>₵{deliveryFee}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6ee7b7" }}>
                    <span>🎟️ Promo discount</span><span>−₵{discount}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px" }}>
                  <span>Total</span>
                  <span>₵{total.toLocaleString()} <span style={{ fontSize: "12px", color: "#333", fontWeight: "400" }}>(${toUSD(total)})</span></span>
                </div>
              </div>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "14px", fontSize: "13px", color: "#666", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "11px", color: "#444", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>DELIVERY DETAILS</div>
                {location ? <div>📍 GPS: <span style={{ color: "#888" }}>{location.lat}, {location.lng}</span></div> : <div>📍 <span style={{ color: "#888" }}>{manualLocation}</span></div>}
                {landmark  && <div>🗺️ <span style={{ color: "#888" }}>{landmark}</span></div>}
                <div>🚚 Method: <span style={{ color: "#888" }}>{deliveryMethod === "rider" ? "Rider delivery" : "Campus pickup (free)"}</span></div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button className="btn-gold" onClick={() => setStep(2)} style={{ flex: 2, padding: "13px", borderRadius: "12px", fontSize: "15px" }}>
                  Proceed to Payment →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2 — Payment ── */}
          {step === 2 && (
            <>
              <div style={{ background: "#ffd700", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#554400", marginBottom: "6px" }}>SEND THIS EXACT AMOUNT VIA MTN MOMO</div>
                <div style={{ fontSize: "40px", fontWeight: "900", color: "#1a1a00", letterSpacing: "-0.03em" }}>₵{total.toLocaleString()}</div>
                <div style={{ fontSize: "13px", color: "#554400", marginTop: "4px" }}>${toUSD(total)} USD</div>
              </div>

              <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#fcd34d", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "14px" }}>⚠️ How to pay:</div>
                <div>1. Dial <strong>*170#</strong> → Send Money → MoMo User</div>
                <div>2. Enter number: <strong style={{ fontSize: "15px" }}>{SILK_ROAD_MOMO}</strong> ({SILK_ROAD_MOMO_NAME})</div>
                <div>3. Amount: <strong>₵{total}</strong></div>
                <div>4. Reference: <strong style={{ fontFamily: "monospace" }}>{orderId}</strong></div>
                <div>5. Fill in your name and number below, then confirm</div>
              </div>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: ".04em" }}>{SILK_ROAD_MOMO}</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>{SILK_ROAD_MOMO_NAME}</div>
                </div>
                <button onClick={copyMomo}
                  style={{ background: copied ? "#064e3b" : "#1a1a1a", border: `1px solid ${copied ? "#065f46" : "#222"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit" }}>
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR NAME (as paid on MoMo)</div>
                <input placeholder="Full name used on MoMo" value={payerName} onChange={e => setPayerName(e.target.value)} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR MOMO NUMBER</div>
                <input placeholder="e.g. 0241234567" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} style={inp} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button onClick={handlePay} disabled={saving}
                  style={{ flex: 2, background: "#c8a97e", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", fontSize: "15px", color: "#000", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
                  {saving ? "⏳ Saving..." : "✅ I've Sent the Money"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3 — Track ── */}
          {step === 3 && (
            <>
              {delivered === null && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "10px" }}>✅</div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", marginBottom: "8px" }}>Payment Submitted!</h3>
                    <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>
                      Your order is with the seller. {deliveryMethod === "rider" ? "A rider will be assigned to deliver your package." : "Contact the seller to arrange pickup."}
                    </p>
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#666", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cart.length > 0 && <div>📦 <span style={{ color: "#c8a97e", fontWeight: "700" }}>{cart.map(i => i.title).join(", ")}</span></div>}
                    <div>💰 Total: <span style={{ color: "#aaa" }}>₵{total.toLocaleString()} (${toUSD(total)})</span></div>
                    {location ? <div>📍 GPS: <span style={{ color: "#aaa" }}>{location.lat}, {location.lng}</span></div> : <div>📍 <span style={{ color: "#aaa" }}>{manualLocation}</span></div>}
                    {landmark  && <div>🗺️ {landmark}</div>}
                    {extraInfo && <div>📝 {extraInfo}</div>}
                    <div>📞 Seller contact: <span style={{ color: "#c8a97e" }}>{contactInfo || payerPhone}</span></div>
                    {paymentRef && <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace", marginTop: "4px" }}>Ref: {paymentRef}</div>}
                    <div style={{ marginTop: "4px" }}>🚚 <span style={{ color: "#aaa" }}>{deliveryMethod === "rider" ? "Rider delivery" : "Campus pickup"}</span></div>
                  </div>

                  {/* ── OTP SECTION — only for rider deliveries ── */}
                  {deliveryMethod === "rider" ? (
                    <>
                      {/* OtpPoller polls every 5s — sets deliveryOtp when rider marks delivered */}
                      <OtpPoller
                        orderId={orderId}
                        deliveryMethod={deliveryMethod}
                        onOtpReceived={setDeliveryOtp}
                      />

                      {deliveryOtp ? (
                        /* ── OTP received — show big gold digits ── */
                        <div style={{ background: "#064e3b18", border: "2px solid #065f46", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: "28px" }}>🚪</div>
                          <div>
                            <div style={{ fontSize: "15px", fontWeight: "700", color: "#6ee7b7", marginBottom: "6px" }}>Your Package Has Arrived!</div>
                            <div style={{ fontSize: "13px", color: "#888" }}>Read this 6-digit code to the rider to confirm delivery</div>
                          </div>
                          <div style={{ fontSize: "52px", fontWeight: "900", color: "#c8a97e", fontFamily: "monospace", letterSpacing: ".2em", background: "#161616", borderRadius: "14px", padding: "20px 12px", border: "2px solid #c8a97e44" }}>
                            {deliveryOtp.otp}
                          </div>
                          <div style={{ fontSize: "12px", color: "#555" }}>
                            ⏰ Expires at {new Date(deliveryOtp.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                            ⚠️ Only share this with the person delivering your package. Once they enter it, your order is marked complete.
                          </div>
                        </div>
                      ) : (
                        /* ── Waiting for rider ── */
                        <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8a97e", flexShrink: 0 }} />
                            <div style={{ fontSize: "13px", color: "#888" }}>Waiting for rider to deliver...</div>
                          </div>
                          <div style={{ fontSize: "12px", color: "#444", lineHeight: "1.7" }}>
                            Keep this screen open. When the rider arrives and marks your package delivered, a 6-digit OTP will appear here automatically. Read it to the rider to complete the delivery.
                          </div>
                        </div>
                      )}

                      {/* Cancel only — no "I've Received" button for rider orders */}
                      <button onClick={handleCancelDelivery}
                        style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                        ❌ Cancel Order — Refund Me
                      </button>
                    </>
                  ) : (
                    /* ── Pickup delivery — show confirm button ── */
                    <>
                      <button onClick={handleConfirmDelivery}
                        style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "15px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
                        ✅ I've Received My Order — Release Payment
                      </button>
                      <button onClick={handleCancelDelivery}
                        style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                        ❌ Cancel — Refund Me
                      </button>
                    </>
                  )}

                  {mapEmbedUrl && (
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
                      <iframe src={mapEmbedUrl} width="100%" height="160" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Location" />
                    </div>
                  )}
                </>
              )}

              {delivered === true && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>🎉</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#6ee7b7" }}>Order Complete!</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Payment released to seller. Silk Road kept ₵{platformFee} (8%) as platform fee.</p>
                  <button className="btn-gold" onClick={onClose} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Marketplace</button>
                </div>
              )}

              {delivered === false && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Order Cancelled</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your refund of ₵{total.toLocaleString()} will be processed within 24 hours to your MTN MoMo.</p>
                  <button className="btn-gold" onClick={onClose} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Marketplace</button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
