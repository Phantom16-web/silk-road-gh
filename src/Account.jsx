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

const statusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE["Active"]

const inputStyle = (hasError) => ({
  width: "100%", background: "#161616",
  border: `1px solid ${hasError ? "#991b1b" : "#222"}`,
  color: "#fff", padding: "12px 16px", borderRadius: "10px",
  fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
})

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "20px", flex: 1, minWidth: "160px" }}>
      <div style={{ fontSize: "22px", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontSize: "24px", fontWeight: "800", color: accent || "#f0ede8", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: "#444", marginTop: "3px" }}>{sub}</div>}
    </div>
  )
}

// ── Active Rentals — Lender View ──────────────────────────────────────────────
function ActiveRentals() {
  const [rentals, setRentals] = useState(() => {
    try {
      const all = getOrders()
      return Object.values(all).filter(o => o.type === "rent" && !o.lenderConfirmed)
    } catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const handleLenderConfirm = (orderId, isDamaged) => {
    updateOrder(orderId, { lenderConfirmed: true, damaged: isDamaged, expiresAt: Date.now() })
    setRentals(r => r.filter(x => x.id !== orderId))
  }

  if (rentals.length === 0) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "32px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "30px", marginBottom: "10px" }}>📦</div>
      No active rentals right now.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rentals.map(rental => {
        const expanded = expandedId === rental.id
        const timeLeft = (rental.rentalTimerEnd || 0) - Date.now()
        const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
        const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
        const isNearEnd = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000
        const isExpired = timeLeft <= 0

        return (
          <div key={rental.id} style={{ background: "#141414", borderRadius: "14px", border: `1px solid ${isNearEnd ? "#92400e" : isExpired ? "#7f1d1d" : "#1e1e1e"}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : rental.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{rental.item?.title || "Rental Item"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{rental.id}</span></div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                {isExpired
                  ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#7f1d1d22", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "3px 10px", borderRadius: "20px" }}>⏰ Expired</span>
                  : isNearEnd
                    ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#78350f22", color: "#fcd34d", border: "1px solid #92400e", padding: "3px 10px", borderRadius: "20px" }}>⚠️ {hoursLeft}h left</span>
                    : <span style={{ fontSize: "11px", fontWeight: "700", background: "#064e3b22", color: "#6ee7b7", border: "1px solid #065f46", padding: "3px 10px", borderRadius: "20px" }}>{daysLeft}d {hoursLeft}h left</span>
                }
                <span style={{ fontSize: "11px", color: "#444" }}>{expanded ? "▲ Hide" : "▼ View"}</span>
              </div>
            </div>
            {expanded && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{rental.days} day{rental.days > 1 ? "s" : ""}</span></div>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{rental.lenderGets || rental.rentalCost}</span></div>
                  {rental.depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{rental.depositAmount}</span></div>}
                  {rental.renterConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Renter confirmed return — please confirm on your end</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Renter has not yet confirmed return</div>
                  }
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>Was the item returned in good condition?</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleLenderConfirm(rental.id, false)}
                    style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    ✅ No Damage
                  </button>
                  <button onClick={() => handleLenderConfirm(rental.id, true)}
                    style={{ flex: 1, background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    ⚠️ Damaged
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Active Services — Provider View ───────────────────────────────────────────
function ActiveServices() {
  const [services, setServices] = useState(() => {
    try {
      const all = getOrders()
      return Object.values(all).filter(o => o.type === "service" && !o.providerConfirmed && !o.cancelled)
    } catch { return [] }
  })
  const [expandedId, setExpandedId] = useState(null)

  const handleProviderConfirm = (orderId) => {
    updateOrder(orderId, { providerConfirmed: true, expiresAt: Date.now() })
    setServices(s => s.filter(x => x.id !== orderId))
  }

  if (services.length === 0) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "32px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
      <div style={{ fontSize: "30px", marginBottom: "10px" }}>🛠️</div>
      No active services right now.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {services.map(service => {
        const expanded = expandedId === service.id
        return (
          <div key={service.id} style={{ background: "#141414", borderRadius: "14px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : service.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{service.service?.title || "Service"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{service.id}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", background: "#1e3a5f22", color: "#93c5fd", border: "1px solid #1d4ed8", padding: "3px 10px", borderRadius: "20px" }}>Active</span>
                <span style={{ fontSize: "11px", color: "#444" }}>{expanded ? "▲ Hide" : "▼ View"}</span>
              </div>
            </div>
            {expanded && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "14px", background: "#0d0d0d", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{service.providerGets}</span></div>
                  <div>📋 Type: <span style={{ color: "#888" }}>{service.service?.liveSession ? "🔴 Live Session" : service.service?.delivery === "online" ? "🌐 Online" : "📍 In-Person"}</span></div>
                  {service.buyerConfirmed
                    ? <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Buyer confirmed — please confirm to release payment</div>
                    : <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "12px" }}>⏳ Waiting for buyer to confirm completion</div>
                  }
                </div>
                <button onClick={() => handleProviderConfirm(service.id)}
                  style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
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

// ── Notifications Tab Content ─────────────────────────────────────────────────
function NotificationsTab({ user }) {
  const [notifications, setNotifications] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (user?._id) {
      setNotifications(getSellerNotifications(user._id))
      markAllNotificationsRead(user._id)
    }
  }, [user?._id])

  const formatTime = (ts) => {
    const diff = Date.now() - ts
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  if (notifications.length === 0) return (
    <div style={{ background: "#141414", borderRadius: "14px", padding: "48px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔔</div>
      <div style={{ fontSize: "15px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>No notifications yet</div>
      <div style={{ fontSize: "13px" }}>You'll see new orders for your listings here, in real time.</div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {notifications.map(notif => {
        const expanded = expandedId === notif.id
        return (
          <div key={notif.id} style={{ background: notif.status === "unread" ? "#161a1e" : "#141414", border: `1px solid ${notif.status === "unread" ? "#c8a97e33" : "#1e1e1e"}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", cursor: "pointer", display: "flex", gap: "14px", alignItems: "flex-start" }}
              onClick={() => setExpandedId(expanded ? null : notif.id)}>
              <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#1e1e1e", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {notif.itemImage ? <img src={notif.itemImage} alt={notif.itemTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "20px" }}>🛒</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  {notif.status === "unread" && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8a97e", flexShrink: 0 }} />}
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>🛒 New order: {notif.itemTitle}</div>
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "3px" }}>
                  <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{notif.amount?.toLocaleString()}</span> from {notif.buyerName}
                </div>
                <div style={{ fontSize: "11px", color: "#444" }}>{formatTime(notif.createdAt)} · {expanded ? "▲ Hide" : "▼ Details"}</div>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: "1px solid #1e1e1e", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ background: "#0d0d0d", borderRadius: "10px", padding: "16px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "9px" }}>
                  <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>ORDER DETAILS</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Order ID</span><span style={{ color: "#c8a97e", fontFamily: "monospace", fontWeight: "700" }}>{notif.orderId}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Amount</span><span style={{ color: "#6ee7b7", fontWeight: "700" }}>₵{notif.amount?.toLocaleString()}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Payment</span><span style={{ color: "#888" }}>{notif.paymentMethod === "paystack" ? "⚡ Paystack" : "📱 Manual MoMo"}</span></div>
                  {notif.paymentRef && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Ref</span><span style={{ color: "#444", fontSize: "11px", fontFamily: "monospace" }}>{notif.paymentRef}</span></div>}
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Delivery</span><span style={{ color: "#888" }}>{notif.deliveryMethod === "rider" ? "🛵 Rider Delivery" : "📍 Campus Pickup"}</span></div>
                  {notif.location && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Location</span><span style={{ color: "#888", maxWidth: "200px", textAlign: "right" }}>{notif.location}</span></div>}
                  {notif.landmark && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Landmark</span><span style={{ color: "#888", maxWidth: "200px", textAlign: "right" }}>{notif.landmark}</span></div>}
                  {notif.promoCode && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#555" }}>Promo</span><span style={{ color: "#6ee7b7" }}>🎟️ {notif.promoCode} (-₵{notif.discount})</span></div>}
                </div>
                {notif.buyerContact && (
                  <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "10px", color: "#6ee7b7", fontWeight: "700", letterSpacing: ".08em" }}>🔓 BUYER CONTACT</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#6ee7b7" }}>{notif.buyerContact}</div>
                    <div style={{ fontSize: "11px", color: "#065f46" }}>Reach out to coordinate delivery or pickup</div>
                  </div>
                )}
                <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                  ⚠️ Payment held in escrow. Released once the buyer confirms delivery.
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Account Component (full page) ────────────────────────────────────────
export default function Account({ user, onSignOut, onClose, onUserUpdate }) {
  const [tab, setTab] = useState("overview")
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
        .then(([my, selling]) => { setOrders(Array.isArray(my) ? my : []); setSellingOrders(Array.isArray(selling) ? selling : []) })
        .catch(() => {})
        .finally(() => setLoadingOrders(false))
    }
  }, [tab])

  useEffect(() => {
    if (tab === "listings" || tab === "overview") {
      setLoadingListings(true)
      getListings()
        .then(data => setListings(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingListings(false))
    }
  }, [tab])

  const handleSaveProfile = async () => {
    const e = {}
    if (!editForm.name.trim()) e.name = "Name cannot be empty."
    if (!editForm.phone.trim()) e.phone = "Phone cannot be empty."
    if (Object.keys(e).length > 0) { setEditErrors(e); return }
    setSaving(true); setSaveError("")
    try {
      const data = await updateProfile({ name: editForm.name, university: editForm.university, phone: editForm.phone })
      if (data.message) { setSaveError(data.message); setSaving(false); return }
      onUserUpdate({ ...user, name: data.name, university: data.university, phone: data.phone })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setSaveError("Something went wrong. Please try again.") }
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
    catch { alert("Could not remove listing. Try again.") }
  }

  const totalRevenue = sellingOrders.filter(o => o.status === "Completed" || o.status === "Paid").reduce((s, o) => s + (o.sellerAmount || 0), 0)
  const pendingOrders = sellingOrders.filter(o => o.status === "In Escrow" || o.status === "Pending").length
  const activeListingsCount = listings.filter(l => (l.status || "Active") === "Active").length

  const NAV_ITEMS = [
    { id: "overview",      label: "Overview",           icon: "📊" },
    { id: "notifications", label: "Notifications",      icon: "🔔", badge: notifCount },
    { id: "orders",        label: "Orders & Sales",     icon: "📦" },
    { id: "listings",      label: "My Listings",        icon: "🏷️" },
    { id: "rentals",       label: "Active Rentals",     icon: "🔄" },
    { id: "services",      label: "Active Services",    icon: "🛠️" },
    { id: "profile",       label: "Profile",            icon: "👤" },
    { id: "settings",      label: "Settings",           icon: "⚙️" },
  ]

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 500, display: "flex", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: "260px", flexShrink: 0, background: "#0d0d0d", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100vh" }}>

        <div style={{ padding: "20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={onClose}
            style={{ background: "transparent", border: "1px solid #222", color: "#888", width: "34px", height: "34px", borderRadius: "9px", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, minHeight: "auto" }}>
            ←
          </button>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#c8a97e" }}>Silk Road GH</div>
            <div style={{ fontSize: "11px", color: "#444" }}>My Account</div>
          </div>
        </div>

        <div style={{ padding: "20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", color: "#000", flexShrink: 0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: "11px", color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.university}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "12px",
                background: tab === item.id ? "#c8a97e14" : "transparent",
                border: tab === item.id ? "1px solid #c8a97e33" : "1px solid transparent",
                color: tab === item.id ? "#c8a97e" : "#888",
                padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
                fontSize: "13px", fontWeight: tab === item.id ? "700" : "500",
                fontFamily: "inherit", marginBottom: "4px", textAlign: "left",
              }}>
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: "#c8a97e", color: "#000", fontSize: "10px", fontWeight: "800", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid #1a1a1a" }}>
          <button onClick={onSignOut}
            style={{ width: "100%", background: "#7f1d1d18", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "11px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: "auto", height: "100vh" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 32px 80px" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>Welcome back, {user.name.split(" ")[0]} 👋</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "32px" }}>Here's what's happening with your account.</p>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "36px" }}>
                <StatCard icon="💰" label="Total Earned" value={`₵${totalRevenue.toLocaleString()}`} sub="From completed sales" accent="#6ee7b7" />
                <StatCard icon="🔔" label="New Notifications" value={notifCount} sub="Unread order alerts" accent={notifCount > 0 ? "#c8a97e" : undefined} />
                <StatCard icon="📦" label="Pending Orders" value={pendingOrders} sub="Awaiting your action" />
                <StatCard icon="🏷️" label="Active Listings" value={activeListingsCount} sub={`${listings.length} total`} />
              </div>

              {notifCount > 0 && (
                <div onClick={() => setTab("notifications")}
                  style={{ background: "#161a1e", border: "1px solid #c8a97e44", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ fontSize: "24px" }}>🔔</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#c8a97e" }}>You have {notifCount} new order notification{notifCount > 1 ? "s" : ""}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Tap to view buyer details and contact info</div>
                    </div>
                  </div>
                  <span style={{ color: "#c8a97e", fontSize: "18px" }}>→</span>
                </div>
              )}

              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "14px" }}>Recent Sales</h3>
              {loadingOrders ? (
                <div style={{ textAlign: "center", color: "#444", padding: "32px", fontSize: "13px" }}>⏳ Loading...</div>
              ) : sellingOrders.length === 0 ? (
                <div style={{ background: "#141414", borderRadius: "14px", padding: "32px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: "13px" }}>
                  No sales yet. Once someone buys from you, it'll show up here.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sellingOrders.slice(0, 4).map(order => (
                    <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid #1e1e1e" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🏷️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8" }}>{order.listing?.title || "Sale"}</div>
                        <div style={{ fontSize: "12px", color: "#555" }}>{order.buyer?.name || "Buyer"} · ₵{order.sellerAmount}</div>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px" }}>{order.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === "notifications" && (
            <>
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔔 Notifications</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Every order placed for your listings shows up here in real time.</p>
              <NotificationsTab user={user} />
            </>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <>
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>📦 Orders & Sales</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Your purchases and sales, all in one place.</p>

              {loadingOrders ? (
                <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading orders...</div>
              ) : orders.length === 0 && sellingOrders.length === 0 ? (
                <div style={{ background: "#141414", borderRadius: "14px", padding: "48px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
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
                          <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "18px", display: "flex", gap: "14px", alignItems: "flex-start", border: "1px solid #1e1e1e" }}>
                            <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🏷️</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "4px" }}>{order.listing?.title || "Sale"}</div>
                              <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>Buyer: <span style={{ color: "#999" }}>{order.buyer?.name || "Unknown"}</span> · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span></div>
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
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px" }}>{order.status}</span>
                              <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace" }}>{order._id?.slice(-8)}</div>
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
                          <div key={order._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📦</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8" }}>{order.listing?.title || "Order"}</div>
                              <div style={{ fontSize: "12px", color: "#555" }}>{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.amount}</span></div>
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: "700", background: statusStyle(order.status).bg, color: statusStyle(order.status).color, border: `1px solid ${statusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px" }}>{order.status}</span>
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
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🏷️ My Listings</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Everything you currently have for sale, rent, or as a service.</p>

              {loadingListings ? (
                <div style={{ textAlign: "center", color: "#444", padding: "60px", fontSize: "13px" }}>⏳ Loading listings...</div>
              ) : listings.length === 0 ? (
                <div style={{ background: "#141414", borderRadius: "14px", padding: "48px 24px", border: "1px solid #1e1e1e", textAlign: "center", color: "#444" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏷️</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#666" }}>No listings yet</div>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>Click + Sell from the marketplace to create your first listing</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {listings.map(listing => (
                    <div key={listing._id} style={{ background: "#141414", borderRadius: "14px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                      {listing.image
                        ? <img src={listing.image} alt={listing.title} style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>📦</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "3px" }}>{listing.title}</div>
                        <div style={{ fontSize: "12px", color: "#555" }}>{listing.category} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>{listing.type === "rent" ? `₵${listing.dailyRate}/day` : `₵${listing.price}`}</span></div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
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
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🔄 Active Rentals</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Items you've lent out that are currently active.</p>
              <ActiveRentals />
            </>
          )}

          {/* ── SERVICES ── */}
          {tab === "services" && (
            <>
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>🛠️ Active Services</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Services you're currently providing.</p>
              <ActiveServices />
            </>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <>
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>👤 Edit Profile</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Keep your information up to date.</p>

              <div style={{ maxWidth: "480px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>FULL NAME</div>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle(editErrors.name)} />
                  {editErrors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.name}</div>}
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#444", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>EMAIL</div>
                  <input value={user.email} disabled style={{ ...inputStyle(false), background: "#0d0d0d", color: "#333", cursor: "not-allowed", border: "1px solid #1a1a1a" }} />
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
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(editErrors.phone)} />
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
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>⚙️ Account Settings</h1>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px" }}>Manage your password and account.</p>

              <div style={{ maxWidth: "480px", display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ background: "#141414", borderRadius: "14px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", border: "1px solid #1e1e1e" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0ede8" }}>🔒 Change Password</div>
                  <input placeholder="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle(false)} />
                  <input placeholder="Confirm new password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle(false)} />
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
                    {deleteLoading ? "⏳ Deleting..." : deleteConfirm ? "⚠️ Click Again to Confirm Delete" : "Delete Account"}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
