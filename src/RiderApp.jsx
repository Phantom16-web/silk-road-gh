import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

const API_URL    = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"

const STATUS_COLORS = {
  pending:    { bg: "#78350f18", color: "#fcd34d",  border: "#92400e" },
  accepted:   { bg: "#1e3a5f18", color: "#93c5fd",  border: "#1d4ed8" },
  picked_up:  { bg: "#78350f18", color: "#fb923c",  border: "#c2410c" },
  delivered:  { bg: "#064e3b18", color: "#6ee7b7",  border: "#065f46" },
  completed:  { bg: "#064e3b18", color: "#6ee7b7",  border: "#065f46" },
  cancelled:  { bg: "#7f1d1d18", color: "#fca5a5",  border: "#7f1d1d" },
}

const STATUS_LABEL = {
  pending:   "⏳ Pending",
  accepted:  "✅ Accepted",
  picked_up: "📦 Picked Up",
  delivered: "🚪 Delivered",
  completed: "🎉 Complete",
  cancelled: "❌ Cancelled",
}

function riderCall(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("silkroad_rider_token")
  return fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  }).then(r => r.json())
}

export default function RiderApp({ rider: initialRider, onSignOut }) {
  const [rider, setRider]             = useState(initialRider)
  const [tab, setTab]                 = useState("jobs")
  const [jobs, setJobs]               = useState([])
  const [activeDelivery, setActive]   = useState(null)
  const [loading, setLoading]         = useState(false)
  const [otpInput, setOtpInput]       = useState("")
  const [otpError, setOtpError]       = useState("")
  const [otpLoading, setOtpLoading]   = useState(false)
  const [actionLoading, setActionLoading] = useState("")
  const [isOnline, setIsOnline]       = useState(rider.isOnline || false)
  const [earnings, setEarnings]       = useState({ total: rider.totalEarned || 0, deliveries: rider.totalDeliveries || 0 })
  const socketRef                     = useRef(null)

  // ── Socket connection ────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SOCKET_URL, {
      autoConnect:          true,
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: Infinity,
      transports:           ["websocket", "polling"],
    })

    s.on("connect", () => {
      console.log("🔌 Rider socket connected:", s.id)
      s.emit("register_rider", String(rider._id))
    })

    // New delivery job broadcast from server
    s.on("new_delivery_job", (job) => {
      if (!activeDelivery) {
        setJobs(prev => {
          const exists = prev.find(j => j.deliveryId === job.deliveryId)
          if (exists) return prev
          return [job, ...prev]
        })
      }
    })

    socketRef.current = s
    return () => s.disconnect()
  }, [rider._id])

  // ── Fetch available jobs and active delivery on load ─────────────────────────
  useEffect(() => {
    fetchJobsAndActive()
  }, [])

  const fetchJobsAndActive = async () => {
    setLoading(true)
    try {
      const [jobsRes, activeRes] = await Promise.all([
        riderCall("/deliveries/available"),
        riderCall("/deliveries/my-active"),
      ])
      if (jobsRes.jobs) setJobs(jobsRes.jobs)
      if (activeRes.delivery) { setActive(activeRes.delivery); setTab("active") }
    } catch {}
    setLoading(false)
  }

  // ── Toggle online status ─────────────────────────────────────────────────────
  const handleToggleOnline = async () => {
    try {
      const res = await riderCall("/rider-auth/toggle-online", "PUT")
      setIsOnline(res.isOnline)
    } catch {}
  }

  // ── Accept job ───────────────────────────────────────────────────────────────
  const handleAccept = async (deliveryId) => {
    setActionLoading(deliveryId)
    try {
      const res = await riderCall(`/deliveries/${deliveryId}/accept`, "PUT")
      if (res.delivery) {
        setActive(res.delivery)
        setJobs([])
        setTab("active")
      } else {
        alert(res.message || "Could not accept job. It may have been taken.")
        fetchJobsAndActive()
      }
    } catch { alert("Something went wrong.") }
    setActionLoading("")
  }

  // ── Decline job ──────────────────────────────────────────────────────────────
  const handleDecline = async (deliveryId) => {
    setActionLoading(`decline-${deliveryId}`)
    try {
      await riderCall(`/deliveries/${deliveryId}/decline`, "PUT")
      setJobs(prev => prev.filter(j => (j._id || j.deliveryId) !== deliveryId))
    } catch {}
    setActionLoading("")
  }

  // ── Mark picked up ───────────────────────────────────────────────────────────
  const handlePickedUp = async () => {
    if (!activeDelivery) return
    setActionLoading("pickup")
    try {
      const res = await riderCall(`/deliveries/${activeDelivery._id}/picked-up`, "PUT")
      if (res.delivery) setActive(res.delivery)
    } catch { alert("Something went wrong.") }
    setActionLoading("")
  }

  // ── Mark delivered (generates OTP) ──────────────────────────────────────────
  const handleDelivered = async () => {
    if (!activeDelivery) return
    setActionLoading("deliver")
    try {
      const res = await riderCall(`/deliveries/${activeDelivery._id}/delivered`, "PUT")
      if (res.delivery) {
        setActive(res.delivery)
        // res.otp is shown to rider so they know what to ask the buyer to confirm
      }
    } catch { alert("Something went wrong.") }
    setActionLoading("")
  }

  // ── Confirm OTP ──────────────────────────────────────────────────────────────
  const handleConfirmOTP = async () => {
    if (!otpInput.trim() || !activeDelivery) return
    setOtpLoading(true); setOtpError("")
    try {
      const res = await riderCall(`/deliveries/${activeDelivery._id}/confirm-otp`, "PUT", { otp: otpInput.trim() })
      if (res.delivery) {
        setActive(res.delivery)
        setEarnings(e => ({ total: e.total + activeDelivery.deliveryFee, deliveries: e.deliveries + 1 }))
        setOtpInput("")
        setTimeout(() => { setActive(null); setTab("jobs"); fetchJobsAndActive() }, 3000)
      } else {
        setOtpError(res.message || "Incorrect OTP.")
      }
    } catch { setOtpError("Something went wrong.") }
    setOtpLoading(false)
  }

  const inp = {
    width: "100%", background: "#161616", border: "1px solid #1e1e1e",
    color: "#fff", padding: "12px 16px", borderRadius: "10px",
    fontSize: "14px", outline: "none", boxSizing: "border-box",
    fontFamily: "monospace", letterSpacing: ".08em", textAlign: "center",
    fontSize: "22px", fontWeight: "800",
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 500, display: "flex", flexDirection: "column", color: "#f0ede8" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "#000" }}>
            {rider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{rider.name}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>
              {rider.vehicle === "motorbike" ? "🛵 Motorbike" : rider.vehicle === "bicycle" ? "🚲 Bicycle" : "🚶 Walking"} · {rider.university}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Online toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: isOnline ? "#6ee7b7" : "#555" }}>{isOnline ? "Online" : "Offline"}</span>
            <div onClick={handleToggleOnline}
              style={{ width: "44px", height: "24px", background: isOnline ? "#c8a97e" : "#2a2a2a", borderRadius: "24px", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: "3px", left: isOnline ? "22px" : "3px", width: "18px", height: "18px", background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
            </div>
          </div>
          <button onClick={onSignOut}
            style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "12px 20px", display: "flex", gap: "24px", flexShrink: 0 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>₵{earnings.total.toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Total Earned</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>{earnings.deliveries}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Deliveries</div>
        </div>
        {rider.rating > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>⭐ {rider.rating.toFixed(1)}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>Rating</div>
          </div>
        )}
        {activeDelivery && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#93c5fd", background: "#1e3a5f18", border: "1px solid #1d4ed8", padding: "4px 10px", borderRadius: "20px" }}>
              Active Delivery
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", padding: "0 20px", flexShrink: 0 }}>
        {[
          { id: "jobs",   label: `📋 Jobs ${jobs.length > 0 ? `(${jobs.length})` : ""}` },
          { id: "active", label: "🚀 Active Delivery" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: "transparent", border: "none", color: tab === t.id ? "#c8a97e" : "#444", cursor: "pointer", fontSize: "13px", fontWeight: tab === t.id ? "700" : "500", borderBottom: `2px solid ${tab === t.id ? "#c8a97e" : "transparent"}`, padding: "12px 16px", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* ── JOBS TAB ── */}
        {tab === "jobs" && (
          <>
            {!isOnline && (
              <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "14px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>😴</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#fcd34d", marginBottom: "6px" }}>You're Offline</div>
                <div style={{ fontSize: "13px", color: "#888" }}>Toggle online above to start receiving delivery jobs.</div>
              </div>
            )}

            {isOnline && jobs.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛵</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#555", marginBottom: "8px" }}>No jobs yet</div>
                <div style={{ fontSize: "13px" }}>New delivery requests will appear here instantly.</div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: "60px", color: "#444", fontSize: "13px" }}>⏳ Loading jobs...</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {jobs.map(job => {
                const id  = job._id || job.deliveryId
                const fee = job.deliveryFee
                const km  = job.distanceKm
                return (
                  <div key={id} style={{ background: "#111", borderRadius: "16px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
                    {/* Job header */}
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{job.itemTitle || "Package"}</div>
                        <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>{km} km · {rider.vehicle === "motorbike" ? "~" + Math.round(km * 3) + " min" : "~" + Math.round(km * 7) + " min"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em" }}>₵{fee}</div>
                        <div style={{ fontSize: "11px", color: "#555" }}>delivery fee</div>
                      </div>
                    </div>

                    {/* Locations */}
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8a97e", marginTop: "5px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>PICKUP (Seller)</div>
                          <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{job.pickupAddress || (job.pickupLocation ? `${job.pickupLocation.lat}, ${job.pickupLocation.lng}` : "Location provided")}</div>
                          {job.sellerContact && <div style={{ fontSize: "12px", color: "#c8a97e", marginTop: "3px" }}>📞 {job.sellerContact}</div>}
                        </div>
                      </div>
                      <div style={{ marginLeft: "4px", borderLeft: "2px dashed #1e1e1e", height: "12px" }} />
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6ee7b7", marginTop: "5px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>DROP-OFF (Buyer)</div>
                          <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{job.dropAddress || (job.dropLocation ? `${job.dropLocation.lat}, ${job.dropLocation.lng}` : "Location provided")}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "0 18px 18px", display: "flex", gap: "10px" }}>
                      <button onClick={() => handleDecline(id)} disabled={actionLoading === `decline-${id}`}
                        style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", fontFamily: "inherit", opacity: actionLoading === `decline-${id}` ? 0.6 : 1 }}>
                        Decline
                      </button>
                      <button onClick={() => handleAccept(id)} disabled={!!actionLoading || !!activeDelivery}
                        style={{ flex: 2, background: "#c8a97e", border: "none", color: "#000", padding: "12px", borderRadius: "10px", cursor: (!!actionLoading || !!activeDelivery) ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "14px", fontFamily: "inherit", opacity: (!!actionLoading || !!activeDelivery) ? 0.5 : 1 }}>
                        {actionLoading === id ? "⏳ Accepting..." : "✅ Accept Job"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── ACTIVE DELIVERY TAB ── */}
        {tab === "active" && (
          <>
            {!activeDelivery ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#555", marginBottom: "8px" }}>No active delivery</div>
                <div style={{ fontSize: "13px" }}>Accept a job from the Jobs tab to start delivering.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Status */}
                <div style={{ background: STATUS_COLORS[activeDelivery.status]?.bg, border: `1px solid ${STATUS_COLORS[activeDelivery.status]?.border}`, borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>CURRENT STATUS</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: STATUS_COLORS[activeDelivery.status]?.color }}>
                      {STATUS_LABEL[activeDelivery.status] || activeDelivery.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e" }}>₵{activeDelivery.deliveryFee}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>{activeDelivery.distanceKm} km</div>
                  </div>
                </div>

                {/* Item */}
                <div style={{ background: "#161616", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center" }}>
                  {activeDelivery.itemImage
                    ? <img src={activeDelivery.itemImage} alt={activeDelivery.itemTitle} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: "56px", height: "56px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>📦</div>
                  }
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{activeDelivery.itemTitle || "Package"}</div>
                    <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>
                      {activeDelivery.notes || "Handle with care"}
                    </div>
                  </div>
                </div>

                {/* Route */}
                <div style={{ background: "#161616", borderRadius: "14px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>DELIVERY ROUTE</div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c8a97e", marginTop: "4px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "3px" }}>PICKUP — Seller</div>
                      <div style={{ fontSize: "13px", color: "#f0ede8" }}>
                        {activeDelivery.pickupLocation?.address || `${activeDelivery.pickupLocation?.lat}, ${activeDelivery.pickupLocation?.lng}`}
                      </div>
                      {activeDelivery.sellerContact && (
                        <a href={`tel:${activeDelivery.sellerContact}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", background: "#c8a97e18", border: "1px solid #c8a97e44", borderRadius: "8px", padding: "7px 12px", color: "#c8a97e", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
                          📞 Call Seller: {activeDelivery.sellerContact}
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ marginLeft: "5px", borderLeft: "2px dashed #1e1e1e", height: "16px" }} />

                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6ee7b7", marginTop: "4px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "3px" }}>DROP-OFF — Buyer</div>
                      <div style={{ fontSize: "13px", color: "#f0ede8" }}>
                        {activeDelivery.dropLocation?.address || `${activeDelivery.dropLocation?.lat}, ${activeDelivery.dropLocation?.lng}`}
                      </div>
                      {activeDelivery.buyerContact && (
                        <a href={`tel:${activeDelivery.buyerContact}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "7px 12px", color: "#6ee7b7", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
                          📞 Call Buyer: {activeDelivery.buyerContact}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons by status */}
                {activeDelivery.status === "accepted" && (
                  <button onClick={handlePickedUp} disabled={actionLoading === "pickup"}
                    style={{ background: "#c8a97e", border: "none", padding: "16px", borderRadius: "14px", fontWeight: "700", cursor: actionLoading === "pickup" ? "not-allowed" : "pointer", fontSize: "16px", color: "#000", fontFamily: "inherit", opacity: actionLoading === "pickup" ? 0.7 : 1 }}>
                    {actionLoading === "pickup" ? "⏳ Updating..." : "📦 I've Picked Up the Package"}
                  </button>
                )}

                {activeDelivery.status === "picked_up" && (
                  <button onClick={handleDelivered} disabled={actionLoading === "deliver"}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "16px", borderRadius: "14px", fontWeight: "700", cursor: actionLoading === "deliver" ? "not-allowed" : "pointer", fontSize: "16px", fontFamily: "inherit", opacity: actionLoading === "deliver" ? 0.7 : 1 }}>
                    {actionLoading === "deliver" ? "⏳ Updating..." : "🚪 I've Delivered the Package"}
                  </button>
                )}

                {activeDelivery.status === "delivered" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "18px", textAlign: "center" }}>
                      <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔢</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#6ee7b7", marginBottom: "6px" }}>Ask the buyer for their OTP</div>
                      <div style={{ fontSize: "13px", color: "#888" }}>The buyer received a 6-digit code on their screen. Enter it below to complete delivery and get paid.</div>
                    </div>

                    <input
                      placeholder="000000"
                      value={otpInput}
                      onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError("") }}
                      maxLength={6}
                      style={inp}
                    />

                    {otpError && (
                      <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
                        ⚠️ {otpError}
                      </div>
                    )}

                    <button onClick={handleConfirmOTP} disabled={otpInput.length !== 6 || otpLoading}
                      style={{ background: "#c8a97e", border: "none", padding: "16px", borderRadius: "14px", fontWeight: "700", cursor: (otpInput.length !== 6 || otpLoading) ? "not-allowed" : "pointer", fontSize: "16px", color: "#000", fontFamily: "inherit", opacity: (otpInput.length !== 6 || otpLoading) ? 0.5 : 1 }}>
                      {otpLoading ? "⏳ Verifying..." : "✅ Confirm OTP & Complete Delivery"}
                    </button>
                  </div>
                )}

                {activeDelivery.status === "completed" && (
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "28px", textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#6ee7b7", marginBottom: "8px" }}>Delivery Complete!</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#c8a97e", marginBottom: "6px" }}>+₵{activeDelivery.deliveryFee}</div>
                    <div style={{ fontSize: "13px", color: "#888" }}>Payment added to your earnings.</div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
