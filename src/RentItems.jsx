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

const REPORT_REASONS = [
  "Item not delivered",
  "Item was damaged on arrival",
  "Lender was rude or threatening",
  "Fake listing",
  "Item not as described",
  "No-show",
  "Other",
]

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
      <p style={{ fontSize: "13px", color: "#888" }}>Our team will review and follow up.</p>
      <button onClick={onDone} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Done</button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {!showReport ? (
        <>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>⭐ Rate {lenderName}</div>
            {!rated ? (
              <>
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && <div style={{ fontSize: "12px", color: "#c8a97e" }}>{rating <= 1 ? "Very poor" : rating <= 2 ? "Poor" : rating <= 3 ? "Average" : rating <= 4 ? "Good" : "Excellent!"}</div>}
                <button onClick={handleRate} disabled={!rating}
                  style={{ background: rating > 0 ? "#c8a97e" : "#1e1e1e", border: `1px solid ${rating > 0 ? "#c8a97e" : "#333"}`, color: rating > 0 ? "#000" : "#555", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: rating > 0 ? "pointer" : "not-allowed", fontSize: "14px", fontFamily: "inherit" }}>
                  Submit Rating
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StarRating value={rating} onChange={() => {}} readonly />
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved — changeable while your order ID is active.</div>
                <button onClick={() => setRated(false)} style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>✏️ Change Rating</button>
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
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {lenderName}</div>
          {REPORT_REASONS.map(r => (
            <div key={r} onClick={() => setReportReason(r)}
              style={{ padding: "10px 14px", borderRadius: "8px", background: reportReason === r ? "#7f1d1d" : "#111", border: `1px solid ${reportReason === r ? "#991b1b" : "#2a2a2a"}`, cursor: "pointer", fontSize: "13px", color: reportReason === r ? "#fca5a5" : "#888", fontWeight: reportReason === r ? "600" : "400" }}>
              {r}
            </div>
          ))}
          {reportError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {reportError}</div>}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { setShowReport(false); setReportError("") }} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "11px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleReport} style={{ flex: 2, background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "11px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>Submit Report</button>
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
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={item.image ? item.image : `https://picsum.photos/seed/${item.image || item.id}/600/350`} alt={item.title} style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "16px 16px 0 0" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "12px", right: "12px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>{item.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>{item.title}</h2>
            <div style={{ fontSize: "13px", color: "#666" }}>Listed by <span style={{ color: "#aaa", fontWeight: "600" }}>{lenderName}</span></div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>🎓 {university}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {item.rating > 0 && (
              <div style={{ fontSize: "14px", color: "#c8a97e" }}>{"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))} <span style={{ color: "#666", fontSize: "13px" }}>{item.rating} ({item.reviews || 0})</span></div>
            )}
            {item.condition && <span style={{ fontSize: "12px", color: "#aaa", background: "#1e1e1e", padding: "3px 10px", borderRadius: "20px", border: "1px solid #2a2a2a" }}>{item.condition}</span>}
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.7", margin: 0 }}>{item.desc}</p>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div>📅 Max rental: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{item.maxDays || 7} days</span></div>
            {item.accountability && <div>🔒 Accountability deposit: <span style={{ color: "#fcd34d", fontWeight: "700" }}>{item.accountabilityPct || 0}% of daily rate</span></div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "16px" }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#c8a97e" }}>₵{dailyRate}/day</div>
              <div style={{ fontSize: "12px", color: "#555" }}>${toUSD(dailyRate)}/day USD</div>
            </div>
            <button onClick={() => { onRent(item); onClose() }} style={{ background: "#c8a97e", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
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
    const interval = setInterval(() => {
      setTimeLeft(endTime - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const days = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
  const hours = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const mins = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))
  const secs = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000))
  const isNearEnd = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000
  const isExpired = timeLeft <= 0

  return (
    <div style={{ background: isExpired ? "#7f1d1d22" : isNearEnd ? "#78350f22" : "#064e3b22", border: `1px solid ${isExpired ? "#7f1d1d" : isNearEnd ? "#92400e" : "#065f46"}`, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: isExpired ? "#fca5a5" : isNearEnd ? "#fcd34d" : "#6ee7b7", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {isExpired ? "⏰ Rental Period Ended" : isNearEnd ? "⚠️ Less than 24 hours left!" : "⏱️ Rental Time Remaining"}
      </div>
      {!isExpired && (
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          {[["Days", days], ["Hours", hours], ["Mins", mins], ["Secs", secs]].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: isNearEnd ? "#fcd34d" : "#c8a97e", lineHeight: 1 }}>{String(val).padStart(2, "0")}</div>
              <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>{label}</div>
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

  // Backend listings
  const [dbRentals, setDbRentals] = useState([])
  const [loadingListings, setLoadingListings] = useState(false)

  useEffect(() => {
    setLoadingListings(true)
    getListings({ type: "rent", limit: 50 })
      .then(data => { if (Array.isArray(data) && data.length > 0) setDbRentals(data) })
      .catch(() => {})
      .finally(() => setLoadingListings(false))
  }, [])

  const rentals = dbRentals.length > 0 ? dbRentals : STATIC_RENTALS

  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  const getDailyRate = (item) => item.dailyRate || item.price || 0
  const getLenderName = (item) => item._id ? item.seller?.name : item.provider
  const getUniversity = (item) => item._id ? item.seller?.university : item.university
  const getItemImage = (item) => item.image || `https://picsum.photos/seed/${item.image || item.id}/300/200`

  const rentalCost = selected ? getDailyRate(selected) * days : 0
  const depositAmount = selected?.accountability
    ? Math.round(getDailyRate(selected) * (selected.accountabilityPct / 100))
    : 0
  const totalCost = rentalCost + depositAmount
  const platformFee = Math.round(rentalCost * 0.08)
  const lenderGets = rentalCost - platformFee

  const openRental = (item) => {
    setSelected(item)
    setStep(1)
    setDays(1)
    setPhone("")
    setPayLoading(false)
    setRentalTimerEnd(null)
    setRenterConfirmed(false)
    setCancelled(false)
    setShowRating(false)
  }

  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = () => {
    if (!phone.trim()) return alert("Please enter your MTN MoMo number")
    setPayLoading(true)
    setTimeout(() => {
      setPayLoading(false)
      const order = {
        id: orderId,
        type: "rent",
        item: selected,
        days,
        rentalCost,
        depositAmount,
        totalCost,
        platformFee,
        lenderGets,
        renterConfirmed: false,
        lenderConfirmed: false,
        cancelled: false,
        createdAt: Date.now(),
        expiresAt: null,
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

  const filtered = rentals.filter(item =>
    activeCategory === "All" || item.category === activeCategory
  )

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>

      {/* Browse */}
      {step === 0 && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Rent Items</h2>
            <p style={{ color: "#666", fontSize: "14px" }}>Borrow from fellow students. Pay per day, return when done.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: "7px 16px", borderRadius: "100px", border: `1.5px solid ${activeCategory === cat ? "#c8a97e" : "#2a2a2a"}`, background: activeCategory === cat ? "#c8a97e" : "transparent", color: activeCategory === cat ? "#000" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                {cat}
              </button>
            ))}
          </div>

          {loadingListings && (
            <div style={{ textAlign: "center", color: "#555", padding: "48px", fontSize: "13px" }}>⏳ Loading rentals...</div>
          )}

          {!loadingListings && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {filtered.map(item => {
                const dailyRate = getDailyRate(item)
                const lenderName = getLenderName(item)
                const university = getUniversity(item)
                const itemImage = getItemImage(item)

                return (
                  <div key={item._id || item.id}
                    style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e", transition: "transform 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <div style={{ position: "relative" }}>
                      <img src={itemImage} alt={item.title}
                        onClick={() => setDetailItem(item)}
                        style={{ width: "100%", height: "160px", objectFit: "cover", cursor: "pointer", display: "block" }} />
                      {item.accountability && (
                        <span style={{ position: "absolute", top: "10px", left: "10px", background: "#78350f", color: "#fcd34d", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", pointerEvents: "none" }}>
                          🔒 Deposit req.
                        </span>
                      )}
                    </div>
                    <div style={{ padding: "14px" }}>
                      <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{item.category}</div>
                      <div onClick={() => setDetailItem(item)} style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>by {lenderName}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>🎓 {university} · {item.condition || "N/A"}</div>
                      {item.rating > 0 && (
                        <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating}</div>
                      )}
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e", marginBottom: "10px" }}>
                        ₵{dailyRate}/day
                        <span style={{ fontSize: "13px", color: "#666", fontWeight: "400" }}> (${toUSD(dailyRate)}/day)</span>
                      </div>
                      <button onClick={() => openRental(item)}
                        style={{ width: "100%", background: "#c8a97e", border: "none", padding: "9px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
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

      {/* Detail modal */}
      {detailItem && step === 0 && (
        <RentalDetailModal item={detailItem} onClose={() => setDetailItem(null)} onRent={openRental} toUSD={toUSD} />
      )}

      {/* ── BOOKING FLOW MODAL ── */}
      {step > 0 && selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "📦 Rental Details" : step === 2 ? "💳 Payment" : step === 3 ? "✅ Confirmed" : step === 4 ? "⏱️ Rental Active" : "🎉 Complete"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* STEP 1 — Choose days */}
              {step === 1 && (
                <>
                  <img src={getItemImage(selected)} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "10px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#666" }}>by {getLenderName(selected)} · 🎓 {getUniversity(selected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "12px" }}>HOW MANY DAYS?</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
                      <button onClick={() => setDays(d => Math.max(1, d - 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", fontSize: "20px", cursor: "pointer" }}>−</button>
                      <span style={{ fontSize: "36px", fontWeight: "800", color: "#c8a97e", minWidth: "60px", textAlign: "center" }}>{days}</span>
                      <button onClick={() => setDays(d => Math.min(selected.maxDays || 7, d + 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", fontSize: "20px", cursor: "pointer" }}>+</button>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "13px", color: "#555", marginTop: "8px" }}>Max {selected.maxDays || 7} days</div>
                  </div>

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                      <span>Rental ({days} day{days > 1 ? "s" : ""} × ₵{getDailyRate(selected)})</span>
                      <span>₵{rentalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                        <span>Accountability deposit ({selected.accountabilityPct}%)</span>
                        <span>₵{depositAmount}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                      <span>Platform fee (8%)</span>
                      <span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px", fontWeight: "700", color: "#c8a97e", borderTop: "1px solid #2a2a2a", paddingTop: "8px" }}>
                      <span>Total</span><span>₵{totalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ fontSize: "12px", color: "#6ee7b7", background: "#064e3b22", borderRadius: "8px", padding: "8px 12px" }}>
                        🔒 Deposit of ₵{depositAmount} is refunded in full if you return the item undamaged.
                      </div>
                    )}
                  </div>

                  <button onClick={() => setStep(2)} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    Continue to Payment →
                  </button>
                </>
              )}

              {/* STEP 2 — Payment */}
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
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>MTN MOMO NUMBER</div>
                    <input placeholder="e.g. 0241234567" value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#888" }}>
                    <div>Total: <span style={{ color: "#c8a97e", fontWeight: "700", fontSize: "16px" }}>₵{totalCost}</span></div>
                    <div style={{ marginTop: "6px", fontSize: "12px" }}>💰 {getLenderName(selected)} receives ₵{lenderGets} after platform fee</div>
                    {depositAmount > 0 && <div style={{ marginTop: "4px", fontSize: "12px" }}>🔒 ₵{depositAmount} deposit held until item returned</div>}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                    <button onClick={handlePay}
                      style={{ flex: 2, background: "#ffd700", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#000" }}>
                      {payLoading ? "⏳ Awaiting MoMo..." : `Pay ₵${totalCost}`}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 — Confirmed, awaiting item receipt */}
              {step === 3 && !cancelled && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Payment Confirmed!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Contact {getLenderName(selected)} to arrange pickup. Start the timer once you have the item.</p>
                  </div>

                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>📦 Item: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{selected.title}</span></div>
                    <div>📅 Duration: <span style={{ color: "#aaa" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    <div>💰 Paid: <span style={{ color: "#aaa" }}>₵{totalCost}</span></div>
                    {depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{depositAmount} (refunded if undamaged)</span></div>}
                  </div>

                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ The rental timer starts when YOU confirm you've received the item below.
                  </div>

                  <button onClick={handleConfirmReceipt}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ✅ I've Received the Item — Start Timer
                  </button>

                  <button onClick={handleCancelRental}
                    style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
                    ❌ Cancel Rental — Refund Me
                  </button>
                </>
              )}

              {/* STEP 3 — Cancelled */}
              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Rental Cancelled</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your refund of ₵{totalCost} is being sent to your MTN MoMo.</p>
                  <button onClick={reset} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Rentals</button>
                </div>
              )}

              {/* STEP 4 — Active rental with timer */}
              {step === 4 && !showRating && rentalTimerEnd && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "36px", marginBottom: "6px" }}>📦</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>Rental is active · {days} day{days > 1 ? "s" : ""}</div>
                  </div>

                  <RentalTimer endTime={rentalTimerEnd} />

                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#888" }}>
                    <div>📦 Returning to: <span style={{ color: "#aaa" }}>{getLenderName(selected)}</span></div>
                    <div style={{ marginTop: "6px" }}>💰 Deposit held: <span style={{ color: "#fcd34d" }}>₵{depositAmount}</span> — returned if no damage</div>
                  </div>

                  {!renterConfirmed && (
                    <button onClick={handleRenterConfirmReturn}
                      style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                      ✅ I've Returned the Item
                    </button>
                  )}

                  {renterConfirmed && (
                    <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#6ee7b7", textAlign: "center" }}>
                      ✅ You've confirmed return. Waiting for {getLenderName(selected)} to confirm on their end.
                    </div>
                  )}
                </>
              )}

              {/* STEP 4 — Rating after return */}
              {step === 4 && showRating && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>🎉</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Rental Complete!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
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
