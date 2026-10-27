import { useState, useEffect, useRef } from "react"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const API_URL        = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL     = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"
const STEPS          = ["Location", "Confirm Order", "Payment", "Track"]

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
  const [confirmedTotal, setConfirmedTotal] = useState(initialOrder?.total ?? null)
  const [checkoutId, setCheckoutId] = useState(initialOrder?.checkoutId || null)
  const [claimToken, setClaimToken] = useState(initialOrder?.checkoutClaimToken || null)
  const [paymentEvidence, setPaymentEvidence] = useState("")
  const [evidenceBusy, setEvidenceBusy] = useState(false)
  const [evidenceMessage, setEvidenceMessage] = useState("")
  const [checkoutEnvironment, setCheckoutEnvironment] = useState(null)
  const [groupPaymentStatus, setGroupPaymentStatus] = useState("pending")
  const [sellerOrders, setSellerOrders] = useState(initialOrder?.backendOrders || [])
  const [deliveryCodes, setDeliveryCodes] = useState({})
  const [deliveryBusy, setDeliveryBusy] = useState(null)
  const [deliveryError, setDeliveryError] = useState("")
    const [deliveryMethod, setDeliveryMethod] = useState(initialOrder?.deliveryMethod || "pickup")
  const [promoCode, setPromoCode]           = useState("")
  const [promoApplied, setPromoApplied]     = useState(null)
  const [promoError, setPromoError]         = useState("")
  const [promoLoading, setPromoLoading]     = useState(false)

  const [otp, setOtp]             = useState(null)
  const [otpExpiry, setOtpExpiry] = useState(null)
  const pollRef                   = useRef(null)
  const completionPollRef         = useRef(null)
  const socketRef                 = useRef(null)

  const deliveryFee = siteSettings?.deliveryFee || 10
  const subtotal    = initialOrder?.subtotal || cart.reduce((s, i) => s + (i.price || i.dailyRate || 0) * i.qty, 0)
  const discount    = promoApplied?.type === "percentage"    ? Math.round(subtotal * promoApplied.value / 100)
                    : promoApplied?.type === "fixed"         ? promoApplied.value
                    : promoApplied?.type === "free_delivery" ? deliveryFee : 0
  const total       = Math.max(0, subtotal + (deliveryMethod === "rider" && promoApplied?.type !== "free_delivery" ? deliveryFee : 0) - (promoApplied?.type !== "free_delivery" ? discount : 0))
  const platformFee = Math.round(subtotal * 0.08)

  // ── Single socket connection for the entire tracking phase ───────────────
  // Connects when buyer reaches step 3 with rider delivery
  // Stays connected until delivered=true (don't disconnect when OTP arrives)
  // Listens for both otp:SR-XXXXX and completed:SR-XXXXX
  useEffect(() => {
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null) {
      // Clean up socket if delivery is done or method changed
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    // Already connected — don't reconnect
    if (socketRef.current) return

    import("socket.io-client").then(({ io }) => {
      const s = io(SOCKET_URL, {
        autoConnect:          true,
        reconnection:         true,
        reconnectionDelay:    1000,
        reconnectionAttempts: Infinity,
        transports:           ["websocket", "polling"],
      })

      // OTP — rider marked delivered, backend generated OTP
      s.on(`otp:${orderId}`, (d) => {
        if (d?.otp) {
          setOtp(d.otp)
          setOtpExpiry(d.expiresAt)
          // Stop the OTP poll — we have it
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          // DO NOT disconnect here — we still need to receive completed:
        }
      })

      // Completion — rider entered OTP successfully, order done
      s.on(`completed:${orderId}`, () => {
        setDelivered(true)
        updateOrder(orderId, { delivered: true, status: "Completed" })
        // Clean up everything
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null }
        s.disconnect()
        socketRef.current = null
      })

      socketRef.current = s
    }).catch(() => {})

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [step, deliveryMethod, delivered, orderId])

  // ── OTP poll — backup for when socket misses ──────────────────────────────
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null || otp) return

    const poll = async () => {
      try {
        const res  = await fetch(`${API_URL}/deliveries/otp-for-order/${encodeURIComponent(orderId)}`)
        const data = await res.json()
        if (data.otp) {
          setOtp(data.otp)
          setOtpExpiry(data.expiresAt)
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {}
    }

    poll()
    pollRef.current = setInterval(poll, 5000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [step, deliveryMethod, delivered, otp, orderId])

  // ── Completion poll — backup after OTP received ───────────────────────────
  // Polls the delivery status every 5s to catch completion
  // in case the completed: socket event was missed
  useEffect(() => {
    if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null }
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null || !otp) return

    const poll = async () => {
      try {
        const res  = await fetch(`${API_URL}/deliveries/otp-for-order/${encodeURIComponent(orderId)}`)
        const data = await res.json()
        // If OTP is gone from the response but we had it, delivery completed
        if (data.deliveryId) {
          const dr   = await fetch(`${API_URL}/deliveries/${data.deliveryId}`)
          const ddata = await dr.json()
          if (ddata.status === "completed") {
            setDelivered(true)
            updateOrder(orderId, { delivered: true, status: "Completed" })
            clearInterval(completionPollRef.current)
            completionPollRef.current = null
          }
        }
      } catch {}
    }

    completionPollRef.current = setInterval(poll, 5000)
    return () => { if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null } }
  }, [step, deliveryMethod, delivered, otp, orderId])

  const detectLocation = () => {
    setLocLoading(true); setLocError(null); setLocBlocked(false)
    if (!navigator.geolocation) { setLocLoading(false); setLocError("unsupported"); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })
        setLocLoading(false)
      },
      err => {
        setLocLoading(false)
        if (err.code === 1) setLocBlocked(true)
        setLocError(err.code === 1 ? "blocked" : "unavailable")
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
    } catch { setPromoError("Could not validate code.") }
    setPromoLoading(false)
  }

  const handlePay = async () => {
    if (!payerName.trim())  { alert("Please enter your name."); return }
    if (!payerPhone.trim()) { alert("Please enter your contact number."); return }
    setSaving(true)

    const ref = `SR-${orderId}`
    const order = {
      id: orderId, type: "buy", cart, total, subtotal, platformFee,
      deliveryFee:   deliveryMethod === "rider" ? deliveryFee : 0,
      discount,
      promoCode:     promoApplied?.code || null,
      location, manualLocation, landmark, extraInfo,
      contactInfo, payerName, payerPhone,
      deliveryMethod,
      paymentMethod: "manual_verification",
      paymentRef:    ref,
      status:        "Pending Confirmation",
      delivered:     null,
      createdAt:     Date.now(),
      expiresAt:     Date.now() + 48 * 60 * 60 * 1000,
    }
    try {
      const items = cart.map(item => ({ listingId: item._id || item.id, quantity: Number(item.qty || 1) }))
      if (items.some(item => !isMongoId(item.listingId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
        throw new Error("Your cart contains an invalid listing or quantity.")
      }
      const res = await fetch(`${API_URL}/orders/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items, localOrderId: orderId,
          location: location ? `${location.lat},${location.lng}` : manualLocation,
          landmark, extraInfo, contactInfo, payerName, payerPhone,
          promoCode: promoApplied?.code || null,
          deliveryMethod,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Checkout failed (${res.status}).`)
      if (!data.checkoutId || !Array.isArray(data.orders) || !data.orders.length) {
        throw new Error("Server did not confirm all seller orders. Contact support before retrying.")
      }
      const serverTotal = Number(data.total)
      if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
        throw new Error("Server returned an invalid total. Do not send money.")
      }
      if (Math.abs(serverTotal - total) > 0.01) {
        const accepted = window.confirm(
          `The server calculated ₵${serverTotal.toFixed(2)}, but your cart displayed ₵${total.toFixed(2)}. ` +
          "No payment has been verified. Select OK only if you accept the corrected total; otherwise select Cancel and contact support."
        )
        if (!accepted) {
          // The group may already exist on the server. Preserve its claim token
          // and never silently create another group on a second click.
          setCheckoutId(data.checkoutId)
          setClaimToken(data.claimToken)
          setSellerOrders(data.orders)
          setPaymentRef(data.paymentReference)
          setConfirmedTotal(serverTotal)
          saveOrder({ ...order, total: serverTotal, checkoutId: data.checkoutId,
            checkoutClaimToken: data.claimToken, backendOrders: data.orders,
            backendOrderId: data.orders[0].orderId, paymentRef: data.paymentReference,
            status: "Price Review Required" })
          alert("Checkout saved for review. Do not transfer money. Close this window and contact support or cancel the pending checkout.")
          return
        }
      }
      setConfirmedTotal(serverTotal)
      saveOrder({ ...order, total: serverTotal, backendOrderId: data.orders[0].orderId,
        checkoutId: data.checkoutId, checkoutClaimToken: data.claimToken, backendOrders: data.orders, paymentRef: data.paymentReference })
      setSellerOrders(data.orders)
      setCheckoutId(data.checkoutId)
      setClaimToken(data.claimToken)
      setPaymentRef(data.paymentReference)
      setStep(3)
    } catch (err) {
      console.error("Backend order creation failed:", err)
      alert(`Order was not confirmed: ${err.message} Do not send additional money. If you have already paid, contact support with your payment reference.`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (step !== 3 || !checkoutId || !claimToken) return
    let cancelled = false
    fetch(`${API_URL}/checkout-payments/${encodeURIComponent(checkoutId)}/status`, {
      headers: { "x-checkout-token": claimToken },
    }).then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || "Unable to check checkout mode")
      if (!cancelled) {
        setCheckoutEnvironment(data.environment)
        setGroupPaymentStatus(data.status)
      }
    }).catch(err => { if (!cancelled) setEvidenceMessage(err.message) })
    return () => { cancelled = true }
  }, [step, checkoutId, claimToken])

  const submitTestCheckout = async () => {
    if (!checkoutId || !claimToken) return
    setEvidenceBusy(true); setEvidenceMessage("")
    try {
      const response = await fetch(`${API_URL}/checkout-payments/${encodeURIComponent(checkoutId)}/submit-test`, {
        method: "POST", headers: { "x-checkout-token": claimToken },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || "Practice submission failed")
      setGroupPaymentStatus("submitted")
      setEvidenceMessage("Practice submission received. No money was sent. Check the Admin payment queue under Test submissions.")
    } catch (err) { setEvidenceMessage(err.message) }
    finally { setEvidenceBusy(false) }
  }

  const submitPaymentEvidence = async () => {
    if (!checkoutId || !claimToken || !paymentEvidence.trim()) {
      setEvidenceMessage("Enter your actual Mobile Money transaction reference."); return
    }
    setEvidenceBusy(true); setEvidenceMessage("")
    try {
      const response = await fetch(`${API_URL}/checkout-payments/${encodeURIComponent(checkoutId)}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-checkout-token": claimToken },
        body: JSON.stringify({ buyerReference: paymentEvidence.trim() }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || "Submission failed")
      setGroupPaymentStatus(result.status || "submitted")
      setEvidenceMessage("Evidence submitted for independent verification. Payment is NOT yet confirmed.")
    } catch (err) { setEvidenceMessage(err.message) }
    finally { setEvidenceBusy(false) }
  }

  const refreshPaymentStatus = async () => {
    if (!checkoutId || !claimToken) return
    try {
      const response = await fetch(`${API_URL}/checkout-payments/${encodeURIComponent(checkoutId)}/status`, {
        headers: { "x-checkout-token": claimToken },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || "Unable to check payment")
      setGroupPaymentStatus(result.status)
      setCheckoutEnvironment(result.environment)
      setEvidenceMessage(result.status === "verified" ? "Payment independently verified. Each seller order is now funded." : `Current status: ${result.status}. Do not arrange fulfillment until verified.`)
    } catch (err) { setEvidenceMessage(err.message) }
  }

  const refreshSellerOrders = async () => {
    if (!checkoutId || !claimToken) return
    setDeliveryError("")
    try {
      const res = await fetch(`${API_URL}/group-lifecycle/${encodeURIComponent(checkoutId)}/orders`, { headers: { "x-checkout-token": claimToken } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Could not load seller orders")
      setSellerOrders(old => data.orders.map(o => ({ ...old.find(i => i.orderId === o.orderId), ...o })))
      setGroupPaymentStatus(data.status)
    } catch (err) { setDeliveryError(err.message) }
  }
  const generateSellerCode = async orderId => {
    setDeliveryBusy(orderId); setDeliveryError("")
    try {
      const res = await fetch(`${API_URL}/group-lifecycle/${encodeURIComponent(checkoutId)}/orders/${encodeURIComponent(orderId)}/delivery-code`, { method: "POST", headers: { "x-checkout-token": claimToken } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Unable to generate code")
      setDeliveryCodes(prev => ({ ...prev, [orderId]: data }))
    } catch (err) { setDeliveryError(err.message) }
    finally { setDeliveryBusy(null) }
  }
  const handleConfirmDelivery = () => {
    setDelivered(true)
    updateOrder(orderId, { delivered: true, status: "Completed" })
  }

  const handleCancelDelivery = () => {
    setDelivered(false)
    updateOrder(orderId, { delivered: false, status: "Cancelled" })
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

        <style>{`
          .sr-checkout-journey{display:grid;gap:16px;color:#f5f0e7;animation:srRise .35s ease-out}
          @keyframes srRise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
          .sr-journey-hero{background:radial-gradient(ellipse at 90% 0%,#64502a55,transparent 55%),linear-gradient(145deg,#242019,#111);border:1px solid #4a3b26;border-radius:20px;padding:25px 22px}
          .sr-journey-eyebrow{color:#d8bd87;font-size:10px;letter-spacing:.2em;font-weight:800}
          .sr-journey-hero h2{font-size:clamp(25px,6vw,34px);letter-spacing:-.045em;line-height:1.15;margin:12px 0;color:#fff;font-weight:800}
          .sr-journey-hero p,.sr-journey-card p{font-size:13px;line-height:1.75;color:#bcb7ad;margin:9px 0 15px}
          .sr-journey-total{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #ffffff24;margin-top:20px;padding-top:18px}
          .sr-journey-total span{font-size:13px;color:#c8c1b5}.sr-journey-total strong{font-size:23px;color:#e5c28b}
          .sr-journey-card{background:#181818;border:1px solid #30302c;border-radius:18px;padding:19px;display:grid;gap:10px}
          .sr-journey-heading{display:flex;gap:12px;align-items:center;margin-bottom:5px}
          .sr-journey-heading>div{display:grid;gap:3px}.sr-journey-heading strong{font-size:17px;letter-spacing:-.02em}
          .sr-journey-heading small{font-size:12px;color:#8e8a82}
          .sr-journey-number{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#c8a97e;color:#1b140d;font-weight:900;flex-shrink:0}
          .sr-payment-status{display:flex;align-items:center;gap:10px;background:#26231e;border-radius:11px;padding:13px;color:#ead3aa;font-size:13px;font-weight:700}
          .sr-status-dot{height:8px;width:8px;background:#e8b966;border-radius:50%;box-shadow:0 0 0 4px #e8b96620}.sr-status-dot.verified{background:#68d4a0;box-shadow:0 0 0 4px #68d4a020}
          .sr-journey-label{font-size:13px;font-weight:750;color:#f5f0e7;margin-top:3px}
          .sr-journey-input{width:100%;box-sizing:border-box;background:#252525;border:1px solid #555044;border-radius:12px;color:#fff;padding:16px;font:inherit;font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s}
          .sr-journey-input:focus{border-color:#d7b982;box-shadow:0 0 0 3px #d7b98222}
          .sr-journey-hint{font-size:11px;line-height:1.7;color:#aaa397}
          .sr-journey-primary,.sr-journey-secondary{min-height:48px;border-radius:12px;padding:13px 15px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;transition:transform .18s,background .18s}
          .sr-journey-primary{background:linear-gradient(110deg,#e2c590,#b9945e);color:#1a140e;border:0}
          .sr-journey-primary:hover:not(:disabled){transform:translateY(-2px);background:#f0d3a0}
          .sr-journey-primary:disabled{opacity:.45;cursor:not-allowed}
          .sr-journey-secondary{background:#242424;color:#dfd8cd;border:1px solid #45413a}
          .sr-journey-secondary:hover{background:#30302e}
          .sr-journey-feedback{color:#f2d5a0!important}.sr-journey-error{color:#ff9d9d!important}
          .sr-seller-delivery{display:grid;gap:10px;border-top:1px solid #35312a;padding-top:16px;margin-top:8px}
          .sr-seller-top{display:flex;justify-content:space-between;align-items:start;gap:12px}.sr-seller-top>div{display:grid;gap:5px;min-width:0}
          .sr-seller-overline{font-size:10px;font-weight:800;letter-spacing:.13em;color:#b9a17a}
          .sr-seller-top strong{font-size:14px;overflow-wrap:anywhere}.sr-seller-amount{font-size:13px;color:#ddbe89;white-space:nowrap;font-weight:700}
          .sr-seller-state{font-size:12px;color:#aaa79f}.sr-code-button{font-size:13px}
          .sr-code-panel{background:#29231a;border:1px solid #7c633a;border-radius:13px;text-align:center;padding:18px 10px;display:grid;gap:8px}
          .sr-code-panel span{font-size:10px;letter-spacing:.15em;color:#d7b982;font-weight:800}
          .sr-code-panel strong{font-family:ui-monospace,monospace;font-size:clamp(27px,8vw,40px);letter-spacing:.17em;color:#fff}
          .sr-code-panel small{font-size:11px;line-height:1.5;color:#c8c1b5}
          .sr-detail-line{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #ffffff12;font-size:12px}
          .sr-detail-line span{color:#979189;flex-shrink:0}.sr-detail-line strong{text-align:right;font-weight:650;overflow-wrap:anywhere}
          @media(max-width:450px){.sr-journey-card{padding:16px}.sr-journey-hero{padding:22px 18px}.sr-detail-line{flex-direction:column;gap:4px}.sr-detail-line strong{text-align:left}}
          @media(prefers-reduced-motion:reduce){.sr-checkout-journey{animation:none}.sr-journey-primary,.sr-journey-secondary{transition:none}}
        `}</style>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>
            {step === 0 ? "📍 Your Location" : step === 1 ? "✅ Confirm Order" : step === 2 ? "💳 Payment" : "📦 Track Order"}
          </span>
          {step < 3 && <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>}
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
                  ⚠️ Could not get location. Enter manually below.
                </div>
              )}

              {locBlocked && (
                <>
                  <div>
                    <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR LOCATION</div>
                    <textarea placeholder="e.g. Mensah Sarbah Hall, UG Legon" value={manualLocation} onChange={e => setManualLocation(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>NEAREST LANDMARK</div>
                    <input placeholder="e.g. Opposite the main library" value={landmark} onChange={e => setLandmark(e.target.value)} style={inp} />
                  </div>
                </>
              )}

              {mapEmbedUrl && (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
                  <iframe src={mapEmbedUrl} width="100%" height="180" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" title="Location" />
                </div>
              )}

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>DELIVERY METHOD</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["pickup", "📍 Pickup (Free)"], ["rider", `🛵 Rider (₵${deliveryFee})`]].map(([val, label]) => (
                    <button key={val} onClick={() => setDeliveryMethod(val)}
                      style={{ flex: 1, background: deliveryMethod === val ? "#c8a97e18" : "#161616", border: `1.5px solid ${deliveryMethod === val ? "#c8a97e" : "#1e1e1e"}`, color: deliveryMethod === val ? "#c8a97e" : "#888", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>EXTRA DETAILS FOR SELLER</div>
                <textarea placeholder="e.g. Call when you arrive..." value={extraInfo} onChange={e => setExtraInfo(e.target.value)} rows={2} style={{ ...inp, resize: "none" }} />
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR CONTACT (for seller)</div>
                <input placeholder="Phone or Instagram the seller can reach you" value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={inp} />
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}><span>Subtotal</span><span>₵{subtotal.toLocaleString()}</span></div>
                {deliveryMethod === "rider" && promoApplied?.type !== "free_delivery" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}><span>Rider delivery</span><span>₵{deliveryFee}</span></div>
                )}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6ee7b7" }}><span>🎟️ Discount</span><span>−₵{discount}</span></div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px" }}>
                  <span>Total</span>
                  <span>₵{total.toLocaleString()} <span style={{ fontSize: "12px", color: "#333", fontWeight: "400" }}>(${(total / (rate || 1)).toFixed(2)})</span></span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button className="btn-gold" onClick={() => setStep(2)} style={{ flex: 2, padding: "13px", borderRadius: "12px", fontSize: "15px" }}>Continue to Payment →</button>
              </div>
            </>
          )}

          {/* ── STEP 2 — Continue to Payment ── */}
          {step === 2 && (
            <>
              <div style={{ background: "#161616", border: "1px solid #36302a", borderRadius: "14px", padding: "20px", display: "grid", gap: "10px" }}>
                <div style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "700", letterSpacing: ".06em" }}>SECURE CHECKOUT</div>
                <div style={{ color: "#f0ede8", fontSize: "28px", fontWeight: "800" }}>GH₵{total.toLocaleString()}</div>
                <div style={{ color: "#999", fontSize: "13px", lineHeight: 1.7 }}>
                  Continue to create your checkout and view the payment options available for the current platform environment.
                  Your order will remain pending until payment is independently verified.
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#777", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR NAME</div>
                <input placeholder="Full name" value={payerName} onChange={e => setPayerName(e.target.value)} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#777", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>CONTACT NUMBER</div>
                <input placeholder="e.g. 0241234567" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} style={inp} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                <button className="btn-gold" onClick={handlePay} disabled={saving}
                  style={{ flex: 2, padding: "13px", borderRadius: "12px", fontSize: "15px", opacity: saving ? .7 : 1 }}>
                  {saving ? "⏳ Preparing checkout..." : "Continue to Payment →"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3 — A calm, buyer-friendly order journey ── */}
          {step === 3 && (
            <div className="sr-checkout-journey">
              {delivered === null ? (
                <>
                  <div className="sr-journey-hero">
                    <div className="sr-journey-eyebrow">YOUR ORDER JOURNEY</div>
                    <h2>You're all set.</h2>
                    <p>We've saved your order. Just one more step before your seller can get started.</p>
                    <div className="sr-journey-total">
                      <span>Your total</span>
                      <strong>GH₵{Number(confirmedTotal ?? total).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <div className="sr-journey-card">
                    <div className="sr-journey-heading"><span className="sr-journey-number">1</span><div><strong>Complete your payment</strong><small>We'll guide you through it.</small></div></div>
                    {checkoutId && claimToken ? (
                      <>
                        <div className="sr-payment-status">
                          <span className={`sr-status-dot ${groupPaymentStatus === "verified" ? "verified" : ""}`} />
                          <span>{groupPaymentStatus === "verified" ? "Payment confirmed" : groupPaymentStatus === "submitted" ? "We're checking your payment" : "Waiting for payment"}</span>
                        </div>
                        {groupPaymentStatus === "pending" && checkoutEnvironment === "testing" && (
                          <>
                            <p>This is a practice checkout, so you don't need to send any money. Tap below and we'll send your order for a test review.</p>
                            <button className="sr-journey-primary" disabled={evidenceBusy} onClick={submitTestCheckout}>{evidenceBusy ? "Sending your request…" : "Continue with practice payment"}</button>
                          </>
                        )}
                        {groupPaymentStatus === "pending" && checkoutEnvironment === "live" && (
                          <>
                            <p>Once you've paid using Silk Road's official payment instructions, enter the transaction reference from your payment confirmation message.</p>
                            <label className="sr-journey-label" htmlFor="sr-payment-reference">Payment reference</label>
                            <input id="sr-payment-reference" className="sr-journey-input" autoComplete="off" value={paymentEvidence} onChange={e => setPaymentEvidence(e.target.value)} placeholder="e.g. the reference in your payment SMS" />
                            <div className="sr-journey-hint">This is the reference from your payment provider, not your order number. Only enter it after paying.</div>
                            <button className="sr-journey-primary" disabled={evidenceBusy || paymentEvidence.trim().length < 5} onClick={submitPaymentEvidence}>{evidenceBusy ? "Sending…" : "Submit payment reference"}</button>
                          </>
                        )}
                        {groupPaymentStatus === "pending" && checkoutEnvironment === null && <p>We're checking which payment options are available. Please wait before sending money.</p>}
                        {groupPaymentStatus === "submitted" && <p>Thanks! Your payment details are with our team. You don't need to send them again. We'll update your order once payment is confirmed.</p>}
                        {groupPaymentStatus === "verified" && <p>Good news! Your payment is confirmed. Your seller can now prepare your order.</p>}
                        {!["pending", "submitted", "verified"].includes(groupPaymentStatus) && <p>Your payment needs attention. Please contact Silk Road support before taking another step.</p>}
                        <button className="sr-journey-secondary" onClick={refreshPaymentStatus}>↻ Refresh payment status</button>
                        {evidenceMessage && <p role="status" className="sr-journey-feedback">{evidenceMessage}</p>}
                      </>
                    ) : <p>We're preparing your order details. If this takes too long, contact Silk Road support before trying to pay again.</p>}
                  </div>

                  <div className="sr-journey-card">
                    <div className="sr-journey-heading"><span className="sr-journey-number">2</span><div><strong>Receive your order</strong><small>Confirm each delivery when it arrives.</small></div></div>
                    <p>When you receive your items, check that everything is right. Then share the delivery code with the seller. <strong>Never share it before receiving your items.</strong></p>
                    {checkoutId && claimToken ? (
                      <>
                        <button className="sr-journey-secondary" onClick={refreshSellerOrders}>↻ Update delivery progress</button>
                        {sellerOrders.map((o, index) => (
                          <div className="sr-seller-delivery" key={o.orderId}>
                            <div className="sr-seller-top">
                              <div><span className="sr-seller-overline">PACKAGE {index + 1}</span><strong>{o.title || `Your order ${index + 1}`}</strong></div>
                              <span className="sr-seller-amount">GH₵{Number(o.amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="sr-seller-state">{o.paymentStatus === "released" ? "Payment to seller recorded" : o.paymentStatus === "release_pending" ? "Delivery confirmed" : o.paymentStatus === "escrow_held" ? "Ready for delivery" : "Waiting for payment confirmation"}</div>
                            {o.paymentStatus === "escrow_held" && (
                              <button className="sr-journey-primary sr-code-button" disabled={deliveryBusy === o.orderId} onClick={() => generateSellerCode(o.orderId)}>
                                {deliveryBusy === o.orderId ? "Getting your code…" : deliveryCodes[o.orderId] ? "Get a new delivery code" : "I've received this package — get my code"}
                              </button>
                            )}
                            {deliveryCodes[o.orderId] && (
                              <div className="sr-code-panel">
                                <span>YOUR DELIVERY CODE</span>
                                <strong>{deliveryCodes[o.orderId].deliveryCode}</strong>
                                <small>Share only after checking your items. Code expires at {new Date(deliveryCodes[o.orderId].expiresAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}.</small>
                              </div>
                            )}
                          </div>
                        ))}
                        {deliveryError && <p role="alert" className="sr-journey-error">{deliveryError}</p>}
                      </>
                    ) : <p>Need help with an earlier order? Contact Silk Road support to confirm its delivery status.</p>}
                  </div>

                  <div className="sr-journey-card sr-order-details">
                    <div className="sr-journey-heading"><span className="sr-journey-number">3</span><div><strong>Your order at a glance</strong><small>Everything in one place.</small></div></div>
                    {cart.length > 0 && <div className="sr-detail-line"><span>Items</span><strong>{cart.map(i => i.title).join(", ")}</strong></div>}
                    <div className="sr-detail-line"><span>Delivery</span><strong>{deliveryMethod === "rider" ? "Rider delivery requested" : "Arrange with seller"}</strong></div>
                    {(manualLocation || location) && <div className="sr-detail-line"><span>Location</span><strong>{manualLocation || `${location.lat}, ${location.lng}`}</strong></div>}
                    {paymentRef && <div className="sr-detail-line"><span>Reference</span><strong>{paymentRef}</strong></div>}
                    <div className="sr-journey-hint">Keep your order details for reference. Silk Road will never ask for your payment PIN.</div>
                  </div>
                  <button className="sr-journey-secondary" onClick={onClose}>Back to marketplace</button>
                </>
              ) : (
                <div className="sr-journey-hero">
                  <div className="sr-journey-eyebrow">ORDER UPDATE</div>
                  <h2>{delivered ? "Delivered. Enjoy!" : "Order cancelled"}</h2>
                  <p>{delivered ? "Your delivery has been confirmed. Any seller payout is handled separately." : "Your order is marked cancelled. Contact support for the latest refund status."}</p>
                  <button className="sr-journey-primary" onClick={onClose}>Back to marketplace</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}