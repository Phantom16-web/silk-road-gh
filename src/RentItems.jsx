import { useState } from "react"
import { saveOrder, generateOrderId, OrderIdBanner } from "./OrderTracker"

const RENTALS = [
  { id: 101, title: "Canon EOS M50 Camera", price: 120, category: "Electronics", lender: "Nour H.", university: "KNUST", rating: 4.8, reviews: 23, image: 21, condition: "Excellent", desc: "Perfect for events and shoots. Comes with 2 lenses, memory card and bag.", accountability: true, accountabilityPct: 30, maxDays: 7 },
  { id: 102, title: "Projector – Epson X41", price: 80, category: "Electronics", lender: "Kofi T.", university: "UG Legon", rating: 4.6, reviews: 17, image: 22, condition: "Good", desc: "3600 lumens, HDMI and VGA. Great for presentations and movie nights.", accountability: true, accountabilityPct: 40, maxDays: 3 },
  { id: 103, title: "Mountain Bike", price: 60, category: "Sports", lender: "Elias T.", university: "Ashesi", rating: 4.9, reviews: 31, image: 23, condition: "Good", desc: "21-speed, front suspension. Helmet included. Great campus commuter.", accountability: true, accountabilityPct: 50, maxDays: 14 },
  { id: 104, title: "MacBook Air M1", price: 150, category: "Electronics", lender: "Priya S.", university: "UG Legon", rating: 5.0, reviews: 12, image: 24, condition: "Excellent", desc: "8GB RAM, 256GB SSD. Charger included. Perfect for short project work.", accountability: true, accountabilityPct: 60, maxDays: 5 },
  { id: 105, title: "Acoustic Guitar", price: 40, category: "Music", lender: "James O.", university: "UCC", rating: 4.7, reviews: 19, image: 25, condition: "Good", desc: "Steel string acoustic. Great sound, no damage. Pick and capo included.", accountability: false, accountabilityPct: 0, maxDays: 7 },
  { id: 106, title: "Camping Tent (4-person)", price: 70, category: "Outdoors", lender: "Sara B.", university: "UDS", rating: 4.5, reviews: 8, image: 26, condition: "Good", desc: "Waterproof, easy setup. Sleeping bags not included.", accountability: true, accountabilityPct: 35, maxDays: 7 },
  { id: 107, title: "PS5 Console + 2 Controllers", price: 100, category: "Gaming", lender: "Kwame B.", university: "KNUST", rating: 4.8, reviews: 44, image: 27, condition: "Excellent", desc: "Includes 3 games. HDMI cable included. No scratches.", accountability: true, accountabilityPct: 50, maxDays: 3 },
  { id: 108, title: "Scientific Calculator (Casio)", price: 15, category: "Academic", lender: "Ama S.", university: "GIJ", rating: 4.4, reviews: 28, image: 28, condition: "Good", desc: "Casio fx-991EX. All functions working. Great for exams.", accountability: false, accountabilityPct: 0, maxDays: 14 },
]

const CATEGORIES = ["All", "Electronics", "Sports", "Music", "Outdoors", "Gaming", "Academic"]

// ── Timer display ──────────────────────────────────────────────────────────
function CountdownTimer({ endsAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endsAt))

  function getTimeLeft(end) {
    const diff = end - Date.now()
    if (diff <= 0) return null
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, mins, secs, diff }
  }

  useState(() => {
    const interval = setInterval(() => {
      const tl = getTimeLeft(endsAt)
      setTimeLeft(tl)
      if (!tl) { clearInterval(interval); onExpired?.() }
    }, 1000)
    return () => clearInterval(interval)
  })

  if (!timeLeft) return (
    <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
      <div style={{ fontSize: "20px", fontWeight: "700", color: "#fca5a5" }}>⏰ Rental Period Ended</div>
      <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Please return the item and confirm below.</div>
    </div>
  )

  const isWarning = timeLeft.diff < 24 * 60 * 60 * 1000
  return (
    <div style={{ background: isWarning ? "#78350f22" : "#1a1a1a", border: `1px solid ${isWarning ? "#92400e" : "#1e1e1e"}`, borderRadius: "10px", padding: "14px" }}>
      {isWarning && (
        <div style={{ fontSize: "12px", color: "#fcd34d", fontWeight: "700", marginBottom: "8px" }}>⚠️ Less than 24 hours remaining — please return the item soon!</div>
      )}
      <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", marginBottom: "8px" }}>TIME REMAINING</div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {[
          [timeLeft.days, "Days"],
          [timeLeft.hours, "Hours"],
          [timeLeft.mins, "Mins"],
          [timeLeft.secs, "Secs"],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "800", color: isWarning ? "#fcd34d" : "#c8a97e", fontFamily: "monospace" }}>
              {String(val).padStart(2, "0")}
            </div>
            <div style={{ fontSize: "10px", color: "#555", fontWeight: "600" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rating component ───────────────────────────────────────────────────────
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

const REPORT_REASONS = ["Item not as described", "Never delivered", "Rude or threatening behaviour", "Fake listing", "Item was damaged", "Wrong item sent", "Other"]

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
      <p style={{ fontSize: "13px", color: "#888" }}>Our team will review and get back to you.</p>
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
                <div style={{ fontSize: "12px", color: "#6ee7b7" }}>✅ Rating saved — you can change it anytime while your order ID is active.</div>
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

export default function RentItems({ rate }) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [selected, setSelected] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [step, setStep] = useState(0)
  const [days, setDays] = useState(1)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [payLoading, setPayLoading] = useState(false)
  const [orderId] = useState(() => generateOrderId())
  const [rentalTimerEnd, setRentalTimerEnd] = useState(null)
  const [timerExpired, setTimerExpired] = useState(false)
  const [itemReceived, setItemReceived] = useState(null) // null | true | false
  const [renterReturnConfirmed, setRenterReturnConfirmed] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const toUSD = (ghs) => {
    if (!rate) return "..."
    return (ghs * rate).toFixed(2)
  }

  const rentalCost = selected ? selected.price * days : 0
  const depositAmount = selected?.accountability ? Math.round(selected.price * (selected.accountabilityPct / 100)) : 0
  const totalDue = rentalCost + depositAmount
  const platformFee = Math.round(rentalCost * 0.08)
  const lenderGets = rentalCost - platformFee

  const handlePay = () => {
    if (!phone.trim()) return alert("Please enter your MTN MoMo number")
    setPayLoading(true)
    setTimeout(() => {
      setPayLoading(false)
      setStep(3) // move to delivery confirmation
    }, 3000)
  }

  const openRental = (item) => {
    setSelected(item)
    setStep(1)
    setDays(1)
    setPhone("")
    setEmail("")
    setPayLoading(false)
    setRentalTimerEnd(null)
    setTimerExpired(false)
    setItemReceived(null)
    setRenterReturnConfirmed(false)
    setShowRating(false)
    setCancelled(false)
  }

  const reset = () => { setSelected(null); setStep(0) }

  const handleConfirmReceived = () => {
    // Start rental timer
    const end = Date.now() + days * 24 * 60 * 60 * 1000

    // Save order to localStorage
    const order = {
      id: orderId,
      type: "rent",
      item: selected,
      days,
      rentalCost,
      depositAmount,
      totalDue,
      lenderName: selected.lender,
      lenderContact: "Shared after payment",
      rentalTimerEnd: end,
      renterConfirmed: false,
      lenderConfirmed: false,
      damaged: false,
      createdAt: Date.now(),
      expiresAt: end + 24 * 60 * 60 * 1000, // expires 24hrs after rental ends
    }
    saveOrder(order)
    setRentalTimerEnd(end)
    setItemReceived(true)
    setStep(4) // move to active rental timer screen
  }

  const handleCancelReceived = () => {
    setItemReceived(false)
    setCancelled(true)
  }

  const handleConfirmReturn = () => {
    setRenterReturnConfirmed(true)
    setShowRating(true)
  }

  const filtered = RENTALS.filter(r => activeCategory === "All" || r.category === activeCategory)

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>

      {/* BROWSE */}
      {step === 0 && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Rent Items</h2>
            <p style={{ color: "#666", fontSize: "14px" }}>Borrow from fellow students. Deposit refunded if returned undamaged.</p>
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
            {filtered.map(item => (
              <div key={item.id}
                style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e", transition: "transform 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ position: "relative" }}>
                  <img src={`https://picsum.photos/seed/${item.image}/300/200`} alt={item.title}
                    onClick={() => setDetailItem(item)}
                    style={{ width: "100%", height: "160px", objectFit: "cover", cursor: "pointer", display: "block" }} />
                  {item.accountability && (
                    <span style={{ position: "absolute", top: "10px", right: "10px", background: "#78350f", border: "1px solid #92400e", color: "#fcd34d", fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", pointerEvents: "none" }}>
                      🔒 Deposit req.
                    </span>
                  )}
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{item.category}</div>
                  <div onClick={() => setDetailItem(item)} style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#f0ede8", cursor: "pointer" }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>by {item.lender}</div>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>🎓 {item.university} · {item.condition}</div>
                  <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating} ({item.reviews})</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e", marginBottom: "4px" }}>
                    ₵{item.price}<span style={{ fontSize: "12px", color: "#666", fontWeight: "400" }}>/day</span>
                  </div>
                  {item.accountability && (
                    <div style={{ fontSize: "11px", color: "#fcd34d", marginBottom: "8px" }}>
                      + ₵{Math.round(item.price * item.accountabilityPct / 100)} deposit (refundable)
                    </div>
                  )}
                  <button onClick={() => openRental(item)}
                    style={{ width: "100%", background: "#c8a97e", border: "none", padding: "9px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                    Rent This
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* DETAIL MODAL */}
      {detailItem && step === 0 && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDetailItem(null)}>
          <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "relative" }}>
              <img src={`https://picsum.photos/seed/${detailItem.image}/600/350`} alt={detailItem.title} style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "16px 16px 0 0" }} />
              <button onClick={() => setDetailItem(null)} style={{ position: "absolute", top: "12px", right: "12px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>{detailItem.category}</div>
                <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>{detailItem.title}</h2>
                <div style={{ fontSize: "13px", color: "#666" }}>by <span style={{ color: "#aaa", fontWeight: "600" }}>{detailItem.lender}</span></div>
                <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>🎓 {detailItem.university}</div>
              </div>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ fontSize: "14px", color: "#c8a97e" }}>{"★".repeat(Math.round(detailItem.rating))}{"☆".repeat(5 - Math.round(detailItem.rating))} <span style={{ color: "#666", fontSize: "13px" }}>{detailItem.rating} ({detailItem.reviews})</span></div>
                <div style={{ fontSize: "13px", color: "#888" }}>{detailItem.condition}</div>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.7", margin: 0 }}>{detailItem.desc}</p>
              </div>
              {detailItem.accountability && (
                <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#fcd34d" }}>
                  🔒 Accountability deposit: <strong>₵{Math.round(detailItem.price * detailItem.accountabilityPct / 100)}</strong> (fixed for 1 day · {detailItem.accountabilityPct}%). Fully refunded if returned undamaged.
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "16px" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#c8a97e" }}>₵{detailItem.price}<span style={{ fontSize: "13px", color: "#666", fontWeight: "400" }}>/day</span></div>
                  <div style={{ fontSize: "12px", color: "#555" }}>Max {detailItem.maxDays} days</div>
                </div>
                <button onClick={() => { openRental(detailItem); setDetailItem(null) }}
                  style={{ background: "#c8a97e", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                  Rent This →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENTAL FLOW MODAL */}
      {step > 0 && selected && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                {step === 1 ? "Rent Item" : step === 2 ? "Payment" : step === 3 ? "Confirm Receipt" : step === 4 ? "Active Rental" : "Rental Complete"}
              </span>
              {step <= 2 && <button onClick={reset} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>}
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* STEP 1 — Details + day picker */}
              {step === 1 && (
                <>
                  <img src={`https://picsum.photos/seed/${selected.image}/600/300`} alt={selected.title} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "10px" }} />
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{selected.title}</h3>
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "2px" }}>by {selected.lender}</div>
                    <div style={{ fontSize: "12px", color: "#555" }}>🎓 {selected.university} · {selected.condition}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "10px" }}>HOW MANY DAYS?</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <button onClick={() => setDays(d => Math.max(1, d - 1))}
                        style={{ width: "36px", height: "36px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "20px" }}>−</button>
                      <span style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", minWidth: "40px", textAlign: "center" }}>{days}</span>
                      <button onClick={() => setDays(d => Math.min(selected.maxDays, d + 1))}
                        style={{ width: "36px", height: "36px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "20px" }}>+</button>
                      <span style={{ fontSize: "13px", color: "#555" }}>Max {selected.maxDays} days</span>
                    </div>
                  </div>

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#888" }}>
                      <span>Rental ({days} day{days > 1 ? "s" : ""} × ₵{selected.price})</span><span>₵{rentalCost}</span>
                    </div>
                    {selected.accountability && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#fcd34d" }}>
                        <span>🔒 Deposit (1 day × {selected.accountabilityPct}%)</span><span>₵{depositAmount}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px", fontWeight: "700", color: "#c8a97e", borderTop: "1px solid #2a2a2a", paddingTop: "8px" }}>
                      <span>Total Due</span><span>₵{totalDue} (${toUSD(totalDue)})</span>
                    </div>
                    {selected.accountability && (
                      <div style={{ fontSize: "12px", color: "#6ee7b7", background: "#064e3b22", borderRadius: "8px", padding: "8px 12px" }}>
                        ✅ ₵{depositAmount} refunded if returned undamaged
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: "#555" }}>Platform fee (8%): ₵{platformFee} · {selected.lender} receives ₵{lenderGets}</div>
                  </div>

                  <button onClick={() => setStep(2)}
                    style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
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
                      <div style={{ fontSize: "12px", color: "#554400" }}>Secured by Paystack · Deposit held in escrow</div>
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
                    <div>Rental: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{rentalCost}</span> ({days} day{days > 1 ? "s" : ""})</div>
                    {selected.accountability && <div style={{ marginTop: "4px" }}>Deposit: <span style={{ color: "#fcd34d", fontWeight: "700" }}>₵{depositAmount}</span> (refundable)</div>}
                    <div style={{ marginTop: "8px", fontWeight: "700", fontSize: "15px", color: "#c8a97e" }}>Total: ₵{totalDue} (${toUSD(totalDue)})</div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, background: "#1e1e1e", border: "1px solid #333", color: "#aaa", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>← Back</button>
                    <button onClick={handlePay}
                      style={{ flex: 2, background: "#ffd700", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", color: "#000" }}>
                      {payLoading ? "⏳ Awaiting MoMo..." : `Pay ₵${totalDue}`}
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 — Confirm Receipt (like buy products) */}
              {step === 3 && !cancelled && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Payment Successful!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Confirm when you physically receive the item from {selected.lender}.</p>
                  </div>

                  {/* Order ID */}
                  <OrderIdBanner orderId={orderId} />

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#888", fontWeight: "600", marginBottom: "4px" }}>RENTAL DETAILS</div>
                    <div>📦 Item: <span style={{ color: "#f0ede8", fontWeight: "600" }}>{selected.title}</span></div>
                    <div>👤 Lender: <span style={{ color: "#aaa" }}>{selected.lender} · 🎓 {selected.university}</span></div>
                    <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    <div>💰 Paid: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{totalDue}</span>
                      {selected.accountability && <span style={{ color: "#fcd34d" }}> (incl. ₵{depositAmount} deposit)</span>}
                    </div>
                  </div>

                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#fcd34d" }}>
                    ⚠️ Rental timer starts the moment you confirm receipt. Make sure you have the item before confirming.
                  </div>

                  <button onClick={handleConfirmReceived}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ✅ I've Received the Item — Start Timer
                  </button>

                  <button onClick={handleCancelReceived}
                    style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                    ❌ Cancel — I Didn't Receive It
                  </button>
                </>
              )}

              {/* CANCELLED */}
              {step === 3 && cancelled && (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "56px" }}>💸</div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#fca5a5" }}>Rental Cancelled</h3>
                  <p style={{ fontSize: "14px", color: "#888" }}>Full refund of ₵{totalDue} is being returned to your MTN MoMo.</p>
                  <button onClick={reset} style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>Back to Rentals</button>
                </div>
              )}

              {/* STEP 4 — Active Rental with Timer */}
              {step === 4 && !showRating && (
                <>
                  <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#6ee7b7", fontWeight: "600" }}>✅ Item Received · Rental Active</div>
                    <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>{selected.title}</div>
                  </div>

                  {rentalTimerEnd && (
                    <CountdownTimer
                      endsAt={rentalTimerEnd}
                      onExpired={() => setTimerExpired(true)}
                    />
                  )}

                  <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div>📦 <span style={{ color: "#aaa" }}>{selected.title}</span></div>
                    <div>👤 Lender: <span style={{ color: "#aaa" }}>{selected.lender}</span></div>
                    <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{days} day{days > 1 ? "s" : ""}</span></div>
                    {selected.accountability && (
                      <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{depositAmount} — refunded if returned undamaged</span></div>
                    )}
                  </div>

                  {!renterReturnConfirmed ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ background: "#1e1e2e", border: "1px solid #2a2a40", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#aaa" }}>
                        📋 When you've returned the item to {selected.lender}, tap confirm below. The lender will also confirm on their end.
                      </div>
                      <button onClick={handleConfirmReturn}
                        style={{ background: timerExpired ? "#c8a97e" : "#064e3b", border: `1px solid ${timerExpired ? "#c8a97e" : "#065f46"}`, color: timerExpired ? "#000" : "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}>
                        ✅ I've Returned the Item
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#6ee7b7", textAlign: "center" }}>
                      ✅ You confirmed return. Waiting for {selected.lender} to confirm on their end...
                    </div>
                  )}
                </>
              )}

              {/* STEP 5 — Rating after return */}
              {step === 4 && showRating && (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>📦</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#6ee7b7" }}>Item Returned!</h3>
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Waiting for {selected.lender} to confirm. Your deposit will be processed once both sides confirm.</p>
                  </div>
                  <RatingAndReport
                    orderId={orderId}
                    lenderName={selected.lender}
                    onDone={reset}
                  />
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}