import { useEffect, useState } from "react"
import { getListings } from "./api"

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
const gold = "#d5b27e"
const panel = { background: "#171717", border: "1px solid #333", borderRadius: 18, padding: 20 }
const input = { background: "#101010", color: "white", border: "1px solid #494139", borderRadius: 10, padding: 12, width: "100%", boxSizing: "border-box" }
const button = { border: 0, borderRadius: 10, padding: "12px 18px", background: gold, color: "#15110b", fontWeight: 800, cursor: "pointer" }
const money = n => `GH₵ ${Number(n || 0).toFixed(2)}`
const identity = item => item?._id || item?.id

async function api(path, options = {}) {
  const token = localStorage.getItem("silkroad_token")
  const response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`)
  return data
}

export default function RentItems({ rate, initialListing = null }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [days, setDays] = useState(1)
  const [availability, setAvailability] = useState(null)
  const [contact, setContact] = useState("")
  const [accept, setAccept] = useState(false)
  const [order, setOrder] = useState(() => { try { return JSON.parse(localStorage.getItem("sr_pending_rental_order") || "null") } catch { return null } })
  const [paymentMethod, setPaymentMethod] = useState("paystack")
  const [bookings, setBookings] = useState([])
  const [paymentReference, setPaymentReference] = useState("")
  const [evidenceUrl, setEvidenceUrl] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [tab, setTab] = useState("browse")
  const authenticated = Boolean(localStorage.getItem("silkroad_token"))
  useEffect(() => {
    if (!initialListing?._id) return
    setTab("browse")
    setSelected(initialListing)
    setOrder(null)
    setAvailability(null)
  }, [initialListing?._id])
  useEffect(() => {
    let active = true
    setAvailability(null)
    if (selected?._id) api(`/rentals/availability/${encodeURIComponent(selected._id)}`)
      .then(data => { if (active) setAvailability(data.available) })
      .catch(() => { if (active) setAvailability(null) })
    return () => { active = false }
  }, [selected?._id])
  const price = Number(selected?.dailyRate || 0) * days
  const usd = rate && Number(rate) > 0 ? ` (≈ $${(price / rate).toFixed(2)})` : ""

  async function loadBookings() {
    if (!localStorage.getItem("silkroad_token")) return
    try { const data = await api("/rentals/mine"); setBookings(data.bookings || []) }
    catch (e) { setError(e.message) }
  }
  useEffect(() => {
    let live = true
    getListings({ type: "rent", limit: 50 }).then(data => {
      if (live) setListings(Array.isArray(data) ? data.filter(x => x._id && x.type === "rent") : [])
    }).catch(() => { if (live) setError("Could not load rental listings. Try again later.") }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  useEffect(() => { if (tab === "mine") loadBookings() }, [tab])

  function resetMessage() { setError(""); setNotice("") }
  async function createOrder() {
    resetMessage()
    if (!authenticated) { setError("Sign in to your Silk Road account before renting an item."); return }
    if (!selected?._id || !Number.isSafeInteger(days) || days < 1 || days > Number(selected.maxDays || 365)) { setError("Choose a valid rental period."); return }
    if (!contact.trim()) { setError("Enter your contact information."); return }
    if (!accept) { setError("You must accept the accountability terms, or cancel the booking."); return }
    setBusy(true)
    try {
      const availabilityCheck = await api(`/rentals/availability/${encodeURIComponent(selected._id)}`)
      if (!availabilityCheck.available) throw new Error("This item is currently rented. Do not pay for it.")
      const reserved = await api("/rentals/reserve", { method: "POST", body: JSON.stringify({ listingId: selected._id }) })
      const data = await api("/orders", { method: "POST", body: JSON.stringify({ listingId: selected._id, reservationId: reserved.reservationId, type: "rent", rentalDays: days, amount: price, contactInfo: contact.trim(), deliveryMethod: "pickup", paymentMethod }) })
      const pending = { id: data.orderId, amount: data.order?.amount ?? price, environment: data.environment, status: data.paymentStatus, paymentMethod, listingId: selected._id }
      setOrder(pending); localStorage.setItem("sr_pending_rental_order", JSON.stringify(pending))
      setNotice(paymentMethod === "paystack" ? "Order created. Continue to Paystack to pay. Escrow remains unverified until the server confirms payment." : "Order created. Submit your actual MoMo payment evidence for administrator review.")
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function startPaystack() {
    resetMessage()
    if (!order?.id || order.paymentMethod !== "paystack") return
    if (order.paymentId) { setError("A Paystack payment attempt already exists. Verify it or contact support before retrying."); return }
    if (order.environment !== "live") { setError("Live Paystack checkout is disabled in testing. The Owner can simulate payment separately; no real money will be collected."); return }
    setBusy(true)
    try {
      const result = await api(`/payments/paystack/${encodeURIComponent(order.id)}`, { method: "POST", body: "{}" })
      if (!result.authorizationUrl || !/^https:\/\//i.test(result.authorizationUrl)) throw new Error("No valid Paystack checkout URL was returned.")
      const pending = { ...order, paymentId: result.payment?.id || result.payment?._id || null }
      setOrder(pending); localStorage.setItem("sr_pending_rental_order", JSON.stringify(pending))
      window.location.assign(result.authorizationUrl)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function verifyPaystack() {
    resetMessage()
    if (!order?.paymentId) { setError("Payment verification reference is unavailable. Contact support; do not pay again."); return }
    setBusy(true)
    try {
      const result = await api(`/payments/paystack/${encodeURIComponent(order.paymentId)}/verify`, { method: "POST", body: "{}" })
      setNotice(result.message || "Verification request processed. Activate only when escrow is confirmed by the server.")
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function submitEvidence() {
    resetMessage()
    if (!order?.id || !paymentReference.trim()) { setError("Enter your actual Mobile Money transaction reference."); return }
    if (order.environment !== "live") { setError("Testing orders cannot submit real MoMo payments. Use the Owner's testing payment workflow."); return }
    setBusy(true)
    try {
      await api(`/payments/manual/${encodeURIComponent(order.id)}`, { method: "POST", body: JSON.stringify({ buyerReference: paymentReference.trim(), evidenceUrl: evidenceUrl.trim() || null }) })
      setNotice("Payment evidence submitted for administrator verification. This is not payment confirmation. Do not hand over the item yet.")
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function activate() {
    resetMessage(); setBusy(true)
    try {
      const data = await api(`/rentals/orders/${encodeURIComponent(order.id)}/activate`, { method: "POST", body: JSON.stringify({ acceptAccountability: accept }) })
      setNotice(data.message); await loadBookings(); setTab("mine"); setOrder(null); localStorage.removeItem("sr_pending_rental_order"); setSelected(null)
    } catch (e) { setError(`${e.message} Wait for verified escrow before activation.`) }
    finally { setBusy(false) }
  }
  async function action(booking, type) {
    resetMessage(); setBusy(true)
    try {
      const data = await api(`/rentals/${encodeURIComponent(booking._id)}/${type}`, { method: "POST", body: JSON.stringify(type === "dispute" ? { reason: reason.trim() } : {}) })
      setNotice(data.message || "Rental updated."); setReason(""); await loadBookings()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const open = item => { setAvailability(null); setSelected(item); setOrder(null); localStorage.removeItem("sr_pending_rental_order"); setDays(1); setAccept(false); setContact(""); resetMessage() }

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px 90px", color: "#f8f4ed" }}>
    <header style={{ marginBottom: 26 }}><div style={{ color: gold, fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>SILK ROAD GH · RENTALS</div><h1 style={{ fontSize: "clamp(28px,5vw,44px)", margin: "8px 0" }}>Borrow what you need.</h1><p style={{ color: "#aaa" }}>Rent from fellow students. Escrow, accountability and returns are tracked by Silk Road.</p></header>
    <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}><button style={{ ...button, background: tab === "browse" ? gold : "#292929", color: tab === "browse" ? "#111" : "white" }} onClick={() => setTab("browse")}>Browse rentals</button><button style={{ ...button, background: tab === "mine" ? gold : "#292929", color: tab === "mine" ? "#111" : "white" }} onClick={() => setTab("mine")}>My rentals</button></div>
    {error && <p role="alert" style={{ padding: 14, borderRadius: 12, background: "#451b1b", color: "#fecaca" }}>{error}</p>}
    {notice && <p role="status" style={{ padding: 14, borderRadius: 12, background: "#153d30", color: "#b8f5d7" }}>{notice}</p>}
    {order && !selected && <div style={{ ...panel, marginBottom: 18 }}><strong>Pending rental order {order.id}</strong><p>Payment: {order.paymentMethod} · {money(order.amount)}</p>{order.paymentMethod === "paystack" && <><button style={button} disabled={busy || !!order.paymentId || order.environment !== "live"} onClick={startPaystack}>Continue to Paystack</button>{order.paymentId && <button style={{ ...button, marginLeft: 8 }} disabled={busy} onClick={verifyPaystack}>Verify payment</button>}</>}<label style={{ display: "block", marginTop: 12 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} /> I accept the rental accountability terms (damage claims require investigation).</label><button style={{ ...button, marginLeft: 8, background: "#333", color: "white" }} disabled={busy || !accept} onClick={activate}>Activate verified rental</button></div>}
    {tab === "browse" && <>
      {loading ? <p>Loading rentals…</p> : !listings.length ? <div style={panel}>No live rental listings are currently available. Listings will appear here when sellers publish them.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: 16 }}>{listings.map(item => <article key={identity(item)} style={{ ...panel, padding: 0, overflow: "hidden" }}><div style={{ height: 170, background: "#242424" }}>{item.image && <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}</div><div style={{ padding: 17 }}><h3 style={{ margin: "0 0 8px" }}>{item.title}</h3><p style={{ color: gold, fontWeight: 800 }}>{money(item.dailyRate)} / day</p><p style={{ color: "#aaa", fontSize: 13 }}>Up to {item.maxDays || "—"} days · {item.condition || "Condition not specified"}</p><button style={{ ...button, width: "100%" }} onClick={() => open(item)}>View rental</button></div></article>)}</div>}
      {selected && <div style={{ ...panel, marginTop: 25, maxWidth: 650 }}><button onClick={() => { setSelected(null); setOrder(null) }} style={{ background: "transparent", border: 0, color: gold, cursor: "pointer" }}>← Close</button><h2>{selected.title}</h2><p style={{ color: availability === false ? "#ff8b8b" : "#c9c9c9" }}>{availability === false ? "Currently unavailable — do not create or pay for an order." : availability === true ? "Currently available. Availability is not reserved until the paid rental is activated." : "Checking availability. Do not pay until confirmed."}</p><p style={{ color: "#aaa" }}>{selected.description || selected.desc || "Review the item's condition with the owner before collection."}</p><label style={{ display: "grid", gap: 7 }}>Number of days<input style={input} type="number" min="1" max={selected.maxDays || 365} value={days} onChange={e => setDays(Number(e.target.value))} disabled={!!order} /></label><p style={{ fontSize: 22, fontWeight: 800, color: gold }}>Rental cost: {money(price)}{usd}</p><p style={{ color: "#bbb", fontSize: 13 }}>Final charges and platform commission are determined by the backend. No refundable deposit or damage penalty is collected automatically by this screen.</p><label style={{ display: "grid", gap: 7, marginBottom: 15 }}>Your contact number<input style={input} value={contact} onChange={e => setContact(e.target.value)} disabled={!!order} placeholder="Mobile number" /></label><label style={{ display: "flex", gap: 12, alignItems: "start", lineHeight: 1.6, marginBottom: 20 }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} disabled={!!order} style={{ marginTop: 6 }} /><span>I accept responsibility for returning this item in its agreed condition. Damage claims may be investigated and, where justified and lawful, may be assessed up to 2× the rental amount. I understand this is <strong>not an automatic charge</strong> and I may decline and cancel now.</span></label>
      {!order && <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>Payment method<select style={input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="paystack">Paystack (automated)</option><option value="manual_momo">Manual Mobile Money (admin verified)</option></select></label>}
      {!order ? <button style={button} disabled={busy || !accept || availability !== true} onClick={createOrder}>{busy ? "Creating order…" : "Create rental order"}</button> : <div style={{ ...panel, borderColor: "#735b34" }}><h3>Order {order.id}</h3><p>Payment status: <strong>{order.status || "pending"}</strong> · Environment: {order.environment}</p><p>Payable amount: {money(order.amount)}</p>{order.paymentMethod === "paystack" ? <div style={{ display: "grid", gap: 12 }}><button style={button} disabled={busy || !!order.paymentId || order.environment !== "live"} onClick={startPaystack}>Pay securely with Paystack (same tab)</button>{order.paymentId && <button style={{ ...button, background: "#303030", color: "white" }} disabled={busy} onClick={verifyPaystack}>Verify Paystack payment after returning</button>}<p style={{ fontSize: 12, color: "#aaa" }}>Returning from Paystack is not proof of payment. The backend verifies the provider transaction. Never start a second payment if one is pending.</p></div> : <><p>Use only official Silk Road MoMo payment instructions. Payment evidence is reviewed by an administrator.</p><label style={{ display: "grid", gap: 6, marginBottom: 12 }}>MoMo transaction reference<input style={input} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} /></label><label style={{ display: "grid", gap: 6, marginBottom: 12 }}>Payment evidence URL (optional)<input style={input} value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} /></label><button style={button} disabled={busy} onClick={submitEvidence}>Submit payment evidence</button></>}<div style={{ marginTop: 12 }}><button style={{ ...button, background: "#333", color: "white" }} disabled={busy || !accept} onClick={activate}>Activate after verified escrow</button></div><p style={{ fontSize: 12, color: "#aaa" }}>Activation is blocked by the server until payment has been independently verified.</p></div>}</div>}
    </>}
    {tab === "mine" && <div style={{ display: "grid", gap: 16 }}>{!authenticated ? <p>Sign in to view your rentals.</p> : <><button style={{ ...button, justifySelf: "start" }} onClick={loadBookings}>Refresh rentals</button>{!bookings.length && <div style={panel}>No activated rental bookings yet. Once your payment is verified, activate your rental from its order details.</div>}{bookings.map(b => <article key={b._id} style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>Rental #{String(b._id).slice(-8)}</strong><strong style={{ color: gold }}>{String(b.status).replaceAll("_", " ")}</strong></div><p style={{ color: "#aaa" }}>Duration: {b.rentalDays} day(s) · {money(b.rentalAmount)}</p>{b.dueAt && <p>Return due: {new Date(b.dueAt).toLocaleString()}</p>}<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{b.status === "awaiting_handover" && <button style={button} disabled={busy} onClick={() => action(b, "handover")}>Owner: handed over</button>}{b.status === "handed_over" && <button style={button} disabled={busy} onClick={() => action(b, "receive")}>Renter: confirm receipt</button>}{b.status === "in_use" && <button style={button} disabled={busy} onClick={() => action(b, "request-return")}>Renter: request return</button>}{b.status === "return_requested" && <button style={button} disabled={busy} onClick={() => action(b, "confirm-return")}>Owner: confirm return</button>}</div>{["handed_over", "in_use", "return_requested"].includes(b.status) && <div style={{ marginTop: 16 }}><label style={{ display: "grid", gap: 7, maxWidth: 500 }}>Report damage or a dispute<textarea style={input} value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the problem (at least 10 characters)" rows={2} /></label><button style={{ ...button, background: "#7f2b2b", color: "white", marginTop: 10 }} disabled={busy || reason.trim().length < 10} onClick={() => action(b, "dispute")}>Open dispute</button></div>}</article>)}</>}</div>}
  </main>
}
