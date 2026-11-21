import { useState, useEffect, useRef, useCallback } from "react"
import { saveOrder, generateOrderId, updateOrder } from "./OrderTracker"
import {
  NETWORKS, NETWORK_KEYS, guessNetwork, momoSteps, formatCedi, formatCediShort, formatUsd, cartSubtotal,
  checkServerTotal, validateDelivery, buildCheckoutPayload, paymentStatusView, isEmail, normalizeGhPhone,
} from "./checkoutUtils"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_API_URL ? API_URL.replace(/\/api\/?$/, "") : "http://localhost:5000"
const STEPS = ["Delivery", "Review", "Pay"]
const OPEN_STATES = ["pending", "submitted", "under_review"]

const authHeader = () => {
  const token = localStorage.getItem("silkroad_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// One place for every request: JSON in, JSON out, readable errors.
async function api(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.message || `Something went wrong (${res.status}). Please try again.`), { status: res.status, data })
  return data
}

const CSS = `
.co-backdrop{position:fixed;inset:0;background:#000000d9;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.co-sheet{background:#111;border:1px solid #232220;border-radius:22px;width:100%;max-width:540px;max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;overflow:hidden;color:#f0ede8;font-family:inherit}
.co-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #1d1c1a}
.co-head h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.co-x{background:#1a1918;border:1px solid #2a2927;color:#b9b4aa;width:38px;height:38px;border-radius:50%;font-size:16px;cursor:pointer;display:grid;place-items:center;flex-shrink:0}
.co-stepper{display:flex;padding:12px 20px 10px;gap:6px;border-bottom:1px solid #1d1c1a}
.co-stepper>div{flex:1;text-align:center;font-size:11px;color:#6b675f}
.co-stepper b{display:grid;place-items:center;width:26px;height:26px;margin:0 auto 4px;border-radius:50%;border:2px solid #2a2927;background:#171615;font-size:12px;color:#8a857b}
.co-stepper .on{color:#c8a97e;font-weight:700}.co-stepper .on b{background:#c8a97e;border-color:#c8a97e;color:#1b140d}
.co-stepper .done{color:#a89e8a}.co-stepper .done b{background:#2a2419;border-color:#c8a97e;color:#c8a97e}
.co-body{padding:20px;overflow-y:auto;display:grid;gap:16px;align-content:start;flex:1}
.co-body h3{margin:0;font-size:16px}.co-body h4{margin:0;font-size:14px}
.co-lead{margin:0;color:#aaa497;font-size:14px;line-height:1.6}
.co-field{display:grid;gap:7px}
.co-field>label{font-size:13px;font-weight:700;color:#e7e2d8}.co-field>label span{font-weight:400;color:#7c776d}
.co-input{width:100%;box-sizing:border-box;background:#1a1918;border:1px solid #34322e;color:#fff;padding:14px 15px;border-radius:12px;font:inherit;font-size:16px;outline:none;transition:border-color .15s,box-shadow .15s}
.co-input:focus{border-color:#d7b982;box-shadow:0 0 0 3px #d7b98224}.co-input.bad{border-color:#e07474}
textarea.co-input{resize:vertical;min-height:70px}
.co-hint{font-size:12px;line-height:1.55;color:#8f8a80}.co-error{font-size:13px;line-height:1.5;color:#ff9b9b}
.co-pin{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;border-radius:12px;border:1px dashed #6a5a3d;background:#1c1915;color:#e0c590;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.co-pin.on{border-style:solid;border-color:#2f7a5a;background:#12251d;color:#7be0b0}
.co-map{border-radius:12px;overflow:hidden;border:1px solid #2a2927}.co-map iframe{display:block;border:0;width:100%;height:170px}
.co-choices{display:grid;gap:10px}
.co-choice{display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%;padding:14px;border-radius:14px;border:1.5px solid #2c2a27;background:#171615;color:#f0ede8;font:inherit;cursor:pointer}
.co-choice.on{border-color:#c8a97e;background:#1f1b14}
.co-radio{width:20px;height:20px;border-radius:50%;border:2px solid #5c574d;flex-shrink:0;margin-top:2px;display:grid;place-items:center}
.co-choice.on .co-radio{border-color:#c8a97e}.co-choice.on .co-radio::after{content:"";width:10px;height:10px;border-radius:50%;background:#c8a97e}
.co-choice strong{display:block;font-size:14px}.co-choice small{display:block;margin-top:3px;font-size:12px;line-height:1.5;color:#979188}
.co-card{background:#171615;border:1px solid #2c2a27;border-radius:16px;padding:16px;display:grid;gap:12px}
.co-card.hl{border-color:#5a4a2e;background:linear-gradient(145deg,#211c14,#151412)}
.co-row{display:flex;justify-content:space-between;gap:14px;font-size:14px;align-items:baseline}
.co-row span{color:#9a958b}.co-row strong{text-align:right;font-weight:600;overflow-wrap:anywhere}
.co-items{display:grid;gap:12px}
.co-item{display:flex;gap:12px;align-items:center}
.co-thumb{width:52px;height:52px;border-radius:10px;background:#242321 center/cover;flex-shrink:0;border:1px solid #2c2a27}
.co-item-main{flex:1;min-width:0}.co-item-main strong{display:block;font-size:14px;line-height:1.35;overflow-wrap:anywhere}.co-item-main small{color:#8f8a80;font-size:12px}
.co-item-price{font-weight:700;font-size:14px;color:#d9bf92;white-space:nowrap}
.co-total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #2c2a27;padding-top:12px;font-size:20px;font-weight:800;color:#e0c590}
.co-total small{font-size:12px;font-weight:400;color:#7c776d;margin-left:6px}
.co-link{background:none;border:0;color:#d7b982;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;padding:0}
.co-chips{display:flex;flex-wrap:wrap;gap:8px}
.co-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#1d1c1a;border:1px solid #302e2a;font-size:12px;color:#dcd6ca}
.co-chip i{width:9px;height:9px;border-radius:50%;display:block}
.co-foot{border-top:1px solid #1d1c1a;padding:14px 20px calc(14px + env(safe-area-inset-bottom,0px));display:grid;gap:10px;background:#111}
.co-actions{display:flex;gap:10px}
.co-btn{min-height:50px;border-radius:13px;border:1px solid transparent;font:inherit;font-size:15px;font-weight:800;cursor:pointer;padding:12px 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box;transition:transform .15s,background .15s}
.co-primary{background:linear-gradient(110deg,#e4c892,#bb9660);color:#1a140e;flex:1}
.co-primary:hover:not(:disabled){transform:translateY(-1px)}
.co-primary:disabled{opacity:.5;cursor:not-allowed}
.co-secondary{background:#1f1e1c;color:#e5dfd3;border-color:#3a3833}.co-secondary:hover:not(:disabled){background:#2a2926}.co-secondary:disabled{opacity:.5;cursor:not-allowed}
.co-ghost{background:transparent;color:#a39e93;border-color:#2e2c29;flex:0 0 auto}
.co-banner{display:flex;gap:12px;align-items:flex-start;border-radius:16px;padding:16px;border:1px solid}
.co-banner b{display:block;font-size:16px;margin-bottom:3px}.co-banner span{font-size:13px;line-height:1.55}
.co-banner .ic{font-size:22px;line-height:1}
.co-banner.wait{background:#251f12;border-color:#6a5420;color:#f0d9a6}
.co-banner.review{background:#12202c;border-color:#27506f;color:#a9d2f0}
.co-banner.ok{background:#112219;border-color:#2c7a55;color:#9be5bf}
.co-banner.stop{background:#1c1c1c;border-color:#3b3b3b;color:#c6c2b8}
.co-banner.alert{background:#2a1517;border-color:#7a3238;color:#ffb3b8}
.co-paybox{display:grid;gap:0;border:1px solid #3a3326;border-radius:14px;overflow:hidden;background:#14120f}
.co-payrow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #26231d}.co-payrow:last-child{border-bottom:0}
.co-payrow small{display:block;font-size:11px;letter-spacing:.06em;color:#8f8a80;text-transform:uppercase;margin-bottom:2px}
.co-payrow strong{font-size:17px;letter-spacing:.01em;overflow-wrap:anywhere}.co-payrow.big strong{font-size:22px;color:#e8c98f}
.co-copy{background:#26231d;border:1px solid #4a4130;color:#e7cf9c;border-radius:9px;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;min-width:64px}
.co-tabs{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:13px;color:#aaa497}
.co-tab{padding:9px 13px;border-radius:999px;border:1.5px solid #34322e;background:#171615;color:#d5cfc3;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.co-tab.on{border-color:#c8a97e;background:#231e15;color:#f0d9a6}
.co-ol{margin:0;padding:0 0 0 22px;display:grid;gap:9px;font-size:14px;line-height:1.55;color:#d6d0c4}
.co-ol li::marker{color:#c8a97e;font-weight:700}
.co-note{font-size:13px;line-height:1.6;color:#f2d5a0;background:#211c12;border:1px solid #4d3f22;border-radius:12px;padding:12px 14px}
.co-note.bad{color:#ffb3b8;background:#2a1517;border-color:#6b2c31}
.co-fine{margin:0;font-size:12px;line-height:1.6;color:#847f75}
.co-live{display:flex;align-items:center;gap:9px;font-size:13px;color:#a9d2f0}
.co-pulse{width:9px;height:9px;border-radius:50%;background:#58a9e0;box-shadow:0 0 0 0 #58a9e088;animation:coPulse 1.6s infinite}
@keyframes coPulse{70%{box-shadow:0 0 0 9px #58a9e000}100%{box-shadow:0 0 0 0 #58a9e000}}
.co-code{background:#27210f;border:1px solid #7a6330;border-radius:14px;text-align:center;padding:16px 10px;display:grid;gap:6px}
.co-code span{font-size:10px;letter-spacing:.15em;color:#d7b982;font-weight:800}
.co-code strong{font-family:ui-monospace,monospace;font-size:clamp(28px,9vw,40px);letter-spacing:.17em;color:#fff}
.co-code small{font-size:11px;line-height:1.5;color:#c8c1b5}
.co-skel{height:120px;border-radius:14px;background:linear-gradient(90deg,#171615 25%,#211f1c 50%,#171615 75%);background-size:200% 100%;animation:coShimmer 1.4s linear infinite}
@keyframes coShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.co-divider{height:1px;background:#2a2723}
.co-amount{display:grid;gap:3px;text-align:center;padding:4px 0 2px}
.co-amount span{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#9a958b}
.co-amount strong{font-size:36px;line-height:1.1;letter-spacing:-.02em;color:#e8c98f}
.co-amount small{font-size:13px;color:#7c776d}
.co-details{border:1px solid #2c2a27;border-radius:14px;background:#151413}
.co-details summary{cursor:pointer;padding:14px 16px;font-weight:700;font-size:14px;color:#e5dfd3;list-style:none;display:flex;justify-content:space-between;align-items:center}
.co-details summary::-webkit-details-marker{display:none}
.co-details summary::after{content:"+";color:#c8a97e;font-size:20px;line-height:1}
.co-details[open] summary::after{content:"–"}
.co-details-body{padding:0 16px 16px;display:grid;gap:12px}
.co-mapwrap{display:grid;gap:8px}
.co-soft{font-size:13px;line-height:1.6;color:#b7b1a5;background:#171615;border:1px solid #2c2a27;border-radius:12px;padding:12px 14px}
.co-sep{display:grid;gap:8px;border-top:1px solid #2a2723;padding-top:14px}
.co-pkg-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.co-pkg-top small{font-size:10px;font-weight:800;letter-spacing:.13em;color:#b9a17a}.co-pkg-top strong{display:block;font-size:14px;overflow-wrap:anywhere}
@media(max-width:560px){.co-backdrop{padding:0;align-items:flex-end}.co-sheet{max-width:none;border-radius:22px 22px 0 0;max-height:96vh;max-height:96dvh}.co-body{padding:16px}.co-head,.co-stepper,.co-foot{padding-left:16px;padding-right:16px}}
@media(prefers-reduced-motion:reduce){.co-pulse,.co-skel{animation:none}.co-btn{transition:none}}
`

// ── Small building blocks ────────────────────────────────────────────────────
function Field({ id, label, optional, hint, error, children }) {
  return <div className="co-field">
    <label htmlFor={id}>{label}{optional && <span> (optional)</span>}</label>
    {children}
    {error ? <div className="co-error" role="alert">{error}</div> : hint ? <div className="co-hint">{hint}</div> : null}
  </div>
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    const value = String(text)
    try { await navigator.clipboard.writeText(value) } catch {
      const box = document.createElement("textarea")
      box.value = value; box.setAttribute("readonly", ""); box.style.cssText = "position:fixed;opacity:0"
      document.body.appendChild(box); box.select()
      try { document.execCommand("copy") } catch { /* the number is still visible to copy by hand */ }
      document.body.removeChild(box)
    }
    setDone(true); setTimeout(() => setDone(false), 1800)
  }
  return <button type="button" className="co-copy" onClick={copy} aria-label={`Copy ${label}`}>{done ? "Copied ✓" : "Copy"}</button>
}

function ProviderChips({ card }) {
  return <div className="co-chips" aria-label="Accepted payment methods">
    {NETWORK_KEYS.map(key => <span key={key} className="co-chip"><i style={{ background: NETWORKS[key].color }} />{NETWORKS[key].name}</span>)}
    {card && <span className="co-chip"><i style={{ background: "#9aa4b2" }} />Card</span>}
  </div>
}

// Shows where the order is going: a GPS pin, or a typed address looked up on the map.
function MapPreview({ query, pinned, compact }) {
  if (!query) return null
  const encoded = encodeURIComponent(query)
  return <div className="co-mapwrap">
    <div className="co-map"><iframe src={`https://www.google.com/maps?q=${encoded}&z=${pinned ? 17 : 15}&output=embed`} loading="lazy" title="Delivery location map" referrerPolicy="no-referrer-when-downgrade" style={compact ? { height: 130 } : undefined} /></div>
    <a className="co-link" href={`https://www.google.com/maps/search/?api=1&query=${encoded}`} target="_blank" rel="noreferrer" style={{ justifySelf: "start" }}>Open in Google Maps</a>
    {!pinned && !compact && <div className="co-hint">Not the right place? Tap “Use my current location” for an exact pin.</div>}
  </div>
}

// ── Payment: Paystack (MTN, Telecel, AT and cards are all chosen on Paystack's page) ──
function PaystackPay({ checkoutId, claimToken, amount, defaultEmail, onVerified }) {
  const [email, setEmail] = useState(isEmail(defaultEmail) ? defaultEmail : "")
  const [editEmail, setEditEmail] = useState(!isEmail(defaultEmail))
  const [state, setState] = useState("ready") // ready | loading | awaiting | checking | verified | error
  const [message, setMessage] = useState("")
  const [url, setUrl] = useState("")
  const busy = useRef(false)
  const startedAt = useRef(0)
  const verifiedRef = useRef(onVerified)
  useEffect(() => { verifiedRef.current = onVerified })
  const call = (path, body) => api(`/checkout-paystack/${encodeURIComponent(checkoutId)}/${path}`, { method: "POST", headers: { "x-checkout-token": claimToken }, body })

  const verify = useCallback(async silent => {
    if (busy.current) return
    busy.current = true
    if (!silent) setState("checking")
    try {
      const result = await api(`/checkout-paystack/${encodeURIComponent(checkoutId)}/verify`, { method: "POST", headers: { "x-checkout-token": claimToken } })
      if (result.verified) { setState("verified"); setMessage(""); verifiedRef.current?.(result) }
      else {
        setState("awaiting")
        if (!silent) setMessage(`Not confirmed yet (${result.providerStatus || "pending"}). If you already approved the payment, wait a moment and check again. Please don’t pay twice.`)
      }
    } catch (error) {
      setState("awaiting")
      if (!silent) setMessage(`${error.message} Please don’t pay again until this is sorted out.`)
    } finally { busy.current = false }
  }, [checkoutId, claimToken])

  const pay = async () => {
    if (busy.current) return
    if (!isEmail(email)) { setState("error"); setMessage("Enter a valid email address for your receipt."); setEditEmail(true); return }
    busy.current = true; setState("loading"); setMessage("")
    try {
      const result = await call("initialize", { email: email.trim() })
      const parsed = new URL(result.authorizationUrl)
      if (parsed.protocol !== "https:" || !["checkout.paystack.com", "paystack.com"].includes(parsed.hostname)) throw new Error("The payment provider returned an unexpected address. Please contact support.")
      setUrl(parsed.href); startedAt.current = Date.now(); setState("awaiting")
      window.open(parsed.href, "_blank", "noopener,noreferrer")
    } catch (error) { setState("error"); setMessage(error.message) }
    finally { busy.current = false }
  }

  // After payment starts, confirm automatically: every 6 s for 2 minutes, then every 15 s, and whenever the buyer comes back to this tab.
  useEffect(() => {
    if (state !== "awaiting") return undefined
    let timer
    const tick = () => { if (document.visibilityState === "visible") verify(true) }
    const schedule = () => {
      const elapsed = Date.now() - startedAt.current
      if (elapsed > 20 * 60 * 1000) return
      timer = setTimeout(() => { tick(); schedule() }, elapsed < 120000 ? 6000 : 15000)
    }
    schedule()
    document.addEventListener("visibilitychange", tick)
    window.addEventListener("focus", tick)
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("focus", tick) }
  }, [state, verify])

  const waiting = state === "awaiting" || state === "checking"
  return <div className="co-card hl">
    <h3>Pay securely</h3>
    {!waiting && <>
      <p className="co-lead">Pick MTN MoMo, Telecel Cash, AT Money or card on the next screen.</p>
      <ProviderChips card />
      {editEmail
        ? <Field id="co-email" label="Email for your receipt" error={state === "error" && !isEmail(email) ? message : ""}>
            <input id="co-email" className="co-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} />
          </Field>
        : <div className="co-hint">Your receipt goes to <b>{email}</b> · <button type="button" className="co-link" onClick={() => setEditEmail(true)}>Change</button></div>}
      <button type="button" className="co-btn co-primary" disabled={state === "loading" || (editEmail && !isEmail(email))} onClick={pay}>{state === "loading" ? "Preparing secure payment…" : `Pay ${formatCedi(amount)}`}</button>
    </>}
    {waiting && <>
      <ol className="co-ol">
        <li>Open the secure payment page.</li>
        <li>Choose MTN MoMo, Telecel Cash, AT Money or card.</li>
        <li>Approve the prompt on your phone with your PIN.</li>
        <li>Come back here. We confirm it automatically.</li>
      </ol>
      <a className="co-btn co-primary" href={url} target="_blank" rel="noopener noreferrer">Open secure payment ↗</a>
      <button type="button" className="co-btn co-secondary" disabled={state === "checking"} onClick={() => verify(false)}>{state === "checking" ? "Checking…" : "I’ve paid — check now"}</button>
      <div className="co-live"><span className="co-pulse" />Waiting for confirmation…</div>
    </>}
    {message && !(state === "error" && !isEmail(email)) && <div role="status" className={`co-note ${state === "error" ? "bad" : ""}`}>{message}</div>}
    <p className="co-fine">Never share your MoMo PIN or one-time code with anyone, including Silk Road staff. Your order is only marked paid after our server confirms it with Paystack.</p>
  </div>
}

// ── Payment: manual Mobile Money (the buyer can send from ANY network) ──────────
function ManualMomoPay({ amount, reference, buyerPhone, support, checkoutId, claimToken, onSubmitted }) {
  const [account, setAccount] = useState(undefined) // undefined = loading, null = unavailable
  const [from, setFrom] = useState(guessNetwork(buyerPhone) || "MTN")
  const [txn, setTxn] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let off = false
    api("/settings/manual-momo-public")
      .then(data => { if (!off) setAccount(data?.manualMomo?.enabled && data.manualMomo.number ? data.manualMomo : null) })
      .catch(() => { if (!off) setAccount(null) })
    return () => { off = true }
  }, [])

  const submit = async () => {
    setBusy(true); setError("")
    try {
      const result = await api(`/checkout-payments/${encodeURIComponent(checkoutId)}/submit`, { method: "POST", headers: { "x-checkout-token": claimToken }, body: { buyerReference: txn.trim() } })
      onSubmitted(result.status || "submitted")
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  if (account === undefined) return <div className="co-skel" aria-label="Loading payment details" />
  if (account === null) return <div className="co-card">
    <h3>Payment details unavailable</h3>
    <p className="co-lead">We couldn’t load our payment details just now. Please don’t send any money yet.</p>
    {support && <a className="co-btn co-secondary" href={`https://wa.me/${support}`} target="_blank" rel="noreferrer">Message support on WhatsApp</a>}
  </div>

  const target = NETWORKS[account.network] ? account.network : "MTN"
  return <div className="co-card hl">
    <h3>Pay with Mobile Money</h3>
    <p className="co-lead">Send the exact amount to the number below from <b>any</b> network: MTN, Telecel or AT.</p>
    <div className="co-paybox">
      <div className="co-payrow big"><div><small>Amount to send</small><strong>{formatCedi(amount)}</strong></div><CopyButton text={Number(amount).toFixed(2)} label="amount" /></div>
      <div className="co-payrow"><div><small>Send to ({NETWORKS[target].name})</small><strong>{account.number}</strong></div><CopyButton text={account.number} label="number" /></div>
      <div className="co-payrow"><div><small>Account name</small><strong>{account.accountName}</strong></div></div>
      {reference && <div className="co-payrow"><div><small>Reference / reason</small><strong>{reference}</strong></div><CopyButton text={reference} label="reference" /></div>}
    </div>
    <details className="co-details">
      <summary>How to send it</summary>
      <div className="co-details-body">
        <div className="co-tabs" role="group" aria-label="Which network are you paying from?">
          <span>I’m paying from:</span>
          {NETWORK_KEYS.map(key => <button key={key} type="button" className={`co-tab ${from === key ? "on" : ""}`} aria-pressed={from === key} onClick={() => setFrom(key)}>{NETWORKS[key].name}</button>)}
        </div>
        <ol className="co-ol">{momoSteps({ from, to: target, amount, reference, number: account.number, accountName: account.accountName }).map((step, index) => <li key={index}>{step}</li>)}</ol>
      </div>
    </details>
    <div className="co-divider" />
    <h4>Then confirm your payment</h4>
    <Field id="co-txn" label="Transaction ID" hint="Find it in the confirmation SMS from your network. It is not your order number. Only enter it after paying." error={error}>
      <input id="co-txn" className="co-input" autoComplete="off" value={txn} onChange={e => setTxn(e.target.value)} placeholder="e.g. the ID in your payment SMS" />
    </Field>
    <button type="button" className="co-btn co-primary" disabled={busy || txn.trim().length < 5} onClick={submit}>{busy ? "Sending…" : "I’ve paid — submit"}</button>
    <p className="co-fine">Silk Road will never ask for your PIN. Network fees, if any, are charged by your network.</p>
  </div>
}

function PracticePay({ checkoutId, claimToken, onSubmitted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const go = async () => {
    setBusy(true); setError("")
    try {
      await api(`/checkout-payments/${encodeURIComponent(checkoutId)}/submit-test`, { method: "POST", headers: { "x-checkout-token": claimToken } })
      onSubmitted("submitted")
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="co-card hl">
    <h3>Practice checkout</h3>
    <p className="co-lead">This is a practice order, so you don’t need to send any money. Tap below and we’ll send it for a test review.</p>
    <button type="button" className="co-btn co-primary" disabled={busy} onClick={go}>{busy ? "Sending your request…" : "Continue with practice payment"}</button>
    {error && <div className="co-note bad" role="alert">{error}</div>}
  </div>
}

// ── The checkout ─────────────────────────────────────────────────────────────
export default function Checkout({ cart, rate, onClose, initialOrder, siteSettings, user, onOrderPlaced }) {
  // Snapshot the cart: the app empties its cart once the order exists, but this screen still needs the items.
  const [items] = useState(() => (cart && cart.length ? cart : initialOrder?.cart) || [])
  const [step, setStep] = useState(initialOrder ? 3 : 0)

  // delivery details
  const [pin, setPin] = useState(initialOrder?.location || null)
  const [locationText, setLocationText] = useState(initialOrder?.manualLocation || "")
  const [extraInfo, setExtraInfo] = useState(initialOrder?.extraInfo || "")
  const [name, setName] = useState(initialOrder?.payerName || user?.name || "")
  const [phone, setPhone] = useState(initialOrder?.payerPhone || user?.phone || "")
  // Buyers no longer choose how an order is delivered. The seller decides (deliver themselves or request a rider).
  // This only keeps older saved rider orders working.
  const deliveryMethod = initialOrder?.deliveryMethod || "pickup"
  const [mapQuery, setMapQuery] = useState("")
  const [errors, setErrors] = useState({})
  const [locBusy, setLocBusy] = useState(false)
  const [locMessage, setLocMessage] = useState("")

  // order + payment
  const [orderId] = useState(() => initialOrder?.id || generateOrderId())
  const [saving, setSaving] = useState(false)
  const [placeError, setPlaceError] = useState("")
  const [priceReview, setPriceReview] = useState(null)
  const [checkoutId, setCheckoutId] = useState(initialOrder?.checkoutId || null)
  const [claimToken, setClaimToken] = useState(initialOrder?.checkoutClaimToken || null)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState(initialOrder?.checkoutPaymentMethod || "manual_momo")
  const [paymentRef, setPaymentRef] = useState(initialOrder?.paymentRef || null)
  const [confirmedTotal, setConfirmedTotal] = useState(initialOrder?.total ?? null)
  const [sellerOrders, setSellerOrders] = useState(initialOrder?.backendOrders || [])
  const [groupPaymentStatus, setGroupPaymentStatus] = useState("pending")
  const [checkoutEnvironment, setCheckoutEnvironment] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [statusReady, setStatusReady] = useState(!initialOrder) // a re-opened order shows a skeleton until its real status arrives
  const [cancelAsk, setCancelAsk] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [publicSettings, setPublicSettings] = useState(null)

  // delivery confirmation
  const [deliveryCodes, setDeliveryCodes] = useState({})
  const [deliveryBusy, setDeliveryBusy] = useState(null)
  const [deliveryError, setDeliveryError] = useState("")
  const [delivered, setDelivered] = useState(initialOrder?.delivered ?? null)
  const [otp, setOtp] = useState(null)
  const [, setOtpExpiry] = useState(null)

  const placingRef = useRef(false)
  const prevStatusRef = useRef("pending")
  const pollRef = useRef(null)
  const completionPollRef = useRef(null)
  const socketRef = useRef(null)

  const subtotal = initialOrder?.subtotal || cartSubtotal(items)
  const total = confirmedTotal ?? subtotal // the rider fee is paid by the seller, never by the buyer
  const support = siteSettings?.contactWhatsApp || ""

  // Escape closes; the page behind stays put while the sheet is open.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = e => { if (e.key === "Escape") closeRef.current?.() }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey) }
  }, [])

  // Which payment methods will be offered (shown on the review screen before any order exists).
  useEffect(() => {
    if (initialOrder) return undefined
    let off = false
    api("/settings").then(data => { if (!off) setPublicSettings(data) }).catch(() => {})
    return () => { off = true }
  }, [initialOrder])

  // ── Legacy rider-delivery listeners (kept as they were): completion arrives over the socket, with polling as backup ──
  useEffect(() => {
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
      return undefined
    }
    if (socketRef.current) return undefined
    import("socket.io-client").then(({ io }) => {
      const s = io(SOCKET_URL, { autoConnect: true, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: Infinity, transports: ["websocket", "polling"] })
      s.on(`otp:${orderId}`, d => {
        if (d?.otp) {
          setOtp(d.otp); setOtpExpiry(d.expiresAt)
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        }
      })
      s.on(`completed:${orderId}`, () => {
        setDelivered(true)
        updateOrder(orderId, { delivered: true, status: "Completed" })
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null }
        s.disconnect(); socketRef.current = null
      })
      socketRef.current = s
    }).catch(() => {})
    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null } }
  }, [step, deliveryMethod, delivered, orderId])

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null || otp) return undefined
    const poll = async () => {
      try {
        const data = await api(`/deliveries/otp-for-order/${encodeURIComponent(orderId)}`)
        if (data.otp) { setOtp(data.otp); setOtpExpiry(data.expiresAt); clearInterval(pollRef.current); pollRef.current = null }
      } catch { /* the socket is the primary channel */ }
    }
    poll()
    pollRef.current = setInterval(poll, 5000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [step, deliveryMethod, delivered, otp, orderId])

  useEffect(() => {
    if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null }
    if (step !== 3 || deliveryMethod !== "rider" || delivered !== null || !otp) return undefined
    const poll = async () => {
      try {
        const data = await api(`/deliveries/otp-for-order/${encodeURIComponent(orderId)}`)
        if (data.deliveryId) {
          const delivery = await api(`/deliveries/${data.deliveryId}`)
          if (delivery.status === "completed") {
            setDelivered(true)
            updateOrder(orderId, { delivered: true, status: "Completed" })
            clearInterval(completionPollRef.current); completionPollRef.current = null
          }
        }
      } catch { /* try again on the next tick */ }
    }
    completionPollRef.current = setInterval(poll, 5000)
    return () => { if (completionPollRef.current) { clearInterval(completionPollRef.current); completionPollRef.current = null } }
  }, [step, deliveryMethod, delivered, otp, orderId])

  // ── Location ──────────────────────────────────────────────────────────────
  // The map follows what the buyer types (after a short pause) or the GPS pin.
  useEffect(() => {
    const typed = locationText.trim()
    const next = pin ? `${pin.lat},${pin.lng}` : typed.length >= 5 ? typed : ""
    const timer = setTimeout(() => setMapQuery(next), pin ? 0 : 700)
    return () => clearTimeout(timer)
  }, [pin, locationText])

  const detectLocation = () => {
    setLocBusy(true); setLocMessage("")
    if (!navigator.geolocation) { setLocBusy(false); setLocMessage("This browser can’t share your location. Type your hostel or area instead."); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPin({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6), accuracy: Math.round(pos.coords.accuracy || 0) })
        setErrors(old => ({ ...old, location: undefined }))
        setLocBusy(false)
      },
      err => {
        setLocBusy(false)
        setLocMessage(err.code === 1 ? "Location access is turned off for this site. You can type your hostel or area instead." : "We couldn’t get your location. Type your hostel or area instead.")
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const goReview = () => {
    const found = validateDelivery({ locationText, pin, name, phone })
    setErrors(found)
    if (Object.keys(found).length) {
      const first = found.location ? "co-loc" : found.name ? "co-name" : "co-phone"
      setTimeout(() => document.getElementById(first)?.focus(), 0)
      return
    }
    setPlaceError(""); setStep(1)
  }

  // ── Create the order on the server ────────────────────────────────────────
  const applyCheckout = (data, serverTotal, status) => {
    const platformFee = data.orders.reduce((sum, o) => sum + Number(o.platformFee || 0), 0)
    saveOrder({
      id: orderId, type: "buy", cart: items, subtotal, discount: 0, promoCode: null, deliveryFee: 0,
      location: pin ? { lat: pin.lat, lng: pin.lng } : null, manualLocation: locationText.trim(), landmark: "",
      extraInfo, contactInfo: phone, payerName: name.trim(), payerPhone: phone, deliveryMethod: "pickup",
      paymentMethod: "pending_provider_selection", delivered: null, createdAt: Date.now(), expiresAt: Date.now() + 48 * 60 * 60 * 1000,
      platformFee, commissionRatePercent: data.commissionRatePercent, total: serverTotal,
      backendOrderId: data.orders[0].orderId, checkoutId: data.checkoutId, checkoutClaimToken: data.claimToken,
      backendOrders: data.orders, checkoutPaymentMethod: data.paymentMethod, paymentRef: data.paymentReference || `SR-${orderId}`,
      status,
    })
    setConfirmedTotal(serverTotal); setSellerOrders(data.orders); setCheckoutId(data.checkoutId)
    setCheckoutPaymentMethod(data.paymentMethod || "manual_momo"); setClaimToken(data.claimToken)
    setPaymentRef(data.paymentReference || null)
    if (data.environment) setCheckoutEnvironment(data.environment)
  }

  const placeOrder = async () => {
    if (placingRef.current) return
    placingRef.current = true; setSaving(true); setPlaceError("")
    try {
      const body = buildCheckoutPayload({ cart: items, localOrderId: orderId, form: { pin, locationText, extraInfo, name, phone } })
      const data = await api("/orders/checkout", { method: "POST", headers: authHeader(), body })
      if (!data.checkoutId || !Array.isArray(data.orders) || !data.orders.length) throw new Error("We couldn’t confirm every seller’s order. Please contact support before trying again.")
      const check = checkServerTotal(data.total, subtotal)
      if (!check.usable) throw new Error("The server returned an invalid total, so nothing was charged. Please contact support.")
      onOrderPlaced?.() // the items now live in this order, so the app can empty its cart
      if (check.changed) {
        applyCheckout(data, check.total, "Price Review Required")
        setPriceReview({ serverTotal: check.total, shown: subtotal, checkoutId: data.checkoutId, claimToken: data.claimToken })
        return
      }
      applyCheckout(data, check.total, "Pending Confirmation")
      setStep(3)
    } catch (err) {
      setPlaceError(`${err.message} If you already paid for this order, contact support with your reference and don’t pay again.`)
    } finally { placingRef.current = false; setSaving(false) }
  }

  const acceptNewTotal = () => {
    updateOrder(orderId, { status: "Pending Confirmation" })
    setPriceReview(null); setStep(3)
  }

  // ── Payment status ────────────────────────────────────────────────────────
  const refreshSellerOrders = useCallback(async () => {
    if (!checkoutId || !claimToken) return
    setDeliveryError("")
    try {
      const data = await api(`/group-lifecycle/${encodeURIComponent(checkoutId)}/orders`, { headers: { "x-checkout-token": claimToken } })
      setSellerOrders(old => data.orders.map(o => ({ ...old.find(i => i.orderId === o.orderId), ...o })))
      setGroupPaymentStatus(data.status)
    } catch (err) { setDeliveryError(err.message) }
  }, [checkoutId, claimToken])

  const loadStatus = useCallback(async announce => {
    if (!checkoutId || !claimToken) return
    try {
      const data = await api(`/checkout-payments/${encodeURIComponent(checkoutId)}/status`, { headers: { "x-checkout-token": claimToken } })
      setCheckoutEnvironment(data.environment)
      if (data.paymentMethod) setCheckoutPaymentMethod(data.paymentMethod)
      setGroupPaymentStatus(data.status)
      if (data.status === "verified" && prevStatusRef.current !== "verified") refreshSellerOrders()
      prevStatusRef.current = data.status
      if (announce) setStatusMessage(data.status === "verified" ? "Payment confirmed. Your seller can now prepare your order." : "Still waiting. This page updates by itself.")
    } catch (err) { if (announce) setStatusMessage(err.message) }
    finally { setStatusReady(true) }
  }, [checkoutId, claimToken, refreshSellerOrders])

  useEffect(() => {
    if (step !== 3) return undefined
    const first = setTimeout(() => loadStatus(false), 0)
    return () => clearTimeout(first)
  }, [step, loadStatus])
  useEffect(() => {
    if (step !== 3 || !OPEN_STATES.includes(groupPaymentStatus)) return undefined
    const timer = setInterval(() => { if (document.visibilityState === "visible") loadStatus(false) }, 12000)
    return () => clearInterval(timer)
  }, [step, groupPaymentStatus, loadStatus])

  const onPaid = () => { setGroupPaymentStatus("verified"); prevStatusRef.current = "verified"; refreshSellerOrders() }
  const onSubmitted = status => { setGroupPaymentStatus(status); prevStatusRef.current = status; setStatusMessage("") }

  const cancelOrder = async () => {
    setCancelBusy(true); setStatusMessage("")
    try {
      await api(`/checkout-payments/${encodeURIComponent(checkoutId)}/cancel`, { method: "POST", headers: { "x-checkout-token": claimToken } })
      setGroupPaymentStatus("cancelled"); prevStatusRef.current = "cancelled"; setCancelAsk(false)
      updateOrder(orderId, { status: "Cancelled" })
    } catch (err) { setStatusMessage(err.message) }
    finally { setCancelBusy(false) }
  }

  const declineNewTotal = async () => {
    setCancelBusy(true)
    try {
      await api(`/checkout-payments/${encodeURIComponent(priceReview.checkoutId)}/cancel`, { method: "POST", headers: { "x-checkout-token": priceReview.claimToken } })
      updateOrder(orderId, { status: "Cancelled" })
      onClose?.()
    } catch (err) { setPlaceError(`We couldn’t cancel this order automatically (${err.message}). Please don’t pay. Contact support to cancel it.`) }
    finally { setCancelBusy(false) }
  }

  const generateSellerCode = async sellerOrderId => {
    setDeliveryBusy(sellerOrderId); setDeliveryError("")
    try {
      const data = await api(`/group-lifecycle/${encodeURIComponent(checkoutId)}/orders/${encodeURIComponent(sellerOrderId)}/delivery-code`, { method: "POST", headers: { "x-checkout-token": claimToken } })
      setDeliveryCodes(prev => ({ ...prev, [sellerOrderId]: data }))
    } catch (err) { setDeliveryError(err.message) }
    finally { setDeliveryBusy(null) }
  }

  // ── Derived display values ────────────────────────────────────────────────
  const view = paymentStatusView(groupPaymentStatus)
  const paystackOffered = publicSettings?.paymentMode === "paystack"
  const locationLabel = pin ? (locationText.trim() ? `${locationText.trim()} (pinned)` : "Pinned on map") : locationText.trim()
  const icons = { wait: "⏳", review: "🔎", ok: "✅", stop: "🚫", alert: "⚠️" }
  const title = step === 0 ? "Delivery" : step === 1 ? "Review your order" : delivered !== null ? "Order update" : groupPaymentStatus === "verified" ? "Your order" : groupPaymentStatus === "pending" ? "Complete your payment" : "Your order"
  const stepNumber = step === 3 ? 2 : step

  const itemsList = <div className="co-items">{items.map((item, index) => {
    const line = Number(item.price || item.dailyRate || 0) * Number(item.qty || 1)
    return <div className="co-item" key={index}>
      <div className="co-thumb" style={typeof item.image === "string" && item.image.startsWith("http") ? { backgroundImage: `url(${item.image})` } : undefined} />
      <div className="co-item-main"><strong>{item.title}</strong><small>Qty {item.qty || 1}</small></div>
      <div className="co-item-price">{formatCediShort(line)}</div>
    </div>
  })}</div>

  return <div className="co-backdrop">
    <style>{CSS}</style>
    <div className="co-sheet" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="co-head">
        <h2>{title}</h2>
        <button type="button" className="co-x" onClick={onClose} aria-label="Close checkout">✕</button>
      </div>
      {step < 3 && <div className="co-stepper" aria-label={`Step ${stepNumber + 1} of ${STEPS.length}`}>
        {STEPS.map((label, i) => <div key={label} className={i === stepNumber ? "on" : i < stepNumber ? "done" : ""}><b>{i < stepNumber ? "✓" : i + 1}</b>{label}</div>)}
      </div>}

      <div className="co-body">

        {/* ── 1. Delivery ── */}
        {step === 0 && <>
          <p className="co-lead">Tell us where this order is going. You won’t be charged yet.</p>
          <Field id="co-loc" label="Shipment location" error={errors.location} hint={pin ? `Pinned to within about ${pin.accuracy || "a few"} m.${pin.accuracy > 100 ? " For a sharper pin, step outside and tap again." : ""} Add a landmark above if it helps.` : "Your hostel, hall or area. Add a landmark to help the seller find you."}>
            <input id="co-loc" className={`co-input ${errors.location ? "bad" : ""}`} autoComplete="street-address" value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="e.g. Mensah Sarbah Hall, opposite the library" />
          </Field>
          <button type="button" className={`co-pin ${pin ? "on" : ""}`} onClick={detectLocation} disabled={locBusy}>{locBusy ? "Finding you…" : pin ? "📍 Location pinned ✓ (tap to refresh)" : "📍 Use my current location"}</button>
          {locMessage && <div className="co-hint" role="status">{locMessage}</div>}
          <MapPreview query={mapQuery} pinned={!!pin} />

          <Field id="co-name" label="Name" error={errors.name}>
            <input id="co-name" className={`co-input ${errors.name ? "bad" : ""}`} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </Field>
          <Field id="co-phone" label="Phone number" error={errors.phone} hint="The seller or rider calls this number to reach you.">
            <input id="co-phone" className={`co-input ${errors.phone ? "bad" : ""}`} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 123 4567" />
          </Field>
          <Field id="co-extra" label="Anything the seller should know?" optional hint="The seller sees this message with your order.">
            <textarea id="co-extra" className="co-input" rows={2} value={extraInfo} onChange={e => setExtraInfo(e.target.value)} placeholder="e.g. Call me when you arrive" />
          </Field>
          <div className="co-soft">After you pay, the seller arranges delivery with you. They may bring it themselves or send a Silk Road rider.</div>
        </>}

        {/* ── 2. Review ── */}
        {step === 1 && !priceReview && <>
          <div className="co-card">{itemsList}</div>
          <div className="co-card">
            <div className="co-row"><span>Deliver to</span><strong>{locationLabel}</strong></div>
            <MapPreview query={mapQuery} pinned={!!pin} compact />
            <div className="co-row"><span>Contact</span><strong>{name.trim()} · {normalizeGhPhone(phone).local || phone}</strong></div>
            {extraInfo.trim() && <div className="co-row"><span>Your message</span><strong>{extraInfo.trim()}</strong></div>}
            <button type="button" className="co-link" style={{ justifySelf: "start" }} onClick={() => setStep(0)}>Edit details</button>
          </div>
          <div className="co-card">
            <div className="co-row"><span>Items</span><strong>{formatCedi(subtotal)}</strong></div>
            <div className="co-row"><span>Delivery</span><strong>Arranged by the seller</strong></div>
            <div className="co-total"><span>Total</span><span>{formatCedi(subtotal)}<small>({formatUsd(subtotal, rate)})</small></span></div>
          </div>
          <div className="co-card">
            <h4>How you’ll pay</h4>
            <ProviderChips card={paystackOffered} />
            <p className="co-hint" style={{ margin: 0 }}>{paystackOffered ? "You’ll pick MTN MoMo, Telecel Cash, AT Money or card on a secure payment page." : "Pay by Mobile Money from MTN, Telecel or AT. The next screen shows exactly where to send it."}</p>
          </div>
          {placeError && <div className="co-note bad" role="alert">{placeError}</div>}
        </>}

        {step === 1 && priceReview && <>
          <div className="co-banner alert"><span className="ic">⚠️</span><div><b>The price changed</b><span>You saw {formatCedi(priceReview.shown)}, but the seller’s current total is <b style={{ display: "inline" }}>{formatCedi(priceReview.serverTotal)}</b>. Nothing has been charged.</span></div></div>
          {placeError && <div className="co-note bad" role="alert">{placeError}</div>}
          <button type="button" className="co-btn co-primary" onClick={acceptNewTotal}>Continue with {formatCedi(priceReview.serverTotal)}</button>
          <button type="button" className="co-btn co-secondary" disabled={cancelBusy} onClick={declineNewTotal}>{cancelBusy ? "Cancelling…" : "No thanks, cancel this order"}</button>
        </>}

        {/* ── 3. Pay, then track ── */}
        {step === 3 && delivered === null && !statusReady && <div className="co-skel" aria-label="Loading your order" />}
        {step === 3 && (delivered === null ? (!statusReady ? null : <>
          {groupPaymentStatus === "pending"
            ? <div className="co-amount"><span>Amount to pay</span><strong>{formatCedi(total)}</strong><small>({formatUsd(total, rate)})</small></div>
            : <div className={`co-banner ${view.tone}`}><span className="ic">{icons[view.tone]}</span><div><b>{view.title}</b><span>{view.detail}</span></div></div>}

          {checkoutId && claimToken ? <>
            {groupPaymentStatus === "pending" && checkoutPaymentMethod === "paystack" && <PaystackPay checkoutId={checkoutId} claimToken={claimToken} amount={total} defaultEmail={user?.email} onVerified={onPaid} />}
            {groupPaymentStatus === "pending" && checkoutPaymentMethod !== "paystack" && checkoutEnvironment === "testing" && <PracticePay checkoutId={checkoutId} claimToken={claimToken} onSubmitted={onSubmitted} />}
            {groupPaymentStatus === "pending" && checkoutPaymentMethod !== "paystack" && checkoutEnvironment === "live" && <ManualMomoPay amount={total} reference={paymentRef} buyerPhone={phone} support={support} checkoutId={checkoutId} claimToken={claimToken} onSubmitted={onSubmitted} />}
            {groupPaymentStatus === "pending" && checkoutPaymentMethod !== "paystack" && checkoutEnvironment === null && <div className="co-skel" aria-label="Checking payment options" />}

            {(groupPaymentStatus === "submitted" || groupPaymentStatus === "under_review") && <div className="co-card">
              <div className="co-live"><span className="co-pulse" />Checking your payment…</div>
              <p className="co-lead" style={{ margin: 0 }}>Your payment details are with our team. You don’t need to send them again.</p>
              <button type="button" className="co-btn co-secondary" onClick={() => loadStatus(true)}>↻ Check again</button>
            </div>}

            {groupPaymentStatus === "verified" && <div className="co-card">
              <h3>Receive your order</h3>
              <p className="co-lead">When your items arrive, check that everything is right. Then get your delivery code and share it with the seller or rider. <b>Never share it before you have your items.</b></p>
              {checkoutEnvironment === "testing" && <div className="co-note">This was a practice order, so there are no delivery codes.</div>}
              {sellerOrders.map((o, index) => (
                <div className="co-sep" key={o.orderId}>
                  <div className="co-pkg-top"><div><small>PACKAGE {index + 1}</small><strong>{o.title || `Your order ${index + 1}`}</strong></div><span className="co-item-price">{formatCedi(o.amount)}</span></div>
                  <div className="co-hint">{o.paymentStatus === "released" ? "Payment to seller recorded" : o.paymentStatus === "release_pending" ? "Delivery confirmed" : o.paymentStatus === "escrow_held" ? "Ready for delivery" : "Waiting for payment confirmation"}</div>
                  {o.paymentStatus === "escrow_held" && <button type="button" className="co-btn co-primary" disabled={deliveryBusy === o.orderId} onClick={() => generateSellerCode(o.orderId)}>{deliveryBusy === o.orderId ? "Getting your code…" : deliveryCodes[o.orderId] ? "Get a new delivery code" : "I’ve received this package. Get my code"}</button>}
                  {deliveryCodes[o.orderId] && <div className="co-code"><span>YOUR DELIVERY CODE</span><strong>{deliveryCodes[o.orderId].deliveryCode}</strong><small>Share only after checking your items. Expires at {new Date(deliveryCodes[o.orderId].expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</small></div>}
                </div>
              ))}
              <button type="button" className="co-btn co-secondary" onClick={refreshSellerOrders}>↻ Update delivery progress</button>
              {deliveryError && <div className="co-note bad" role="alert">{deliveryError}</div>}
            </div>}

            {statusMessage && <div className="co-note" role="status">{statusMessage}</div>}

            {groupPaymentStatus === "pending" && <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
              {!cancelAsk
                ? <button type="button" className="co-link" onClick={() => setCancelAsk(true)}>Cancel this order</button>
                : <div className="co-card" style={{ width: "100%", boxSizing: "border-box" }}>
                    <b>Cancel this order?</b>
                    <p className="co-hint" style={{ margin: 0 }}>If you’ve already sent money, don’t cancel. Wait for confirmation or contact support.</p>
                    <div className="co-actions"><button type="button" className="co-btn co-secondary" onClick={() => setCancelAsk(false)}>Keep order</button><button type="button" className="co-btn co-primary" disabled={cancelBusy} onClick={cancelOrder}>{cancelBusy ? "Cancelling…" : "Yes, cancel"}</button></div>
                  </div>}
            </div>}
          </> : <div className="co-card"><p className="co-lead" style={{ margin: 0 }}>We’re preparing your order details. If this takes too long, contact Silk Road support before trying to pay again.</p></div>}

          <details className="co-details">
            <summary>Order details</summary>
            <div className="co-details-body">
              {itemsList}
              <div className="co-divider" />
              <div className="co-row"><span>Total</span><strong>{formatCedi(total)} ({formatUsd(total, rate)})</strong></div>
              <div className="co-row"><span>Delivery</span><strong>{deliveryMethod === "rider" ? "Rider delivery requested" : "Arranged by the seller"}</strong></div>
              {(locationText || pin) && <div className="co-row"><span>Location</span><strong>{locationText.trim() || `${pin.lat}, ${pin.lng}`}</strong></div>}
              {extraInfo.trim() && <div className="co-row"><span>Your message</span><strong>{extraInfo.trim()}</strong></div>}
              {paymentRef && <div className="co-row"><span>Reference</span><strong>{paymentRef}</strong></div>}
              <MapPreview query={mapQuery} pinned={!!pin} compact />
              <p className="co-fine">Keep this reference. Silk Road will never ask for your payment PIN.</p>
            </div>
          </details>

          {support && <a className="co-btn co-secondary" href={`https://wa.me/${support}`} target="_blank" rel="noreferrer">Need help? Chat on WhatsApp</a>}
          <button type="button" className="co-btn co-ghost" onClick={onClose}>Back to marketplace</button>
        </>) : <div className={`co-banner ${delivered ? "ok" : "stop"}`}>
          <span className="ic">{delivered ? "🎉" : "🚫"}</span>
          <div><b>{delivered ? "Delivered. Enjoy!" : "Order cancelled"}</b><span>{delivered ? "Your delivery has been confirmed. Any seller payout is handled separately." : "Your order is marked cancelled. Contact support for the latest refund status."}</span><br /><button type="button" className="co-btn co-primary" style={{ marginTop: 12 }} onClick={onClose}>Back to marketplace</button></div>
        </div>)}
      </div>

      {step === 0 && <div className="co-foot"><div className="co-actions"><button type="button" className="co-btn co-primary" onClick={goReview}>Continue</button></div></div>}
      {step === 1 && !priceReview && <div className="co-foot">
        <div className="co-actions">
          <button type="button" className="co-btn co-ghost" onClick={() => setStep(0)} disabled={saving}>Back</button>
          <button type="button" className="co-btn co-primary" onClick={placeOrder} disabled={saving}>{saving ? "Placing your order…" : `Continue to payment · ${formatCedi(subtotal)}`}</button>
        </div>
        <div className="co-fine" style={{ textAlign: "center" }}>You won’t be charged on this screen.</div>
      </div>}
    </div>
  </div>
}
