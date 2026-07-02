import { useState, useEffect } from "react"
import { getListings } from "./api"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const STATIC_SERVICES = [
  { id: 201, title: "Mathematics Private Lessons",    price: 120, category: "Lessons",       provider: "James O.",  university: "KNUST",    rating: 4.9, reviews: 48, image: `https://picsum.photos/seed/31/300/200`, delivery: "online",    liveSession: true,  badge: "Top Rated", desc: "Covers calculus, algebra, statistics. Flexible schedule. All levels welcome." },
  { id: 202, title: "Concert & Event Photography",    price: 800, category: "Photography",   provider: "Nour H.",   university: "UG Legon", rating: 4.8, reviews: 23, image: `https://picsum.photos/seed/32/300/200`, delivery: "in-person", liveSession: false, badge: null,        desc: "Full event coverage, edited photos delivered within 48hrs.", contact: { method: "WhatsApp", detail: "+233 24 567 8901", note: "Message with event date and location." } },
  { id: 203, title: "Room & Hostel Cleaning",         price: 80,  category: "Cleaning",      provider: "Ama S.",    university: "UG Legon", rating: 4.7, reviews: 61, image: `https://picsum.photos/seed/33/300/200`, delivery: "in-person", liveSession: false, badge: "Popular",   desc: "Deep cleaning, laundry, ironing. Available weekends.", contact: { method: "Phone", detail: "+233 50 123 4567", note: "Call between 8am–6pm." } },
  { id: 204, title: "Python & Data Science Tutoring", price: 150, category: "Lessons",       provider: "Kofi T.",   university: "Ashesi",   rating: 5.0, reviews: 34, image: `https://picsum.photos/seed/34/300/200`, delivery: "online",    liveSession: true,  badge: "Top Rated", desc: "NumPy, Pandas, ML basics. Live coding via video call." },
  { id: 205, title: "Graphic Design – Logo & Branding",price: 300,category: "Design",        provider: "Fiona L.",  university: "UCC",      rating: 4.9, reviews: 19, image: `https://picsum.photos/seed/35/300/200`, delivery: "online",    liveSession: false, badge: null,        desc: "Logo, brand kit, social media templates. 3 revision rounds.", contact: { method: "Instagram", detail: "@fiona.designs", note: "DM me with your brief." } },
  { id: 206, title: "DJ Services for Events",         price: 600, category: "Entertainment", provider: "Elias T.",  university: "UDS",      rating: 4.6, reviews: 12, image: `https://picsum.photos/seed/36/300/200`, delivery: "in-person", liveSession: false, badge: null,        desc: "Afrobeats, hiphop, dancehall. Campus events & parties.", contact: { method: "WhatsApp", detail: "+233 27 890 1234", note: "Send event date, venue and crowd size." } },
  { id: 207, title: "French Language Lessons",        price: 100, category: "Lessons",       provider: "Leila N.",  university: "GIJ",      rating: 4.8, reviews: 27, image: `https://picsum.photos/seed/37/300/200`, delivery: "online",    liveSession: true,  badge: "Popular",   desc: "Beginner to intermediate. Conversational focus." },
  { id: 208, title: "CV & Cover Letter Writing",      price: 120, category: "Career",        provider: "Sara B.",   university: "UDS",      rating: 4.7, reviews: 44, image: `https://picsum.photos/seed/38/300/200`, delivery: "online",    liveSession: false, badge: null,        desc: "ATS-optimized CVs. LinkedIn profile included. 24hr turnaround.", contact: { method: "Email", detail: "sara.b@gmail.com", note: "Email your current CV and target role." } },
]

const CATEGORIES   = ["All", "Lessons", "Photography", "Cleaning", "Design", "Entertainment", "Career"]
const DATE_OPTIONS = ["Today", "Tomorrow", "In 2 days", "In 3 days", "In 4 days", "In 5 days", "In 6 days", "In 7 days"]
const TIME_OPTIONS = ["6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"]
const REPORT_REASONS = ["Service not delivered","Provider was rude or threatening","Fake listing","Service not as described","No-show","Other"]

// ── Helpers ────────────────────────────────────────────────────────────────────
const getProviderName = (s) => s._id ? s.seller?.name : s.provider
const getUniversity   = (s) => s._id ? s.seller?.university : s.university
const getDelivery     = (s) => s.serviceDelivery || s.delivery || "online"
const getLiveSession  = (s) => !!(s.liveSession)
const getContact      = (s) => s.contact || null
const getSellerId     = (s) => s._id ? (s.seller?._id || s.seller) : null
const getImg          = (s) => s.image || `https://picsum.photos/seed/${s.id || s._id}/300/200`

// ── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[1,2,3,4,5].map(star => {
        const active = hovered ?? value
        return (
          <div key={star} style={{ position: "relative", width: "36px", height: "36px", cursor: readonly ? "default" : "pointer" }}>
            <span style={{ fontSize: "32px", color: "#333", position: "absolute" }}>☆</span>
            {active >= star - 0.5 && active < star && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute", overflow: "hidden", width: "50%" }}>★</span>}
            {active >= star && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute" }}>★</span>}
            {!readonly && (
              <>
                <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%" }} onMouseEnter={() => setHovered(star - 0.5)} onMouseLeave={() => setHovered(null)} onClick={() => onChange(star - 0.5)} />
                <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%" }} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(null)} onClick={() => onChange(star)} />
              </>
            )}
          </div>
        )
      })}
      {!readonly && <span style={{ fontSize: "16px", fontWeight: "700", color: "#c8a97e", marginLeft: "6px" }}>{(hovered ?? value) || ""}</span>}
    </div>
  )
}

// ── Rating + Report ────────────────────────────────────────────────────────────
function RatingAndReport({ orderId, providerName, onDone }) {
  const [rating, setRating] = useState(0)
  const [rated, setRated] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitted, setReportSubmitted] = useState(false)

  const handleRate = () => {
    if (!rating) return
    const saved = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}")
    saved[orderId] = rating
    localStorage.setItem("silkroad_ratings", JSON.stringify(saved))
    setRated(true)
  }

  const handleReport = () => {
    if (!reportReason) return
    const reports = JSON.parse(localStorage.getItem("silkroad_reports") || "[]")
    reports.push({ orderId, providerName, reason: reportReason, date: new Date().toISOString() })
    localStorage.setItem("silkroad_reports", JSON.stringify(reports))
    setReportSubmitted(true)
  }

  if (reportSubmitted) return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ fontSize: "48px" }}>📋</div>
      <div style={{ fontSize: "18px", fontWeight: "700" }}>Report Submitted</div>
      <button onClick={onDone} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>Done</button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {!showReport ? (
        <>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>⭐ Rate {providerName}</div>
            {!rated ? (
              <>
                <StarRating value={rating} onChange={setRating} />
                <button onClick={handleRate} disabled={!rating}
                  style={{ background: rating > 0 ? "#c8a97e" : "#1e1e1e", border: "none", color: rating > 0 ? "#000" : "#555", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: rating > 0 ? "pointer" : "not-allowed", fontSize: "14px", fontFamily: "inherit" }}>
                  Submit Rating
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StarRating value={rating} onChange={() => {}} readonly />
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onDone} style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>Back to Marketplace</button>
            <button onClick={() => setShowReport(true)} style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>🚩 Report</button>
          </div>
        </>
      ) : (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", border: "1px solid #7f1d1d", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {providerName}</div>
          {REPORT_REASONS.map(r => (
            <div key={r} onClick={() => setReportReason(r)}
              style={{ padding: "10px 14px", borderRadius: "8px", background: reportReason === r ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === r ? "#991b1b" : "#2a2a2a"}`, cursor: "pointer", fontSize: "13px", color: reportReason === r ? "#fca5a5" : "#888" }}>
              {r}
            </div>
          ))}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowReport(false)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "11px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleReport} style={{ flex: 2, background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>Submit Report</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Jitsi Live Session ─────────────────────────────────────────────────────────
function JitsiSession({ roomId, displayName, onEnd }) {
  const [joined, setJoined] = useState(false)
  const [api, setApi] = useState(null)

  const handleJoin = () => {
    setJoined(true)
    setTimeout(() => {
      if (!window.JitsiMeetExternalAPI) { alert("Jitsi failed to load."); return }
      const jitsiApi = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: `silkroadgh-${roomId}`,
        width: "100%", height: 420,
        parentNode: document.getElementById(`jitsi-${roomId}`),
        userInfo: { displayName },
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false, startWithVideoMuted: false },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","desktop","chat","hangup"], SHOW_JITSI_WATERMARK: false },
      })
      jitsiApi.addEventListener("videoConferenceLeft", () => onEnd())
      setApi(jitsiApi)
    }, 300)
  }

  const handleEnd = () => { if (api) { try { api.dispose() } catch {} }; onEnd() }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {!joined ? (
        <div style={{ background: "#0a0a1a", border: "1px solid #1d4ed8", borderRadius: "12px", padding: "28px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "52px" }}>🎥</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#93c5fd" }}>Live Session Ready</div>
          <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d" }}>
            ⚠️ Once you join, payment becomes non-refundable.
          </div>
          <button onClick={handleJoin} style={{ background: "#1d4ed8", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff", fontFamily: "inherit" }}>
            🎥 Join Live Session Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "#e11d4822", border: "1px solid #e11d48", borderRadius: "8px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%" }} />
            <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — Session in progress</span>
          </div>
          <div id={`jitsi-${roomId}`} style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1d4ed8", minHeight: "420px", background: "#000" }} />
          <button onClick={handleEnd} style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>🔴 End Session</button>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function RequestService({ rate }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [detailService, setDetailService] = useState(null)
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(0)
  const [contactInfo, setContactInfo] = useState("")
  const [payLoading, setPayLoading] = useState(false)
  const [orderId] = useState(() => generateOrderId())
  const [cancelled, setCancelled] = useState(false)
  const [buyerConfirmed, setBuyerConfirmed] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false)
  const [inSession, setInSession] = useState(false)
  const [dbServices, setDbServices] = useState([])
  const [loadingListings, setLoadingListings] = useState(false)

  useEffect(() => {
    setLoadingListings(true)
    getListings({ type: "service", limit: 50 })
      .then(data => { if (Array.isArray(data) && data.length > 0) setDbServices(data) })
      .catch(() => {}).finally(() => setLoadingListings(false))
  }, [])

  const services = dbServices.length > 0 ? dbServices : STATIC_SERVICES

  const platformFee  = selected ? Math.round((selected.price || 0) * 0.08) : 0
  const providerGets = selected ? (selected.price || 0) - platformFee : 0

  const openService = (service) => {
    setSelected(service); setStep(1); setContactInfo(""); setPayLoading(false)
    setCancelled(false); setBuyerConfirmed(false); setShowRating(false)
    setSessionEnded(false); setScheduledDate(""); setScheduledTime("")
    setScheduleConfirmed(false); setInSession(false)
  }
  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = async () => {
    if (!contactInfo.trim()) { alert("Please enter your contact info."); return }
    setPayLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setPayLoading(false)

    const order = {
      id: orderId,
      type: "service",
      cart: [{ ...(selected), title: selected.title, price: selected.price || 0, qty: 1, seller: selected.seller || { _id: null, name: getProviderName(selected) }, image: getImg(selected) }],
      service: selected,
      amount: selected.price || 0,
      total: selected.price || 0,
      subtotal: selected.price || 0,
      platformFee,
      providerGets,
      contactInfo,
      deliveryMethod: "pickup",
      paymentMethod: "manual_momo",
      paymentRef: `SVC-${orderId}`,
      status: "Pending Confirmation",
      buyerConfirmed: false,
      providerConfirmed: false,
      cancelled: false,
      delivered: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    }

    // Persist to backend if logged in
    try {
      const token = localStorage.getItem("silkroad_token")
      if (token && selected._id) {
        await fetch(`${API_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            listingId: selected._id,
            sellerId: getSellerId(selected),
            type: "service",
            amount: selected.price || 0,
            paystackRef: `SVC-${orderId}`,
            contactInfo,
          }),
        })
      }
    } catch {}

    // saveOrder triggers notifySeller automatically
    saveOrder(order)
    setStep(3)
  }

  const handleConfirmService = () => { setBuyerConfirmed(true); setShowRating(true) }
  const handleSessionEnd     = () => { setInSession(false); setSessionEnded(true); setShowRating(true) }

  const filtered = services.filter(s => activeCategory === "All" || s.category === activeCategory)

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 18px 24px" }}>
      {step === 0 && (
        <>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: "800", color: "#f0ede8", letterSpacing: "-0.02em", marginBottom: "8px" }}>Request a Service</h2>
            <p style={{ color: "#555", fontSize: "14px" }}>Book skilled students for lessons, events, cleaning and more.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`pill ${activeCategory === cat ? "active" : ""}`}>{cat}</button>
            ))}
          </div>

          {loadingListings ? (
            <div style={{ textAlign: "center", color: "#555", padding: "60px", fontSize: "13px" }}>⏳ Loading services...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {filtered.map((service, index) => (
                <div key={service._id || service.id} className="listing-card reveal" style={{ animationDelay: `${(index % 8) * 55}ms` }}>
                  <div style={{ overflow: "hidden", position: "relative" }}>
                    <img src={getImg(service)} alt={service.title} onClick={() => setDetailService(service)}
                      style={{ width: "100%", height: "200px", objectFit: "cover", cursor: "pointer" }} />
                    {service.badge && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#064e3b", color: "#6ee7b7", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", border: "1px solid #065f46", pointerEvents: "none" }}>
                        ⭐ {service.badge}
                      </span>
                    )}
                    <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", pointerEvents: "none" }}>
                      <span style={{ background: getDelivery(service) === "online" ? "#1e3a5f" : "#2a1a3f", color: getDelivery(service) === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
                        {getDelivery(service) === "online" ? "🌐 Online" : "📍 In-Person"}
                      </span>
                      {getLiveSession(service) && (
                        <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>🔴 Live</span>
                      )}
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, #111, transparent)", pointerEvents: "none" }} />
                  </div>
                  <div style={{ padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>{service.category}</div>
                    <div onClick={() => setDetailService(service)} style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3", letterSpacing: "-0.01em" }}>{service.title}</div>
                    <div style={{ fontSize: "12px", color: "#444", marginBottom: "2px" }}>by <span style={{ color: "#666" }}>{getProviderName(service)}</span></div>
                    <div style={{ fontSize: "11px", color: "#333", marginBottom: "14px" }}>🎓 {getUniversity(service)}</div>
                    {service.rating > 0 && <div style={{ fontSize: "13px", color: "#c8a97e", marginBottom: "10px" }}>{"★".repeat(Math.round(service.rating))} {service.rating}</div>}
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "14px" }}>₵{(service.price || 0).toLocaleString()}</div>
                    <button className="btn-gold" onClick={() => openService(service)} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: "13px" }}>
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail modal */}
          {detailService && (
            <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDetailService(null)}>
              <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
                <div style={{ position: "relative" }}>
                  <img src={getImg(detailService)} alt={detailService.title} style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #111)", pointerEvents: "none", borderRadius: "20px 20px 0 0" }} />
                  <button onClick={() => setDetailService(null)} style={{ position: "absolute", top: "14px", right: "14px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>{detailService.category}</div>
                    <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>{detailService.title}</h2>
                    <div style={{ fontSize: "13px", color: "#555" }}>by <span style={{ color: "#888", fontWeight: "600" }}>{getProviderName(detailService)}</span> · 🎓 {getUniversity(detailService)}</div>
                  </div>
                  {detailService.rating > 0 && <div style={{ fontSize: "13px", color: "#c8a97e" }}>{"★".repeat(Math.round(detailService.rating))} {detailService.rating} ({detailService.reviews || 0} reviews)</div>}
                  <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px" }}>
                    <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", margin: 0 }}>{detailService.desc}</p>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>🌐 Delivery: <span style={{ color: "#c8a97e" }}>{getDelivery(detailService) === "online" ? "Online" : "In-Person"}</span></div>
                    {getLiveSession(detailService) && <div>🔴 <span style={{ color: "#fca5a5" }}>Live video session via Jitsi</span></div>}
                    <div>🔒 Payment held in escrow until you confirm completion</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: "18px" }}>
                    <div style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.03em" }}>₵{(detailService.price || 0).toLocaleString()}</div>
                    <button className="btn-gold" onClick={() => { openService(detailService); setDetailService(null) }} style={{ padding: "13px 28px", borderRadius: "12px", fontSize: "14px" }}>
                      Book Now →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── BOOKING FLOW ── */}
      {step > 0 && selected && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "Book Service" : step === 2 ? "💳 Payment" : showRating ? "🎉 Complete" : inSession ? "🔴 Live Session" : "✅ Booking Confirmed"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* STEP 1 — Review */}
              {step === 1 && (
                <>
                  <img src={getImg(selected)} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "12px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px", letterSpacing: "-0.02em" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555" }}>by {getProviderName(selected)} · 🎓 {getUniversity(selected)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ background: getDelivery(selected) === "online" ? "#1e3a5f" : "#2a1a3f", color: getDelivery(selected) === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>
                      {getDelivery(selected) === "online" ? "🌐 Online" : "📍 In-Person"}
                    </span>
                    {getLiveSession(selected) && (
                      <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>🔴 Live Session via Jitsi</span>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>{selected.desc}</p>
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Service fee</span><span>₵{selected.price || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Platform fee (8%)</span><span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                      <span>Total</span><span>₵{selected.price || 0}</span>
                    </div>
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#6ee7b7" }}>
                      🔒 {getLiveSession(selected) ? "Cancel before session starts for a full refund." : "Cancel before provider contacts you for a full refund."}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR CONTACT (for the provider)</div>
                    <input placeholder="e.g. 0241234567 or @yourinstagram"
                      value={contactInfo} onChange={e => setContactInfo(e.target.value)}
                      style={{ width: "100%", background: "#161616", border: "1px solid #1e1e1e", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>

                  <button className="btn-gold" onClick={() => setStep(2)} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                    Continue to Payment →
                  </button>
                </>
              )}

              {/* STEP 2 — Payment */}
              {step === 2 && (
                <>
                  <div style={{ background: "#ffd700", borderRadius: "16px", padding: "22px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#554400", marginBottom: "6px" }}>SEND THIS EXACT AMOUNT</div>
                    <div style={{ fontSize: "36px", fontWeight: "800", color: "#1a1a00", letterSpacing: "-0.02em" }}>₵{selected.price || 0}</div>
                  </div>
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>🛠️ Service: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{selected.title}</span></div>
                    <div>💰 {getProviderName(selected)} receives: <span style={{ color: "#aaa" }}>₵{providerGets} after platform fee</span></div>
                    <div>📞 Your contact: <span style={{ color: "#aaa" }}>{contactInfo}</span></div>
                  </div>
                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#fcd34d", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontWeight: "700" }}>⚠️ Steps:</div>
                    <div>1. Dial *170# → Transfer Money → MoMo User</div>
                    <div>2. Enter: <strong>0543883608</strong> (Silk Road GH)</div>
                    <div>3. Amount: <strong>₵{selected.price || 0}</strong> · Ref: <strong style={{ fontFamily: "monospace" }}>{orderId}</strong></div>
                    <div>4. Come back and confirm below</div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                    <button onClick={handlePay} disabled={payLoading}
                      style={{ flex: 2, background: "#c8a97e", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: payLoading ? "not-allowed" : "pointer", fontSize: "15px", opacity: payLoading ? 0.7 : 1, color: "#000", fontFamily: "inherit" }}>
                      {payLoading ? "⏳ Processing..." : "✅ I've Sent the Money"}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 — Confirmed */}
              {step === 3 && !cancelled && !showRating && !inSession && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "8px" }}>✅</div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", marginBottom: "8px" }}>Payment Submitted!</h3>
                    <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>
                      {getLiveSession(selected)
                        ? `${getProviderName(selected)} will schedule your session. You'll see the time below once confirmed.`
                        : `${getProviderName(selected)}'s contact details are now visible below.`}
                    </p>
                  </div>
                  <OrderIdBanner orderId={orderId} />

                  {/* Non-live: show contact */}
                  {!getLiveSession(selected) && getContact(selected) && (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".08em" }}>🔓 PROVIDER CONTACT DETAILS</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{getContact(selected).method}: <span style={{ color: "#c8a97e" }}>{getContact(selected).detail}</span></div>
                      {getContact(selected).note && <div style={{ fontSize: "13px", color: "#888" }}>📝 {getContact(selected).note}</div>}
                    </div>
                  )}

                  {/* Live: scheduling */}
                  {getLiveSession(selected) && (
                    <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {!scheduleConfirmed ? (
                        <>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#93c5fd" }}>⏳ Awaiting Session Schedule</div>
                          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>{getProviderName(selected)} is picking a time slot.</p>
                          <div style={{ background: "#0d0d0d", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ fontSize: "11px", color: "#555", fontWeight: "600" }}>🛠️ PROVIDER: Schedule this session</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              <select value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                                style={{ background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "9px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
                                <option value="">Pick date</option>
                                {DATE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                                style={{ background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "9px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
                                <option value="">Pick time</option>
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <button onClick={() => { if (scheduledDate && scheduledTime) setScheduleConfirmed(true) }}
                              style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                              ✅ Confirm & Notify Buyer
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: "#c8a97e18", border: "1px solid #c8a97e44", borderRadius: "10px", padding: "14px" }}>
                            <div style={{ fontSize: "12px", color: "#c8a97e", marginBottom: "4px" }}>📅 SESSION SCHEDULED</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e" }}>{scheduledDate} at {scheduledTime}</div>
                          </div>
                          <button onClick={() => setInSession(true)}
                            style={{ background: "#1d4ed8", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff", fontFamily: "inherit" }}>
                            🎥 Join Live Session
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "12px 14px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Payment released to {getProviderName(selected)} only after you confirm service is complete.
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {!getLiveSession(selected) && (
                      <button onClick={handleConfirmService}
                        style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                        ✅ Confirm Completed
                      </button>
                    )}
                    <button onClick={() => setCancelled(true)}
                      style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                      ❌ Cancel & Refund
                    </button>
                  </div>
                </>
              )}

              {/* CANCELLED */}
              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Booking Cancelled</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your full refund of ₵{selected.price || 0} will be processed within 24 hours.</p>
                  <button className="btn-gold" onClick={reset} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Services</button>
                </div>
              )}

              {/* LIVE SESSION */}
              {step === 3 && inSession && !sessionEnded && (
                <>
                  <div style={{ background: "#e11d4822", border: "1px solid #e11d48", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%" }} />
                    <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — {selected.title} with {getProviderName(selected)}</span>
                  </div>
                  <JitsiSession roomId={orderId} displayName="Buyer" onEnd={handleSessionEnd} />
                </>
              )}

              {/* RATING */}
              {step === 3 && showRating && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "8px" }}>🎉</div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#6ee7b7", marginBottom: "8px" }}>
                      {getLiveSession(selected) ? "Session Complete!" : "Service Complete!"}
                    </h3>
                    <p style={{ fontSize: "13px", color: "#888" }}>Payment of ₵{providerGets} released to {getProviderName(selected)}.</p>
                  </div>
                  <RatingAndReport orderId={orderId} providerName={getProviderName(selected)} onDone={reset} />
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
