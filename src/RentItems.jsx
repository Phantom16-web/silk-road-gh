import { useState, useEffect } from "react"
import { getListings } from "./api"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const STATIC_RENTALS = [
  { id: 101, title: "Canon EOS M50 Camera",         price: 120, dailyRate: 120, category: "Electronics", provider: "Kwame A.",  university: "KNUST",    rating: 4.8, reviews: 34, image: 21, condition: "Excellent", desc: "Full kit with 2 lenses, 2 batteries, SD card and bag. Perfect for events and shoots.", maxDays: 7,  accountability: true,  accountabilityPct: 30 },
  { id: 102, title: "Projector – Epson X41",         price: 80,  dailyRate: 80,  category: "Electronics", provider: "Ama S.",    university: "UG Legon", rating: 4.6, reviews: 18, image: 22, condition: "Good",      desc: "3600 lumens, HDMI + VGA. Great for presentations and movie nights.",                  maxDays: 5,  accountability: true,  accountabilityPct: 25 },
  { id: 103, title: "Mountain Bike",                 price: 50,  dailyRate: 50,  category: "Sports",      provider: "Kofi T.",   university: "KNUST",    rating: 4.7, reviews: 22, image: 23, condition: "Good",      desc: "Trek Marlin 5. Helmet included. Perfect for campus commuting.",                      maxDays: 14, accountability: false, accountabilityPct: 0  },
  { id: 104, title: "MacBook Air M1",                price: 150, dailyRate: 150, category: "Electronics", provider: "Abena M.",  university: "Ashesi",   rating: 5.0, reviews: 11, image: 24, condition: "Excellent", desc: "8GB RAM, 256GB SSD. Charger included. Great for design or dev work.",                 maxDays: 3,  accountability: true,  accountabilityPct: 50 },
  { id: 105, title: "Acoustic Guitar",               price: 40,  dailyRate: 40,  category: "Music",       provider: "Sara B.",   university: "UDS",      rating: 4.5, reviews: 9,  image: 25, condition: "Good",      desc: "Yamaha F310. Comes with picks and a capo. Good for beginners and events.",            maxDays: 7,  accountability: false, accountabilityPct: 0  },
  { id: 106, title: "Camping Tent (4-person)",       price: 60,  dailyRate: 60,  category: "Outdoors",    provider: "Elias T.",  university: "UCC",      rating: 4.4, reviews: 7,  image: 26, condition: "Good",      desc: "Easy setup dome tent. Sleeping bags available for extra fee.",                       maxDays: 5,  accountability: true,  accountabilityPct: 20 },
  { id: 107, title: "PS5 Console + 2 Controllers",   price: 100, dailyRate: 100, category: "Gaming",      provider: "Yaw D.",    university: "GIJ",      rating: 4.9, reviews: 41, image: 27, condition: "Excellent", desc: "PS5 disc edition with 2 controllers and 3 games. Weekend rentals preferred.",         maxDays: 3,  accountability: true,  accountabilityPct: 40 },
  { id: 108, title: "Scientific Calculator (Casio)", price: 15,  dailyRate: 15,  category: "Academic",    provider: "Nour H.",   university: "KNUST",    rating: 4.3, reviews: 29, image: 28, condition: "Good",      desc: "Casio fx-991EX. Perfect for exams. Available weekdays only.",                        maxDays: 2,  accountability: false, accountabilityPct: 0  },
]

const CATEGORIES = ["All", "Electronics", "Sports", "Music", "Outdoors", "Gaming", "Academic"]
const REPORT_REASONS = ["Item not delivered", "Item was damaged on arrival", "Lender was rude or threatening", "Fake listing", "Item not as described", "No-show", "Other"]

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
function RatingAndReport({ orderId, lenderName, onDone }) {
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
    reports.push({ orderId, lenderName, reason: reportReason, date: new Date().toISOString() })
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
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>⭐ Rate {lenderName}</div>
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
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved — changeable while your order ID is active.</div>
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
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {lenderName}</div>
          {REPORT_REASONS.map(r => (
            <div key={r} onClick={() => setReportReason(r)}
              style={{ padding: "11px 14px", borderRadius: "10px", background: reportReason === r ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === r ? "#991b1b" : "#222"}`, cursor: "pointer", fontSize: "13px", color: reportReason === r ? "#fca5a5" : "#666", fontWeight: reportReason === r ? "600" : "400", transition: "all 0.2s" }}>
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

// ── Rental Detail Modal ──────────────────────────────────────────────────────
function RentalDetailModal({ item, onClose, onRent, toUSD }) {
  if (!item) return null
  const isDbItem = !!item._id
  const lenderName = isDbItem ? item.seller?.name : item.provider
  const university = isDbItem ? item.seller?.university : item.university
  const dailyRate = item.dailyRate || item.price || 0

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={item.image ? item.image : `https://picsum.photos/seed/${item.image || item.id}/600/350`} alt={item.title} style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "20px 20px 0 0" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #111)", borderRadius: "20px 20px 0 0", pointerEvents: "none" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>{item.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>{item.title}</h2>
            <div style={{ fontSize: "13px", color: "#555" }}>Listed by <span style={{ color: "#888", fontWeight: "600" }}>{lenderName}</span></div>
            <div style={{ fontSize: "12px", color: "#444", marginTop: "3px" }}>🎓 {university}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {item.rating > 0 && (
              <div style={{ fontSize: "13px", color: "#c8a97e" }}>{"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))} <span style={{ color: "#555", fontSize: "12px" }}>{item.rating} ({item.reviews || 0})</span></div>
            )}
            {item.condition && <span style={{ fontSize: "11px", color: "#666", background: "#1a1a1a", padding: "3px 10px", borderRadius: "20px", border: "1px solid #222" }}>{item.condition}</span>}
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px" }}>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", margin: 0 }}>{item.desc}</p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div>📅 Max rental: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{item.maxDays || 7} days</span></div>
            {item.accountability && <div>🔒 Accountability deposit: <span style={{ color: "#fcd34d", fontWeight: "700" }}>{item.accountabilityPct || 0}% of daily rate</span></div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: "18px" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.03em" }}>₵{dailyRate}/day</div>
              <div style={{ fontSize: "12px", color: "#444" }}>${toUSD(dailyRate)}/day USD</div>
            </div>
            <button className="btn-gold" onClick={() => { onRent(item); onClose() }} style={{ padding: "13px 28px", borderRadius: "12px", fontSize: "14px" }}>
              Rent This →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rental Timer ─────────────────────────────────────────────────────────────
function RentalTimer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState(endTime - Date.now())

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(endTime - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const days = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
  const hours = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const mins = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))
  const secs = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000))
  const isNearEnd = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000
  const isExpired = timeLeft <= 0

  return (
    <div style={{ background: isExpired ? "#7f1d1d18" : isNearEnd ? "#78350f18" : "#064e3b18", border: `1px solid ${isExpired ? "#7f1d1d" : isNearEnd ? "#92400e" : "#065f46"}`, borderRadius: "14px", padding: "18px", textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: isExpired ? "#fca5a5" : isNearEnd ? "#fcd34d" : "#6ee7b7", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".08em" }}>
        {isExpired ? "⏰ Rental Period Ended" : isNearEnd ? "⚠️ Less than 24 hours left!" : "⏱️ Rental Time Remaining"}
      </div>
      {!isExpired && (
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          {[["Days", days], ["Hours", hours], ["Mins", mins], ["Secs", secs]].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: isNearEnd ? "#fcd34d" : "#c8a97e", lineHeight: 1, letterSpacing: "-0.02em" }}>{String(val).padStart(2, "0")}</div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "5px" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RentItems({ rate }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [detailItem, setDetailItem] = useState(null)
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(0)
  const [days, setDays] = useState(1)
  const [phone, setPhone] = useState("")
  const [payLoading, setPayLoading] = useState(false)
  const [orderId] = useState(() => generateOrderId())
  const [rentalTimerEnd, setRentalTimerEnd] = useState(null)
  const [renterConfirmed, setRenterConfirmed] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [showRating, setShowRating] = useState(false)

  const [dbRentals, setDbRentals] = useState([])
  const [loadingListings, setLoadingListings] = useState(false)

  useEffect(() => {
    setLoadingListings(true)
    getListings({ type: "rent", limit: 50 })
      .then(data => { if (Array.isArray(data) && data.length > 0) setDbRentals(data) })
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
  }, [dbRentals, activeCategory, loadingListings])

  const rentals = dbRentals.length > 0 ? dbRentals : STATIC_RENTALS
  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  const getDailyRate = (item) => item.dailyRate || item.price || 0
  const getLenderName = (item) => item._id ? item.seller?.name : item.provider
  const getUniversity = (item) => item._id ? item.seller?.university : item.university
  const getItemImage = (item) => item.image || `https://picsum.photos/seed/${item.image || item.id}/300/200`

  const rentalCost = selected ? getDailyRate(selected) * days : 0
  const depositAmount = selected?.accountability ? Math.round(getDailyRate(selected) * (selected.accountabilityPct / 100)) : 0
  const totalCost = rentalCost + depositAmount
  const platformFee = Math.round(rentalCost * 0.08)
  const lenderGets = rentalCost - platformFee

  const openRental = (item) => {
    setSelected(item); setStep(1); setDays(1); setPhone(""); setPayLoading(false)
    setRentalTimerEnd(null); setRenterConfirmed(false); setCancelled(false); setShowRating(false)
  }

  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = () => {
    if (!phone.trim()) return alert("Please enter your MTN MoMo number")
    setPayLoading(true)
    setTimeout(() => {
      setPayLoading(false)
      const order = {
        id: orderId, type: "rent", item: selected, days, rentalCost, depositAmount, totalCost,
        platformFee, lenderGets, renterConfirmed: false, lenderConfirmed: false, cancelled: false,
        createdAt: Date.now(), expiresAt: null,
      }
      saveOrder(order)
      setStep(3)
    }, 3000)
  }

  const handleConfirmReceipt = () => {
    const end = Date.now() + days * 24 * 60 * 60 * 1000
    setRentalTimerEnd(end)
    updateOrder(orderId, { rentalTimerEnd: end, rentalStarted: true })
    setStep(4)
  }

  const handleRenterConfirmReturn = () => {
    setRenterConfirmed(true)
    updateOrder(orderId, { renterConfirmed: true })
    setShowRating(true)
  }

  const handleCancelRental = () => {
    setCancelled(true)
    updateOrder(orderId, { cancelled: true, expiresAt: Date.now() })
  }

  const filtered = rentals.filter(item => activeCategory === "All" || item.category === activeCategory)

  const inputStyle = {
    width: "100%", background: "#161616", border: "1px solid #1e1e1e", color: "#fff",
    padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "36px 18px 24px" }}>

      {step === 0 && (
        <>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: "800", color: "#f0ede8", letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "10px" }}>
              Rent Items 📦
            </h1>
            <p style={{ color: "#444", fontSize: "14px", maxWidth: "380px", lineHeight: "1.7" }}>Borrow from fellow students. Pay per day, return when done.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`pill ${activeCategory === cat ? "active" : ""}`}>
                {cat}
              </button>
            ))}
          </div>

          {loadingListings && (
            <div className="empty-state"><div className="icon">⏳</div><div className="title">Loading rentals...</div></div>
          )}

          {!loadingListings && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {filtered.map((item, index) => {
                const dailyRate = getDailyRate(item)
                const lenderName = getLenderName(item)
                const university = getUniversity(item)
                const itemImage = getItemImage(item)

                return (
                  <div key={item._id || item.id} className="listing-card reveal" style={{ animationDelay: `${(index % 8) * 55}ms` }}>
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      <img src={itemImage} alt={item.title} onClick={() => setDetailItem(item)}
                        style={{ width: "100%", height: "180px", objectFit: "cover", cursor: "pointer" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, #111 0%, transparent 100%)", pointerEvents: "none" }} />
                      {item.accountability && (
                        <span style={{ position: "absolute", top: "10px", left: "10px", background: "#78350fcc", color: "#fcd34d", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", pointerEvents: "none", backdropFilter: "blur(4px)" }}>
                          🔒 Deposit req.
                        </span>
                      )}
                    </div>
                    <div style={{ padding: "16px" }}>
                      <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>{item.category}</div>
                      <div onClick={() => setDetailItem(item)} style={{ fontSize: "14px", fontWeight: "700", marginBottom: "6px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#444", marginBottom: "2px" }}>by <span style={{ color: "#666" }}>{lenderName}</span></div>
                      <div style={{ fontSize: "11px", color: "#333", marginBottom: "14px" }}>🎓 {university} · {item.condition || "N/A"}</div>
                      {item.rating > 0 && (
                        <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating}</div>
                      )}
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#c8a97e", marginBottom: "14px", letterSpacing: "-0.02em" }}>
                        ₵{dailyRate}/day
                        <span style={{ fontSize: "12px", color: "#333", fontWeight: "400" }}> (${toUSD(dailyRate)})</span>
                      </div>
                      <button className="btn-gold" onClick={() => openRental(item)} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: "13px" }}>
                        Rent This
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {detailItem && step === 0 && (
        <RentalDetailModal item={detailItem} onClose={() => setDetailItem(null)} onRent={openRental} toUSD={toUSD} />
      )}

      {/* ── BOOKING FLOW ── */}
      {step > 0 && selected && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "📦 Rental Details" : step === 2 ? "💳 Payment" : step === 3 ? "✅ Confirmed" : step === 4 ? "⏱️ Rental Active" : "🎉 Complete"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {step === 1 && (
                <>
                  <img src={getItemImage(selected)} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "14px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555" }}>by {getLenderName(selected)} · 🎓 {getUniversity(selected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", marginBottom: "14px", textTransform: "uppercase", letterSpacing: ".08em" }}>HOW MANY DAYS?</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "18px", justifyContent: "center" }}>
                      <button onClick={() => setDays(d => Math.max(1, d - 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#161616", border: "1px solid #222", color: "#fff", fontSize: "20px", cursor: "pointer" }}>−</button>
                      <span style={{ fontSize: "36px", fontWeight: "800", color: "#c8a97e", minWidth: "60px", textAlign: "center", letterSpacing: "-0.03em" }}>{days}</span>
                      <button onClick={() => setDays(d => Math.min(selected.maxDays || 7, d + 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#161616", border: "1px solid #222", color: "#fff", fontSize: "20px", cursor: "pointer" }}>+</button>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "12px", color: "#444", marginTop: "10px" }}>Max {selected.maxDays || 7} days</div>
                  </div>

                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Rental ({days} day{days > 1 ? "s" : ""} × ₵{getDailyRate(selected)})</span><span>₵{rentalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                        <span>Accountability deposit ({selected.accountabilityPct}%)</span><span>₵{depositAmount}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Platform fee (8%)</span><span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                      <span>Total</span><span>₵{totalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ fontSize: "12px", color: "#6ee7b7", background: "#064e3b18", borderRadius: "10px", padding: "10px 14px" }}>
                        🔒 Deposit of ₵{depositAmount} is refunded in full if you return the item undamaged.
                      </div>
                    )}
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
                    <div>Total: <span style={{ color: "#c8a97e", fontWeight: "800", fontSize: "17px" }}>₵{totalCost}</span></div>
                    <div style={{ marginTop: "8px", fontSize: "12px" }}>💰 {getLenderName(selected)} receives ₵{lenderGets} after platform fee</div>
                    {depositAmount > 0 && <div style={{ marginTop: "4px", fontSize: "12px" }}>🔒 ₵{depositAmount} deposit held until item returned</div>}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: "12px" }}>← Back</button>
                    <button onClick={handlePay} disabled={payLoading}
                      style={{ flex: 2, background: "#ffd700", border: "none", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: payLoading ? "not-allowed" : "pointer", fontSize: "15px", color: "#000", opacity: payLoading ? 0.7 : 1 }}>
                      {payLoading ? "⏳ Awaiting MoMo..." : `Pay ₵${totalCost}`}
                    </button>
                  </div>
                </>
              )}

              {step === 3 && !cancelled && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>✅</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Payment Confirmed!</h3>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>Contact {getLenderName(selected)} to arrange pickup. Start the timer once you have the item.</p>
                  </div>
                  <OrderIdBanner orderId={orderId} />
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "16px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>📦 Item: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{selected.title}</span></div>
                    <div>📅 Duration: <span style={{ color: "#888" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    <div>💰 Paid: <span style={{ color: "#888" }}>₵{totalCost}</span></div>
                    {depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{depositAmount} (refunded if undamaged)</span></div>}
                  </div>
                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ The rental timer starts when YOU confirm you've received the item below.
                  </div>
                  <button onClick={handleConfirmReceipt}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ✅ I've Received the Item — Start Timer
                  </button>
                  <button onClick={handleCancelRental}
                    style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
                    ❌ Cancel Rental — Refund Me
                  </button>
                </>
              )}

              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Rental Cancelled</h3>
                  <p style={{ color: "#666", fontSize: "14px" }}>Your refund of ₵{totalCost} is being sent to your MTN MoMo.</p>
                  <button className="btn-gold" onClick={reset} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Rentals</button>
                </div>
              )}

              {step === 4 && !showRating && rentalTimerEnd && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📦</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>Rental is active · {days} day{days > 1 ? "s" : ""}</div>
                  </div>
                  <RentalTimer endTime={rentalTimerEnd} />
                  <OrderIdBanner orderId={orderId} />
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "16px", fontSize: "13px", color: "#666" }}>
                    <div>📦 Returning to: <span style={{ color: "#888" }}>{getLenderName(selected)}</span></div>
                    <div style={{ marginTop: "8px" }}>💰 Deposit held: <span style={{ color: "#fcd34d" }}>₵{depositAmount}</span> — returned if no damage</div>
                  </div>
                  {!renterConfirmed && (
                    <button onClick={handleRenterConfirmReturn}
                      style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                      ✅ I've Returned the Item
                    </button>
                  )}
                  {renterConfirmed && (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "16px", fontSize: "13px", color: "#6ee7b7", textAlign: "center" }}>
                      ✅ You've confirmed return. Waiting for {getLenderName(selected)} to confirm on their end.
                    </div>
                  )}
                </>
              )}

              {step === 4 && showRating && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Rental Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>
                      {depositAmount > 0 ? `₵${depositAmount} deposit will be refunded once ${getLenderName(selected)} confirms no damage.` : "Thanks for returning on time!"}
                    </p>
                  </div>
                  <RatingAndReport orderId={orderId} lenderName={getLenderName(selected)} onDone={reset} />
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
