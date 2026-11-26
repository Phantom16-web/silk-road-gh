import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { RiderNotificationBell } from "./NotificationCenter"
import { fireToast } from "./OrderTracker"
import "./RiderStyles.css"
import { AIcon } from "./AccountIcons"

const API_URL    = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"

const STEPS = [["accepted", "Accepted"], ["picked_up", "Picked up"], ["delivered", "Delivered"], ["completed", "Confirmed"]]
const STATUS_TITLE = { pending: "Waiting", accepted: "Head to the pick-up", picked_up: "Take it to the buyer", delivered: "Get the buyer’s code", completed: "Delivery complete", cancelled: "Cancelled" }

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isOnline, setIsOnline]           = useState(Boolean(rider.isOnline))
  const [onlineBusy, setOnlineBusy]       = useState(false)
  const [isTestRider, setIsTestRider]     = useState(Boolean(rider.isTestRider))
  const [earnings, setEarnings]           = useState({
    total:      rider.totalEarned     || 0,
    deliveries: rider.totalDeliveries || 0,
  })
  const socketRef  = useRef(null)
  const autoRefRef = useRef(null)

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SOCKET_URL, {
      autoConnect:          true,
      auth:                 { token: localStorage.getItem("silkroad_rider_token") || "" },
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: Infinity,
      transports:           ["websocket", "polling"],
    })
    s.on("connect", () => {
      s.emit("register_rider", String(rider._id))
      window.dispatchEvent(new Event("silkroad_rider_socket_connected"))
    })
    // Saved notifications for this rider go to the bell and show a toast.
    s.on("notification", (data) => {
      window.dispatchEvent(new CustomEvent("silkroad_rider_notification", { detail: data }))
      fireToast({ kind: data?.type, title: data?.title || "Update", message: data?.message || "" })
    })
    s.on("new_delivery_job", (job) => {
      fireToast({ kind: "new_delivery_job", title: "New delivery job", message: `${job.itemTitle || "A delivery"} is waiting for a rider.` })
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

  // Test riders only see Testing Mode jobs. Ask the server so the badge is right even on an old session.
  useEffect(() => { riderCall("/rider-auth/me").then(me => setIsTestRider(Boolean(me?.isTestRider))).catch(() => {}) }, [])

  // ── Auto-refresh active delivery every 10s ─────────────────────────────────
  useEffect(() => {
    if (tab === "active" && activeDelivery) {
      autoRefRef.current = setInterval(silentRefreshActive, 10000)
    }
    return () => { if (autoRefRef.current) clearInterval(autoRefRef.current) }
  }, [tab, activeDelivery?._id, activeDelivery?.status])

  const silentRefreshActive = async () => {
    try {
      const res = await riderCall("/deliveries/my-active")
      if (res.delivery) setActive(res.delivery)
      else setActive(null)
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
      if (activeRes.delivery) { setActive(activeRes.delivery); setTab("active") }
      else setActive(null)
    } catch (err) { console.error("Fetch error:", err.message) }
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true); setActionError("")
    await fetchJobsAndActive()
    setRefreshing(false)
  }

  const handleToggleOnline = async () => {
    if (onlineBusy) return
    setOnlineBusy(true)
    setActionError("")
    try {
      const res = await riderCall("/rider-auth/toggle-online", "PUT")
      setIsOnline(Boolean(res.isOnline))
      setRider(previous => {
        const next = { ...previous, isOnline: Boolean(res.isOnline) }
        localStorage.setItem("silkroad_rider", JSON.stringify(next))
        return next
      })
      await fetchJobsAndActive()
    } catch (err) {
      setActionError(err.message || "Unable to change availability. Please retry.")
    } finally {
      setOnlineBusy(false)
    }
  }

  const handleAccept = async (deliveryId) => {
    setActionLoading(deliveryId); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${deliveryId}/accept`, "PUT")
      if (res.delivery) { setActive(res.delivery); setJobs([]); setTab("active") }
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
    } catch (err) { setActionError(err.message || "Could not cancel.") }
    setActionLoading("")
  }

  const handleForceClear = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    setActionLoading("clear"); setActionError(""); setClearConfirm(false)
    try {
      await riderCall("/deliveries/force-clear", "PUT")
      setActive(null); setOtpInput(""); setTab("jobs")
      await fetchJobsAndActive()
    } catch (err) { setActionError(err.message || "Could not clear.") }
    setActionLoading("")
  }

  const handlePickedUp = async () => {
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) { setActionError("Delivery ID missing. Tap refresh."); return }
    setActionLoading("pickup"); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${id}/picked-up`, "PUT")
      setActive(res.delivery)
    } catch (err) { setActionError(err.message || "Could not update. Try again.") }
    setActionLoading("")
  }

  const handleDelivered = async () => {
    const id = activeDelivery?._id || activeDelivery?.id
    if (!id) { setActionError("Delivery ID missing. Tap refresh."); return }
    setActionLoading("deliver"); setActionError("")
    try {
      const res = await riderCall(`/deliveries/${id}/delivered`, "PUT")
      setActive(res.delivery)
    } catch (err) { setActionError(err.message || "Could not update. Try again.") }
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
      setEarnings(e => ({ total: e.total + (activeDelivery.deliveryFee || 0), deliveries: e.deliveries + 1 }))
      setOtpInput("")
      setTimeout(() => { setActive(null); setTab("jobs"); fetchJobsAndActive() }, 3000)
    } catch (err) { setOtpError(err.message || "Incorrect OTP. Ask the buyer to check again.") }
    setOtpLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return }
    setDeleteLoading(true)
    try {
      await riderCall("/rider-auth/delete-account", "DELETE")
      localStorage.removeItem("silkroad_rider_token")
      localStorage.removeItem("silkroad_rider")
      onSignOut()
    } catch (err) {
      setActionError(err.message || "Could not delete account.")
      setShowDeleteConfirm(false)
    }
    setDeleteLoading(false)
  }

  const stepIndex = activeDelivery ? Math.max(0, STEPS.findIndex(([k]) => k === activeDelivery.status)) : 0
  const money = n => `₵${Number(n || 0).toLocaleString()}`
  const where = loc => loc?.address || (loc?.lat != null ? `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}` : "Shown after you accept")
  const vehicleLabel = rider.vehicle === "motorbike" ? "Motorbike" : rider.vehicle === "bicycle" ? "Bicycle" : "On foot"

  return (
    <div className="rd-root">
      <header className="rd-head">
        <div className="rd-av" aria-hidden="true">{rider.name.charAt(0).toUpperCase()}</div>
        <div className="rd-who">
          <b>{rider.name}{isTestRider && <span className="rd-test" title="Test rider: sees Testing Mode jobs only">TEST</span>}</b>
          <small>{vehicleLabel} · {rider.university}</small>
        </div>
        <RiderNotificationBell />
      </header>

      <div className="rd-body">
        <div className="rd-col">
          {actionError && tab !== "active" && <div role="alert" className="rd-err"><AIcon name="alert" size={17} /><span>{actionError}</span><button type="button" onClick={() => setActionError("")} aria-label="Dismiss"><AIcon name="close" size={15} /></button></div>}

          {tab !== "me" && (<>
            <section className={`rd-power ${isOnline ? "on" : ""}`}>
              <div className="rd-radar" aria-hidden="true"><i /><i /><i /><AIcon name="bike" size={26} /></div>
              <div><h2>{isOnline ? "You’re online" : "You’re offline"}</h2><p>{isOnline ? "New delivery jobs appear here the moment they’re posted." : "Go online to start receiving delivery jobs."}</p></div>
              <button type="button" role="switch" aria-checked={isOnline} aria-label="Rider online availability" className={`rd-switch ${isOnline ? "on" : ""}`} disabled={onlineBusy} onClick={handleToggleOnline}><span /></button>
            </section>
            <div className="rd-stats">
              <div className="rd-stat"><small>Total earned</small><b>{money(earnings.total)}</b></div>
              <div className="rd-stat"><small>Deliveries</small><b>{earnings.deliveries}</b></div>
              <div className="rd-stat"><small>Rating</small><b>{rider.rating > 0 ? rider.rating.toFixed(1) : "New"}</b></div>
            </div>
          </>)}

          {tab === "jobs" && (<>
            <div className="rd-toolbar"><h3>Available jobs</h3>
              <button type="button" className={`rd-refresh ${refreshing ? "spin" : ""}`} onClick={handleRefresh} disabled={refreshing}><AIcon name="refresh" size={15} stroke={2.2} />{refreshing ? "Updating" : "Refresh"}</button></div>
            {loading && <div className="rd-empty"><p>Loading jobs…</p></div>}
            {!isOnline && !loading && <div className="rd-empty"><div className="art"><AIcon name="clock" size={32} /></div><h3>Go online to see jobs</h3><p>Flip the switch above and nearby delivery requests will show up here.</p></div>}
            {isOnline && !loading && jobs.length === 0 && <div className="rd-empty"><div className="art"><AIcon name="package" size={32} /></div><h3>No jobs yet</h3><p>Stay online. New requests appear instantly and you’ll get a notification.</p></div>}
            {jobs.map((job, index) => {
              const id = job._id || job.deliveryId
              const km = Number(job.distanceKm) || 0
              const eta = rider.vehicle === "motorbike" ? Math.round(km * 3) : rider.vehicle === "bicycle" ? Math.round(km * 6) : Math.round(km * 12)
              return (
                <article key={id} className="rd-card" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
                  <div className="rd-job-head">
                    <div className="rd-thumb">{job.itemImage ? <img src={job.itemImage} alt="" /> : <AIcon name="package" size={24} />}</div>
                    <div><strong>{job.itemTitle || "Package"}</strong><div className="rd-chips"><span className="rd-chip"><AIcon name="pin" size={12} />{km} km</span><span className="rd-chip"><AIcon name="clock" size={12} />~{eta} min</span></div></div>
                    <div className="rd-fee"><b>{money(job.deliveryFee)}</b><small>you earn</small></div>
                  </div>
                  <div className="rd-route">
                    <div className="rd-stop"><i /><div><small>Pick-up · seller</small><span>{job.pickupAddress || (job.pickupLocation ? `${job.pickupLocation.lat?.toFixed(4)}, ${job.pickupLocation.lng?.toFixed(4)}` : "Shown after you accept")}</span></div></div>
                    <div className="rd-stop"><i className="b" /><div><small>Drop-off · buyer</small><span>{job.dropAddress || (job.dropLocation ? `${job.dropLocation.lat?.toFixed(4)}, ${job.dropLocation.lng?.toFixed(4)}` : "Shown after you accept")}</span></div></div>
                  </div>
                  <div className="rd-actions">
                    <button type="button" className="rd-btn danger" onClick={() => handleDecline(id)} disabled={!!actionLoading}>Decline</button>
                    <button type="button" className="rd-btn primary" onClick={() => handleAccept(id)} disabled={!!actionLoading || !!activeDelivery}>{actionLoading === id ? "Accepting…" : activeDelivery ? "Finish your current job" : <>Accept job <AIcon name="arrow" size={18} stroke={2.5} /></>}</button>
                  </div>
                </article>
              )
            })}
          </>)}

          {tab === "active" && (!activeDelivery ? (
            <div className="rd-empty"><div className="art"><AIcon name="bike" size={32} /></div><h3>No active delivery</h3><p>Accept a job from the Jobs tab and it will show up here with step-by-step guidance.</p>
              <button type="button" className="rd-btn ghost" style={{ maxWidth: 220, marginTop: 8 }} onClick={handleRefresh}><AIcon name="refresh" size={16} />Refresh</button></div>
          ) : (<>
            <section className="rd-status">
              <small>CURRENT STEP</small>
              <h2>{STATUS_TITLE[activeDelivery.status] || activeDelivery.status}</h2>
              <div className="rd-status-row"><span>{activeDelivery.distanceKm} km trip</span><b>{money(activeDelivery.deliveryFee)}</b></div>
              {activeDelivery.status !== "cancelled" && <ol className="rd-steps" aria-label="Delivery progress">{STEPS.map(([key, label], i) => <li key={key} className={i < stepIndex || activeDelivery.status === "completed" ? "done" : i === stepIndex ? "now" : ""}><i>{i < stepIndex || activeDelivery.status === "completed" ? <AIcon name="check" size={11} stroke={3} /> : null}</i><span>{label}</span></li>)}</ol>}
            </section>

            <section className="rd-card rd-item">
              <div className="rd-thumb">{activeDelivery.itemImage ? <img src={activeDelivery.itemImage} alt={activeDelivery.itemTitle} /> : <AIcon name="package" size={24} />}</div>
              <div><b>{activeDelivery.itemTitle || "Package"}</b>{activeDelivery.notes && <span>{activeDelivery.notes}</span>}</div>
            </section>

            <section className="rd-card rd-pad">
              <span className="rd-label">Delivery route</span>
              <div className="rd-route" style={{ padding: 0 }}>
                <div className="rd-stop"><i /><div><small>Pick-up · seller</small><span>{where(activeDelivery.pickupLocation)}</span>
                  {activeDelivery.sellerContact && <a className="rd-call" href={`tel:${activeDelivery.sellerContact}`}><AIcon name="phone" size={14} />Call seller</a>}</div></div>
                <div className="rd-stop"><i className="b" /><div><small>Drop-off · buyer</small><span>{where(activeDelivery.dropLocation)}</span>
                  {activeDelivery.buyerContact && <a className="rd-call g" href={`tel:${activeDelivery.buyerContact}`}><AIcon name="phone" size={14} />Call buyer</a>}</div></div>
              </div>
            </section>

            {actionError && <div role="alert" className="rd-err"><AIcon name="alert" size={17} /><span>{actionError}</span><button type="button" onClick={() => setActionError("")} aria-label="Dismiss"><AIcon name="close" size={15} /></button></div>}

            {activeDelivery.status === "accepted" && <button type="button" className="rd-btn primary" onClick={handlePickedUp} disabled={actionLoading === "pickup"}>{actionLoading === "pickup" ? "Updating…" : <><AIcon name="package" size={20} />I’ve picked up the package</>}</button>}
            {activeDelivery.status === "picked_up" && <button type="button" className="rd-btn green" onClick={handleDelivered} disabled={actionLoading === "deliver"}>{actionLoading === "deliver" ? "Getting the code ready…" : <><AIcon name="check" size={20} />I’ve arrived · ask for the code</>}</button>}

            {activeDelivery.status === "delivered" && (<>
              <div className="rd-otp-info"><AIcon name="shield" size={30} /><b>Ask the buyer for their code</b><span>They’ll see a 6-digit code on their order screen. Hand over the item first, then enter it below.</span></div>
              <div><span className="rd-label">Buyer’s code</span>
                <input className={`rd-otp ${otpError ? "bad" : ""}`} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" value={otpInput} maxLength={6} onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError("") }} aria-label="Buyer's 6-digit code" /></div>
              {otpError && <div role="alert" className="rd-err"><AIcon name="alert" size={17} /><span>{otpError}</span></div>}
              <button type="button" className="rd-btn primary" onClick={handleConfirmOTP} disabled={otpInput.length !== 6 || otpLoading}>{otpLoading ? "Verifying…" : "Confirm & complete delivery"}</button>
            </>)}

            {activeDelivery.status === "completed" && (
              <div className="rd-done">
                <svg className="big" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l8 8 15-17" /></svg>
                <h3>Delivery complete</h3><div className="amt">+{money(activeDelivery.deliveryFee)}</div><p>Added to your earnings.</p>
                <button type="button" className="rd-btn ghost" onClick={handleForceClear}>Continue to the next job <AIcon name="arrow" size={18} /></button>
              </div>
            )}

            {(activeDelivery.status === "accepted" || activeDelivery.status === "picked_up") && (!cancelConfirm
              ? <button type="button" className="rd-btn quiet" onClick={() => setCancelConfirm(true)}>Cancel this delivery</button>
              : <div className="rd-confirm"><b>Cancel this delivery?</b><span>The job goes back to the board for another rider.</span>
                  <div className="row"><button type="button" className="rd-btn ghost" onClick={() => setCancelConfirm(false)}>Keep going</button>
                    <button type="button" className="rd-btn danger" onClick={handleCancelDelivery} disabled={actionLoading === "cancel"}>{actionLoading === "cancel" ? "Cancelling…" : "Yes, cancel"}</button></div></div>)}

            {(activeDelivery.status === "completed" || activeDelivery.status === "cancelled") && (!clearConfirm
              ? <button type="button" className="rd-btn quiet" onClick={() => setClearConfirm(true)}>Clear &amp; accept new jobs</button>
              : <div className="rd-confirm"><b>Clear this from your active slot?</b>
                  <div className="row"><button type="button" className="rd-btn ghost" onClick={() => setClearConfirm(false)}>No</button>
                    <button type="button" className="rd-btn primary" onClick={handleForceClear} disabled={actionLoading === "clear"}>{actionLoading === "clear" ? "Clearing…" : "Yes, clear"}</button></div></div>)}
          </>))}

          {tab === "me" && (<>
            <section className="rd-card rd-profile">
              <div className="rd-av" aria-hidden="true">{rider.name.charAt(0).toUpperCase()}</div>
              <h3>{rider.name}</h3><p>{vehicleLabel} · {rider.university}{isTestRider ? " · Test rider" : ""}</p>
            </section>
            <button type="button" className="rd-btn ghost" onClick={onSignOut}><AIcon name="logout" size={18} />Sign out</button>
            {!showDeleteConfirm
              ? <button type="button" className="rd-btn quiet" onClick={() => setShowDeleteConfirm(true)}>Delete rider account</button>
              : <div className="rd-confirm"><b>Delete your rider account?</b><span>This is permanent and cannot be undone.</span>
                  <div className="row"><button type="button" className="rd-btn ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button type="button" className="rd-btn danger" onClick={handleDeleteAccount} disabled={deleteLoading}>{deleteLoading ? "Deleting…" : "Yes, delete"}</button></div></div>}
          </>)}
        </div>
      </div>

      <nav className="rd-tabbar" aria-label="Rider navigation">
        <button type="button" className={tab === "jobs" ? "on" : ""} onClick={() => setTab("jobs")}><AIcon name="package" size={21} /><span>Jobs</span>{jobs.length > 0 && <em>{jobs.length}</em>}</button>
        <button type="button" className={tab === "active" ? "on" : ""} onClick={() => setTab("active")}><AIcon name="bike" size={21} /><span>Active</span>{activeDelivery && <i className="dot" aria-hidden="true" />}</button>
        <button type="button" className={tab === "me" ? "on" : ""} onClick={() => setTab("me")}><AIcon name="user" size={21} /><span>Me</span></button>
      </nav>
    </div>
  )
}

