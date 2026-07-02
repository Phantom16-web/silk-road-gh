import { useState, useEffect } from "react"
import { updateProfile, changePassword, deleteAccount, getMyOrders, getSellingOrders, getListings, deleteListing } from "./api"
import { getOrders, updateOrder, getSellerNotifications, markAllNotificationsRead } from "./OrderTracker"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

const STATUS_STYLE = {
  "Delivered":           { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "Completed":           { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "In Escrow":           { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
  "Pending Confirmation":{ bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Paid":                { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "Pending":             { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Refunded":            { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Cancelled":           { bg: "#7f1d1d22", color: "#fca5a5", border: "#7f1d1d" },
  "Active":              { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
  "Flagged":             { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
}

const statusStyle = (s) => STATUS_STYLE[s] || STATUS_STYLE["Active"]

const inp = (err) => ({
  width: "100%", background: "#161616",
  border: `1px solid ${err ? "#991b1b" : "#222"}`,
  color: "#fff", padding: "12px 16px", borderRadius: "10px",
  fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
})

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "18px", flex: 1, minWidth: "130px" }}>
      <div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: accent || "#f0ede8", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{sub}</div>}
    </div>
  )
}

// ── Active Rentals ─────────────────────────────────────────────────────────────
function ActiveRentals() {
  const [rentals, setRentals] = useState(() => {
    try { return Object.values(getOrders()).filter(o => o.type === "rent" && !o.lenderConfirmed) }
    catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const confirm = (id, isDamaged) => {
    updateOrder(id, { lenderConfirmed: true, damaged: isDamaged, expiresAt: Date.now() })
    setRentals(r => r.filter(x => x.id !== id))
  }

  if (!rentals.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "40px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>📦</div>No active rentals.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rentals.map(r => {
        const tl = (r.rentalTimerEnd || 0) - Date.now()
        const d = Math.max(0, Math.floor(tl / 86400000))
        const h = Math.max(0, Math.floor((tl % 86400000) / 3600000))
        const near = tl > 0 && tl < 86400000
        const exp = tl <= 0
        const open = expandedId === r.id
        return (
          <div key={r.id} style={{ background: "#141414", borderRadius: "14px", border: `1px solid ${near ? "#92400e" : exp ? "#7f1d1d" : "#1e1e1e"}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(open ? null : r.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{r.item?.title || "Rental Item"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{r.id}</span></div>
              </div>
              {exp ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#7f1d1d22", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "3px 10px", borderRadius: "20px" }}>⏰ Expired</span>
                : near ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#78350f22", color: "#fcd34d", border: "1px solid #92400e", padding: "3px 10px", borderRadius: "20px" }}>⚠️ {h}h left</span>
                : <span style={{ fontSize: "11px", fontWeight: "700", background: "#064e3b22", color: "#6ee7b7", border: "1px solid #065f46", padding: "3px 10px", borderRadius: "20px" }}>{d}d {h}h</span>
              }
            </div>
            {open && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{r.days} day{r.days > 1 ? "s" : ""}</span></div>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{r.lenderGets || r.rentalCost}</span></div>
                  {r.depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{r.depositAmount}</span></div>}
                  {r.renterConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Renter confirmed return</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Renter hasn't confirmed yet</div>
                  }
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>Was the item returned in good condition?</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => confirm(r.id, false)} style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>✅ No Damage</button>
                  <button onClick={() => confirm(r.id, true)} style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>⚠️ Damaged</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Active Services ────────────────────────────────────────────────────────────
function ActiveServices() {
  const [services, setServices] = useState(() => {
    try { return Object.values(getOrders()).filter(o => o.type === "service" && !o.providerConfirmed && !o.cancelled) }
    catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const confirm = (id) => {
    updateOrder(id, { providerConfirmed: true, expiresAt: Date.now() })
    setServices(s => s.filter(x => x.id !== id))
  }

  if (!services.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "40px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px" }}>🛠️</div>No active services.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {services.map(s => {
        const open = expandedId === s.id
        return (
          <div key={s.id} style={{ background: "#141414", borderRadius: "14px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(open ? null : s.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{s.service?.title || "Service"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{s.id}</span></div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#1e3a5f22", color: "#93c5fd", border: "1px solid #1d4ed8", padding: "3px 10px", borderRadius: "20px" }}>Active</span>
            </div>
            {open && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{s.providerGets}</span></div>
                  <div>📋 Type: <span style={{ color: "#888" }}>{s.service?.liveSession ? "🔴 Live Session" : s.service?.delivery === "online" ? "🌐 Online" : "📍 In-Person"}</span></div>
                  {s.buyerConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Buyer confirmed — confirm to release payment</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Waiting for buyer confirmation</div>
                  }
                </div>
                <button onClick={() => confirm(s.id)} style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                  ✅ I've Completed This Service
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Notifications Tab ──────────────────────────────────────────────────────────
function NotificationsTab({ user }) {
  const [notifications, setNotifications] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (user?._id) {
      setNotifications(getSellerNotifications(user._id))
      markAllNotificationsRead(user._id)
    }
  }, [user?._id])

  const fmt = (ts) => {
    const d = Date.now() - ts
    if (d < 60000) return "Just now"
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  if (!notifications.length) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
      <div style={{ fontSize: "36px", marginBottom: "14px" }}>🔔</div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>No notifications yet</div>
      <div style={{ fontSize: "13px" }}>New orders for your listings appear here in real time.</div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {notifications.map(n => {
        const open = expandedId === n.id
        return (
          <div key={n.id} style={{ background: n.status === "unread" ? "#161a1e" : "#141414", border: `1px solid ${n.status === "unread" ? "#c8a97e33" : "#1e1e1e"}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", cursor: "pointer", display: "flex", gap: "12px", alignItems: "flex-start" }} onClick={() => setExpandedId(open ? null : n.id)}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e1e1e", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {n.itemImage ? <img src={n.itemImage} alt={n.itemTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "18px" }}>🛒</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  {n.status === "unread" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a97e", flexShrink: 0 }} />}
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🛒 {n.itemTitle}</div>
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "3px" }}>
                  <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{n.amount?.toLocaleString()}</span> · {n.buyerName}
                </div>
                <div style={{ fontSize: "11px", color: "#444" }}>{fmt(n.createdAt)} · {open ? "▲ Hide" : "▼ Details"}</div>
              </div>
            </div>
            {open && (
              <div style={{ borderTop: "1px solid #1e1e1e", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "9px" }}>
                  <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>ORDER DETAILS</div>
                  {[
                    ["Order ID", <span style={{ color: "#c8a97e", fontFamily: "monospace", fontWeight: "700" }}>{n.orderId}</span>],
                    ["Amount",   <span style={{ color: "#6ee7b7", fontWeight: "700" }}>₵{n.amount?.toLocaleString()}</span>],
                    ["Payment",  <span style={{ color: "#888" }}>{n.paymentMethod === "paystack" ? "⚡ Paystack" : "📱 Manual MoMo"}</span>],
                    n.paymentRef && ["Ref", <span style={{ color: "#444", fontSize: "11px", fontFamily: "monospace" }}>{n.paymentRef}</span>],
                    ["Delivery", <span style={{ color: "#888" }}>{n.deliveryMethod === "rider" ? "🛵 Rider" : "📍 Pickup"}</span>],
                    n.location  && ["Location", <span style={{ color: "#888", textAlign: "right", maxWidth: "180px" }}>{n.location}</span>],
                    n.landmark  && ["Landmark", <span style={{ color: "#888" }}>{n.landmark}</span>],
                    n.promoCode && ["Promo",    <span style={{ color: "#6ee7b7" }}>🎟️ {n.promoCode} (-₵{n.discount})</span>],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: "#555", flexShrink: 0 }}>{label}</span>{val}
                    </div>
                  ))}
                </div>
                {n.buyerContact && (
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".08em", marginBottom: "6px" }}>🔓 BUYER CONTACT</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#6ee7b7" }}>{n.buyerContact}</div>
                    <div style={{ fontSize: "11px", color: "#065f46", marginTop: "4px" }}>Reach out to coordinate delivery or pickup</div>
                  </div>
                )}
                <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                  ⚠️ Payment held in escrow. Released once buyer confirms delivery.
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function Account({ user, onSignOut, onClose, onUserUpdate }) {
  const [tab, setTab] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [editForm, setEditForm] = useState({ name: user.name, university: user.university || "", phone: user.phone || "" })
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const [orders, setOrders] = useState([])
  const [sellingOrders, setSellingOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (user?._id) setNotifCount(getSellerNotifications(user._id).filter(n => n.status === "unread").length)
  }, [user?._id, tab])

  useEffect(() => {
    if (tab === "orders" || tab === "overview") {
      setLoadingOrders(true)
      Promise.all([getMyOrders(), getSellingOrders()])
        .then(([my, sell]) => { setOrders(Array.isArray(my) ? my : []); setSellingOrders(Array.isArray(sell) ? sell : []) })
        .catch(() => {}).finally(() => setLoadingOrders(false))
    }
  }, [tab])

  useEffect(() => {
    if (tab === "listings" || tab === "overview") {
      setLoadingListings(true)
      getListings().then(d => setListings(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingListings(false))
    }
  }, [tab])

  const handleSaveProfile = async () => {
    const e = {}
    if (!editForm.name.trim()) e.name = "Name cannot be empty."
    if (!editForm.phone.trim()) e.phone = "Phone cannot be empty."
    if (Object.keys(e).length) { setEditErrors(e); return }
    setSaving(true); setSaveError("")
    try {
      const data = await updateProfile({ name: editForm.name, university: editForm.university, phone: editForm.phone })
      if (data.message) { setSaveError(data.message); setSaving(false); return }
      onUserUpdate({ ...user, name: data.name, university: data.university, phone: data.phone })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setSaveError("Something went wrong.") }
    setSaving(false)
  }

  const handleSavePassword = async () => {
    setPasswordError("")
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return }
    setPasswordSaving(true)
    try {
      const data = await changePassword(newPassword)
      if (data.message === "Password updated successfully.") {
        setPasswordSaved(true); setNewPassword(""); setConfirmPassword("")
        setTimeout(() => setPasswordSaved(false), 2500)
      } else { setPasswordError(data.message || "Something went wrong.") }
    } catch { setPasswordError("Something went wrong.") }
    setPasswordSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleteLoading(true); setDeleteError("")
    try {
      const data = await deleteAccount()
      if (data.message === "Account deleted successfully.") { localStorage.removeItem("silkroad_token"); onSignOut() }
      else { setDeleteError(data.message || "Something went wrong.") }
    } catch { setDeleteError("Something went wrong.") }
    setDeleteLoading(false)
  }

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Remove this listing?")) return
    try { await deleteListing(id); setListings(l => l.filter(x => x._id !== id)) }
    catch { alert("Could not remove listing.") }
  }

  const totalRevenue = sellingOrders.filter(o => o.status === "Completed" || o.status === "Paid").reduce((s, o) => s + (o.sellerAmount || 0), 0)
  const pendingOrders = sellingOrders.filter(o => o.status === "In Escrow" || o.status === "Pending").length
  const activeListingsCount = listings.filter(l => (l.status || "Active") === "Active").length

  const NAV = [
    { id: "overview",      label: "Overview",       icon: "📊" },
    { id: "notifications", label: "Notifications",  icon: "🔔", badge: notifCount },
    { id: "orders",        label: "Orders & Sales",  icon: "📦" },
    { id: "listings",      label: "My Listings",    icon: "🏷️" },
    { id: "rentals",       label: "Active Rentals", icon: "🔄" },
    { id: "services",      label: "Active Services",icon: "🛠️" },
    { id: "profile",       label: "Profile",        icon: "👤" },
    { id: "settings",      label: "Settings",       icon: "⚙️" },
  ]

  const goTo = (id) => { setTab(id); setSidebarOpen(false) }

  const currentTab = NAV.find(n => n.id === tab)

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 500, display: "flex", overflow: "hidden" }}>

      {/* ── Sidebar overlay (mobile tap-outside to close) ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 10, display: "block" }}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: "240px",
        background: "#0d0d0d",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>

        {/* Sidebar header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background: "transparent", border: "1px solid #222", color: "#888", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, minHeight: "auto" }}>
            ✕
          </button>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#c8a97e" }}>Silk Road GH</div>
            <div style={{ fontSize: "11px", color: "#444" }}>My Account</div>
          </div>
        </div>

        {/* User info */}
        <div style={{ padding: "16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "800", color: "#000", flexShrink: 0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: "11px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.university}</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => goTo(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                background: tab === item.id ? "#c8a97e14" : "transparent",
                border: tab === item.id ? "1px solid #c8a97e33" : "1px solid transparent",
                color: tab === item.id ? "#c8a97e" : "#666",
                padding: "11px 12px", borderRadius: "10px", cursor: "pointer",
                fontSize: "13px", fontWeight: tab === item.id ? "700" : "500",
                fontFamily: "inherit", marginBottom: "3px", textAlign: "left",
              }}>
              <span style={{ fontSize: "15px" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "17px", height: "17px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: "14px", borderTop: "1px solid #1a1a1a" }}>
          <button onClick={onSignOut}
            style={{ width: "100%", background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "11px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar — always visible */}
        <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "12px 18px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>

          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "1px solid #222", color: "#c8a97e", width: "38px", height: "38px", borderRadius: "9px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", flexShrink: 0, minHeight: "auto" }}>
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "16px", height: "2px", background: "#c8a97e", borderRadius: "2px" }} />
          </button>

          {/* Current tab label */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#f0ede8" }}>
              {currentTab?.icon} {currentTab?.label}
            </div>
            <div style={{ fontSize: "11px", color: "#555" }}>{user.name} · {user.university}</div>
          </div>

          {/* Back to marketplace */}
          <button onClick={onClose}
            style={{ background: "#1a1a1a", border: "1px solid #222", color: "#888", padding: "8px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            ← Back
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", padding: "28px 20px 80px" }}>

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <>
                <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>
                  Welcome back, {user.name.split(" ")[0]} 👋
                </h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Here's what's happening with your account.</p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
                  <StatCard icon="💰" label="Total Earned"     value={`₵${totalRevenue.toLocaleString()}`} sub="Completed sales" accent="#6ee7b7" />
                  <StatCard icon="🔔" label="Notifications"    value={notifCount} sub="Unread alerts" accent={notifCount > 0 ? "#c8a97e" : undefined} />
                  <StatCard icon="📦" label="Pending Orders"   value={pendingOrders} sub="Awaiting action" />
                  <StatCard icon="🏷️" label="Active Listings"  value={activeListingsCount} sub={`${listings.length} total`} />
                </div>

                {notifCount > 0 && (
                  <div onClick={() => setTab("notifications")}
                    style={{ background: "#161a1e", border: "1px solid #c8a97e44", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "24px" }}>🔔</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>{notifCount} new order notification{notifCount > 1 ? "s" : ""}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>Tap to view buyer details and contact info</div>
                      </div>
                    </div>
                    <span style={{ color: "#c8a97e", fontSize: "18px" }}>→</span>
                  </div>
                )}

                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "14px" }}>Recent Sales</h3>
                {loadingOrders ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "32px", fontSize: "13px" }}>⏳ Loading...</div>
                ) : !sellingOrders.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "32px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
                    No sales yet. Once someone buys from you, it'll show here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sellingOrders.slice(0, 5).map(order => (
                      <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #1e1e1e" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>🏷️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Sale"}</div>
                          <div style={{ fontSize: "12px", color: "#555" }}>{order.buyer?.name || "Buyer"} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span></div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === "notifications" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔔 Notifications</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Every order placed for your listings — in real time.</p>
                <NotificationsTab user={user} />
              </>
            )}

            {/* ── ORDERS ── */}
            {tab === "orders" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>📦 Orders & Sales</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Your purchases and sales.</p>

                {loadingOrders ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading orders...</div>
                ) : !orders.length && !sellingOrders.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>📦</div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#666" }}>No orders yet</div>
                  </div>
                ) : (
                  <>
                    {sellingOrders.length > 0 && (
                      <div style={{ marginBottom: "32px" }}>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "14px" }}>My Sales ({sellingOrders.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {sellingOrders.map(order => (
                            <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "18px", border: "1px solid #1e1e1e" }}>
                              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", flexShrink: 0 }}>🏷️</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Sale"}</div>
                                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                                    Buyer: <span style={{ color: "#999" }}>{order.buyer?.name || "Unknown"}</span> · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span>
                                  </div>
                                  {order.contactInfo && (
                                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px" }}>
                                      <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".06em", marginBottom: "3px" }}>🔓 BUYER CONTACT</div>
                                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#6ee7b7" }}>{order.contactInfo}</div>
                                    </div>
                                  )}
                                  <div style={{ fontSize: "12px", color: "#555", display: "flex", flexDirection: "column", gap: "3px" }}>
                                    {order.deliveryMethod && <div>🛵 {order.deliveryMethod === "rider" ? "Rider Delivery" : "Campus Pickup"}</div>}
                                    {order.location && <div>📍 {order.location}</div>}
                                    {order.landmark && <div>🗺️ {order.landmark}</div>}
                                    {order.promoCode && <div style={{ color: "#6ee7b7" }}>🎟️ {order.promoCode} (-₵{order.discount})</div>}
                                    {order.paystackRef && <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#444" }}>Ref: {order.paystackRef}</div>}
                                  </div>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {orders.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "14px" }}>My Purchases ({orders.length})</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {orders.map(order => (
                            <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📦</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.listing?.title || "Order"}</div>
                                <div style={{ fontSize: "12px", color: "#555" }}>
                                  {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.amount}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>{order.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── LISTINGS ── */}
            {tab === "listings" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🏷️ My Listings</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Everything you currently have listed.</p>
                {loadingListings ? (
                  <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading...</div>
                ) : !listings.length ? (
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "56px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏷️</div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#666" }}>No listings yet</div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>Click + Sell from the marketplace to create your first listing</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {listings.map(listing => (
                      <div key={listing._id} style={{ background: "#141414", borderRadius: "14px", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                        {listing.image
                          ? <img src={listing.image} alt={listing.title} style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: "50px", height: "50px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", flexShrink: 0 }}>📦</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</div>
                          <div style={{ fontSize: "12px", color: "#555" }}>{listing.category} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>{listing.type === "rent" ? `₵${listing.dailyRate}/day` : `₵${listing.price}`}</span></div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(listing.status || "Active").bg, color: statusStyle(listing.status || "Active").color, border: `1px solid ${statusStyle(listing.status || "Active").border}`, padding: "3px 10px", borderRadius: "20px" }}>{listing.status || "Active"}</span>
                          <button onClick={() => handleDeleteListing(listing._id)} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", minHeight: "auto" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── RENTALS ── */}
            {tab === "rentals" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔄 Active Rentals</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Items you've lent out that are currently active.</p>
                <ActiveRentals />
              </>
            )}

            {/* ── SERVICES ── */}
            {tab === "services" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🛠️ Active Services</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Services you're currently providing.</p>
                <ActiveServices />
              </>
            )}

            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>👤 Edit Profile</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Keep your information up to date.</p>
                <div style={{ maxWidth: "460px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>FULL NAME</div>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inp(editErrors.name)} />
                    {editErrors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.name}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>EMAIL</div>
                    <input value={user.email} disabled style={{ ...inp(false), background: "#0d0d0d", color: "#333", cursor: "not-allowed", border: "1px solid #1a1a1a" }} />
                    <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Email cannot be changed.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>UNIVERSITY</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                      {UNIS.map(u => (
                        <button key={u} onClick={() => setEditForm(f => ({ ...f, university: u }))}
                          style={{ padding: "10px 4px", borderRadius: "9px", border: `1.5px solid ${editForm.university === u ? "#c8a97e" : "#1e1e1e"}`, background: editForm.university === u ? "#c8a97e18" : "#161616", color: editForm.university === u ? "#c8a97e" : "#666", cursor: "pointer", fontWeight: "600", fontSize: "11px", textAlign: "center", fontFamily: "inherit" }}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>PHONE NUMBER</div>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inp(editErrors.phone)} />
                    {editErrors.phone && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.phone}</div>}
                  </div>
                  {saveError && <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>🚫 {saveError}</div>}
                  <button className="btn-gold" onClick={handleSaveProfile} disabled={saving}
                    style={{ padding: "14px", borderRadius: "12px", fontSize: "15px", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "⏳ Saving..." : saved ? "✅ Profile Saved!" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* ── SETTINGS ── */}
            {tab === "settings" && (
              <>
                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>⚙️ Settings</h1>
                <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>Manage your password and account.</p>
                <div style={{ maxWidth: "460px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ background: "#141414", borderRadius: "14px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", border: "1px solid #1e1e1e" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>🔒 Change Password</div>
                    <input placeholder="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inp(false)} />
                    <input placeholder="Confirm new password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inp(false)} />
                    {passwordError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {passwordError}</div>}
                    <button onClick={handleSavePassword} disabled={passwordSaving}
                      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#c8a97e", padding: "12px", borderRadius: "10px", cursor: passwordSaving ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", opacity: passwordSaving ? 0.7 : 1 }}>
                      {passwordSaving ? "⏳ Saving..." : passwordSaved ? "✅ Password Updated!" : "Update Password"}
                    </button>
                  </div>

                  <div style={{ background: "#7f1d1d10", borderRadius: "14px", padding: "22px", border: "1px solid #7f1d1d44", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#fca5a5" }}>⚠️ Danger Zone</div>
                    <p style={{ fontSize: "12px", color: "#888", margin: 0, lineHeight: "1.6" }}>Deleting your account is permanent and removes all your listings, orders, and data.</p>
                    {deleteError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {deleteError}</div>}
                    <button onClick={handleDeleteAccount} disabled={deleteLoading}
                      style={{ background: deleteConfirm ? "#7f1d1d" : "#7f1d1d18", border: "1px solid #7f1d1d", color: deleteConfirm ? "#fff" : "#fca5a5", padding: "12px", borderRadius: "10px", cursor: deleteLoading ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit", opacity: deleteLoading ? 0.7 : 1 }}>
                      {deleteLoading ? "⏳ Deleting..." : deleteConfirm ? "⚠️ Click Again to Confirm" : "Delete Account"}
                    </button>
                  </div>

                  <button onClick={onSignOut}
                    style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "13px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px", fontFamily: "inherit" }}>
                    Sign Out
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
