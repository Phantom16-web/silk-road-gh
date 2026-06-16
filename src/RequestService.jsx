import { useState, useEffect } from "react"
import { getListings } from "./api"
import { saveOrder, generateOrderId, OrderIdBanner } from "./OrderTracker"

const STATIC_SERVICES = [
  { id: 1, title: "Mathematics Private Lessons",    price: 120, category: "Lessons",       provider: "James O.",  university: "KNUST",    rating: 4.9, reviews: 48, image: 31, delivery: "online",    liveSession: true,  badge: "Top Rated", desc: "Covers calculus, algebra, statistics. Flexible schedule. All levels welcome." },
  { id: 2, title: "Concert & Event Photography",    price: 800, category: "Photography",   provider: "Nour H.",   university: "UG Legon", rating: 4.8, reviews: 23, image: 32, delivery: "in-person", liveSession: false, badge: null,        desc: "Full event coverage, edited photos delivered within 48hrs.", contact: { method: "WhatsApp", detail: "+233 24 567 8901", note: "Message me first with your event date and location." } },
  { id: 3, title: "Room & Hostel Cleaning",         price: 80,  category: "Cleaning",      provider: "Ama S.",    university: "UG Legon", rating: 4.7, reviews: 61, image: 33, delivery: "in-person", liveSession: false, badge: "Popular",   desc: "Deep cleaning, laundry, ironing. Available weekends.", contact: { method: "Phone", detail: "+233 50 123 4567", note: "Call between 8am and 6pm." } },
  { id: 4, title: "Python & Data Science Tutoring", price: 150, category: "Lessons",       provider: "Kofi T.",   university: "Ashesi",   rating: 5.0, reviews: 34, image: 34, delivery: "online",    liveSession: true,  badge: "Top Rated", desc: "NumPy, Pandas, ML basics. Live coding sessions via video call." },
  { id: 5, title: "Graphic Design – Logo & Branding",price: 300,category: "Design",        provider: "Fiona L.",  university: "UCC",      rating: 4.9, reviews: 19, image: 35, delivery: "online",    liveSession: false, badge: null,        desc: "Logo, brand kit, social media templates. 3 revision rounds.", contact: { method: "Instagram", detail: "@fiona.designs", note: "DM me with your brief." } },
  { id: 6, title: "DJ Services for Events",         price: 600, category: "Entertainment", provider: "Elias T.",  university: "UDS",      rating: 4.6, reviews: 12, image: 36, delivery: "in-person", liveSession: false, badge: null,        desc: "Afrobeats, hiphop, dancehall. Campus events & parties.", contact: { method: "WhatsApp", detail: "+233 27 890 1234", note: "Send event date, venue and crowd size." } },
  { id: 7, title: "French Language Lessons",        price: 100, category: "Lessons",       provider: "Leila N.",  university: "GIJ",      rating: 4.8, reviews: 27, image: 37, delivery: "online",    liveSession: true,  badge: "Popular",   desc: "Beginner to intermediate. Conversational focus." },
  { id: 8, title: "CV & Cover Letter Writing",      price: 120, category: "Career",        provider: "Sara B.",   university: "UDS",      rating: 4.7, reviews: 44, image: 38, delivery: "online",    liveSession: false, badge: null,        desc: "ATS-optimized CVs. LinkedIn profile included. 24hr turnaround.", contact: { method: "Email", detail: "sara.b@gmail.com", note: "Email me your current CV and the job you're applying for." } },
]

const CATEGORIES = ["All", "Lessons", "Photography", "Cleaning", "Design", "Entertainment", "Career"]
const DATE_OPTIONS = ["Today", "Tomorrow", "In 2 days", "In 3 days", "In 4 days", "In 5 days", "In 6 days", "In 7 days"]
const TIME_OPTIONS = ["6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"]
const REPORT_REASONS = ["Service not delivered","Provider was rude or threatening","Fake listing","Service not as described","No-show","Other"]

// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(star => {
        const active = hovered ?? value
        const full = active >= star
        const half = active >= star - 0.5 && active < star
        return (
          <div key={star} style={{ position: "relative", width: "36px", height: "36px", cursor: readonly ? "default" : "pointer" }}>
            <span style={{ fontSize: "32px", color: "#222", position: "absolute" }}>☆</span>
            {half && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute", overflow: "hidden", width: "50%" }}>★</span>}
            {full && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute" }}>★</span>}
            {!readonly && (
              <>
                <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%" }}
                  onMouseEnter={() => setHovered(star - 0.5)} onMouseLeave={() => setHovered(null)} onClick={() => onChange(star - 0.5)} />
                <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%" }}
                  onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(null)} onClick={() => onChange(star)} />
              </>
            )}
          </div>
        )
      })}
      {!readonly && <span style={{ fontSize: "16px", fontWeight: "700", color: "#c8a97e", marginLeft: "6px" }}>{(hovered ?? value) || ""}</span>}
    </div>
  )
}

// ── Rating + Report ──────────────────────────────────────────────────────────
function RatingAndReport({ orderId, providerName, onDone }) {
  const [rating, setRating] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}"); return s[orderId] || 0 } catch { return 0 }
  })
  const [rated, setRated] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}"); return !!s[orderId] } catch { return false }
  })
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportError, setReportError] = useState("")

  const handleRate = () => {
    if (!rating) return
    const saved = JSON.parse(localStorage.getItem("silkroad_ratings") || "{}")
    saved[orderId] = rating
    localStorage.setItem("silkroad_ratings", JSON.stringify(saved))
    setRated(true)
  }

  const handleReport = () => {
    if (!reportReason) { setReportError("Please select a reason."); return }
    const reports = JSON.parse(localStorage.getItem("silkroad_reports") || "[]")
    reports.push({ orderId, providerName, reason: reportReason, date: new Date().toISOString() })
    localStorage.setItem("silkroad_reports", JSON.stringify(reports))
    setReportSubmitted(true)
  }

  if (reportSubmitted) return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ fontSize: "48px" }}>📋</div>
      <div style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>Report Submitted</div>
      <p style={{ fontSize: "13px", color: "#666" }}>Our team will review and follow up.</p>
      <button className="btn-gold" onClick={onDone} style={{ padding: "13px", borderRadius: "10px", fontSize: "15px" }}>Done</button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {!showReport ? (
        <>
          <div style={{ background: "#161616", borderRadius: "14px", padding: "20px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>⭐ Rate {providerName}</div>
            {!rated ? (
              <>
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && <div style={{ fontSize: "12px", color: "#c8a97e" }}>{rating <= 1 ? "Very poor" : rating <= 2 ? "Poor" : rating <= 3 ? "Average" : rating <= 4 ? "Good" : "Excellent!"}</div>}
                <button className="btn-gold" onClick={handleRate} disabled={!rating}
                  style={{ padding: "12px", borderRadius: "10px", fontSize: "14px", opacity: rating > 0 ? 1 : 0.4, cursor: rating > 0 ? "pointer" : "not-allowed" }}>
                  Submit Rating
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StarRating value={rating} onChange={() => {}} readonly />
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved.</div>
                <button className="btn-ghost" onClick={() => setRated(false)} style={{ padding: "10px", borderRadius: "10px", fontSize: "13px" }}>✏️ Change Rating</button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-gold" onClick={onDone} style={{ flex: 2, padding: "13px", borderRadius: "10px", fontSize: "14px" }}>Back to Marketplace</button>
            <button onClick={() => setShowReport(true)}
              style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}>🚩 Report</button>
          </div>
        </>
      ) : (
        <div style={{ background: "#161616", borderRadius: "14px", padding: "20px", border: "1px solid #7f1d1d", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {providerName}</div>
          {REPORT_REASONS.map(r => (
            <div key={r} onClick={() => setReportReason(r)}
              style={{ padding: "11px 14px", borderRadius: "10px", background: reportReason === r ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === r ? "#991b1b" : "#222"}`, cursor: "pointer", fontSize: "13px", color: reportReason === r ? "#fca5a5" : "#666" }}>
              {r}
            </div>
          ))}
          {reportError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {reportError}</div>}
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-ghost" onClick={() => { setShowReport(false); setReportError("") }} style={{ flex: 1, padding: "12px", borderRadius: "10px" }}>Cancel</button>
            <button onClick={handleReport}
              style={{ flex: 2, background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}>Submit Report</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Jitsi Live Session ───────────────────────────────────────────────────────
function JitsiSession({ roomId, displayName, onEnd }) {
  const [joined, setJoined] = useState(false)
  const [api, setApi] = useState(null)

  const handleJoin = () => {
    setJoined(true)
    setTimeout(() => {
      if (!window.JitsiMeetExternalAPI) { alert("Jitsi failed to load. Check your connection."); return }
      const jitsiApi = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: `silkroadgh-${roomId}`,
        width: "100%",
        height: 420,
        parentNode: document.getElementById(`jitsi-${roomId}`),
        userInfo: { displayName },
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false, startWithVideoMuted: false, disableDeepLinking: true },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone", "camera", "desktop", "chat", "raisehand", "tileview", "hangup"], SHOW_JITSI_WATERMARK: false, MOBILE_APP_PROMO: false },
      })
      jitsiApi.addEventListener("videoConferenceLeft", () => onEnd())
      jitsiApi.addEventListener("readyToClose", () => onEnd())
      setApi(jitsiApi)
    }, 300)
  }

  const handleEnd = () => {
    if (api) { try { api.dispose() } catch {} }
    onEnd()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {!joined ? (
        <div style={{ background: "#0a0a1a", border: "1px solid #1d4ed8", borderRadius: "16px", padding: "32px 26px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "52px" }}>🎥</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#93c5fd" }}>Live Session Ready</div>
          <div style={{ fontSize: "13px", color: "#555" }}>Room: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>silkroadgh-{roomId}</span></div>
          <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "12px 16px", fontSize: "12px", color: "#fcd34d" }}>
            ⚠️ Once you join, payment becomes non-refundable.
          </div>
          <button onClick={handleJoin} style={{ background: "#1d4ed8", border: "none", padding: "15px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff" }}>
            🎥 Join Live Session Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "#e11d4818", border: "1px solid #e11d48", borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — Session in progress</span>
          </div>
          <div id={`jitsi-${roomId}`} style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #1d4ed8", minHeight: "420px", background: "#000" }} />
          <button onClick={handleEnd} style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>🔴 End Session</button>
        </div>
      )}
    </div>
  )
}

// ── Service Detail Modal ─────────────────────────────────────────────────────
function ServiceDetailModal({ service, onClose, onBook, toUSD }) {
  if (!service) return null
  const isDbItem = !!service._id
  const providerName = isDbItem ? service.seller?.name : service.provider
  const university = isDbItem ? service.seller?.university : service.university
  const itemImage = service.image || `https://picsum.photos/seed/${service.image || service.id}/600/350`
  const delivery = service.serviceDelivery || service.delivery || "online"
  const liveSession = service.liveSession || false

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={itemImage} alt={service.title} style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "20px 20px 0 0" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #111)", borderRadius: "20px 20px 0 0", pointerEvents: "none" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>✕</button>
          <div style={{ position: "absolute", top: "14px", left: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {service.badge && <span style={{ background: "#064e3bdd", color: "#6ee7b7", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", border: "1px solid #065f46", backdropFilter: "blur(4px)" }}>⭐ {service.badge}</span>}
            {liveSession && <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", backdropFilter: "blur(4px)" }}>🔴 Live Session</span>}
          </div>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>{service.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>{service.title}</h2>
            <div style={{ fontSize: "13px", color: "#555" }}>by <span style={{ color: "#888", fontWeight: "600" }}>{providerName}</span></div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "3px" }}>🎓 {university}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {service.rating > 0 && (
              <div style={{ fontSize: "13px", color: "#c8a97e" }}>{"★".repeat(Math.round(service.rating))}{"☆".repeat(5 - Math.round(service.rating))} <span style={{ color: "#555", fontSize: "12px" }}>{service.rating} ({service.reviews || 0})</span></div>
            )}
            <span style={{ background: delivery === "online" ? "#1e3a5f" : "#2a1a3f", color: delivery === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px" }}>
              {delivery === "online" ? "🌐 Online" : "📍 In-Person"}
            </span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px" }}>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", margin: 0 }}>{service.desc}</p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "9px" }}>
            <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>What to expect</div>
            {liveSession ? (
              <>
                <div style={{ fontSize: "13px", color: "#888" }}>🎥 Provider schedules a live Jitsi video session after payment.</div>
                <div style={{ fontSize: "13px", color: "#888" }}>📅 Cancel before session starts for a full refund.</div>
                <div style={{ fontSize: "13px", color: "#888" }}>🔒 Once session starts, payment is non-refundable.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "13px", color: "#888" }}>📞 Provider's contact details revealed after payment.</div>
                <div style={{ fontSize: "13px", color: "#888" }}>🔒 Payment held in escrow until you confirm completion.</div>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: "18px" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.03em" }}>₵{(service.price || 0).toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#444" }}>${toUSD(service.price || 0)} USD</div>
            </div>
            <button className="btn-gold" onClick={() => { onBook(service); onClose() }} style={{ padding: "13px 28px", borderRadius: "12px", fontSize: "14px" }}>
              Book Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RequestService({ rate }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [detailService, setDetailService] = useState(null)
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState("")
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
      .catch(() => {})
      .finally(() => setLoadingListings(false))
  }, [])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible") }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    )
    const cards = document.querySelectorAll(".reveal")
    cards.forEach(c => observer.observe(c))
    return () => observer.disconnect()
  }, [dbServices, activeCategory, loadingListings])

  const services = dbServices.length > 0 ? dbServices : STATIC_SERVICES
  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  const getProviderName = (s) => s._id ? s.seller?.name : s.provider
  const getUniversity = (s) => s._id ? s.seller?.university : s.university
  const getDelivery = (s) => s.serviceDelivery || s.delivery || "online"
  const getLiveSession = (s) => s.liveSession || false
  const getContact = (s) => s.contact || null
  const getItemImage = (s) => s.image || `https://picsum.photos/seed/${s.image || s.id}/300/200`

  const platformFee = selected ? Math.round((selected.price || 0) * 0.08) : 0
  const providerGets = selected ? (selected.price || 0) - platformFee : 0

  const openService = (service) => {
    setSelected(service); setStep(1); setPhone(""); setPayLoading(false)
    setCancelled(false); setBuyerConfirmed(false); setShowRating(false); setSessionEnded(false)
    setScheduledDate(""); setScheduledTime(""); setScheduleConfirmed(false); setInSession(false)
  }

  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = () => {
    if (!phone.trim()) return alert("Please enter your MTN MoMo number")
    setPayLoading(true)
    setTimeout(() => {
      setPayLoading(false)
      const order = {
        id: orderId, type: "service", service: selected, amount: selected.price || 0,
        platformFee, providerGets, buyerConfirmed: false, providerConfirmed: false,
        cancelled: false, sessionEnded: false, createdAt: Date.now(), expiresAt: null,
      }
      saveOrder(order)
      setStep(3)
    }, 3000)
  }

  const handleConfirmService = () => { setBuyerConfirmed(true); setShowRating(true) }
  const handleCancelService = () => setCancelled(true)
  const handleSessionEnd = () => { setInSession(false); setSessionEnded(true); setShowRating(true) }

  const filtered = services.filter(s => activeCategory === "All" || s.category === activeCategory)

  const inputStyle = {
    width: "100%", background: "#161616", border: "1px solid #1e1e1e", color: "#fff",
    padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  }

  const selectStyle = {
    background: "#161616", border: "1px solid #222", color: "#fff", padding: "10px",
    borderRadius: "10px", fontSize: "13px", outline: "none", fontFamily: "inherit",
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "36px 18px 24px" }}>

      {step === 0 && (
        <>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: "800", color: "#f0ede8", letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "10px" }}>
              Request a Service 🛠️
            </h1>
            <p style={{ color: "#444", fontSize: "14px", maxWidth: "380px", lineHeight: "1.7" }}>Book skilled students for lessons, events, cleaning and more.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`pill ${activeCategory === cat ? "active" : ""}`}>
                {cat}
              </button>
            ))}
          </div>

          {loadingListings && (
            <div className="empty-state"><div className="icon">⏳</div><div className="title">Loading services...</div></div>
          )}

          {!loadingListings && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {filtered.map((service, index) => {
                const providerName = getProviderName(service)
                const university = getUniversity(service)
                const delivery = getDelivery(service)
                const liveSession = getLiveSession(service)
                const itemImage = getItemImage(service)

                return (
                  <div key={service._id || service.id} className="listing-card reveal" style={{ animationDelay: `${(index % 8) * 55}ms` }}>
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      <img src={itemImage} alt={service.title} onClick={() => setDetailService(service)}
                        style={{ width: "100%", height: "180px", objectFit: "cover", cursor: "pointer" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, #111 0%, transparent 100%)", pointerEvents: "none" }} />
                      {service.badge && (
                        <span style={{ position: "absolute", top: "10px", left: "10px", background: "#064e3bcc", color: "#6ee7b7", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", border: "1px solid #065f46", pointerEvents: "none", backdropFilter: "blur(4px)" }}>
                          ⭐ {service.badge}
                        </span>
                      )}
                      <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", pointerEvents: "none" }}>
                        <span style={{ background: delivery === "online" ? "#1e3a5fcc" : "#2a1a3fcc", color: delivery === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", backdropFilter: "blur(4px)" }}>
                          {delivery === "online" ? "🌐 Online" : "📍 In-Person"}
                        </span>
                        {liveSession && (
                          <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", backdropFilter: "blur(4px)" }}>
                            🔴 Live Session
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: "16px" }}>
                      <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>{service.category}</div>
                      <div onClick={() => setDetailService(service)} style={{ fontSize: "14px", fontWeight: "700", marginBottom: "6px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3" }}>{service.title}</div>
                      <div style={{ fontSize: "12px", color: "#444", marginBottom: "2px" }}>by <span style={{ color: "#666" }}>{providerName}</span></div>
                      <div style={{ fontSize: "11px", color: "#333", marginBottom: "14px" }}>🎓 {university}</div>
                      {service.rating > 0 && (
                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>{"★".repeat(Math.round(service.rating))} {service.rating} ({service.reviews || 0})</div>
                      )}
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#c8a97e", marginBottom: "14px", letterSpacing: "-0.02em" }}>
                        ₵{(service.price || 0).toLocaleString()}
                        <span style={{ fontSize: "12px", color: "#333", fontWeight: "400" }}> (${toUSD(service.price || 0)})</span>
                      </div>
                      <button className="btn-gold" onClick={() => openService(service)} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: "13px" }}>
                        Book Now
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {detailService && step === 0 && (
        <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} onBook={openService} toUSD={toUSD} />
      )}

      {/* ── BOOKING FLOW ── */}
      {step > 0 && selected && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "Book Service" : step === 2 ? "Payment" : step === 3 ? "Booking Confirmed" : "Live Session"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {step === 1 && (
                <>
                  <img src={getItemImage(selected)} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "14px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555" }}>by {getProviderName(selected)}</div>
                    <div style={{ fontSize: "12px", color: "#444" }}>🎓 {getUniversity(selected)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ background: getDelivery(selected) === "online" ? "#1e3a5f" : "#2a1a3f", color: getDelivery(selected) === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>
                      {getDelivery(selected) === "online" ? "🌐 Online" : "📍 In-Person"}
                    </span>
                    {getLiveSession(selected) && (
                      <span style={{ background: "#e11d4818", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" }}>
                        🔴 Live Session via Jitsi
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>{selected.desc}</p>
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Service fee</span><span>₵{selected.price || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Platform fee (8%)</span><span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                      <span>Total</span><span>₵{selected.price || 0} (${toUSD(selected.price || 0)})</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6ee7b7", background: "#064e3b18", borderRadius: "10px", padding: "10px 14px" }}>
                      🔒 {getLiveSession(selected) ? "Cancel before session starts for a full refund." : "Cancel before provider contacts you for a full refund."}
                    </div>
                  </div>
                  <button className="btn-gold" onClick={() => setStep(2)} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>
                    Continue to Payment →
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ background: "#ffd700", borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ fontSize: "32px" }}>📱</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a00" }}>MTN MoMo Ghana</div>
                      <div style={{ fontSize: "12px", color: "#554400" }}>Secured · Held in escrow</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".08em" }}>MTN MOMO NUMBER</div>
                    <input placeholder="e.g. 0241234567" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "16px", fontSize: "13px", color: "#666" }}>
                    <div>Amount: <span style={{ color: "#c8a97e", fontWeight: "800", fontSize: "17px" }}>₵{selected.price || 0}</span> (${toUSD(selected.price || 0)})</div>
                    <div style={{ marginTop: "8px", fontSize: "12px" }}>💰 {getProviderName(selected)} receives ₵{providerGets} after platform fee</div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                    <button onClick={handlePay} disabled={payLoading}
                      style={{ flex: 2, background: "#ffd700", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: payLoading ? "not-allowed" : "pointer", fontSize: "15px", color: "#000", opacity: payLoading ? 0.7 : 1 }}>
                      {payLoading ? "⏳ Awaiting MoMo..." : `Pay ₵${selected.price || 0}`}
                    </button>
                  </div>
                </>
              )}

              {step === 3 && !cancelled && !showRating && !inSession && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>✅</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Payment Successful!</h3>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>
                      {getLiveSession(selected)
                        ? `${getProviderName(selected)} will schedule your session. You'll see the time below once confirmed.`
                        : `${getProviderName(selected)}'s contact details are now visible below.`}
                    </p>
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  {!getLiveSession(selected) && getContact(selected) && (
                    <div style={{ background: "#161616", border: "1px solid #c8a97e33", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".08em" }}>🔓 PROVIDER CONTACT DETAILS</div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "600", marginBottom: "3px" }}>METHOD</div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{getContact(selected).method}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "600", marginBottom: "3px" }}>CONTACT</div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#c8a97e" }}>{getContact(selected).detail}</div>
                      </div>
                      {getContact(selected).note && (
                        <div style={{ background: "#111", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
                          📝 {getContact(selected).note}
                        </div>
                      )}
                    </div>
                  )}

                  {getLiveSession(selected) && (
                    <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {!scheduleConfirmed ? (
                        <>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#93c5fd" }}>⏳ Awaiting Session Schedule</div>
                          <p style={{ fontSize: "13px", color: "#666", margin: 0, lineHeight: "1.6" }}>
                            {getProviderName(selected)} is picking a time. Use your Order ID to check back anytime.
                          </p>
                          <div style={{ background: "#111", border: "1px dashed #2a2a2a", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ fontSize: "11px", color: "#444", fontWeight: "600" }}>🛠️ PROVIDER: Schedule this session</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              <select value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={selectStyle}>
                                <option value="">Pick date</option>
                                {DATE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} style={selectStyle}>
                                <option value="">Pick time</option>
                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <button onClick={() => { if (scheduledDate && scheduledTime) setScheduleConfirmed(true) }}
                              style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "11px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                              ✅ Confirm & Notify Buyer
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7" }}>📅 Session Scheduled!</div>
                          <div style={{ background: "#c8a97e18", border: "1px solid #c8a97e33", borderRadius: "12px", padding: "16px" }}>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>YOUR SESSION TIME</div>
                            <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.01em" }}>{scheduledDate} at {scheduledTime}</div>
                          </div>
                          <button onClick={() => setInSession(true)}
                            style={{ background: "#1d4ed8", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff" }}>
                            🎥 Join Live Session
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Payment released to {getProviderName(selected)} only after you confirm service is complete.
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!getLiveSession(selected) && (
                      <button onClick={handleConfirmService}
                        style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                        ✅ Confirm Completed
                      </button>
                    )}
                    <button onClick={handleCancelService}
                      style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                      ❌ Cancel & Refund
                    </button>
                  </div>
                </>
              )}

              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Booking Cancelled</h3>
                  <p style={{ color: "#666", fontSize: "14px" }}>Your full refund of ₵{selected.price || 0} is being returned to your MTN MoMo.</p>
                  <button className="btn-gold" onClick={reset} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Services</button>
                </div>
              )}

              {step === 3 && showRating && !getLiveSession(selected) && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Service Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>Payment of ₵{providerGets} released to {getProviderName(selected)}.</p>
                  </div>
                  <RatingAndReport orderId={orderId} providerName={getProviderName(selected)} onDone={reset} />
                </>
              )}

              {step === 3 && inSession && !sessionEnded && (
                <>
                  <div style={{ background: "#e11d4818", border: "1px solid #e11d48", borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — {selected.title} with {getProviderName(selected)}</span>
                  </div>
                  <JitsiSession roomId={orderId} displayName="Buyer" onEnd={handleSessionEnd} />
                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Session in progress. Payment of ₵{selected.price || 0} is non-refundable.
                  </div>
                </>
              )}

              {step === 3 && showRating && getLiveSession(selected) && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Session Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>Payment of ₵{providerGets} released to {getProviderName(selected)}.</p>
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
