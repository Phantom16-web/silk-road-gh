import { useState } from "react"
import { saveOrder, generateOrderId, OrderIdBanner } from "./OrderTracker"

const SERVICES = [
  { id: 1, title: "Mathematics Private Lessons", price: 120, category: "Lessons", provider: "James O.", university: "KNUST", rating: 4.9, reviews: 48, image: 31, delivery: "online", liveSession: true, badge: "Top Rated", desc: "Covers calculus, algebra, statistics. Flexible schedule. All levels welcome." },
  { id: 2, title: "Concert & Event Photography", price: 800, category: "Photography", provider: "Nour H.", university: "UG Legon", rating: 4.8, reviews: 23, image: 32, delivery: "in-person", liveSession: false, badge: null, desc: "Full event coverage, edited photos delivered within 48hrs.", contact: { method: "WhatsApp", detail: "+233 24 567 8901", note: "Message me first with your event date and location." } },
  { id: 3, title: "Room & Hostel Cleaning", price: 80, category: "Cleaning", provider: "Ama S.", university: "UG Legon", rating: 4.7, reviews: 61, image: 33, delivery: "in-person", liveSession: false, badge: "Popular", desc: "Deep cleaning, laundry, ironing. Available weekends.", contact: { method: "Phone", detail: "+233 50 123 4567", note: "Call between 8am and 6pm. Same day bookings welcome." } },
  { id: 4, title: "Python & Data Science Tutoring", price: 150, category: "Lessons", provider: "Kofi T.", university: "Ashesi", rating: 5.0, reviews: 34, image: 34, delivery: "online", liveSession: true, badge: "Top Rated", desc: "NumPy, Pandas, ML basics. Live coding sessions via video call." },
  { id: 5, title: "Graphic Design – Logo & Branding", price: 300, category: "Design", provider: "Fiona L.", university: "UCC", rating: 4.9, reviews: 19, image: 35, delivery: "online", liveSession: false, badge: null, desc: "Logo, brand kit, social media templates. 3 revision rounds included.", contact: { method: "Instagram", detail: "@fiona.designs", note: "DM me with your brief and I'll respond within 2hrs." } },
  { id: 6, title: "DJ Services for Events", price: 600, category: "Entertainment", provider: "Elias T.", university: "UDS", rating: 4.6, reviews: 12, image: 36, delivery: "in-person", liveSession: false, badge: null, desc: "Afrobeats, hiphop, dancehall. Campus events & parties.", contact: { method: "WhatsApp", detail: "+233 27 890 1234", note: "Send event details — date, venue, expected crowd size." } },
  { id: 7, title: "French Language Lessons", price: 100, category: "Lessons", provider: "Leila N.", university: "GIJ", rating: 4.8, reviews: 27, image: 37, delivery: "online", liveSession: true, badge: "Popular", desc: "Beginner to intermediate. Conversational focus. Flexible scheduling." },
  { id: 8, title: "CV & Cover Letter Writing", price: 120, category: "Career", provider: "Sara B.", university: "UDS", rating: 4.7, reviews: 44, image: 38, delivery: "online", liveSession: false, badge: null, desc: "ATS-optimized CVs. LinkedIn profile included. 24hr turnaround.", contact: { method: "Email", detail: "sara.b@gmail.com", note: "Email me your current CV and the job you're applying for." } },
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
            <span style={{ fontSize: "32px", color: "#333", position: "absolute" }}>☆</span>
            {half && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute", overflow: "hidden", width: "50%" }}>★</span>}
            {full && <span style={{ fontSize: "32px", color: "#c8a97e", position: "absolute" }}>★</span>}
            {!readonly && (
              <>
                <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%" }}
                  onMouseEnter={() => setHovered(star - 0.5)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onChange(star - 0.5)} />
                <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%" }}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onChange(star)} />
              </>
            )}
          </div>
        )
      })}
      {!readonly && (
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#c8a97e", marginLeft: "6px" }}>
          {(hovered ?? value) || ""}
        </span>
      )}
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
      <p style={{ fontSize: "13px", color: "#888" }}>Our team will review and follow up with you.</p>
      <button onClick={onDone} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Done</button>
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
                {rating > 0 && (
                  <div style={{ fontSize: "12px", color: "#c8a97e" }}>
                    {rating <= 1 ? "Very poor" : rating <= 2 ? "Poor" : rating <= 3 ? "Average" : rating <= 4 ? "Good" : "Excellent!"}
                  </div>
                )}
                <button onClick={handleRate} disabled={!rating}
                  style={{ background: rating > 0 ? "#c8a97e" : "#1e1e1e", border: `1px solid ${rating > 0 ? "#c8a97e" : "#333"}`, color: rating > 0 ? "#000" : "#555", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: rating > 0 ? "pointer" : "not-allowed", fontSize: "14px", fontFamily: "inherit" }}>
                  Submit Rating
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StarRating value={rating} onChange={() => {}} readonly />
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved — changeable while your Order ID is active.</div>
                <button onClick={() => setRated(false)}
                  style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                  ✏️ Change Rating
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onDone}
              style={{ flex: 2, background: "#c8a97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
              Back to Marketplace
            </button>
            <button onClick={() => setShowReport(true)}
              style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
              🚩 Report
            </button>
          </div>
        </>
      ) : (
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", border: "1px solid #7f1d1d", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {providerName}</div>
          <div style={{ fontSize: "13px", color: "#888" }}>Select the reason for your report:</div>
          {REPORT_REASONS.map(r => (
            <div key={r} onClick={() => setReportReason(r)}
              style={{ padding: "10px 14px", borderRadius: "8px", background: reportReason === r ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === r ? "#991b1b" : "#2a2a2a"}`, cursor: "pointer", fontSize: "13px", color: reportReason === r ? "#fca5a5" : "#888", fontWeight: reportReason === r ? "600" : "400" }}>
              {r}
            </div>
          ))}
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

// ── Jitsi Live Session ───────────────────────────────────────────────────────
function JitsiSession({ roomId, displayName, onEnd }) {
  const [joined, setJoined] = useState(false)
  const [api, setApi] = useState(null)

  const handleJoin = () => {
    setJoined(true)
    setTimeout(() => {
      if (!window.JitsiMeetExternalAPI) {
        alert("Jitsi failed to load. Please check your internet connection.")
        return
      }
      const jitsiApi = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: `silkroadgh-${roomId}`,
        width: "100%",
        height: 420,
        parentNode: document.getElementById(`jitsi-${roomId}`),
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ["microphone", "camera", "desktop", "chat", "raisehand", "tileview", "hangup"],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
        },
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
        <div style={{ background: "#0a0a1a", border: "1px solid #1d4ed8", borderRadius: "12px", padding: "28px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "52px" }}>🎥</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#93c5fd" }}>Live Session Ready</div>
          <div style={{ fontSize: "13px", color: "#666" }}>
            Room: <span style={{ color: "#c8a97e", fontFamily: "monospace", fontSize: "14px" }}>silkroadgh-{roomId}</span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#aaa", textAlign: "left", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div>🎤 Make sure your mic and camera are ready</div>
            <div>🌐 Powered by Jitsi Meet — no install needed</div>
            <div>🔒 Private room — only people with your Order ID can join</div>
          </div>
          <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d" }}>
            ⚠️ Once you join, payment becomes non-refundable.
          </div>
          <button onClick={handleJoin}
            style={{ background: "#1d4ed8", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff" }}>
            🎥 Join Live Session Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "#e11d4822", border: "1px solid #e11d48", borderRadius: "8px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — Session in progress</span>
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
          <div id={`jitsi-${roomId}`}
            style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #1d4ed8", minHeight: "420px", background: "#000" }} />
          <button onClick={handleEnd}
            style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
            🔴 End Session
          </button>
        </div>
      )}
    </div>
  )
}

// ── Service Detail Modal ─────────────────────────────────────────────────────
function ServiceDetailModal({ service, onClose, onBook, toUSD }) {
  if (!service) return null
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={`https://picsum.photos/seed/${service.image}/600/350`} alt={service.title} style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "16px 16px 0 0" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "12px", right: "12px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {service.badge && <span style={{ background: "#064e3b", color: "#6ee7b7", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", border: "1px solid #065f46" }}>⭐ {service.badge}</span>}
            {service.liveSession && <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>🔴 Live Session</span>}
          </div>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>{service.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>{service.title}</h2>
            <div style={{ fontSize: "13px", color: "#666" }}>by <span style={{ color: "#aaa", fontWeight: "600" }}>{service.provider}</span></div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>🎓 {service.university}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "14px", color: "#c8a97e" }}>
              {"★".repeat(Math.round(service.rating))}{"☆".repeat(5 - Math.round(service.rating))}
              <span style={{ color: "#666", fontSize: "13px" }}> {service.rating} ({service.reviews})</span>
            </div>
            <span style={{ background: service.delivery === "online" ? "#1e3a5f" : "#2a1a3f", color: service.delivery === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px" }}>
              {service.delivery === "online" ? "🌐 Online" : "📍 In-Person"}
            </span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.7", margin: 0 }}>{service.desc}</p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>What to expect</div>
            {service.liveSession ? (
              <>
                <div style={{ fontSize: "13px", color: "#aaa" }}>🎥 Provider schedules a real live video session via Jitsi after payment.</div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>📅 Cancel anytime before session starts for a full refund.</div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>🔒 Once session starts, payment is non-refundable.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "13px", color: "#aaa" }}>📞 Provider's contact details revealed immediately after payment.</div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>🤝 Coordinate directly with provider to arrange the service.</div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>🔒 Payment held in escrow and released when you confirm completion.</div>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "16px" }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#c8a97e" }}>₵{service.price.toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#555" }}>${toUSD(service.price)} USD</div>
            </div>
            <button onClick={() => { onBook(service); onClose() }}
              style={{ background: "#c8a97e", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
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
  const [email, setEmail] = useState("")
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

  const toUSD = (ghs) => {
    if (!rate) return "..."
    return (ghs * rate).toFixed(2)
  }

  const platformFee = selected ? Math.round(selected.price * 0.08) : 0
  const providerGets = selected ? selected.price - platformFee : 0

  const openService = (service) => {
    setSelected(service)
    setStep(1)
    setEmail("")
    setPhone("")
    setPayLoading(false)
    setCancelled(false)
    setBuyerConfirmed(false)
    setShowRating(false)
    setSessionEnded(false)
    setScheduledDate("")
    setScheduledTime("")
    setScheduleConfirmed(false)
    setInSession(false)
  }

  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = () => {
    if (!phone.trim()) return alert("Please enter your MTN MoMo number")
    setPayLoading(true)
    setTimeout(() => {
      setPayLoading(false)
      const order = {
        id: orderId,
        type: "service",
        service: selected,
        amount: selected.price,
        platformFee,
        providerGets,
        buyerConfirmed: false,
        providerConfirmed: false,
        cancelled: false,
        sessionEnded: false,
        createdAt: Date.now(),
        expiresAt: null,
      }
      saveOrder(order)
      setStep(3)
    }, 3000)
  }

  const handleConfirmService = () => {
    setBuyerConfirmed(true)
    setShowRating(true)
  }

  const handleCancelService = () => setCancelled(true)

  const handleSessionEnd = () => {
    setInSession(false)
    setSessionEnded(true)
    setShowRating(true)
  }

  const filtered = SERVICES.filter(s => activeCategory === "All" || s.category === activeCategory)

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>

      {/* ── BROWSE ── */}
      {step === 0 && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Request a Service</h2>
            <p style={{ color: "#666", fontSize: "14px" }}>Book skilled students for lessons, events, cleaning and more.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: "7px 16px", borderRadius: "100px", border: `1.5px solid ${activeCategory === cat ? "#c8a97e" : "#2a2a2a"}`, background: activeCategory === cat ? "#c8a97e" : "transparent", color: activeCategory === cat ? "#000" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {filtered.map(service => (
              <div key={service.id}
                style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e", transition: "transform 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ position: "relative" }}>
                  <img src={`https://picsum.photos/seed/${service.image}/300/200`} alt={service.title}
                    onClick={() => setDetailService(service)}
                    style={{ width: "100%", height: "160px", objectFit: "cover", cursor: "pointer", display: "block" }} />
                  {service.badge && (
                    <span style={{ position: "absolute", top: "10px", left: "10px", background: "#064e3b", color: "#6ee7b7", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", border: "1px solid #065f46", pointerEvents: "none" }}>
                      ⭐ {service.badge}
                    </span>
                  )}
                  <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", pointerEvents: "none" }}>
                    <span style={{ background: service.delivery === "online" ? "#1e3a5f" : "#2a1a3f", color: service.delivery === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
                      {service.delivery === "online" ? "🌐 Online" : "📍 In-Person"}
                    </span>
                    {service.liveSession && (
                      <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px" }}>
                        🔴 Live Session
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{service.category}</div>
                  <div onClick={() => setDetailService(service)} style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3" }}>{service.title}</div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>by {service.provider}</div>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>🎓 {service.university}</div>
                  <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>
                    {"★".repeat(Math.round(service.rating))} {service.rating} ({service.reviews})
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e", marginBottom: "10px" }}>
                    ₵{service.price.toLocaleString()}
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "400" }}> (${toUSD(service.price)})</span>
                  </div>
                  <button onClick={() => openService(service)}
                    style={{ width: "100%", background: "#c8a97e", border: "none", padding: "9px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailService && step === 0 && (
        <ServiceDetailModal
          service={detailService}
          onClose={() => setDetailService(null)}
          onBook={openService}
          toUSD={toUSD}
        />
      )}

      {/* ── BOOKING FLOW MODAL ── */}
      {step > 0 && selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "Book Service" : step === 2 ? "Payment" : step === 3 ? "Booking Confirmed" : "Live Session"}
              </span>
              {step <= 2 && (
                <button onClick={reset} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
              )}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* ── STEP 1: Review & Book ── */}
              {step === 1 && (
                <>
                  <img src={`https://picsum.photos/seed/${selected.image}/600/300`} alt={selected.title}
                    style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "10px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "2px" }}>by {selected.provider}</div>
                    <div style={{ fontSize: "12px", color: "#555" }}>🎓 {selected.university}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ background: selected.delivery === "online" ? "#1e3a5f" : "#2a1a3f", color: selected.delivery === "online" ? "#93c5fd" : "#c4b5fd", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px" }}>
                      {selected.delivery === "online" ? "🌐 Online" : "📍 In-Person"}
                    </span>
                    {selected.liveSession && (
                      <span style={{ background: "#e11d4822", border: "1px solid #e11d48", color: "#fca5a5", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px" }}>
                        🔴 Live Session via Jitsi
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6" }}>{selected.desc}</p>
                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                      <span>Service fee</span><span>₵{selected.price}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                      <span>Platform fee (8%)</span><span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px", fontWeight: "700", color: "#c8a97e", borderTop: "1px solid #2a2a2a", paddingTop: "8px" }}>
                      <span>Total</span><span>₵{selected.price} (${toUSD(selected.price)})</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6ee7b7", background: "#064e3b22", borderRadius: "8px", padding: "8px 12px" }}>
                      🔒 {selected.liveSession ? "Cancel anytime before session starts for a full refund." : "Cancel before provider contacts you for a full refund."}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)}
                    style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    Continue to Payment →
                  </button>
                </>
              )}

              {/* ── STEP 2: Payment ── */}
              {step === 2 && (
                <>
                  <div style={{ background: "#ffd700", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "32px" }}>📱</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a00" }}>MTN MoMo Ghana</div>
                      <div style={{ fontSize: "12px", color: "#554400" }}>Secured by Paystack · Held in escrow</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>YOUR EMAIL</div>
                    <input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>MTN MOMO NUMBER</div>
                    <input placeholder="e.g. 0241234567" value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#888" }}>
                    <div>Amount: <span style={{ color: "#c8a97e", fontWeight: "700", fontSize: "16px" }}>₵{selected.price}</span> (${toUSD(selected.price)})</div>
                    <div style={{ marginTop: "6px", fontSize: "12px" }}>💰 {selected.provider} receives ₵{providerGets} after platform fee</div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                    <button onClick={handlePay}
                      style={{ flex: 2, background: "#ffd700", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#000" }}>
                      {payLoading ? "⏳ Awaiting MoMo..." : `Pay ₵${selected.price}`}
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 3: Confirmed — buyer view ── */}
              {step === 3 && !cancelled && !showRating && !inSession && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Payment Successful!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                      {selected.liveSession
                        ? `${selected.provider} will schedule your session. You'll see the time below once confirmed.`
                        : `${selected.provider}'s contact details are now visible below.`}
                    </p>
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  {/* Non-live: contact details */}
                  {!selected.liveSession && selected.contact && (
                    <div style={{ background: "#1a1a1a", border: "1px solid #c8a97e44", borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".06em" }}>🔓 PROVIDER CONTACT DETAILS</div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "2px" }}>METHOD</div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{selected.contact.method}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "2px" }}>CONTACT</div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#c8a97e" }}>{selected.contact.detail}</div>
                      </div>
                      {selected.contact.note && (
                        <div style={{ background: "#111", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "#aaa", lineHeight: "1.6" }}>
                          📝 {selected.contact.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live: scheduling */}
                  {selected.liveSession && (
                    <div style={{ background: "#1a1a1a", border: "1px solid #1e1e1e", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {!scheduleConfirmed ? (
                        <>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#93c5fd" }}>⏳ Awaiting Session Schedule</div>
                          <p style={{ fontSize: "13px", color: "#888", margin: 0, lineHeight: "1.6" }}>
                            {selected.provider} is picking a time for your session. This page will update once confirmed. Use your Order ID to check back anytime.
                          </p>
                          {/* Provider scheduling UI — in production this is in provider's account */}
                          <div style={{ background: "#111", border: "1px dashed #2a2a2a", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
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
                            <button
                              onClick={() => { if (scheduledDate && scheduledTime) setScheduleConfirmed(true) }}
                              style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                              ✅ Confirm & Notify Buyer
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#6ee7b7" }}>📅 Session Scheduled!</div>
                          <div style={{ background: "#c8a97e22", border: "1px solid #c8a97e44", borderRadius: "10px", padding: "14px" }}>
                            <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>YOUR SESSION TIME</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e" }}>{scheduledDate} at {scheduledTime}</div>
                          </div>
                          <button onClick={() => setInSession(true)}
                            style={{ background: "#1d4ed8", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#fff" }}>
                            🎥 Join Live Session
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Payment released to {selected.provider} only after you confirm service is complete.
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!selected.liveSession && (
                      <button onClick={handleConfirmService}
                        style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                        ✅ Confirm Completed
                      </button>
                    )}
                    <button onClick={handleCancelService}
                      style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                      ❌ Cancel & Refund
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 3: CANCELLED ── */}
              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Booking Cancelled</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your full refund of ₵{selected.price} is being returned to your MTN MoMo.</p>
                  <button onClick={reset} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Services</button>
                </div>
              )}

              {/* ── STEP 3: RATING (non-live) ── */}
              {step === 3 && showRating && !selected.liveSession && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Service Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Payment of ₵{providerGets} released to {selected.provider}.</p>
                  </div>
                  <RatingAndReport orderId={orderId} providerName={selected.provider} onDone={reset} />
                </>
              )}

              {/* ── STEP 3: LIVE SESSION ── */}
              {step === 3 && inSession && !sessionEnded && (
                <>
                  <div style={{ background: "#e11d4822", border: "1px solid #e11d48", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#e11d48", borderRadius: "50%" }} />
                    <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "600" }}>LIVE — {selected.title} with {selected.provider}</span>
                  </div>
                  <JitsiSession
                    roomId={orderId}
                    displayName="Buyer"
                    onEnd={handleSessionEnd}
                  />
                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Session in progress. Payment of ₵{selected.price} is non-refundable.
                  </div>
                </>
              )}

              {/* ── STEP 3: RATING (live) ── */}
              {step === 3 && showRating && selected.liveSession && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Session Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Payment of ₵{providerGets} released to {selected.provider}.</p>
                  </div>
                  <RatingAndReport orderId={orderId} providerName={selected.provider} onDone={reset} />
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}