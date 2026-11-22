import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import "./NotificationCenter.css"
import { Icon } from "./NotificationIcon"
import { kindOf } from "./notificationKinds"
import { getSellerNotifications, refreshSellerNotifications, markAllNotificationsRead } from "./OrderTracker"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const AUDIENCES = {
  user: { endpoint: "/notifications", tokenKey: "silkroad_token", live: "silkroad_notification", reconnect: "silkroad_socket_connected" },
  rider: { endpoint: "/rider-notifications", tokenKey: "silkroad_rider_token", live: "silkroad_rider_notification", reconnect: "silkroad_rider_socket_connected" },
}

const fromServer = n => ({ id: String(n.id), type: n.type, title: n.title || kindOf(n.type).title, message: n.message || "", createdAt: n.createdAt, unread: n.status !== "read", legacy: false })
// Older "new paid order" alerts still live in the seller-notification store; show them in the same list.
const fromLegacy = n => ({ id: `legacy-${n.id}`, type: "new_order", title: "New paid order", message: `An order worth ₵${Number(n.amount || 0).toLocaleString()} is ready for fulfillment.`, createdAt: n.createdAt, unread: n.status === "unread", legacy: true })

function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 45) return "Just now"
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d`
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" })
}
function dayLabel(value) {
  const d = new Date(value), now = new Date()
  const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86400000)
  if (diff <= 0) return "Today"
  if (diff === 1) return "Yesterday"
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })
}

function useNotifications(audience, userId) {
  const cfg = AUDIENCES[audience] || AUDIENCES.user
  const [server, setServer] = useState([])
  const [legacyTick, setLegacyTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fresh, setFresh] = useState(0) // bumps when a live notification lands, to ring the bell
  const headers = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem(cfg.tokenKey) || ""}` }), [cfg.tokenKey])

  const load = useCallback(async () => {
    if (!localStorage.getItem(cfg.tokenKey)) { setLoading(false); return }
    try {
      const response = await fetch(`${API_URL}${cfg.endpoint}?limit=60`, { headers: headers() })
      if (!response.ok) throw new Error("load failed")
      const data = await response.json()
      setServer((data.notifications || []).map(fromServer)); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
    if (audience === "user" && userId) refreshSellerNotifications(userId)
  }, [audience, cfg, headers, userId])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(load, 60000)
    const onLive = event => {
      const d = event.detail || {}
      if (!d.notificationId) return
      setServer(prev => prev.some(n => n.id === String(d.notificationId)) ? prev : [fromServer({ id: d.notificationId, type: d.type, title: d.title, message: d.message, createdAt: d.createdAt || new Date().toISOString(), status: "unread" }), ...prev])
      setFresh(x => x + 1)
    }
    const onLegacy = () => { setLegacyTick(x => x + 1); setFresh(x => x + 1) }
    window.addEventListener(cfg.live, onLive)
    window.addEventListener(cfg.reconnect, load)
    window.addEventListener("silkroad_notifications_changed", onLegacy)
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener(cfg.live, onLive); window.removeEventListener(cfg.reconnect, load); window.removeEventListener("silkroad_notifications_changed", onLegacy) }
  }, [cfg, load])

  const items = useMemo(() => {
    const legacy = audience === "user" && userId ? getSellerNotifications(userId).map(fromLegacy) : []
    return [...server, ...legacy].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, legacyTick, audience, userId])
  const unread = items.filter(n => n.unread).length

  const markRead = async item => {
    if (!item.unread) return
    if (item.legacy) { markAllNotificationsRead(userId); return }
    setServer(prev => prev.map(n => n.id === item.id ? { ...n, unread: false } : n))
    try { await fetch(`${API_URL}${cfg.endpoint}/${encodeURIComponent(item.id)}/read`, { method: "PUT", headers: headers() }) } catch { load() }
  }
  const markAll = async () => {
    setServer(prev => prev.map(n => ({ ...n, unread: false })))
    if (audience === "user" && userId) markAllNotificationsRead(userId)
    try { await fetch(`${API_URL}${cfg.endpoint}/read-all`, { method: "PUT", headers: headers() }) } catch { load() }
  }
  return { items, unread, loading, error, fresh, reload: load, markRead, markAll }
}

function EmptyArt() {
  return <svg className="nc-empty-art" viewBox="0 0 160 140" aria-hidden="true">
    <circle cx="80" cy="70" r="52" className="a" /><circle cx="80" cy="70" r="36" className="b" />
    <g transform="translate(56 46)" fill="none" stroke="#e4c892" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path transform="scale(2)" d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></g>
    <path className="spark s1" d="M130 28v10M125 33h10" /><path className="spark s2" d="M26 96v8M22 100h8" /><path className="spark s3" d="M138 98v6M135 101h6" />
  </svg>
}

export function NotificationBell({ sellerId, userId, audience = "user", onClick }) {
  const id = userId || sellerId
  const { items, unread, loading, error, fresh, reload, markRead, markAll } = useNotifications(audience, id)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("all")
  const [ringing, setRinging] = useState(false)
  const closeRef = useRef(null)

  useEffect(() => { if (!fresh) return undefined; const on = setTimeout(() => setRinging(true), 0); const off = setTimeout(() => setRinging(false), 1400); return () => { clearTimeout(on); clearTimeout(off) } }, [fresh])
  useEffect(() => {
    if (!open) return undefined
    const onKey = e => { if (e.key === "Escape") setOpen(false) }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    closeRef.current?.focus()
    const refresh = setTimeout(reload, 0)
    return () => { clearTimeout(refresh); document.body.style.overflow = previous; document.removeEventListener("keydown", onKey) }
  }, [open, reload])

  const shown = tab === "unread" ? items.filter(n => n.unread) : items
  const groups = []
  shown.forEach(n => { const label = dayLabel(n.createdAt); const last = groups[groups.length - 1]; if (last && last.label === label) last.rows.push(n); else groups.push({ label, rows: [n] }) })

  return <>
    <button type="button" className={`nc-bell ${ringing ? "ring" : ""} ${unread ? "has" : ""}`} onClick={() => setOpen(true)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-haspopup="dialog">
      <Icon name="bell" size={19} />
      {unread > 0 && <span className="nc-badge" key={unread}>{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && createPortal(<div className="nc-layer" role="presentation">
      <div className="nc-backdrop" onClick={() => setOpen(false)} />
      <aside className="nc-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="nc-grab" aria-hidden="true" />
        <header className="nc-head">
          <div>
            <div className="nc-eyebrow">SILK ROAD</div>
            <h2>Notifications{unread > 0 && <span className="nc-pill">{unread} new</span>}</h2>
          </div>
          <div className="nc-head-actions">
            <button type="button" className="nc-icon-btn" onClick={reload} aria-label="Refresh"><Icon name="refresh" size={17} /></button>
            <button type="button" className="nc-icon-btn" ref={closeRef} onClick={() => setOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button>
          </div>
        </header>
        <div className="nc-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>All</button>
          <button type="button" role="tab" aria-selected={tab === "unread"} className={tab === "unread" ? "on" : ""} onClick={() => setTab("unread")}>Unread{unread > 0 && <em>{unread}</em>}</button>
          <span className="nc-tab-bar" style={{ transform: `translateX(${tab === "all" ? 0 : 100}%)` }} />
        </div>
        <div className="nc-scroll">
          {loading && items.length === 0 && [0, 1, 2].map(i => <div className="nc-skel" key={i}><span /><div><b /><i /></div></div>)}
          {!loading && error && items.length === 0 && <div className="nc-empty"><p>We couldn’t load your notifications.</p><button type="button" className="nc-link" onClick={reload}>Try again</button></div>}
          {!loading && !error && shown.length === 0 && <div className="nc-empty"><EmptyArt /><h3>{tab === "unread" ? "Nothing unread" : "You’re all caught up"}</h3><p>New orders, rider updates and delivery codes show up here the moment they happen.</p></div>}
          {groups.map(group => <section key={group.label} className="nc-group">
            <h4>{group.label}</h4>
            {group.rows.map((n, index) => {
              const kind = kindOf(n.type)
              return <button type="button" key={n.id} className={`nc-item tone-${kind.tone} ${n.unread ? "unread" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} onClick={() => markRead(n)}>
                <span className="nc-tile"><Icon name={kind.icon} size={20} /></span>
                <span className="nc-copy"><strong>{n.title}</strong><span>{n.message}</span></span>
                <span className="nc-meta"><time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>{n.unread && <i aria-label="Unread" />}</span>
              </button>
            })}
          </section>)}
        </div>
        <footer className="nc-foot">
          <button type="button" className="nc-ghost" disabled={unread === 0} onClick={markAll}><Icon name="checks" size={17} />Mark all as read</button>
          {onClick && <button type="button" className="nc-solid" onClick={() => { setOpen(false); onClick() }}>My account</button>}
        </footer>
      </aside>
    </div>, document.body)}
  </>
}

export const RiderNotificationBell = () => <NotificationBell audience="rider" />
