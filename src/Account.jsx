import { useState, useEffect } from "react"
import { updateProfile, changePassword, deleteAccount, getMyOrders, getSellingOrders, getMyListings, deleteListing } from "./api"
import { getOrders, updateOrder, getSellerNotifications, markAllNotificationsRead } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

const STATUS_STYLE = {
  "Delivered":           { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "Completed":           { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "In Escrow":           { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
  "Pending Confirmation":{ bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Paid":                { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "Pending":             { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Refunded":            { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Cancelled":           { bg: "#7f1d1d22", color: "#fca5a5", border: "#7f1d1d" },
  "Active":              { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
  "Flagged":             { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
}

const statusStyle = (s) => STATUS_STYLE[s] || STATUS_STYLE["Active"]

const inp = (err) => ({
  width: "100%", background: "#161616",
  border: `1px solid ${err ? "#991b1b" : "#222"}`,
  color: "#fff", padding: "12px 16px", borderRadius: "10px",
  fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
})

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "18px", flex: 1, minWidth: "130px" }}>
      <div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: accent || "#f0ede8", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{sub}</div>}
    </div>
  )
}

// ── Active Rentals ─────────────────────────────────────────────────────────────
function ActiveRentals() {
  const [rentals, setRentals] = useState(() => {
    try { return Object.values(getOrders()).filter(o => o.type === "rent" && !o.lenderConfirmed) }
    catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const confirm = (id, isDamaged) => {
    updateOrder(id, { lenderConfirmed: true, damaged: isDamaged, expiresAt: Date.now() })
    setRentals(r => r.filter(x => x.id !== id))
  }

  if (!rentals.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "40px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>📦</div>No active rentals.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rentals.map(r => {
        const tl   = (r.rentalTimerEnd || 0) - Date.now()
        const d    = Math.max(0, Math.floor(tl / 86400000))
        const h    = Math.max(0, Math.floor((tl % 86400000) / 3600000))
        const near = tl > 0 && tl < 86400000
        const exp  = tl <= 0
        const open = expandedId === r.id
        return (
          <div key={r.id} style={{ background: "#141414", borderRadius: "14px", border: `1px solid ${near ? "#92400e" : exp ? "#7f1d1d" : "#1e1e1e"}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(open ? null : r.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{r.item?.title || "Rental Item"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{r.id}</span></div>
              </div>
              {exp
                ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#7f1d1d22", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "3px 10px", borderRadius: "20px" }}>⏰ Expired</span>
                : near
                  ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#78350f22", color: "#fcd34d", border: "1px solid #92400e", padding: "3px 10px", borderRadius: "20px" }}>⚠️ {h}h left</span>
                  : <span style={{ fontSize: "11px", fontWeight: "700", background: "#064e3b22", color: "#6ee7b7", border: "1px solid #065f46", padding: "3px 10px", borderRadius: "20px" }}>{d}d {h}h</span>
              }
            </div>
            {open && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{r.days} day{r.days > 1 ? "s" : ""}</span></div>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{r.lenderGets || r.rentalCost}</span></div>
                  {r.depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{r.depositAmount}</span></div>}
                  {r.renterConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Renter confirmed return</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Renter hasn't confirmed yet</div>
                  }
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>Was the item returned in good condition?</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => confirm(r.id, false)} style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>✅ No Damage</button>
                  <button onClick={() => confirm(r.id, true)}  style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>⚠️ Damaged</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Active Services ────────────────────────────────────────────────────────────
function ActiveServices() {
  const [services, setServices] = useState(() => {
    try { return Object.values(getOrders()).filter(o => o.type === "service" && !o.providerConfirmed && !o.cancelled) }
    catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const confirm = (id) => {
    updateOrder(id, { providerConfirmed: true, expiresAt: Date.now() })
    setServices(s => s.filter(x => x.id !== id))
  }

  if (!services.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "40px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>🛠️</div>No active services.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {services.map(s => {
        const open = expandedId === s.id
        return (
          <div key={s.id} style={{ background: "#141414", borderRadius: "14px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(open ? null : s.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{s.service?.title || "Service"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{s.id}</span></div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#1e3a5f22", color: "#93c5fd", border: "1px solid #1d4ed8", padding: "3px 10px", borderRadius: "20px" }}>Active</span>
            </div>
            {open && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{s.providerGets}</span></div>
                  <div>📋 Type: <span style={{ color: "#888" }}>{s.service?.liveSession ? "🔴 Live Session" : s.service?.delivery === "online" ? "🌐 Online" : "📍 In-Person"}</span></div>
                  {s.buyerConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Buyer confirmed — confirm to release payment</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Waiting for buyer confirmation</div>
                  }
                </div>
                <button onClick={() => confirm(s.id)} style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                  ✅ I've Completed This Service
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Delivery Request Modal ─────────────────────────────────────────────────────
// Opens when seller taps "Request a Rider"
function DeliveryRequestModal({ notification, user, onClose, onRequested }) {
  const [step, setStep]               = useState("form") // form | quote | requesting | done | error
  const [pickupAddress, setPickupAddress] = useState("")
  const [dropAddress, setDropAddress]     = useState("")
  const [pickupLat, setPickupLat]     = useState("")
  const [pickupLng, setPickupLng]     = useState("")
  const [dropLat, setDropLat]         = useState(notification.location ? notification.location.split(",")[0] : "")
  const [dropLng, setDropLng]         = useState(notification.location ? notification.location.split(",")[1] : "")
  const [quote, setQuote]             = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [locLoading, setLocLoading]   = useState(false)

  const token = localStorage.getItem("silkroad_token")

  const detectLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickupLat(pos.coords.latitude.toFixed(6))
        setPickupLng(pos.coords.longitude.toFixed(6))
        setPickupAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        setLocLoading(false)
      },
      () => setLocLoading(false),
      { timeout: 10000 }
    )
  }

  const handleGetQuote = async () => {
    if (!pickupLat || !pickupLng) { setError("Please enter or detect your pickup location."); return }
    if (!dropLat   || !dropLng)   { setError("Buyer location is missing. Check the order details."); return }
    setLoading(true); setError("")
    try {
      const res  = await fetch(`${API_URL}/deliveries/quote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ pickupLat, pickupLng, dropLat: dropLat.trim(), dropLng: dropLng.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || "Could not calculate quote."); setLoading(false); return }
      setQuote(data)
      setStep("quote")
    } catch { setError("Network error. Try again.") }
    setLoading(false)
  }

  const handleRequestRider = async () => {
    setStep("requesting"); setLoading(true); setError("")
    try {
      const res  = await fetch(`${API_URL}/deliveries`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          orderId:       notification.orderId,
          pickupLat,     pickupLng,
          pickupAddress: pickupAddress || `${pickupLat}, ${pickupLng}`,
          dropLat:       dropLat.trim(),
          dropLng:       dropLng.trim(),
          dropAddress:   dropAddress || notification.location || `${dropLat}, ${dropLng}`,
          sellerContact: user?.phone || "",
          buyerContact:  notification.buyerContact || "",
          itemTitle:     notification.itemTitle || "Package",
          itemImage:     notification.itemImage  || "",
          notes:         "",
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || "Could not request rider."); setStep("quote"); setLoading(false); return }
      setStep("done")
      onRequested(data)
    } catch { setError("Network error. Try again."); setStep("quote") }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%", background: "#161616", border: "1px solid #1e1e1e",
    color: "#fff", padding: "11px 14px", borderRadius: "10px",
    fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "17px", fontWeight: "700" }}>🛵 Request a Rider</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Order info */}
          <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "7px" }}>
            <div>📦 <span style={{ color: "#c8a97e", fontWeight: "700" }}>{notification.itemTitle}</span></div>
            <div>💰 Order: <span style={{ color: "#aaa" }}>₵{notification.amount}</span></div>
            {notification.buyerContact && <div>📞 Buyer: <span style={{ color: "#aaa" }}>{notification.buyerContact}</span></div>}
            {notification.location && <div>📍 Buyer location: <span style={{ color: "#aaa", fontFamily: "monospace", fontSize: "11px" }}>{notification.location}</span></div>}
            {notification.landmark  && <div>🗺️ Landmark: <span style={{ color: "#aaa" }}>{notification.landmark}</span></div>}
          </div>

          {/* FORM step */}
          {(step === "form" || step === "quote") && (
            <>
              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR PICKUP LOCATION (where you are)</div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button onClick={detectLocation}
                    style={{ flex: 1, background: pickupLat ? "#064e3b" : "#161616", border: `1px solid ${pickupLat ? "#065f46" : "#1e1e1e"}`, color: pickupLat ? "#6ee7b7" : "#c8a97e", padding: "11px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
                    {locLoading ? "⏳ Detecting..." : pickupLat ? "✅ GPS Detected" : "📍 Detect My Location"}
                  </button>
                </div>
                {pickupLat && (
                  <div style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", marginBottom: "6px" }}>
                    {pickupLat}, {pickupLng}
                  </div>
                )}
                <input placeholder="Or type your address / landmark" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>DROP-OFF LOCATION (buyer's location)</div>
                {dropLat && dropLng ? (
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#6ee7b7" }}>
                    ✅ GPS from buyer's checkout: <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{dropLat}, {dropLng}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d", marginBottom: "8px" }}>
                      ⚠️ Buyer didn't share GPS. Enter their address manually.
                    </div>
                    <input placeholder="e.g. Mensah Sarbah Hall, UG Legon" value={dropAddress} onChange={e => setDropAddress(e.target.value)} style={inputStyle} />
                  </>
                )}
              </div>

              {error && (
                <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Quote result */}
              {step === "quote" && quote && (
                <div style={{ background: "#1a1a1a", border: "1px solid #c8a97e44", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>DELIVERY QUOTE</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                    <span>Distance</span><span style={{ color: "#aaa" }}>{quote.distanceKm} km</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                    <span>Base fee</span><span style={{ color: "#aaa" }}>₵5.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                    <span>Distance charge ({quote.distanceKm}km × ₵2.50)</span><span style={{ color: "#aaa" }}>₵{(quote.distanceKm * 2.5).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                    <span>Rider Fee</span><span>₵{quote.deliveryFee}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6" }}>
                    This amount is charged to the buyer and paid directly to the rider upon successful delivery via OTP confirmation.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                {step === "form" ? (
                  <button className="btn-gold" onClick={handleGetQuote} disabled={loading}
                    style={{ flex: 1, padding: "14px", borderRadius: "12px", fontSize: "15px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "⏳ Calculating..." : "Get Delivery Quote →"}
                  </button>
                ) : (
                  <>
                    <button onClick={() => setStep("form")}
                      style={{ flex: 1, background: "#161616", border: "1px solid #222", color: "#888", padding: "13px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", fontFamily: "inherit" }}>
                      ← Recalculate
                    </button>
                    <button className="btn-gold" onClick={handleRequestRider}
                      style={{ flex: 2, padding: "13px", borderRadius: "12px", fontSize: "15px" }}>
                      🛵 Request Rider Now
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* REQUESTING step */}
          {step === "requesting" && (
            <div style={{ textAlign: "center", padding: "32px 0", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
              <div style={{ fontSize: "48px" }}>🛵</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#c8a97e" }}>Broadcasting to riders...</div>
              <div style={{ fontSize: "13px", color: "#555" }}>All online riders in your area are being notified.</div>
            </div>
          )}

          {/* DONE step */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
              <div style={{ fontSize: "56px" }}>✅</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#6ee7b7" }}>Riders Notified!</div>
              <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>
                Available riders have been notified of this delivery job. You'll get a notification the moment a rider accepts.
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#666", width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: "7px" }}>
                <div>📦 {notification.itemTitle}</div>
                {quote && <div>🛵 Rider fee: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{quote.deliveryFee}</span></div>}
                <div>📍 Distance: <span style={{ color: "#aaa" }}>{quote?.distanceKm} km</span></div>
              </div>
              <button className="btn-gold" onClick={onClose} style={{ width: "100%", padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                Back to Notifications
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Self Delivery OTP Modal ────────────────────────────────────────────────────
// When seller delivers themselves, generate OTP for buyer to confirm
function SelfDeliveryModal({ notification, user, onClose }) {
  const [step, setStep]       = useState("confirm") // confirm | otp | done
  const [otp, setOtp]         = useState("")
  const [loading, setLoading] = useState(false)

  const generateOTP = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setOtp(code)
    setStep("otp")
    // Store OTP in localStorage so buyer's OrderTracker can verify it
    const otps = JSON.parse(localStorage.getItem("silkroad_self_delivery_otps") || "{}")
    otps[notification.orderId] = { otp: code, createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000 }
    localStorage.setItem("silkroad_self_delivery_otps", JSON.stringify(otps))
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "420px", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "17px", fontWeight: "700" }}>📍 Self Delivery</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {step === "confirm" && (
            <>
              <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "7px" }}>
                <div>📦 <span style={{ color: "#c8a97e", fontWeight: "700" }}>{notification.itemTitle}</span></div>
                {notification.buyerContact && <div>📞 Buyer: <span style={{ color: "#aaa" }}>{notification.buyerContact}</span></div>}
                {notification.location    && <div>📍 Location: <span style={{ color: "#aaa" }}>{notification.location}</span></div>}
                {notification.landmark   && <div>🗺️ Landmark: <span style={{ color: "#aaa" }}>{notification.landmark}</span></div>}
              </div>
              <div style={{ background: "#1e3a5f18", border: "1px solid #1d4ed8", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#93c5fd", lineHeight: "1.7" }}>
                ℹ️ When you arrive and hand over the item, generate an OTP. The buyer enters it to confirm receipt and release your payment.
              </div>
              <button className="btn-gold" onClick={generateOTP} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                I've Delivered — Generate OTP
              </button>
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid #222", color: "#555", padding: "12px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", fontFamily: "inherit" }}>
                Not Yet — Close
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555", marginBottom: "16px" }}>Show this OTP to the buyer</div>
                <div style={{ fontSize: "52px", fontWeight: "900", color: "#c8a97e", fontFamily: "monospace", letterSpacing: ".15em", background: "#161616", borderRadius: "16px", padding: "20px", border: "1px solid #c8a97e44" }}>
                  {otp}
                </div>
                <div style={{ fontSize: "12px", color: "#555", marginTop: "12px" }}>Expires in 30 minutes</div>
              </div>
              <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#6ee7b7", lineHeight: "1.7" }}>
                ✅ The buyer enters this code on their order screen. Once confirmed, your payment is released automatically.
              </div>
              <button className="btn-gold" onClick={onClose} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                Done
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Notifications Tab ──────────────────────────────────────────────────────────
function NotificationsTab({ user }) {
  const [notifications, setNotifications]     = useState([])
  const [expandedId, setExpandedId]           = useState(null)
  const [deliveryModal, setDeliveryModal]     = useState(null) // notification object
  const [selfDeliveryModal, setSelfDelivery]  = useState(null) // notification object
  const [requestedOrders, setRequestedOrders] = useState({})   // orderId → delivery data

  useEffect(() => {
    if (user?._id) {
      setNotifications(getSellerNotifications(user._id))
      markAllNotificationsRead(user._id)
    }
  }, [user?._id])

  const fmt = (ts) => {
    const d = Date.now() - ts
    if (d < 60000)    return "Just now"
    if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  if (!notifications.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
      <div style={{ fontSize: "36px", marginBottom: "14px" }}>🔔</div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>No notifications yet</div>
      <div style={{ fontSize: "13px" }}>New orders for your listings appear here in real time.</div>
    </div>
  )

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {notifications.map(n => {
          const open       = expandedId === n.id
          const hasDelivery = requestedOrders[n.orderId]

          return (
            <div key={n.id} style={{ background: n.status === "unread" ? "#161a1e" : "#141414", border: `1px solid ${n.status === "unread" ? "#c8a97e33" : "#1e1e1e"}`, borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "16px 18px", cursor: "pointer", display: "flex", gap: "12px", alignItems: "flex-start" }} onClick={() => setExpandedId(open ? null : n.id)}>
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e1e1e", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {n.itemImage
                    ? <img src={n.itemImage} alt={n.itemTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "18px" }}>🛒</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    {n.status === "unread" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a97e", flexShrink: 0 }} />}
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🛒 {n.itemTitle}</div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "3px" }}>
                    <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{n.amount?.toLocaleString()}</span> · {n.buyerName}
                  </div>
                  <div style={{ fontSize: "11px", color: "#444" }}>{fmt(n.createdAt)} · {open ? "▲ Hide" : "▼ Details"}</div>
                </div>
              </div>

              {open && (
                <div style={{ borderTop: "1px solid #1e1e1e", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

                  {/* Order details */}
                  <div style={{ background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "9px" }}>
                    <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>ORDER DETAILS</div>
                    {[
                      ["Order ID", <span style={{ color: "#c8a97e", fontFamily: "monospace", fontWeight: "700" }}>{n.orderId}</span>],
                      ["Amount",   <span style={{ color: "#6ee7b7", fontWeight: "700" }}>₵{n.amount?.toLocaleString()}</span>],
                      ["Payment",  <span style={{ color: "#888" }}>{n.paymentMethod === "paystack" ? "⚡ Paystack" : "📱 Manual MoMo"}</span>],
                      n.paymentRef && ["Ref",      <span style={{ color: "#444", fontSize: "11px", fontFamily: "monospace" }}>{n.paymentRef}</span>],
                      ["Delivery", <span style={{ color: "#888" }}>{n.deliveryMethod === "rider" ? "🛵 Rider" : "📍 Pickup"}</span>],
                      n.location  && ["Location",  <span style={{ color: "#888", textAlign: "right", maxWidth: "180px" }}>{n.location}</span>],
                      n.landmark  && ["Landmark",  <span style={{ color: "#888" }}>{n.landmark}</span>],
                      n.promoCode && ["Promo",     <span style={{ color: "#6ee7b7" }}>🎟️ {n.promoCode} (-₵{n.discount})</span>],
                    ].filter(Boolean).map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                        <span style={{ color: "#555", flexShrink: 0 }}>{label}</span>{val}
                      </div>
                    ))}
                  </div>

                  {/* Buyer contact */}
                  {n.buyerContact && (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".08em", marginBottom: "6px" }}>🔓 BUYER CONTACT</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#6ee7b7" }}>{n.buyerContact}</div>
                      <div style={{ fontSize: "11px", color: "#065f46", marginTop: "4px" }}>Reach out to coordinate delivery or pickup</div>
                    </div>
                  )}

                  {/* Delivery choice */}
                  {!hasDelivery ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>HOW WILL YOU DELIVER?</div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => setSelfDelivery(n)}
                          style={{ flex: 1, background: "#1e3a5f18", border: "1px solid #1d4ed8", color: "#93c5fd", padding: "13px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", lineHeight: "1.4" }}>
                          📍 Deliver<br />Myself
                        </button>
                        <button onClick={() => setDeliveryModal(n)}
                          style={{ flex: 1, background: "#c8a97e18", border: "1px solid #c8a97e44", color: "#c8a97e", padding: "13px 10px", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", lineHeight: "1.4" }}>
                          🛵 Request<br />a Rider
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", color: "#6ee7b7" }}>
                      ✅ Rider requested — fee: ₵{hasDelivery.deliveryFee} · {hasDelivery.distanceKm}km
                    </div>
                  )}

                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                    ⚠️ Payment held in escrow. Released once buyer confirms delivery via OTP.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {deliveryModal && (
        <DeliveryRequestModal
          notification={deliveryModal}
          user={user}
          onClose={() => setDeliveryModal(null)}
          onRequested={(data) => {
            setRequestedOrders(prev => ({ ...prev, [deliveryModal.orderId]: data.delivery }))
            setDeliveryModal(null)
          }}
        />
      )}

      {selfDeliveryModal && (
        <SelfDeliveryModal
          notification={selfDeliveryModal}
          user={user}
          onClose={() => setSelfDelivery(null)}
        />
      )}
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function Account({ user, onSignOut, onClose, onUserUpdate, notifTick }) {
  const [tab, setTab]           = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [editForm, setEditForm]   = useState({ name: user.name, university: user.university || "", phone: user.phone || "" })
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState("")

  const [newPassword, setNewPassword]       = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError]   = useState("")
  const [passwordSaved, setPasswordSaved]   = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError]     = useState("")

  const [orders, setOrders]           = useState([])
  const [sellingOrders, setSellingOrders] = useState([])
  const [listings, setListings]       = useState([])
  const [loadingOrders, setLoadingOrders]     = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [notifCount, setNotifCount]   = useState(0)

  useEffect(() => {
    if (user?._id) setNotifCount(getSellerNotifications(user._id).filter(n => n.status === "unread").length)
  }, [user?._id, tab, notifTick])

  useEffect(() => {
    if (tab === "orders" || tab === "overview") {
      setLoadingOrders(true)
      Promise.all([getMyOrders(), getSellingOrders()])
        .then(([my, sell]) => { setOrders(Array.isArray(my) ? my : []); setSellingOrders(Array.isArray(sell) ? sell : []) })
        .catch(() => {}).finally(() => setLoadingOrders(false))
    }
  }, [tab])

  useEffect(() => {
    if (tab === "listings" || tab === "overview") {
      setLoadingListings(true)
      getMyListings()
        .then(d => setListings(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoadingListings(false))
    }
  }, [tab])

  const handleSaveProfile = async () => {
    const e = {}
    if (!editForm.name.trim())  e.name  = "Name cannot be empty."
    if (!editForm.phone.trim()) e.phone = "Phone cannot be empty."
    if (Object.keys(e).length) { setEditErrors(e); return }
    setSaving(true); setSaveError("")
    try {
      const data = await updateProfile({ name: editForm.name, university: editForm.university, phone: editForm.phone })
      if (data.message) { setSaveError(data.message); setSaving(false); return }
      onUserUpdate({ ...user, name: data.name, university: data.university, phone: data.phone })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setSaveError("Something went wrong.") }
    setSaving(false)
  }

  const handleSavePassword = async () => {
    setPasswordError("")
    if (newPassword.length < 6)           { setPasswordError("Password must be at least 6 characters."); return }
    if (newPassword !== confirmPassword)  { setPasswordError("Passwords do not match."); return }
    setPasswordSaving(true)
    try {
      const data = await changePassword(newPassword)
      if (data.message === "Password updated successfully.") {
        setPasswordSaved(true); setNewPassword(""); setConfirmPassword("")
        setTimeout(() => setPasswordSaved(false), 2500)
      } else { setPasswordError(data.message || "Something went wrong.") }
    } catch { setPasswordError("Something went wrong.") }
    setPasswordSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleteLoading(true); setDeleteError("")
    try {
      const data = await deleteAccount()
      if (data.message === "Account deleted successfully.") { localStorage.removeItem("silkroad_token"); onSignOut() }
      else { setDeleteError(data.message || "Something went wrong.") }
    } catch { setDeleteError("Something went wrong.") }
    setDeleteLoading(false)
  }

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Remove this listing?")) return
    try { await deleteListing(id); setListings(l => l.filter(x => x._id !== id)) }
    catch { alert("Could not remove listing.") }
  }

  const totalRevenue        = sellingOrders.filter(o => o.status === "Completed" || o.status === "Paid").reduce((s, o) => s + (o.sellerAmount || 0), 0)
  const pendingOrders       = sellingOrders.filter(o => o.status === "In Escrow" || o.status === "Pending").length
  const activeListingsCount = listings.filter(l => (l.status || "Active") === "Active").length

  const NAV = [
    { id: "overview",      label: "Overview",        icon: "📊" },
    { id: "notifications", label: "Notifications",   icon: "🔔", badge: notifCount },
    { id: "orders",        label: "Orders & Sales",  icon: "📦" },
    { id: "listings",      label: "My Listings",     icon: "🏷️" },
    { id: "rentals",       label: "Active Rentals",  icon: "🔄" },
    { id: "services",      label: "Active Services", icon: "🛠️" },
    { id: "profile",       label: "Profile",         icon: "👤" },
    { id: "settings",      label: "Settings",        icon: "⚙️" },
  ]

  const goTo       = (id) => { setTab(id); setSidebarOpen(false) }
  const currentTab = NAV.find(n => n.id === tab)

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 500, display: "flex", overflow: "hidden" }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 10 }} />
      )}

      {/* ── Sidebar ── */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "240px", background: "#0d0d0d", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 20, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background: "transparent", border: "1px solid #222", color: "#888", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, minHeight: "auto" }}>
            ✕
          </button>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#c8a97e" }}>Silk Road GH</div>
            <div style={{ fontSize: "11px", color: "#444" }}>My Account</div>
          </div>
        </div>

        <div style={{ padding: "16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "#000", flexShrink: 0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: "11px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.university}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => goTo(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", background: tab === item.id ? "#c8a97e14" : "transparent", border: tab === item.id ? "1px solid #c8a97e33" : "1px solid transparent", color: tab === item.id ? "#c8a97e" : "#666", padding: "11px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: tab === item.id ? "700" : "500", fontFamily: "inherit", marginBottom: "3px", textAlign: "left" }}>
              <span style={{ fontSize: "15px" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "17px", height: "17px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: "14px", borderTop: "1px solid #1a1a1a" }}>
          <button onClick={onSignOut} style={{ width: "100%", background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "11px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "12px 18px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "1px solid #222", color: "#c8a97e", width: "38px", height: "38px", borderRadius: "9px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", flexShrink: 0, minHeight: "auto" }}>
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#f0ede8" }}>{currentTab?.icon} {currentTab?.label}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>{user.name} · {user.university}</div>
          </div>
          <button onClick={onClose}
            style={{ background: "#1a1a1a", border: "1px solid #222", color: "#888", padding: "8px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            ← Back
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", padding: "28px 20px 80px" }}>

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <>
                <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>
                  Welcome back, {user.name.split(" ")[0]} 👋
                </h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Here's what's happening with your account.</p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
                  <StatCard icon="💰" label="Total Earned"    value={`₵${totalRevenue.toLocaleString()}`} sub="Completed sales" accent="#6ee7b7" />
                  <StatCard icon="🔔" label="Notifications"   value={notifCount} sub="Unread alerts" accent={notifCount > 0 ? "#c8a97e" : undefined} />
                  <StatCard icon="📦" label="Pending Orders"  value={pendingOrders} sub="Awaiting action" />
                  <StatCard icon="🏷️" label="Active Listings" value={activeListingsCount} sub={`${listings.length} total`} />
                </div>

                {notifCount > 0 && (
                  <div onClick={() => setTab("notifications")}
                    style={{ background: "#161a1e", border: "1px solid #c8a97e44", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "24px" }}>🔔</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>{notifCount} new order notification{notifCount > 1 ? "s" : ""}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>Tap to view buyer details and choose delivery method</div>
                      </div>
                    </div>
                    <span style={{ color: "#c8a97e", fontSize: "18px" }}>→</span>
                  </div>
                )}

                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "14px" }}>Recent Sales</h3>
                {loadingOrders ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "32px", fontSize: "13px" }}>⏳ Loading...</div>
                ) : !sellingOrders.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "32px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
                    No sales yet. Once someone buys from you, it'll show here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sellingOrders.slice(0, 5).map(order => (
                      <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #1e1e1e" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>🏷️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Sale"}</div>
                          <div style={{ fontSize: "12px", color: "#555" }}>{order.buyer?.name || "Buyer"} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span></div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === "notifications" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔔 Notifications</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Every order placed for your listings — choose how to deliver each one.</p>
                <NotificationsTab user={user} />
              </>
            )}

            {/* ── ORDERS ── */}
            {tab === "orders" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>📦 Orders & Sales</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Your purchases and sales.</p>
                {loadingOrders ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading orders...</div>
                ) : !orders.length && !sellingOrders.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>📦</div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#666" }}>No orders yet</div>
                  </div>
                ) : (
                  <>
                    {sellingOrders.length > 0 && (
                      <div style={{ marginBottom: "32px" }}>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "14px" }}>My Sales ({sellingOrders.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {sellingOrders.map(order => (
                            <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "18px", border: "1px solid #1e1e1e" }}>
                              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", flexShrink: 0 }}>🏷️</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Sale"}</div>
                                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                                    Buyer: <span style={{ color: "#999" }}>{order.buyer?.name || "Unknown"}</span> · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span>
                                  </div>
                                  {order.contactInfo && (
                                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px" }}>
                                      <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".06em", marginBottom: "3px" }}>🔓 BUYER CONTACT</div>
                                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#6ee7b7" }}>{order.contactInfo}</div>
                                    </div>
                                  )}
                                  <div style={{ fontSize: "12px", color: "#555", display: "flex", flexDirection: "column", gap: "3px" }}>
                                    {order.deliveryMethod && <div>🚚 {order.deliveryMethod === "rider" ? "Rider Delivery" : "Campus Pickup"}</div>}
                                    {order.location  && <div>📍 {order.location}</div>}
                                    {order.landmark  && <div>🗺️ {order.landmark}</div>}
                                    {order.promoCode && <div style={{ color: "#6ee7b7" }}>🎟️ {order.promoCode} (-₵{order.discount})</div>}
                                    {order.paystackRef && <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#444" }}>Ref: {order.paystackRef}</div>}
                                  </div>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {orders.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "14px" }}>My Purchases ({orders.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {orders.map(order => (
                            <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📦</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Order"}</div>
                                <div style={{ fontSize: "12px", color: "#555" }}>
                                  {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.amount}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── LISTINGS ── */}
            {tab === "listings" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🏷️ My Listings</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Everything you currently have listed.</p>
                {loadingListings ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading...</div>
                ) : !listings.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏷️</div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#666" }}>No listings yet</div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>Click + Sell from the marketplace to create your first listing</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {listings.map(listing => (
                      <div key={listing._id} style={{ background: "#141414", borderRadius: "14px", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                        {listing.image
                          ? <img src={listing.image} alt={listing.title} style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: "50px", height: "50px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", flexShrink: 0 }}>📦</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</div>
                          <div style={{ fontSize: "12px", color: "#555" }}>{listing.category} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>{listing.type === "rent" ? `₵${listing.dailyRate}/day` : `₵${listing.price}`}</span></div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(listing.status || "Active").bg, color: statusStyle(listing.status || "Active").color, border: `1px solid ${statusStyle(listing.status || "Active").border}`, padding: "3px 10px", borderRadius: "20px" }}>{listing.status || "Active"}</span>
                          <button onClick={() => handleDeleteListing(listing._id)} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", minHeight: "auto" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── RENTALS ── */}
            {tab === "rentals" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔄 Active Rentals</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Items you've lent out that are currently active.</p>
                <ActiveRentals />
              </>
            )}

            {/* ── SERVICES ── */}
            {tab === "services" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🛠️ Active Services</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Services you're currently providing.</p>
                <ActiveServices />
              </>
            )}

            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>👤 Edit Profile</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Keep your information up to date.</p>
                <div style={{ maxWidth: "460px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>FULL NAME</div>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inp(editErrors.name)} />
                    {editErrors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.name}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>EMAIL</div>
                    <input value={user.email} disabled style={{ ...inp(false), background: "#0d0d0d", color: "#333", cursor: "not-allowed", border: "1px solid #1a1a1a" }} />
                    <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Email cannot be changed.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>UNIVERSITY</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                      {UNIS.map(u => (
                        <button key={u} onClick={() => setEditForm(f => ({ ...f, university: u }))}
                          style={{ padding: "10px 4px", borderRadius: "9px", border: `1.5px solid ${editForm.university === u ? "#c8a97e" : "#1e1e1e"}`, background: editForm.university === u ? "#c8a97e18" : "#161616", color: editForm.university === u ? "#c8a97e" : "#666", cursor: "pointer", fontWeight: "600", fontSize: "11px", textAlign: "center", fontFamily: "inherit" }}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>PHONE NUMBER</div>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inp(editErrors.phone)} />
                    {editErrors.phone && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.phone}</div>}
                  </div>
                  {saveError && <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>🚫 {saveError}</div>}
                  <button className="btn-gold" onClick={handleSaveProfile} disabled={saving}
                    style={{ padding: "14px", borderRadius: "12px", fontSize: "15px", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "⏳ Saving..." : saved ? "✅ Profile Saved!" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* ── SETTINGS ── */}
            {tab === "settings" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>⚙️ Settings</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Manage your password and account.</p>
                <div style={{ maxWidth: "460px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", border: "1px solid #1e1e1e" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>🔒 Change Password</div>
                    <input placeholder="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp(false)} />
                    <input placeholder="Confirm new password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inp(false)} />
                    {passwordError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {passwordError}</div>}
                    <button onClick={handleSavePassword} disabled={passwordSaving}
                      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8a97e", padding: "12px", borderRadius: "10px", cursor: passwordSaving ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", opacity: passwordSaving ? 0.7 : 1 }}>
                      {passwordSaving ? "⏳ Saving..." : passwordSaved ? "✅ Password Updated!" : "Update Password"}
                    </button>
                  </div>

                  <div style={{ background: "#7f1d1d10", borderRadius: "14px", padding: "22px", border: "1px solid #7f1d1d44", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>⚠️ Danger Zone</div>
                    <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: "1.6" }}>Deleting your account is permanent and removes all your listings, orders, and data.</p>
                    {deleteError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {deleteError}</div>}
                    <button onClick={handleDeleteAccount} disabled={deleteLoading}
                      style={{ background: deleteConfirm ? "#7f1d1d" : "#7f1d1d18", border: "1px solid #7f1d1d", color: deleteConfirm ? "#fff" : "#fca5a5", padding: "12px", borderRadius: "10px", cursor: deleteLoading ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", opacity: deleteLoading ? 0.7 : 1 }}>
                      {deleteLoading ? "⏳ Deleting..." : deleteConfirm ? "⚠️ Click Again to Confirm" : "Delete Account"}
                    </button>
                  </div>

                  <button onClick={onSignOut}
                    style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", fontFamily: "inherit" }}>
                    Sign Out
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
