import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { AIcon } from "./AccountIcons"
import { cedi, apiJson, API_URL, timeAgo, orderStage } from "./accountUtils"

async function geocode(address) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", Ghana")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } })
    const data = await response.json()
    return data?.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null
  } catch { return null }
}
const parseLatLng = text => { const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text || ""); return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null }

const STAGES = {
  choose: { chip: "Action needed", tone: "amber", step: 1 },
  finding_rider: { chip: "Finding a rider", tone: "blue", step: 1 },
  rider_assigned: { chip: "Rider on the way to you", tone: "blue", step: 2 },
  on_the_way: { chip: "Out for delivery", tone: "blue", step: 2 },
  awaiting_code: { chip: "Waiting for code", tone: "amber", step: 3 },
  releasing: { chip: "Releasing payout", tone: "green", step: 4 },
  settled: { chip: "Paid out", tone: "green", step: 5 },
}
const STEPS = ["Paid", "Delivery", "On the way", "Handed over", "Paid out"]

function Stepper({ step }) {
  return <ol className="ac-steps" aria-label="Order progress">{STEPS.map((label, i) => <li key={label} className={i < step ? "done" : i === step ? "now" : ""}><i>{i < step ? <AIcon name="check" size={11} stroke={3} /> : null}</i><span>{label}</span></li>)}</ol>
}

// ── Sheet: call a rider ────────────────────────────────────────────────────────
function RiderSheet({ order, user, onClose, onDone }) {
  const [pickup, setPickup] = useState({ text: "", lat: null, lng: null })
  const [drop, setDrop] = useState({ text: order.location || "", lat: null, lng: null })
  const [quote, setQuote] = useState(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  useEffect(() => { // the buyer's drop-off is already known: resolve it for them
    const ll = parseLatLng(order.location)
    if (ll) { const t = setTimeout(() => setDrop(d => ({ ...d, ...ll })), 0); return () => clearTimeout(t) }
    let live = true
    if (order.location) geocode(order.location + (order.landmark ? `, ${order.landmark}` : "")).then(r => { if (live && r) setDrop(d => ({ ...d, ...r })) })
    return () => { live = false }
  }, [order.location, order.landmark])
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k) }, [onClose])

  const useGps = () => {
    if (!navigator.geolocation) { setError("Your browser can't share its location. Type the pickup address instead."); return }
    setBusy("gps"); setError("")
    navigator.geolocation.getCurrentPosition(
      pos => { setPickup({ text: "My current location", lat: pos.coords.latitude, lng: pos.coords.longitude }); setBusy("") },
      () => { setError("We couldn't get your location. Allow location access or type the address."); setBusy("") },
      { enableHighAccuracy: true, timeout: 12000 })
  }
  const findPickup = async () => {
    if (!pickup.text.trim()) return
    setBusy("find"); setError("")
    const r = await geocode(pickup.text)
    if (r) setPickup(p => ({ ...p, ...r })); else setError("We couldn't find that address. Try a landmark or use your location.")
    setBusy("")
  }
  const findDrop = async () => {
    setBusy("find"); setError("")
    const r = await geocode(drop.text)
    if (r) setDrop(d => ({ ...d, ...r })); else setError("We couldn't find the buyer's address. Edit it and try again.")
    setBusy("")
  }
  const ready = pickup.lat != null && drop.lat != null
  const getQuote = async () => {
    setBusy("quote"); setError("")
    try {
      const r = await fetch(`${API_URL}/deliveries/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pickupLat: pickup.lat, pickupLng: pickup.lng, dropLat: drop.lat, dropLng: drop.lng }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message || "Couldn't price this trip.")
      setQuote(data)
    } catch (e) { setError(e.message) }
    setBusy("")
  }
  const request = async () => {
    setBusy("send"); setError("")
    const base = `/group-lifecycle/rider-funding/${encodeURIComponent(order.orderId)}`
    try {
      try {
        await apiJson(`${base}/choose`, { method: "POST", body: JSON.stringify({ fundingSource: "earnings", pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.text, dropLat: drop.lat, dropLng: drop.lng, dropAddress: drop.text }) })
      } catch (e) { if (!/already exists/i.test(e.message)) throw e } // a fee was already reserved earlier: go straight to posting the job
      await apiJson(`${base}/dispatch`, { method: "POST", body: JSON.stringify({ sellerContact: user.phone || "", buyerContact: order.buyerPhone || "" }) })
      onDone()
    } catch (e) { setError(e.message); setBusy("") }
  }

  return createPortal(<div className="ac-sheet-layer" role="presentation">
    <div className="ac-sheet-backdrop" onClick={onClose} />
    <section className="ac-sheet" role="dialog" aria-modal="true" aria-label="Call a rider">
      <div className="ac-grab" />
      <header><div><span className="ac-eyebrow">DELIVERY</span><h3>Call a rider</h3></div><button type="button" className="ac-x" onClick={onClose} aria-label="Close"><AIcon name="close" size={18} /></button></header>
      <div className="ac-sheet-body">
        <div className="ac-route">
          <div className="ac-stop"><i className="a" /><div>
            <label htmlFor="rs-pick">Pick-up (where you are)</label>
            <div className="ac-row"><input id="rs-pick" className="ac-input" value={pickup.text} onChange={e => setPickup({ text: e.target.value, lat: null, lng: null })} placeholder="Hostel, shop or landmark" onKeyDown={e => e.key === "Enter" && findPickup()} />
              <button type="button" className="ac-btn ghost sm" onClick={useGps} disabled={busy === "gps"}><AIcon name="pin" size={16} />{busy === "gps" ? "Locating…" : "Use mine"}</button></div>
            {pickup.text && pickup.lat == null && <button type="button" className="ac-link" onClick={findPickup} disabled={busy === "find"}>Find this address</button>}
            {pickup.lat != null && <span className="ac-ok"><AIcon name="check" size={13} /> Location set</span>}
          </div></div>
          <div className="ac-stop"><i className="b" /><div>
            <label htmlFor="rs-drop">Drop-off (the buyer)</label>
            <div className="ac-row"><input id="rs-drop" className="ac-input" value={drop.text} onChange={e => setDrop({ text: e.target.value, lat: null, lng: null })} placeholder="Buyer's address" onKeyDown={e => e.key === "Enter" && findDrop()} /></div>
            {drop.lat == null ? <button type="button" className="ac-link" onClick={findDrop} disabled={busy === "find" || !drop.text.trim()}>Find this address</button> : <span className="ac-ok"><AIcon name="check" size={13} /> Location set</span>}
          </div></div>
        </div>
        {quote
          ? <div className="ac-quote">
              <div><span>Distance</span><b>{Number(quote.distanceKm).toFixed(1)} km</b></div>
              <div><span>Rider fee</span><b>{cedi(quote.deliveryFee)}</b></div>
              <div className="total"><span>You keep</span><b>{cedi(Number(order.sellerAmount) - Number(quote.deliveryFee))}</b></div>
              <p>The rider fee is taken from your earnings for this order. Nothing is charged to the buyer.</p>
            </div>
          : <p className="ac-hint">We’ll price the trip by distance before anything is sent.</p>}
        {error && <div role="alert" className="ac-alert">{error}</div>}
      </div>
      <footer>
        {!quote ? <button type="button" className="ac-btn primary" disabled={!ready || busy === "quote"} onClick={getQuote}>{busy === "quote" ? "Pricing…" : "See the price"}</button>
          : <><button type="button" className="ac-btn ghost" onClick={() => setQuote(null)} disabled={busy === "send"}>Change locations</button>
              <button type="button" className="ac-btn primary" disabled={busy === "send"} onClick={request}>{busy === "send" ? "Sending…" : `Request rider · ${cedi(quote.deliveryFee)}`}</button></>}
      </footer>
    </section>
  </div>, document.body)
}

// ── One seller order ───────────────────────────────────────────────────────────
export function SellerOrderCard({ order, user, onChanged }) {
  const stage = useMemo(() => orderStage(order), [order])
  const meta = STAGES[stage]
  const [mode, setMode] = useState(null) // null | "self"
  const [sheet, setSheet] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const d = order.delivery
  const test = order.environment === "testing"
  const maps = order.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}` : ""

  const confirmSelf = async () => {
    if (!/^\d{6}$/.test(code)) { setError("Enter the six-digit code from the buyer."); return }
    setBusy(true); setError("")
    try {
      const r = await apiJson(`/group-lifecycle/${encodeURIComponent(order.checkoutId)}/orders/${encodeURIComponent(order.orderId)}/confirm-delivery`, { method: "POST", body: JSON.stringify({ deliveryCode: code }) })
      if (r.verified === false) setError(`${r.message || "That code isn't right."} ${r.attemptsRemaining != null ? `${r.attemptsRemaining} tries left.` : ""}`)
      else { setDone("Delivery confirmed. Your money is being released automatically."); setCode(""); onChanged() }
    } catch (e) { setError(e.message) }
    setBusy(false)
  }
  const cancelRider = async () => {
    if (!window.confirm("Cancel this rider request? No rider has accepted it yet.")) return
    setBusy(true); setError("")
    try { await apiJson(`/group-lifecycle/rider-funding/${encodeURIComponent(order.orderId)}/cancel-dispatch`, { method: "POST" }); onChanged() }
    catch (e) { setError(e.message) }
    setBusy(false)
  }

  const codeEntry = <div className="ac-code-box">
    <label htmlFor={`code-${order.orderId}`}>Buyer’s 6-digit code</label>
    <input id={`code-${order.orderId}`} className="ac-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" />
    <button type="button" className="ac-btn primary" disabled={busy || code.length !== 6} onClick={confirmSelf}>{busy ? "Confirming…" : "Confirm delivery"}</button>
    <p className="ac-hint">Only enter it after the buyer has the item. Your payout is released automatically once it’s confirmed.</p>
  </div>

  return <article className={`ac-card ac-order tone-${meta.tone}`}>
    <header className="ac-order-head">
      <div className="ac-thumb">{order.itemImage ? <img src={order.itemImage} alt="" loading="lazy" /> : <AIcon name="package" size={22} />}</div>
      <div className="ac-order-title"><strong>{order.itemTitle}</strong><span>{order.buyerName} · {timeAgo(order.createdAt)}</span></div>
      <div className="ac-order-amount"><b>{cedi(order.sellerAmount)}</b><span className={`ac-chip ${meta.tone}`}>{meta.chip}</span></div>
    </header>
    {test && <div className="ac-testtag">TEST ORDER · simulated payment</div>}
    <Stepper step={meta.step} />

    <div className="ac-contact">
      <div><AIcon name="user" size={15} /><span>{order.buyerName}</span></div>
      {order.buyerPhone && <a href={`tel:${order.buyerPhone}`} className="ac-pillbtn"><AIcon name="phone" size={14} />Call buyer</a>}
      {order.location && <a href={maps} target="_blank" rel="noopener noreferrer" className="ac-pillbtn"><AIcon name="pin" size={14} />{order.location.length > 26 ? order.location.slice(0, 26) + "…" : order.location}</a>}
    </div>

    {stage === "choose" && <div className="ac-choices">
      <h4>How will this reach {order.buyerName.split(" ")[0]}?</h4>
      <button type="button" className={`ac-choice ${mode === "self" ? "on" : ""}`} onClick={() => setMode(mode === "self" ? null : "self")}>
        <span className="ic"><AIcon name="hand" size={22} /></span><span className="tx"><b>I’ll deliver it myself</b><small>Hand it over in person. You keep the full {cedi(order.sellerAmount)}.</small></span><AIcon name="chevron" size={18} />
      </button>
      {mode === "self" && <div className="ac-expand"><p className="ac-hint">Ask the buyer to open their order and tap <b>“I’ve received this package”</b>. They’ll get a code to give you.</p>{codeEntry}</div>}
      <button type="button" className="ac-choice" onClick={() => setSheet(true)}>
        <span className="ic gold"><AIcon name="bike" size={22} /></span><span className="tx"><b>Call a rider</b><small>A verified rider collects and delivers it. The fee comes from your earnings.</small></span><AIcon name="chevron" size={18} />
      </button>
    </div>}

    {stage === "finding_rider" && <div className="ac-radar"><div className="pulse" aria-hidden="true"><i /><i /><i /><AIcon name="bike" size={22} /></div>
      <div><b>Finding a rider near you…</b><span>{d?.fee ? `${cedi(d.fee)} rider fee reserved. ` : ""}You’ll be notified the moment one accepts.</span></div>
      <button type="button" className="ac-btn ghost sm" disabled={busy} onClick={cancelRider}>Cancel request</button></div>}

    {(stage === "rider_assigned" || stage === "on_the_way") && d?.rider && <div className="ac-rider">
      <div className="av">{d.rider.photoUrl ? <img src={d.rider.photoUrl} alt="" /> : d.rider.name?.[0]}</div>
      <div><b>{d.rider.name}</b><span>{d.rider.vehicle || "Rider"} · {stage === "rider_assigned" ? "heading to you for pick-up" : "delivering to the buyer"}</span></div>
      {d.rider.phone && <a href={`tel:${d.rider.phone}`} className="ac-pillbtn"><AIcon name="phone" size={14} />Call</a>}
    </div>}

    {stage === "awaiting_code" && (d?.rider
      ? <div className="ac-note"><AIcon name="clock" size={16} />The rider is at the buyer’s door. The buyer gives them the code, then your payout is released automatically.</div>
      : <div className="ac-expand">{codeEntry}</div>)}

    {stage === "releasing" && <div className="ac-note good"><AIcon name="check" size={16} />Delivery confirmed. Your {cedi(order.sellerAmount)} is being sent to your payout account.</div>}
    {stage === "settled" && <div className="ac-note good"><AIcon name="check" size={16} />Paid out · {cedi(order.sellerAmount)}{test ? " (test, no real money moved)" : ""}</div>}

    {done && <div className="ac-note good"><AIcon name="check" size={16} />{done}</div>}
    {error && <div role="alert" className="ac-alert">{error}</div>}
    {sheet && <RiderSheet order={order} user={user} onClose={() => setSheet(false)} onDone={() => { setSheet(false); onChanged() }} />}
  </article>
}
