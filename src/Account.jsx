import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import "./AccountStyles.css"
import { AIcon } from "./AccountIcons"
import { CountMoney, AreaChart, Donut, Bars } from "./accountKit"
import { cedi, cediShort, apiJson, timeAgo, orderStage } from "./accountUtils"
import { SellerOrderCard } from "./SellerFulfillment"
import PayoutsPanel from "./PayoutsPanel"
import { ActiveRentals, ActiveServices, NotificationsTab } from "./AccountLegacy"
import { NotificationBell } from "./NotificationCenter"
import { updateProfile, changePassword, deleteAccount, getMyOrders, getSellingOrders, getMyListings, updateListing, deleteListing } from "./api"
import { getSellerNotifications } from "./OrderTracker"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening" }

// A buyer's view of where their purchase is.
function purchaseStatus(o) {
  if (o.cancelled || o.status === "Cancelled") return { label: "Cancelled", tone: "red" }
  if (o.paymentStatus === "released" || o.paymentStatus === "release_pending") return { label: "Completed", tone: "green" }
  if (o.fulfillmentStatus === "delivered_pending_otp") return { label: "Confirm with your code", tone: "amber" }
  if (o.fulfillmentStatus === "delivery_in_progress") return { label: "On the way", tone: "blue" }
  if (o.paymentStatus === "escrow_held") return { label: "Seller is preparing it", tone: "blue" }
  if (o.paymentStatus === "pending") return { label: "Awaiting payment", tone: "amber" }
  return { label: o.status || "Processing", tone: "blue" }
}

export default function Account({ user, onSignOut, onClose, onUserUpdate, notifTick }) {
  const [tab, setTab] = useState("overview")
  const [moreOpen, setMoreOpen] = useState(false)
  const [seller, setSeller] = useState([])
  const [legacySelling, setLegacySelling] = useState([])
  const [purchases, setPurchases] = useState([])
  const [listings, setListings] = useState([])
  const [payout, setPayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orderFilter, setOrderFilter] = useState("active")
  const scroller = useRef(null)

  const loadAll = useCallback(async () => {
    const [grouped, legacy, mine, lst, pay] = await Promise.allSettled([
      apiJson("/group-lifecycle/seller/orders"), getSellingOrders(), getMyOrders(), getMyListings(), apiJson("/payout-recipients/me/summary?role=seller"),
    ])
    if (grouped.status === "fulfilled") setSeller(grouped.value.orders || [])
    if (legacy.status === "fulfilled" && Array.isArray(legacy.value)) setLegacySelling(legacy.value)
    if (mine.status === "fulfilled" && Array.isArray(mine.value)) setPurchases(mine.value)
    if (lst.status === "fulfilled" && Array.isArray(lst.value)) setListings(lst.value)
    if (pay.status === "fulfilled") setPayout(pay.value)
    setLoading(false)
  }, [])
  useEffect(() => { const t = setTimeout(loadAll, 0); return () => clearTimeout(t) }, [loadAll])
  // Stay live: any notification (new order, rider accepted, delivery confirmed, payout sent) refreshes the numbers.
  useEffect(() => {
    let timer
    const refresh = () => { clearTimeout(timer); timer = setTimeout(loadAll, 700) }
    window.addEventListener("silkroad_notification", refresh)
    const poll = setInterval(loadAll, 45000)
    return () => { window.removeEventListener("silkroad_notification", refresh); clearInterval(poll); clearTimeout(timer) }
  }, [loadAll])
  useEffect(() => { scroller.current?.scrollTo({ top: 0, behavior: "smooth" }) }, [tab])

  // Grouped (Paystack) orders plus older manual-payment orders, de-duplicated.
  const allSales = useMemo(() => {
    const ids = new Set(seller.map(o => o.orderId))
    const legacy = legacySelling.filter(o => !ids.has(String(o._id)) && ["escrow_held", "release_pending", "released"].includes(o.paymentStatus))
      .map(o => ({ orderId: String(o._id), itemTitle: o.listing?.title || "Item", amount: o.amount, sellerAmount: o.sellerAmount, paymentStatus: o.paymentStatus, createdAt: o.createdAt }))
    return [...seller, ...legacy]
  }, [seller, legacySelling])

  const stats = useMemo(() => {
    const sum = f => allSales.filter(f).reduce((s, o) => s + Number(o.sellerAmount || 0), 0)
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d })
    const timeline = days.map(d => ({ label: d.toLocaleDateString([], { day: "numeric", month: "short" }), value: allSales.filter(o => { const c = new Date(o.createdAt); c.setHours(0, 0, 0, 0); return c.getTime() === d.getTime() }).reduce((s, o) => s + Number(o.sellerAmount || 0), 0) }))
    const byItem = {}; allSales.forEach(o => { byItem[o.itemTitle] = (byItem[o.itemTitle] || 0) + Number(o.sellerAmount || 0) })
    return {
      earned: sum(o => o.paymentStatus === "released"), escrow: sum(o => o.paymentStatus === "escrow_held"), releasing: sum(o => o.paymentStatus === "release_pending"),
      count: allSales.length, timeline, weekTotal: timeline.slice(-7).reduce((s, p) => s + p.value, 0),
      pipeline: [
        { label: "Awaiting delivery", value: allSales.filter(o => o.paymentStatus === "escrow_held").length, color: "#e4c892" },
        { label: "Releasing", value: allSales.filter(o => o.paymentStatus === "release_pending").length, color: "#58a9e0" },
        { label: "Paid out", value: allSales.filter(o => o.paymentStatus === "released").length, color: "#4fbf8a" },
      ],
      top: Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
    }
  }, [allSales])

  const needsAction = seller.filter(o => orderStage(o) === "choose")
  const needsCode = seller.filter(o => orderStage(o) === "awaiting_code")
  const legacyUnread = user?._id ? getSellerNotifications(user._id).filter(n => n.status === "unread").length : 0
  void notifTick
  const visibleSales = seller.filter(o => orderFilter === "all" ? true : orderFilter === "done" ? o.paymentStatus === "released" : o.paymentStatus !== "released")

  const NAV = [
    { id: "overview", label: "Overview", icon: "home" },
    { id: "selling", label: "Selling", icon: "store", badge: needsAction.length + needsCode.length },
    { id: "buying", label: "Purchases", icon: "bag" },
    { id: "listings", label: "Listings", icon: "tag" },
    { id: "payouts", label: "Payouts", icon: "wallet", dot: payout && !payout.configured },
    { id: "rentals", label: "Rentals", icon: "calendar" },
    { id: "services", label: "Services", icon: "tool" },
    { id: "inbox", label: "Manual orders", icon: "inbox", badge: legacyUnread },
    { id: "profile", label: "Profile", icon: "user" },
    { id: "security", label: "Security", icon: "shield" },
  ]
  const MOBILE = ["overview", "selling", "buying", "listings"]
  const go = id => { setTab(id); setMoreOpen(false) }
  const current = NAV.find(n => n.id === tab)

  return <div className="ac-root">
    <aside className="ac-rail" aria-label="Account navigation">
      <div className="ac-brand"><span className="mark" aria-hidden="true">S</span><div><b>Silk Road</b><small>My account</small></div></div>
      <div className="ac-me"><div className="ac-avatar">{user.name?.[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>{user.university}</small></div></div>
      <nav>{NAV.map(n => <button key={n.id} type="button" className={tab === n.id ? "on" : ""} onClick={() => go(n.id)}>
        <AIcon name={n.icon} size={19} /><span>{n.label}</span>{n.badge > 0 && <em>{n.badge > 9 ? "9+" : n.badge}</em>}{n.dot && <i className="dot" />}
      </button>)}</nav>
      <button type="button" className="ac-signout" onClick={onSignOut}><AIcon name="logout" size={18} />Sign out</button>
    </aside>

    <main className="ac-main">
      <header className="ac-top">
        <button type="button" className="ac-iconbtn" onClick={onClose} aria-label="Back to marketplace"><AIcon name="back" size={19} /></button>
        <div className="ac-top-title"><h1>{current?.label}</h1><span>{user.name}</span></div>
        <NotificationBell sellerId={user._id} />
      </header>

      <div className="ac-scroll" ref={scroller}>
        <div className="ac-page" key={tab}>
          {tab === "overview" && <Overview user={user} stats={stats} loading={loading} needsAction={needsAction} needsCode={needsCode} payout={payout} go={go} />}

          {tab === "selling" && <div className="ac-stack">
            <div className="ac-seg" role="tablist">{[["active", "Active"], ["done", "Paid out"], ["all", "All"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={orderFilter === id} className={orderFilter === id ? "on" : ""} onClick={() => setOrderFilter(id)}>{label}</button>)}</div>
            {loading && !seller.length && [0, 1].map(i => <div key={i} className="ac-card ac-skel" />)}
            {!loading && visibleSales.length === 0 && <div className="ac-empty"><div className="art"><AIcon name="store" size={30} /></div><h3>{orderFilter === "done" ? "No payouts yet" : "No active orders"}</h3><p>When someone buys from you, the order lands here with everything you need: deliver it yourself or call a rider.</p></div>}
            {visibleSales.map(o => <SellerOrderCard key={o.orderId} order={o} user={user} onChanged={loadAll} />)}
          </div>}

          {tab === "buying" && <div className="ac-stack">
            {!loading && purchases.length === 0 && <div className="ac-empty"><div className="art"><AIcon name="bag" size={30} /></div><h3>No purchases yet</h3><p>Everything you buy shows up here with live delivery progress.</p><button type="button" className="ac-btn primary" onClick={onClose}>Browse the marketplace</button></div>}
            {purchases.map(o => { const st = purchaseStatus(o); return <article key={o._id} className="ac-card ac-purchase">
              <div className="ac-thumb">{o.listing?.image ? <img src={o.listing.image} alt="" loading="lazy" /> : <AIcon name="package" size={22} />}</div>
              <div className="ac-order-title"><strong>{o.listing?.title || "Item"}</strong><span>from {o.seller?.name || "a seller"} · {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
              <div className="ac-order-amount"><b>{cedi(o.amount)}</b><span className={`ac-chip ${st.tone}`}>{st.label}</span></div>
            </article> })}
          </div>}

          {tab === "listings" && <ListingsTab listings={listings} setListings={setListings} loading={loading} />}
          {tab === "payouts" && <PayoutsPanel user={user} sellerOrders={allSales} />}
          {tab === "rentals" && <div className="ac-legacy"><ActiveRentals /></div>}
          {tab === "services" && <div className="ac-legacy"><ActiveServices /></div>}
          {tab === "inbox" && <div className="ac-legacy"><NotificationsTab user={user} onSaleComplete={loadAll} /></div>}
          {tab === "profile" && <ProfileTab user={user} onUserUpdate={onUserUpdate} />}
          {tab === "security" && <SecurityTab onSignOut={onSignOut} />}
        </div>
      </div>
    </main>

    <nav className="ac-tabbar" aria-label="Account navigation">
      {MOBILE.map(id => { const n = NAV.find(x => x.id === id); return <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => go(id)}><AIcon name={n.icon} size={21} /><span>{n.label}</span>{n.badge > 0 && <em>{n.badge > 9 ? "9+" : n.badge}</em>}</button> })}
      <button type="button" className={!MOBILE.includes(tab) ? "on" : ""} onClick={() => setMoreOpen(true)}><AIcon name="user" size={21} /><span>More</span></button>
    </nav>
    {moreOpen && <div className="ac-sheet-layer"><div className="ac-sheet-backdrop" onClick={() => setMoreOpen(false)} />
      <section className="ac-sheet short" role="dialog" aria-label="More"><div className="ac-grab" />
        <div className="ac-more">{NAV.filter(n => !MOBILE.includes(n.id)).map(n => <button key={n.id} type="button" onClick={() => go(n.id)}><AIcon name={n.icon} size={22} /><span>{n.label}</span>{n.badge > 0 && <em>{n.badge}</em>}{n.dot && <i className="dot" />}</button>)}
          <button type="button" className="danger" onClick={onSignOut}><AIcon name="logout" size={22} /><span>Sign out</span></button></div></section></div>}
  </div>
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ user, stats, loading, needsAction, needsCode, payout, go }) {
  const kpis = [
    { label: "Paid out to you", value: stats.earned, icon: "wallet", tone: "green" },
    { label: "Held in escrow", value: stats.escrow, icon: "shield", tone: "gold" },
    { label: "Being released", value: stats.releasing, icon: "clock", tone: "blue" },
  ]
  const todo = [
    ...needsAction.map(o => ({ key: o.orderId, icon: "bike", title: `Choose delivery for ${o.itemTitle}`, sub: `${o.buyerName} is waiting · ${cedi(o.sellerAmount)}`, go: "selling" })),
    ...needsCode.map(o => ({ key: `c${o.orderId}`, icon: "key", title: `Enter the buyer’s code for ${o.itemTitle}`, sub: "Delivery is done, confirm it to get paid", go: "selling" })),
    ...(payout && !payout.configured ? [{ key: "payout", icon: "wallet", title: "Add your payout account", sub: "So your money can be sent automatically", go: "payouts" }] : []),
  ]
  return <div className="ac-stack">
    <section className="ac-hero">
      <div className="glow" aria-hidden="true" />
      <div className="ac-hero-top"><div><span className="ac-eyebrow">{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span>
        <h2>{greeting()}, {user.name?.split(" ")[0]}</h2><p>{stats.weekTotal > 0 ? `You made ${cedi(stats.weekTotal)} in sales this week.` : "Your sales dashboard updates live as orders come in."}</p></div>
        <div className="ac-avatar big">{user.name?.[0]?.toUpperCase()}</div></div>
      <div className="ac-hero-total"><small>Lifetime earnings</small><b><CountMoney value={stats.earned + stats.releasing + stats.escrow} /></b><span>{stats.count} {stats.count === 1 ? "order" : "orders"}</span></div>
    </section>

    <div className="ac-kpis">{kpis.map(k => <div key={k.label} className={`ac-kpi tone-${k.tone}`}><span className="ic"><AIcon name={k.icon} size={18} /></span><small>{k.label}</small><b><CountMoney value={k.value} short /></b></div>)}</div>

    {todo.length > 0 && <section className="ac-card ac-todo"><header className="ac-card-head"><div><h3>Needs your attention</h3><p>Quick wins that keep orders moving.</p></div></header>
      {todo.slice(0, 5).map(t => <button key={t.key} type="button" onClick={() => go(t.go)}><span className="ic"><AIcon name={t.icon} size={19} /></span><span className="tx"><b>{t.title}</b><small>{t.sub}</small></span><AIcon name="chevron" size={18} /></button>)}
    </section>}

    <section className="ac-card"><header className="ac-card-head"><div><h3>Sales, last 14 days</h3><p>What you’ve earned from orders, day by day.</p></div><span className="ac-chip gold"><AIcon name="trend" size={13} /> {cediShort(stats.weekTotal)} this week</span></header>
      {loading ? <div className="ac-skel flat" /> : <AreaChart points={stats.timeline} />}</section>

    <div className="ac-grid2">
      <section className="ac-card"><header className="ac-card-head"><div><h3>Order pipeline</h3></div></header><Donut parts={stats.pipeline} center={{ value: stats.count, label: "orders" }} /></section>
      <section className="ac-card"><header className="ac-card-head"><div><h3>Best sellers</h3></div></header>
        {stats.top.length ? <Bars rows={stats.top} /> : <p className="ac-empty-line">Your top items will show up here.</p>}</section>
    </div>
  </div>
}

// ── Listings ──────────────────────────────────────────────────────────────────
function ListingsTab({ listings, setListings, loading }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const open = l => { setEditing(l); setError(""); setDraft({ title: l.title || "", desc: l.desc || "", category: l.category || "", price: l.price ?? "", dailyRate: l.dailyRate ?? "", maxDays: l.maxDays ?? "", condition: l.condition || "", contactDetail: l.contactDetail || "", contactNote: l.contactNote || "" }) }
  const set = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  const save = async e => {
    e.preventDefault()
    if (!editing || saving) return
    if (!draft.title.trim() || !draft.desc.trim() || !draft.category.trim()) { setError("Title, description and category are required."); return }
    const payload = { title: draft.title.trim(), desc: draft.desc.trim(), category: draft.category.trim() }
    if (editing.type === "rent") {
      if (!(Number(draft.dailyRate) > 0) || !Number.isInteger(Number(draft.maxDays)) || !(Number(draft.maxDays) > 0)) { setError("Enter a positive daily rate and a whole number of maximum days."); return }
      payload.dailyRate = Number(draft.dailyRate); payload.maxDays = Number(draft.maxDays)
    } else { if (!(Number(draft.price) > 0)) { setError("Enter a price greater than zero."); return } payload.price = Number(draft.price) }
    if (editing.type === "product") payload.condition = draft.condition
    if (editing.type === "service") { payload.contactDetail = draft.contactDetail; payload.contactNote = draft.contactNote }
    setSaving(true); setError("")
    try {
      const updated = await updateListing(editing._id, payload)
      if (!updated || updated.message || !updated._id) throw new Error(updated?.message || "The server did not confirm the update.")
      setListings(cur => cur.map(x => x._id === updated._id ? updated : x)); setEditing(null)
    } catch (err) { setError(err.message || "Could not update listing.") }
    setSaving(false)
  }
  const remove = async id => {
    if (!window.confirm("Remove this listing?")) return
    try { await deleteListing(id); setListings(l => l.filter(x => x._id !== id)) } catch { window.alert("Could not remove listing.") }
  }
  return <div className="ac-stack">
    {!loading && listings.length === 0 && <div className="ac-empty"><div className="art"><AIcon name="tag" size={30} /></div><h3>Nothing listed yet</h3><p>Items you list for sale, rent or as a service live here.</p></div>}
    <div className="ac-listings">{listings.map(l => <article key={l._id} className="ac-card ac-listing">
      <div className="pic">{l.image ? <img src={l.image} alt="" loading="lazy" /> : <AIcon name="tag" size={26} />}<span className="ac-chip gold">{l.type}</span></div>
      <div className="body"><strong>{l.title}</strong><span>{l.type === "rent" ? `${cedi(l.dailyRate)} / day` : cedi(l.price)}</span>
        <div className="ac-row"><button type="button" className="ac-btn ghost sm" onClick={() => open(l)}><AIcon name="edit" size={15} />Edit</button><button type="button" className="ac-btn danger sm" onClick={() => remove(l._id)}><AIcon name="trash" size={15} /></button></div></div>
    </article>)}</div>
    {editing && <div className="ac-sheet-layer"><div className="ac-sheet-backdrop" onClick={() => setEditing(null)} />
      <form className="ac-sheet" onSubmit={save}><div className="ac-grab" />
        <header><div><span className="ac-eyebrow">EDIT LISTING</span><h3>{editing.title}</h3></div><button type="button" className="ac-x" onClick={() => setEditing(null)} aria-label="Close"><AIcon name="close" size={18} /></button></header>
        <div className="ac-sheet-body">
          <label className="ac-field"><span>Title</span><input className="ac-input" value={draft.title} onChange={set("title")} /></label>
          <label className="ac-field"><span>Description</span><textarea className="ac-input" rows={4} value={draft.desc} onChange={set("desc")} /></label>
          <label className="ac-field"><span>Category</span><input className="ac-input" value={draft.category} onChange={set("category")} /></label>
          {editing.type === "rent" ? <div className="ac-row"><label className="ac-field"><span>Daily rate (GH₵)</span><input className="ac-input" type="number" min="0" step="0.01" value={draft.dailyRate} onChange={set("dailyRate")} /></label><label className="ac-field"><span>Max days</span><input className="ac-input" type="number" min="1" step="1" value={draft.maxDays} onChange={set("maxDays")} /></label></div>
            : <label className="ac-field"><span>Price (GH₵)</span><input className="ac-input" type="number" min="0" step="0.01" value={draft.price} onChange={set("price")} /></label>}
          {editing.type === "product" && <label className="ac-field"><span>Condition</span><input className="ac-input" value={draft.condition} onChange={set("condition")} /></label>}
          {editing.type === "service" && <><label className="ac-field"><span>Contact detail</span><input className="ac-input" value={draft.contactDetail} onChange={set("contactDetail")} /></label><label className="ac-field"><span>Note to buyers</span><input className="ac-input" value={draft.contactNote} onChange={set("contactNote")} /></label></>}
          {error && <div role="alert" className="ac-alert">{error}</div>}
        </div>
        <footer><button type="button" className="ac-btn ghost" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="ac-btn primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></footer>
      </form></div>}
  </div>
}

// ── Profile & security ────────────────────────────────────────────────────────
function ProfileTab({ user, onUserUpdate }) {
  const [form, setForm] = useState({ name: user.name, university: user.university || "", phone: user.phone || "" })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const save = async () => {
    const e = {}
    if (!form.name.trim()) e.name = "Name cannot be empty."
    if (!form.phone.trim()) e.phone = "Phone cannot be empty."
    setErrors(e); if (Object.keys(e).length) return
    setSaving(true); setError("")
    try {
      const data = await updateProfile({ name: form.name, university: form.university, phone: form.phone })
      if (data.message) { setError(data.message); setSaving(false); return }
      onUserUpdate({ ...user, name: data.name, university: data.university, phone: data.phone })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setError("Something went wrong.") }
    setSaving(false)
  }
  return <section className="ac-card ac-form"><div className="ac-profile-head"><div className="ac-avatar big">{user.name?.[0]?.toUpperCase()}</div><div><h3>{user.name}</h3><p>{user.email}</p></div></div>
    <label className="ac-field"><span>Full name</span><input className="ac-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />{errors.name && <em>{errors.name}</em>}</label>
    <label className="ac-field"><span>University</span><select className="ac-input" value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))}><option value="">Select…</option>{UNIS.map(u => <option key={u}>{u}</option>)}</select></label>
    <label className="ac-field"><span>Phone</span><input className="ac-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />{errors.phone && <em>{errors.phone}</em>}</label>
    {error && <div role="alert" className="ac-alert">{error}</div>}
    <button type="button" className="ac-btn primary" disabled={saving} onClick={save}>{saved ? "Saved ✓" : saving ? "Saving…" : "Save profile"}</button></section>
}

function SecurityTab({ onSignOut }) {
  const [pw, setPw] = useState(""), [pw2, setPw2] = useState("")
  const [pwErr, setPwErr] = useState(""), [pwSaved, setPwSaved] = useState(false), [pwBusy, setPwBusy] = useState(false)
  const [confirm, setConfirm] = useState(false), [delBusy, setDelBusy] = useState(false), [delErr, setDelErr] = useState("")
  const savePw = async () => {
    setPwErr("")
    if (pw.length < 6) { setPwErr("Password must be at least 6 characters."); return }
    if (pw !== pw2) { setPwErr("Passwords do not match."); return }
    setPwBusy(true)
    try {
      const data = await changePassword(pw)
      if (data.message === "Password updated successfully.") { setPwSaved(true); setPw(""); setPw2(""); setTimeout(() => setPwSaved(false), 2500) } else setPwErr(data.message || "Something went wrong.")
    } catch { setPwErr("Something went wrong.") }
    setPwBusy(false)
  }
  const del = async () => {
    if (!confirm) { setConfirm(true); return }
    setDelBusy(true); setDelErr("")
    try {
      const data = await deleteAccount()
      if (data.message === "Account deleted successfully.") { localStorage.removeItem("silkroad_token"); onSignOut() } else setDelErr(data.message || "Something went wrong.")
    } catch { setDelErr("Something went wrong.") }
    setDelBusy(false)
  }
  return <div className="ac-stack">
    <section className="ac-card ac-form"><header className="ac-card-head"><div><h3>Change password</h3><p>Use at least 6 characters.</p></div></header>
      <label className="ac-field"><span>New password</span><input className="ac-input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
      <label className="ac-field"><span>Confirm password</span><input className="ac-input" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></label>
      {pwErr && <div role="alert" className="ac-alert">{pwErr}</div>}
      <button type="button" className="ac-btn primary" disabled={pwBusy} onClick={savePw}>{pwSaved ? "Password updated ✓" : pwBusy ? "Saving…" : "Update password"}</button></section>
    <section className="ac-card ac-form danger-zone"><header className="ac-card-head"><div><h3>Delete account</h3><p>This permanently removes your account and listings. It can’t be undone.</p></div></header>
      {delErr && <div role="alert" className="ac-alert">{delErr}</div>}
      <button type="button" className="ac-btn danger" disabled={delBusy} onClick={del}>{confirm ? (delBusy ? "Deleting…" : "Yes, permanently delete my account") : "Delete my account"}</button>
      {confirm && !delBusy && <button type="button" className="ac-link" onClick={() => setConfirm(false)}>Keep my account</button>}</section>
    <p className="ac-fine">Signed in on this device. <button type="button" className="ac-link" onClick={onSignOut}>Sign out</button></p>
  </div>
}
void timeAgo
