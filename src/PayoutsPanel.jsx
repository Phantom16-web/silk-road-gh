import { useState, useEffect, useCallback } from "react"
import { AIcon } from "./AccountIcons"
import { CountMoney } from "./accountKit"
import { apiJson, cedi, timeAgo } from "./accountUtils"

const NETWORKS = [
  { code: "MTN", name: "MTN MoMo", color: "#ffcc00", ink: "#1a140e", short: "MTN" },
  { code: "VOD", name: "Telecel Cash", color: "#e60000", ink: "#fff", short: "TC" },
  { code: "ATL", name: "AT Money", color: "#1e88e5", ink: "#fff", short: "AT" },
]
const guess = n => { const p = String(n).replace(/\D/g, "").replace(/^233/, "0").slice(1, 3); return ["24", "25", "53", "54", "55", "59"].includes(p) ? "MTN" : ["20", "50"].includes(p) ? "VOD" : ["26", "27", "56", "57"].includes(p) ? "ATL" : "" }

export default function PayoutsPanel({ user, sellerOrders }) {
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({ accountName: user.name || "", accountNumber: user.phone || "", bankCode: guess(user.phone || "") || "MTN" })
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    try { setSummary(await apiJson("/payout-recipients/me/summary?role=seller")) } catch { setSummary({ configured: false, recipient: null, environment: null }) }
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  const save = async () => {
    setBusy(true); setError(""); setNotice("")
    try {
      const r = await apiJson("/payout-recipients/me", { method: "POST", body: JSON.stringify({ role: "seller", type: "mobile_money", accountName: form.accountName, accountNumber: form.accountNumber, bankCode: form.bankCode }) })
      setNotice(r.message); setEditing(false); load()
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const paid = sellerOrders.filter(o => o.paymentStatus === "released")
  const pending = sellerOrders.filter(o => o.paymentStatus === "release_pending")
  const waiting = sellerOrders.filter(o => o.paymentStatus === "escrow_held")
  const sum = list => list.reduce((s, o) => s + Number(o.sellerAmount || 0), 0)
  const showForm = editing || (summary && !summary.configured)
  const test = summary?.environment === "test"

  return <div className="ac-stack">
    <section className="ac-card ac-wallet">
      <div className="ac-wallet-top"><span className="ac-eyebrow">PAID OUT TO YOU</span>{test && <span className="ac-testtag inline">TEST MODE</span>}</div>
      <div className="ac-wallet-amount"><CountMoney value={sum(paid)} /></div>
      <div className="ac-wallet-row">
        <div><span>On its way</span><b>{cedi(sum(pending))}</b></div>
        <div><span>Waiting for delivery</span><b>{cedi(sum(waiting))}</b></div>
      </div>
    </section>

    <section className="ac-card">
      <header className="ac-card-head"><div><h3>Payout account</h3><p>Your money is sent here automatically the moment a buyer confirms delivery. No approval needed.</p></div>
        {summary?.configured && !editing && <button type="button" className="ac-btn ghost sm" onClick={() => setEditing(true)}>Change</button>}</header>

      {summary?.configured && !editing && <div className="ac-account-live">
        <div className="net" style={{ background: NETWORKS.find(n => n.code === summary.recipient.bankCode)?.color, color: NETWORKS.find(n => n.code === summary.recipient.bankCode)?.ink }}>{NETWORKS.find(n => n.code === summary.recipient.bankCode)?.short || "MoMo"}</div>
        <div><b>{summary.recipient.accountName}</b><span>{summary.recipient.numberMasked} · {NETWORKS.find(n => n.code === summary.recipient.bankCode)?.name || "Mobile Money"}</span></div>
        <span className="ac-chip green"><AIcon name="check" size={12} stroke={3} /> Active</span>
      </div>}
      {summary?.recipient?.holdUntil && new Date(summary.recipient.holdUntil) > new Date() && <div className="ac-note"><AIcon name="clock" size={16} />You changed your account recently. For your protection, payouts to it start {new Date(summary.recipient.holdUntil).toLocaleString("en-GH")}.</div>}

      {showForm && <div className="ac-form">
        <div className="ac-nets" role="radiogroup" aria-label="Mobile Money network">
          {NETWORKS.map(n => <button key={n.code} type="button" role="radio" aria-checked={form.bankCode === n.code} className={form.bankCode === n.code ? "on" : ""} onClick={() => setForm(f => ({ ...f, bankCode: n.code }))}><i style={{ background: n.color, color: n.ink }}>{n.short}</i>{n.name}</button>)}
        </div>
        <label className="ac-field"><span>Mobile Money number</span><input className="ac-input" type="tel" inputMode="tel" value={form.accountNumber} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, accountNumber: v, bankCode: guess(v) || f.bankCode })) }} placeholder="024 123 4567" /></label>
        <label className="ac-field"><span>Name on the account</span><input className="ac-input" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="As registered with your network" /></label>
        {error && <div role="alert" className="ac-alert">{error}</div>}
        <div className="ac-row end">{summary?.configured && <button type="button" className="ac-btn ghost" onClick={() => { setEditing(false); setError("") }}>Cancel</button>}
          <button type="button" className="ac-btn primary" disabled={busy || !form.accountNumber.trim() || !form.accountName.trim()} onClick={save}>{busy ? "Saving…" : "Save payout account"}</button></div>
      </div>}
      {notice && <div className="ac-note good"><AIcon name="check" size={16} />{notice}</div>}
    </section>

    <section className="ac-card">
      <header className="ac-card-head"><div><h3>Payout history</h3><p>Every order that has been paid out or is on its way.</p></div></header>
      {[...pending, ...paid].length === 0 ? <p className="ac-empty-line">Payouts will appear here after your first confirmed delivery.</p>
        : <ul className="ac-history">{[...pending, ...paid].slice(0, 12).map(o => <li key={o.orderId}><div className={`dot ${o.paymentStatus === "released" ? "ok" : "wait"}`} /><div><b>{o.itemTitle}</b><span>{timeAgo(o.createdAt)} · {o.paymentStatus === "released" ? "Paid out" : "Releasing"}</span></div><strong>{cedi(o.sellerAmount)}</strong></li>)}</ul>}
    </section>
  </div>
}
