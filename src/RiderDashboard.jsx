import { useCallback, useEffect, useState } from "react"

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")
const panel = { background: "#171717", border: "1px solid #37302a", borderRadius: 16, padding: 18 }
const gold = "#d7b47a"
const btn = { background: gold, color: "#16120d", border: 0, borderRadius: 10, padding: "11px 16px", fontWeight: 800, cursor: "pointer" }
const secondary = { ...btn, background: "#292725", color: "#eee1cd", border: "1px solid #5a4a35" }

export default function RiderDashboard({ user, onClose }) {
  const [jobs, setJobs] = useState([])
  const [active, setActive] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [otp, setOtp] = useState("")
  const [context, setContext] = useState(null)
  const token = user?.token || user?.riderToken || localStorage.getItem("riderToken")
    || localStorage.getItem("rider_token")
  const request = useCallback(async (path, method = "GET", body) => {
    if (!token) throw Error("Rider login is required. Sign in to your rider account.")
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw Error(data.message || `Request failed (${response.status})`)
    return data
  }, [token])
  const refresh = useCallback(async () => {
    const current = await request("/api/deliveries/my-active")
    const assigned = current.delivery || null
    setActive(assigned)
    if (assigned) {
      const info = await request(`/api/group-lifecycle/rider-delivery/${assigned._id}/confirmation-context`)
      setContext(info)
      setJobs([])
    } else {
      setContext(null)
      const available = await request("/api/deliveries/available")
      setJobs(available.jobs || [])
    }
  }, [request])
  useEffect(() => { refresh().catch(e => setError(e.message)) }, [refresh])
  async function act(path, method = "PUT", body) {
    setBusy(true); setError(""); setNotice("")
    try {
      const data = await request(path, method, body)
      setNotice(data.message || "Updated successfully.")
      setOtp("")
      await refresh()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const money = amount => `GH₵${Number(amount || 0).toFixed(2)}`
  const action = (label, path, method = "PUT", body, style = btn) => (
    <button type="button" disabled={busy} style={{ ...style, opacity: busy ? 0.5 : 1 }} onClick={() => act(path, method, body)}>{label}</button>
  )
  const place = p => p?.address || (Number.isFinite(p?.lat) ? `${p.lat}, ${p.lng}` : "Location provided after acceptance")
  return <div style={{ position: "fixed", inset: 0, background: "#080808ee", zIndex: 400, padding: 16, overflowY: "auto", color: "#f4eee5" }}>
    <div style={{ maxWidth: 680, margin: "24px auto", display: "grid", gap: 16 }}>
      <header style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div><div style={{ color: gold, letterSpacing: 2, fontSize: 11 }}>SILK ROAD • DELIVERY</div><h2 style={{ margin: "6px 0" }}>Rider dashboard</h2><span style={{ color: "#b9ad9e" }}>{user?.name || "Rider"} · Live delivery jobs</span></div>
        <button type="button" onClick={onClose} style={secondary}>Close</button>
      </header>
      {error && <div role="alert" style={{ ...panel, borderColor: "#9b4343", color: "#ffc5c5" }}>{error}</div>}
      {notice && <div role="status" style={{ ...panel, borderColor: "#4a7656", color: "#baf4c5" }}>{notice}</div>}
      <button type="button" style={secondary} disabled={busy} onClick={() => refresh().catch(e => setError(e.message))}>Refresh deliveries</button>
      {active ? <section style={panel}>
        <div style={{ color: gold, fontSize: 12 }}>CURRENT DELIVERY</div>
        <h3 style={{ margin: "8px 0" }}>{active.itemTitle || "Customer order"}</h3>
        <p style={{ color: "#c2b9ac" }}>Status: <strong>{active.status}</strong> · Fee: <strong>{money(active.deliveryFee)}</strong></p>
        <p>Pickup: {place(active.pickupLocation)}</p><p>Drop-off: {place(active.dropLocation)}</p>
        {active.sellerContact && <p>Seller: {active.sellerContact}</p>}
        {active.buyerContact && <p>Buyer: {active.buyerContact}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {active.status === "accepted" && action("Item picked up", `/api/deliveries/${active._id}/picked-up`)}
          {active.status === "picked_up" && action("Arrived at buyer / delivered", `/api/deliveries/${active._id}/delivered`)}
          {["accepted", "picked_up"].includes(active.status) && action("Release assignment", `/api/deliveries/${active._id}/cancel-by-rider`, "PUT", undefined, secondary)}
        </div>
        {active.status === "delivered" && <div style={{ marginTop: 18, padding: 16, border: "1px solid #6b593f", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>Confirm with buyer's code</h3>
          <p style={{ color: "#c2b9ac" }}>Ask the buyer to generate the six-digit delivery code in their order screen. Payment is not released until the code is verified and settlement is recorded.</p>
          <input aria-label="Six-digit delivery code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" style={{ background: "#24211e", color: "white", border: "1px solid #88704d", borderRadius: 10, padding: 14, fontSize: 22, width: 170, letterSpacing: 5 }} />
          <div style={{ marginTop: 12 }}>
            <button type="button" style={btn} disabled={busy || otp.length !== 6 || !context} onClick={() => {
              if (context?.grouped) return act(`/api/group-lifecycle/${encodeURIComponent(context.checkoutId)}/orders/${context.orderId}/confirm-rider-delivery`, "POST", { deliveryCode: otp })
              if (context?.grouped === false) return act(`/api/deliveries/${active._id}/confirm-otp`, "PUT", { otp })
              setError("Unable to verify delivery type. Confirmation is blocked for safety.")
            }}>Verify delivery code</button>
          </div>
        </div>}
      </section> : <section style={panel}>
        <h3 style={{ marginTop: 0 }}>Available rider jobs</h3>
        {!jobs.length && <p style={{ color: "#a9a093" }}>No funded jobs available right now.</p>}
        {jobs.map(job => <div key={job._id || job.id} style={{ borderTop: "1px solid #3c342a", padding: "16px 0" }}>
          <strong>{job.itemTitle || "Delivery request"}</strong>
          <p style={{ color: "#b8aa97" }}>Fee: {money(job.deliveryFee)} · Distance: {Number(job.distanceKm || 0).toFixed(1)} km</p>
          {action("Accept job", `/api/deliveries/${job._id || job.id}/accept`)}
        </div>)}
      </section>}
    </div>
  </div>
}
