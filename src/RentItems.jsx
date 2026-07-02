import { useState, useEffect } from "react"
import { getListings } from "./api"
import { saveOrder, generateOrderId, updateOrder, OrderIdBanner } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const STATIC_RENTALS = [
  { id: 101, title: "Canon EOS M50 Camera",         dailyRate: 120, category: "Electronics", provider: "Kwame A.",  university: "KNUST",    rating: 4.8, reviews: 34, image: `https://picsum.photos/seed/21/300/200`,  condition: "Excellent", desc: "Full kit with 2 lenses, 2 batteries, SD card and bag. Perfect for events and shoots.", maxDays: 7,  accountability: true,  accountabilityPct: 30 },
  { id: 102, title: "Projector – Epson X41",         dailyRate: 80,  category: "Electronics", provider: "Ama S.",    university: "UG Legon", rating: 4.6, reviews: 18, image: `https://picsum.photos/seed/22/300/200`,  condition: "Good",      desc: "3600 lumens, HDMI + VGA. Great for presentations and movie nights.",                  maxDays: 5,  accountability: true,  accountabilityPct: 25 },
  { id: 103, title: "Mountain Bike",                 dailyRate: 50,  category: "Sports",      provider: "Kofi T.",   university: "KNUST",    rating: 4.7, reviews: 22, image: `https://picsum.photos/seed/23/300/200`,  condition: "Good",      desc: "Trek Marlin 5. Helmet included. Perfect for campus commuting.",                      maxDays: 14, accountability: false, accountabilityPct: 0  },
  { id: 104, title: "MacBook Air M1",                dailyRate: 150, category: "Electronics", provider: "Abena M.",  university: "Ashesi",   rating: 5.0, reviews: 11, image: `https://picsum.photos/seed/24/300/200`,  condition: "Excellent", desc: "8GB RAM, 256GB SSD. Charger included. Great for design or dev work.",                 maxDays: 3,  accountability: true,  accountabilityPct: 50 },
  { id: 105, title: "Acoustic Guitar",               dailyRate: 40,  category: "Music",       provider: "Sara B.",   university: "UDS",      rating: 4.5, reviews: 9,  image: `https://picsum.photos/seed/25/300/200`,  condition: "Good",      desc: "Yamaha F310. Comes with picks and a capo. Good for beginners and events.",            maxDays: 7,  accountability: false, accountabilityPct: 0  },
  { id: 106, title: "Camping Tent (4-person)",       dailyRate: 60,  category: "Outdoors",    provider: "Elias T.",  university: "UCC",      rating: 4.4, reviews: 7,  image: `https://picsum.photos/seed/26/300/200`,  condition: "Good",      desc: "Easy setup dome tent. Sleeping bags available for extra fee.",                       maxDays: 5,  accountability: true,  accountabilityPct: 20 },
  { id: 107, title: "PS5 Console + 2 Controllers",   dailyRate: 100, category: "Gaming",      provider: "Yaw D.",    university: "GIJ",      rating: 4.9, reviews: 41, image: `https://picsum.photos/seed/27/300/200`,  condition: "Excellent", desc: "PS5 disc edition with 2 controllers and 3 games. Weekend rentals preferred.",         maxDays: 3,  accountability: true,  accountabilityPct: 40 },
  { id: 108, title: "Scientific Calculator (Casio)", dailyRate: 15,  category: "Academic",    provider: "Nour H.",   university: "KNUST",    rating: 4.3, reviews: 29, image: `https://picsum.photos/seed/28/300/200`,  condition: "Good",      desc: "Casio fx-991EX. Perfect for exams. Available weekdays only.",                        maxDays: 2,  accountability: false, accountabilityPct: 0  },
]

const CATEGORIES = ["All", "Electronics", "Sports", "Music", "Outdoors", "Gaming", "Academic"]

const REPORT_REASONS = ["Item not delivered","Item was damaged on arrival","Lender was rude or threatening","Fake listing","Item not as described","No-show","Other"]

// ── Helpers ────────────────────────────────────────────────────────────────────
const getLenderName = (item) => item._id ? item.seller?.name : item.provider
const getUniversity = (item) => item._id ? item.seller?.university : item.university
const getDailyRate  = (item) => item.dailyRate || item.price || 0
const getSellerId   = (item) => item._id ? (item.seller?._id || item.seller) : null
const getImg        = (item) => item.image || `https://picsum.photos/seed/${item.id || item._id}/300/200`

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
function RatingAndReport({ orderId, lenderName, onDone }) {
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
    reports.push({ orderId, lenderName, reason: reportReason, date: new Date().toISOString() })
    localStorage.setItem("silkroad_reports", JSON.stringify(reports))
    setReportSubmitted(true)
  }

  if (reportSubmitted) return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ fontSize: "48px" }}>📋</div>
      <div style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>Report Submitted</div>
      <button onClick={onDone} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>Done</button>
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
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>🚩 Report {lenderName}</div>
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

// ── Rental Timer ───────────────────────────────────────────────────────────────
function RentalTimer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState(endTime - Date.now())
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(endTime - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [endTime])
  const days  = Math.max(0, Math.floor(timeLeft / 86400000))
  const hours = Math.max(0, Math.floor((timeLeft % 86400000) / 3600000))
  const mins  = Math.max(0, Math.floor((timeLeft % 3600000) / 60000))
  const secs  = Math.max(0, Math.floor((timeLeft % 60000) / 1000))
  const near  = timeLeft > 0 && timeLeft < 86400000
  const exp   = timeLeft <= 0
  return (
    <div style={{ background: exp ? "#7f1d1d22" : near ? "#78350f22" : "#064e3b22", border: `1px solid ${exp ? "#7f1d1d" : near ? "#92400e" : "#065f46"}`, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: exp ? "#fca5a5" : near ? "#fcd34d" : "#6ee7b7", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {exp ? "⏰ Rental Period Ended" : near ? "⚠️ Less than 24 hours left!" : "⏱️ Rental Time Remaining"}
      </div>
      {!exp && (
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          {[["Days", days], ["Hours", hours], ["Mins", mins], ["Secs", secs]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: near ? "#fcd34d" : "#c8a97e", lineHeight: 1 }}>{String(val).padStart(2, "0")}</div>
              <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function RentItems({ rate, siteSettings }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [detailItem, setDetailItem] = useState(null)
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(0)
  const [days, setDays] = useState(1)
  const [contactInfo, setContactInfo] = useState("")
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
      .catch(() => {}).finally(() => setLoadingListings(false))
  }, [])

  const rentals = dbRentals.length > 0 ? dbRentals : STATIC_RENTALS
  const toGHS   = (usd) => rate ? (usd / rate).toFixed(2) : "..."
  const toCedis = (dailyRate) => `₵${dailyRate}`

  const rentalCost    = selected ? getDailyRate(selected) * days : 0
  const depositAmount = selected?.accountability ? Math.round(getDailyRate(selected) * (selected.accountabilityPct / 100)) : 0
  const totalCost     = rentalCost + depositAmount
  const platformFee   = Math.round(rentalCost * 0.08)
  const lenderGets    = rentalCost - platformFee

  const openRental = (item) => {
    setSelected(item); setStep(1); setDays(1); setContactInfo("")
    setPayLoading(false); setRentalTimerEnd(null); setRenterConfirmed(false)
    setCancelled(false); setShowRating(false)
  }
  const reset = () => { setSelected(null); setStep(0) }

  const handlePay = async () => {
    if (!contactInfo.trim()) { alert("Please enter your contact info."); return }
    setPayLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setPayLoading(false)

    const order = {
      id: orderId,
      type: "rent",
      cart: [{ ...(selected), title: selected.title, price: getDailyRate(selected), qty: days, seller: selected.seller || { _id: null, name: getLenderName(selected) }, image: getImg(selected) }],
      item: selected,
      days,
      rentalCost,
      depositAmount,
      totalCost,
      total: totalCost,
      subtotal: rentalCost,
      platformFee,
      lenderGets,
      contactInfo,
      deliveryMethod: "pickup",
      paymentMethod: "manual_momo",
      paymentRef: `RENT-${orderId}`,
      status: "Pending Confirmation",
      renterConfirmed: false,
      lenderConfirmed: false,
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
            type: "rent",
            amount: totalCost,
            paystackRef: `RENT-${orderId}`,
            contactInfo,
            rentalDays: days,
          }),
        })
      }
    } catch {}

    // saveOrder triggers notifySeller automatically
    saveOrder(order)
    setStep(3)
  }

  const handleConfirmReceipt = () => {
    const end = Date.now() + days * 86400000
    setRentalTimerEnd(end)
    updateOrder(orderId, { rentalTimerEnd: end, rentalStarted: true })
    setStep(4)
  }

  const handleRenterConfirmReturn = () => {
    setRenterConfirmed(true)
    updateOrder(orderId, { renterConfirmed: true })
    setShowRating(true)
  }

  const filtered = rentals.filter(item => activeCategory === "All" || item.category === activeCategory)

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 18px 24px" }}>
      {step === 0 && (
        <>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: "800", color: "#f0ede8", letterSpacing: "-0.02em", marginBottom: "8px" }}>Rent Items</h2>
            <p style={{ color: "#555", fontSize: "14px" }}>Borrow from fellow students. Pay per day, return when done.</p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`pill ${activeCategory === cat ? "active" : ""}`}>
                {cat}
              </button>
            ))}
          </div>

          {loadingListings ? (
            <div style={{ textAlign: "center", color: "#555", padding: "60px", fontSize: "13px" }}>⏳ Loading rentals...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {filtered.map((item, index) => (
                <div key={item._id || item.id} className="listing-card reveal" style={{ animationDelay: `${(index % 8) * 55}ms` }}>
                  <div style={{ overflow: "hidden", position: "relative" }}>
                    <img src={getImg(item)} alt={item.title} onClick={() => setDetailItem(item)}
                      style={{ width: "100%", height: "200px", objectFit: "cover", cursor: "pointer" }} />
                    {item.accountability && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#78350f", color: "#fcd34d", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", pointerEvents: "none" }}>
                        🔒 Deposit req.
                      </span>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, #111, transparent)", pointerEvents: "none" }} />
                  </div>
                  <div style={{ padding: "16px" }}>
                    <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>{item.category}</div>
                    <div onClick={() => setDetailItem(item)} style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3", letterSpacing: "-0.01em" }}>{item.title}</div>
                    <div style={{ fontSize: "12px", color: "#444", marginBottom: "2px" }}>by <span style={{ color: "#666" }}>{getLenderName(item)}</span></div>
                    <div style={{ fontSize: "11px", color: "#333", marginBottom: "14px" }}>🎓 {getUniversity(item)}</div>
                    {item.rating > 0 && <div style={{ fontSize: "13px", color: "#c8a97e", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating}</div>}
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "14px" }}>
                      ₵{getDailyRate(item)}<span style={{ fontSize: "13px", fontWeight: "500", color: "#444" }}>/day</span>
                    </div>
                    <button className="btn-gold" onClick={() => openRental(item)} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: "13px" }}>
                      Rent This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailItem && (
            <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDetailItem(null)}>
              <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
                <div style={{ position: "relative" }}>
                  <img src={getImg(detailItem)} alt={detailItem.title} style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #111)", pointerEvents: "none", borderRadius: "20px 20px 0 0" }} />
                  <button onClick={() => setDetailItem(null)} style={{ position: "absolute", top: "14px", right: "14px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>{detailItem.category}</div>
                    <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>{detailItem.title}</h2>
                    <div style={{ fontSize: "13px", color: "#555" }}>by <span style={{ color: "#888", fontWeight: "600" }}>{getLenderName(detailItem)}</span> · 🎓 {getUniversity(detailItem)}</div>
                  </div>
                  {detailItem.rating > 0 && <div style={{ fontSize: "13px", color: "#c8a97e" }}>{"★".repeat(Math.round(detailItem.rating))} {detailItem.rating} ({detailItem.reviews || 0} reviews)</div>}
                  <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px" }}>
                    <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", margin: 0 }}>{detailItem.desc}</p>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>📅 Max rental: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{detailItem.maxDays || 7} days</span></div>
                    <div>🏷️ Condition: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{detailItem.condition || "Good"}</span></div>
                    {detailItem.accountability && <div>🔒 Accountability deposit: <span style={{ color: "#fcd34d", fontWeight: "700" }}>{detailItem.accountabilityPct}% of daily rate</span></div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: "18px" }}>
                    <div>
                      <div style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.03em" }}>₵{getDailyRate(detailItem)}<span style={{ fontSize: "14px", fontWeight: "500", color: "#555" }}>/day</span></div>
                    </div>
                    <button className="btn-gold" onClick={() => { openRental(detailItem); setDetailItem(null) }} style={{ padding: "13px 28px", borderRadius: "12px", fontSize: "14px" }}>
                      Rent This →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {step > 0 && selected && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "📦 Rental Details" : step === 2 ? "💳 Payment" : step === 3 ? "✅ Confirmed" : showRating ? "🎉 Complete" : "⏱️ Rental Active"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* STEP 1 — Choose days */}
              {step === 1 && (
                <>
                  <img src={getImg(selected)} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "12px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px", letterSpacing: "-0.02em" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555" }}>by {getLenderName(selected)} · 🎓 {getUniversity(selected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".06em" }}>HOW MANY DAYS?</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
                      <button onClick={() => setDays(d => Math.max(1, d - 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", fontSize: "20px", cursor: "pointer", minHeight: "auto" }}>−</button>
                      <span style={{ fontSize: "36px", fontWeight: "800", color: "#c8a97e", minWidth: "60px", textAlign: "center" }}>{days}</span>
                      <button onClick={() => setDays(d => Math.min(selected.maxDays || 7, d + 1))}
                        style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", fontSize: "20px", cursor: "pointer", minHeight: "auto" }}>+</button>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "13px", color: "#444", marginTop: "8px" }}>Max {selected.maxDays || 7} days</div>
                  </div>

                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Rental ({days} day{days > 1 ? "s" : ""} × ₵{getDailyRate(selected)})</span><span>₵{rentalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                        <span>🔒 Accountability deposit ({selected.accountabilityPct}%)</span><span>₵{depositAmount}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                      <span>Platform fee (8%)</span><span>₵{platformFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "19px", fontWeight: "800", color: "#c8a97e", borderTop: "1px solid #222", paddingTop: "10px", letterSpacing: "-0.02em" }}>
                      <span>Total</span><span>₵{totalCost}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#6ee7b7" }}>
                        🔒 Deposit of ₵{depositAmount} fully refunded if returned undamaged.
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR CONTACT (for the lender)</div>
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
                    <div style={{ fontSize: "36px", fontWeight: "800", color: "#1a1a00", letterSpacing: "-0.02em" }}>₵{totalCost}</div>
                  </div>
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>📦 Item: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{selected.title}</span></div>
                    <div>📅 Duration: <span style={{ color: "#aaa" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    <div>💰 {getLenderName(selected)} receives: <span style={{ color: "#aaa" }}>₵{lenderGets} after platform fee</span></div>
                    {depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{depositAmount} held until return</span></div>}
                    <div>📞 Your contact: <span style={{ color: "#aaa" }}>{contactInfo}</span></div>
                  </div>
                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#fcd34d", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontWeight: "700" }}>⚠️ Steps:</div>
                    <div>1. Dial *170# → Transfer Money → MoMo User</div>
                    <div>2. Enter number: <strong>0543883608</strong> (Silk Road GH)</div>
                    <div>3. Amount: <strong>₵{totalCost}</strong> · Reference: <strong style={{ fontFamily: "monospace" }}>{orderId}</strong></div>
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

              {/* STEP 3 — Awaiting receipt */}
              {step === 3 && !cancelled && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "8px" }}>✅</div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", marginBottom: "8px" }}>Payment Submitted!</h3>
                    <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>Contact {getLenderName(selected)} to arrange pickup. Start the timer once you have the item.</p>
                  </div>
                  <OrderIdBanner orderId={orderId} />
                  <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", fontSize: "13px", color: "#888", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>📦 <span style={{ color: "#c8a97e", fontWeight: "700" }}>{selected.title}</span></div>
                    <div>📅 Duration: <span style={{ color: "#aaa" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    <div>💰 Total paid: <span style={{ color: "#aaa" }}>₵{totalCost}</span></div>
                    {depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{depositAmount} (refunded if undamaged)</span></div>}
                  </div>
                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "12px", padding: "12px 14px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ The rental timer starts ONLY when you confirm you've received the item below.
                  </div>
                  <button onClick={handleConfirmReceipt}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "15px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
                    ✅ I've Received the Item — Start Timer
                  </button>
                  <button onClick={() => setCancelled(true)}
                    style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "14px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                    ❌ Cancel — Refund Me
                  </button>
                </>
              )}

              {/* STEP 3 — Cancelled */}
              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Rental Cancelled</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>Your refund of ₵{totalCost} will be processed within 24 hours.</p>
                  <button className="btn-gold" onClick={reset} style={{ padding: "14px", borderRadius: "12px", fontSize: "15px" }}>Back to Rentals</button>
                </div>
              )}

              {/* STEP 4 — Active timer */}
              {step === 4 && !showRating && rentalTimerEnd && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "36px", marginBottom: "6px" }}>📦</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f0ede8" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>Rental active · {days} day{days > 1 ? "s" : ""}</div>
                  </div>
                  <RentalTimer endTime={rentalTimerEnd} />
                  <OrderIdBanner orderId={orderId} />
                  {!renterConfirmed ? (
                    <button onClick={handleRenterConfirmReturn}
                      style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "15px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
                      ✅ I've Returned the Item
                    </button>
                  ) : (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#6ee7b7", textAlign: "center" }}>
                      ✅ You've confirmed return. Waiting for {getLenderName(selected)} to confirm on their end.
                    </div>
                  )}
                </>
              )}

              {/* STEP 4 — Rating */}
              {step === 4 && showRating && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "8px" }}>🎉</div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#6ee7b7", marginBottom: "8px" }}>Rental Complete!</h3>
                    {depositAmount > 0 && <p style={{ fontSize: "13px", color: "#888" }}>₵{depositAmount} deposit returned once lender confirms no damage.</p>}
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
