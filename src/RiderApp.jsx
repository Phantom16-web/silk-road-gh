
import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

const API_URL    = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"

const STATUS_COLORS = {
  pending:   { bg: "#78350f18", color: "#fcd34d", border: "#92400e" },
  accepted:  { bg: "#1e3a5f18", color: "#93c5fd", border: "#1d4ed8" },
  picked_up: { bg: "#78350f18", color: "#fb923c", border: "#c2410c" },
  delivered: { bg: "#064e3b18", color: "#6ee7b7", border: "#065f46" },
  completed: { bg: "#064e3b18", color: "#6ee7b7", border: "#065f46" },
  cancelled: { bg: "#7f1d1d18", color: "#fca5a5", border: "#7f1d1d" },
}

const STATUS_LABEL = {
  pending:   "⏳ Pending",
  accepted:  "✅ Accepted — Head to Pickup",
  picked_up: "📦 Package Picked Up — Head to Buyer",
  delivered: "🚪 Delivered — Enter Buyer's OTP",
  completed: "🎉 Delivery Complete",
  cancelled: "❌ Cancelled",
}

async function riderCall(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("silkroad_rider_token")
  const opts  = {
    method,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }
  if (body !== null && method !== "GET") opts.body = JSON.stringify(body)
  const res  = await fetch(`${API_URL}${endpoint}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export default function RiderApp({ rider: initialRider, onSignOut }) {
  const [rider, setRider]                 = useState(initialRider)
  const [tab, setTab]                     = useState("jobs")
  const [jobs, setJobs]                   = useState([])
  const [activeDelivery, setActive]       = useState(null)
  const [loading, setLoading]             = useState(false)
  const [refreshing, setRefreshing]       = useState(false)
  const [otpInput, setOtpInput]           = useState("")
  const [otpError, setOtpError]           = useState("")
  const [otpLoading, setOtpLoading]       = useState(false)
  const [actionLoading, setActionLoading] = useState("")
  const [actionError, setActionError]     = useState("")
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [clearConfirm, setClearConfirm]   = useState(false)
  const [isOnline, setIsOnline]           = useState(rider.isOnline || false)
  const [earnings, setEarnings]           = useState({
    total:      rider.totalEarned     || 0,
    deliveries: rider.totalDeliveries || 0,
  })
  const socketRef    = useRef(null)
  const autoRefRef   = useRef(null)

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SOCKET_URL, {
      autoConnect:          true,
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: Infinity,
      transports:           ["websocket", "polling"],
    })
    s.on("connect", () => {
      s.emit("register_rider", String(rider._id))
    })
    s.on("new_delivery_job", (job) => {
      setActive(prev => {
        if (!prev) {
          setJobs(prevJobs => {
            const id     = job._id || job.deliveryId
            const exists = prevJobs.find(j => (j._id || j.deliveryId) === id)
            if (exists) return prevJobs
            return [job, ...prevJobs]
          })
        }
        return prev
      })
    })
    socketRef.current = s
    return () => s.disconnect()
  }, [rider._id])

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => { fetchJobsAndActive() }, [])

  // ── Auto-refresh every 10s when on active delivery tab ────────────────────
  useEffect(() => {
    if (tab === "active" && activeDelivery) {
      autoRefRef.current = setInterval(() => {
        silentRefreshActive()
      }, 10000)
    }
    return () => { if (autoRefRef.current) clearInterval(autoRefRef.current) }
  }, [tab, activeDelivery?._id, activeDelivery?.status])

  const silentRefreshActive = async () => {
    try {
      const res = await riderCall("/deliveries/my-active")
      if (res.delivery) {
        setActive(res.delivery)
      } else {
        setActive(null)
      }
    } catch {}
  }

  const fetchJobsAndActive = async () => {
    setLoading(true)
    try {
      const [jobsRes, activeRes] = await Promise.all([
        riderCall("/deliveries/available"),
        riderCall("/deliveries/my-active"),
      ])
      if (Array.isArray(jobsRes.jobs)) setJobs(jobsRes.jobs)
      if (activeRes.delivery) {
        setActive(activeRes.delivery)
        setTab("active")
      } else {
        setActive(null)
      }
    } catch (err) {
      console.error("Fetch error:", err.message)
    }
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setActionError("")
    await fetchJobsAndActive()
    setRefreshing(false)
  }

  const handleToggleOnline = async () => {
    try {
      const res = await riderCall("/rider-auth/toggle-online", "PUT")
      setIsOnline(res.isOnline)
    } catch {}
  }

  const handleAccept = async (deliveryId) => {
    setActionLoading(deliveryId); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${deliveryId}/accept`, "PUT")
      if (res.delivery) {
        setActive(res.delivery)
        setJobs([])
        setTab("active")
      }
    } catch (err) {
      setActionError(err.message || "Could not accept. Try refreshing.")
      fetchJobsAndActive()
    }
    setActionLoading("")
  }

  const handleDecline = async (deliveryId) => {
    setActionLoading(`decline-${deliveryId}`)
    try {
      await riderCall(`/deliveries/${deliveryId}/decline`, "PUT")
      setJobs(prev => prev.filter(j => (j._id || j.deliveryId) !== deliveryId))
    } catch {}
    setActionLoading("")
  }

  const handleCancelDelivery = async () => {
    if (!cancelConfirm) { setCancelConfirm(true); return }
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) return
    setActionLoading("cancel"); setActionError(""); setCancelConfirm(false)
    try {
      await riderCall(`/deliveries/${id}/cancel-by-rider`, "PUT")
      setActive(null); setOtpInput(""); setTab("jobs")
      await fetchJobsAndActive()
    } catch (err) {
      setActionError(err.message || "Could not cancel.")
    }
    setActionLoading("")
  }

  // Force-clear stale active delivery (when it's completed/stuck)
  const handleForceClear = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    setActionLoading("clear"); setActionError(""); setClearConfirm(false)
    try {
      await riderCall("/deliveries/force-clear", "PUT")
      setActive(null); setOtpInput(""); setTab("jobs")
      await fetchJobsAndActive()
    } catch (err) {
      setActionError(err.message || "Could not clear.")
    }
    setActionLoading("")
  }

  const handlePickedUp = async () => {
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) { setActionError("Delivery ID missing. Tap refresh."); return }
    setActionLoading("pickup"); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${id}/picked-up`, "PUT")
      setActive(res.delivery)
    } catch (err) {
      setActionError(err.message || "Could not update. Try again.")
    }
    setActionLoading("")
  }

  const handleDelivered = async () => {
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) { setActionError("Delivery ID missing. Tap refresh."); return }
    setActionLoading("deliver"); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${id}/delivered`, "PUT")
      // res.delivery now has status: "delivered"
      // Buyer's OrderTracker will poll and show the OTP
      setActive(res.delivery)
    } catch (err) {
      setActionError(err.message || "Could not update. Try again.")
    }
    setActionLoading("")
  }

  const handleConfirmOTP = async () => {
    if (!otpInput.trim() || !activeDelivery) return
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) { setOtpError("Delivery ID missing."); return }
    setOtpLoading(true); setOtpError("")
    try {
      const res = await riderCall(`/deliveries/${id}/confirm-otp`, "PUT", { otp: otpInput.trim() })
      setActive(res.delivery)
      setEarnings(e => ({
        total:      e.total      + (activeDelivery.deliveryFee || 0),
        deliveries: e.deliveries + 1,
      }))
      setOtpInput("")
      setTimeout(() => { setActive(null); setTab("jobs"); fetchJobsAndActive() }, 3000)
    } catch (err) {
      setOtpError(err.message || "Incorrect OTP. Ask the buyer to check again.")
    }
    setOtpLoading(false)
  }

  const sc = activeDelivery ? (STATUS_COLORS[activeDelivery.status] || STATUS_COLORS.pending) : null

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 500, display: "flex", flexDirection: "column", color: "#f0ede8" }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "#000" }}>
            {rider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>{rider.name}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>
              {rider.vehicle === "motorbike" ? "🛵 Motorbike" : rider.vehicle === "bicycle" ? "🚲 Bicycle" : "🚶 Walking"} · {rider.university}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: isOnline ? "#6ee7b7" : "#555" }}>{isOnline ? "Online" : "Offline"}</span>
          <div onClick={handleToggleOnline}
            style={{ width: "44px", height: "24px", background: isOnline ? "#c8a97e" : "#2a2a2a", borderRadius: "24px", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: "3px", left: isOnline ? "22px" : "3px", width: "18px", height: "18px", background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
          </div>
          <button onClick={onSignOut}
            style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "12px 20px", display: "flex", gap: "28px", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>₵{earnings.total.toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Total Earned</div>
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>{earnings.deliveries}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Deliveries</div>
        </div>
        {rider.rating > 0 && (
          <div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>⭐ {rider.rating.toFixed(1)}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>Rating</div>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {activeDelivery && (
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#93c5fd", background: "#1e3a5f18", border: "1px solid #1d4ed8", padding: "4px 10px", borderRadius: "20px" }}>
              🚀 Active
            </span>
          )}
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ background: "#161616", border: "1px solid #222", color: refreshing ? "#333" : "#888", padding: "6px 12px", borderRadius: "8px", cursor: refreshing ? "not-allowed" : "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: "600" }}>
            {refreshing ? "⏳" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", padding: "0 20px", flexShrink: 0 }}>
        {[
          { id: "jobs",   label: jobs.length > 0 ? `📋 Jobs (${jobs.length})` : "📋 Jobs" },
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
              <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "14px", padding: "28px 20px", textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>😴</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#fcd34d", marginBottom: "6px" }}>You're Offline</div>
                <div style={{ fontSize: "13px", color: "#888" }}>Toggle online to start receiving delivery jobs.</div>
              </div>
            )}

            {actionError && (
              <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", color: "#fca5a5", marginBottom: "16px" }}>
                ⚠️ {actionError}
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: "60px", color: "#444", fontSize: "13px" }}>⏳ Loading jobs...</div>
            )}

            {isOnline && !loading && jobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛵</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#555", marginBottom: "8px" }}>No jobs yet</div>
                <div style={{ fontSize: "13px" }}>New delivery requests appear here instantly.</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {jobs.map(job => {
                const id  = job._id || job.deliveryId
                const fee = job.deliveryFee
                const km  = job.distanceKm
                const eta = rider.vehicle === "motorbike" ? Math.round(km * 3)
                          : rider.vehicle === "bicycle"   ? Math.round(km * 6)
                          : Math.round(km * 12)
                return (
                  <div key={id} style={{ background: "#111", borderRadius: "16px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{job.itemTitle || "Package"}</div>
                        <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>{km} km · ~{eta} min</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e" }}>₵{fee}</div>
                        <div style={{ fontSize: "11px", color: "#555" }}>delivery fee</div>
                      </div>
                    </div>
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8a97e", marginTop: "5px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "#555", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>PICKUP (Seller)</div>
                          <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>
                            {job.pickupAddress || (job.pickupLocation ? `${job.pickupLocation.lat?.toFixed(4)}, ${job.pickupLocation.lng?.toFixed(4)}` : "Provided on accept")}
                          </div>
                          {job.sellerContact && <div style={{ fontSize: "12px", color: "#c8a97e", marginTop: "3px" }}>📞 {job.sellerContact}</div>}
                        </div>
                      </div>
                      <div style={{ marginLeft: "4px", borderLeft: "2px dashed #1e1e1e", height: "14px" }} />
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6ee7b7", marginTop: "5px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "10px", color: "#555", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>DROP-OFF (Buyer)</div>
                          <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>
                            {job.dropAddress || (job.dropLocation ? `${job.dropLocation.lat?.toFixed(4)}, ${job.dropLocation.lng?.toFixed(4)}` : "Provided on accept")}
                          </div>
                          {job.buyerContact && <div style={{ fontSize: "12px", color: "#6ee7b7", marginTop: "3px" }}>📞 {job.buyerContact}</div>}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "0 18px 18px", display: "flex", gap: "10px" }}>
                      <button onClick={() => handleDecline(id)} disabled={!!actionLoading}
                        style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px", fontFamily: "inherit" }}>
                        Decline
                      </button>
                      <button onClick={() => handleAccept(id)} disabled={!!actionLoading || !!activeDelivery}
                        style={{ flex: 2, background: "#c8a97e", border: "none", color: "#000", padding: "12px", borderRadius: "10px", cursor: (!!actionLoading || !!activeDelivery) ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "14px", fontFamily: "inherit", opacity: (!!actionLoading || !!activeDelivery) ? 0.5 : 1 }}>
                        {actionLoading === id ? "⏳ Accepting..." : activeDelivery ? "On a job" : "✅ Accept Job"}
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
                <div style={{ fontSize: "13px", marginBottom: "20px" }}>Accept a job from the Jobs tab.</div>
                <button onClick={handleRefresh}
                  style={{ background: "#161616", border: "1px solid #222", color: "#888", padding: "11px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                  🔄 Refresh
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Status */}
                <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: "14px", padding: "18px 20px" }}>
                  <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>CURRENT STATUS</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: sc.color }}>
                    {STATUS_LABEL[activeDelivery.status] || activeDelivery.status}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#555" }}>{activeDelivery.distanceKm} km</div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e" }}>₵{activeDelivery.deliveryFee}</div>
                  </div>
                </div>

                {/* Item */}
                <div style={{ background: "#161616", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center" }}>
                  {activeDelivery.itemImage
                    ? <img src={activeDelivery.itemImage} alt={activeDelivery.itemTitle} style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: "56px", height: "56px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>📦</div>
                  }
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700" }}>{activeDelivery.itemTitle || "Package"}</div>
                    {activeDelivery.notes && <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>{activeDelivery.notes}</div>}
                  </div>
                </div>

                {/* Route */}
                <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#555", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em" }}>DELIVERY ROUTE</div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c8a97e", marginTop: "4px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "4px" }}>PICKUP — Seller</div>
                      <div style={{ fontSize: "13px", color: "#f0ede8" }}>
                        {activeDelivery.pickupLocation?.address || `${activeDelivery.pickupLocation?.lat?.toFixed(4)}, ${activeDelivery.pickupLocation?.lng?.toFixed(4)}`}
                      </div>
                      {activeDelivery.sellerContact && (
                        <a href={`tel:${activeDelivery.sellerContact}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", background: "#c8a97e18", border: "1px solid #c8a97e44", borderRadius: "8px", padding: "7px 12px", color: "#c8a97e", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
                          📞 Call Seller
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ marginLeft: "5px", borderLeft: "2px dashed #1e1e1e", height: "14px" }} />
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6ee7b7", marginTop: "4px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "4px" }}>DROP-OFF — Buyer</div>
                      <div style={{ fontSize: "13px", color: "#f0ede8" }}>
                        {activeDelivery.dropLocation?.address || `${activeDelivery.dropLocation?.lat?.toFixed(4)}, ${activeDelivery.dropLocation?.lng?.toFixed(4)}`}
                      </div>
                      {activeDelivery.buyerContact && (
                        <a href={`tel:${activeDelivery.buyerContact}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "7px 12px", color: "#6ee7b7", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
                          📞 Call Buyer
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error */}
                {actionError && (
                  <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", color: "#fca5a5" }}>
                    ⚠️ {actionError}
                    <button onClick={() => setActionError("")} style={{ float: "right", background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "16px", minHeight: "auto" }}>✕</button>
                  </div>
                )}

                {/* ── Action by status ── */}

                {activeDelivery.status === "accepted" && (
                  <button onClick={handlePickedUp} disabled={actionLoading === "pickup"}
                    style={{ background: "#c8a97e", border: "none", padding: "18px", borderRadius: "14px", fontWeight: "700", cursor: actionLoading === "pickup" ? "not-allowed" : "pointer", fontSize: "16px", color: "#000", fontFamily: "inherit", opacity: actionLoading === "pickup" ? 0.7 : 1 }}>
                    {actionLoading === "pickup" ? "⏳ Updating..." : "📦 I've Picked Up the Package"}
                  </button>
                )}

                {activeDelivery.status === "picked_up" && (
                  <button onClick={handleDelivered} disabled={actionLoading === "deliver"}
                    style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "18px", borderRadius: "14px", fontWeight: "700", cursor: actionLoading === "deliver" ? "not-allowed" : "pointer", fontSize: "16px", fontFamily: "inherit", opacity: actionLoading === "deliver" ? 0.7 : 1 }}>
                    {actionLoading === "deliver" ? "⏳ Generating OTP..." : "🚪 I've Delivered — Request OTP from Buyer"}
                  </button>
                )}

                {activeDelivery.status === "delivered" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
                      <div style={{ fontSize: "32px", marginBottom: "10px" }}>📱</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#6ee7b7", marginBottom: "8px" }}>Ask the buyer for their OTP</div>
                      <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
                        The buyer has a 6-digit code on their <strong>Order Tracker</strong> screen.<br/>
                        Tell them: "Open your order tracker and read me the 6-digit OTP."
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>ENTER OTP FROM BUYER</div>
                      <input
                        placeholder="000000"
                        value={otpInput}
                        onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError("") }}
                        maxLength={6}
                        style={{ width: "100%", background: "#161616", border: `1.5px solid ${otpError ? "#991b1b" : "#c8a97e44"}`, color: "#c8a97e", padding: "16px", borderRadius: "12px", fontSize: "36px", fontWeight: "900", fontFamily: "monospace", letterSpacing: ".25em", textAlign: "center", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
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
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "32px", textAlign: "center" }}>
                    <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#6ee7b7", marginBottom: "8px" }}>Delivery Complete!</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#c8a97e", marginBottom: "8px" }}>+₵{activeDelivery.deliveryFee}</div>
                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Added to your earnings.</div>
                    <button onClick={handleForceClear}
                      style={{ background: "#161616", border: "1px solid #222", color: "#888", padding: "11px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                      Continue to Next Job →
                    </button>
                  </div>
                )}

                {/* ── CANCEL — only for accepted/picked_up ── */}
                {(activeDelivery.status === "accepted" || activeDelivery.status === "picked_up") && (
                  <div style={{ marginTop: "4px" }}>
                    {!cancelConfirm ? (
                      <button onClick={() => setCancelConfirm(true)}
                        style={{ width: "100%", background: "transparent", border: "1px solid #2a2a2a", color: "#444", padding: "12px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                        ❌ Cancel This Delivery
                      </button>
                    ) : (
                      <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5", textAlign: "center" }}>⚠️ Cancel this delivery?</div>
                        <div style={{ fontSize: "12px", color: "#888", textAlign: "center", lineHeight: "1.6" }}>
                          The job goes back to the board for another rider.
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={() => setCancelConfirm(false)}
                            style={{ flex: 1, background: "#161616", border: "1px solid #222", color: "#888", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                            Keep Going
                          </button>
                          <button onClick={handleCancelDelivery} disabled={actionLoading === "cancel"}
                            style={{ flex: 1, background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "12px", borderRadius: "10px", cursor: actionLoading === "cancel" ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", opacity: actionLoading === "cancel" ? 0.7 : 1 }}>
                            {actionLoading === "cancel" ? "⏳..." : "Yes, Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── FORCE CLEAR — for stuck/stale deliveries ── */}
                {(activeDelivery.status === "completed" || activeDelivery.status === "cancelled") && (
                  <div style={{ marginTop: "4px" }}>
                    {!clearConfirm ? (
                      <button onClick={() => setClearConfirm(true)}
                        style={{ width: "100%", background: "transparent", border: "1px solid #1a1a1a", color: "#333", padding: "10px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
                        🧹 Clear & Accept New Jobs
                      </button>
                    ) : (
                      <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontSize: "13px", color: "#888", textAlign: "center" }}>Clear this from your active slot?</div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={() => setClearConfirm(false)}
                            style={{ flex: 1, background: "#111", border: "1px solid #222", color: "#555", padding: "11px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                            No
                          </button>
                          <button onClick={handleForceClear} disabled={actionLoading === "clear"}
                            style={{ flex: 1, background: "#161616", border: "1px solid #333", color: "#888", padding: "11px", borderRadius: "10px", cursor: actionLoading === "clear" ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
                            {actionLoading === "clear" ? "⏳..." : "Yes, Clear"}
                          </button>
                        </div>
                      </div>
                    )}
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
