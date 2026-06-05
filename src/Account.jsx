import { useState, useEffect } from "react"
import { updateProfile, changePassword, deleteAccount, getMyOrders, getSellingOrders, getListings, deleteListing } from "./api"
import { getOrders, updateOrder } from "./OrderTracker"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

const STATUS_STYLE = {
  "Delivered":   { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "Completed":   { bg: "#064e3b22", color: "#6ee7b7", border: "#065f46" },
  "In Escrow":   { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
  "Pending":     { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Refunded":    { bg: "#78350f22", color: "#fcd34d", border: "#92400e" },
  "Cancelled":   { bg: "#7f1d1d22", color: "#fca5a5", border: "#7f1d1d" },
  "Active":      { bg: "#1e3a5f22", color: "#93c5fd", border: "#1d4ed8" },
}

// ── Active Rentals — Lender View ─────────────────────────────────────────────
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
    <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", border: "1px solid #1e1e1e", textAlign: "center", color: "#555", fontSize: "13px" }}>
      No active rentals right now.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {rentals.map(rental => {
        const expanded = expandedId === rental.id
        const timeLeft = (rental.rentalTimerEnd || 0) - Date.now()
        const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
        const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
        const isNearEnd = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000
        const isExpired = timeLeft <= 0

        return (
          <div key={rental.id} style={{ background: "#1a1a1a", borderRadius: "12px", border: `1px solid ${isNearEnd ? "#92400e" : isExpired ? "#7f1d1d" : "#1e1e1e"}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : rental.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{rental.item?.title || "Rental Item"}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{rental.id}</span></div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                {isExpired
                  ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#7f1d1d22", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "3px 10px", borderRadius: "20px" }}>⏰ Expired</span>
                  : isNearEnd
                    ? <span style={{ fontSize: "11px", fontWeight: "700", background: "#78350f22", color: "#fcd34d", border: "1px solid #92400e", padding: "3px 10px", borderRadius: "20px" }}>⚠️ {hoursLeft}h left</span>
                    : <span style={{ fontSize: "11px", fontWeight: "700", background: "#064e3b22", color: "#6ee7b7", border: "1px solid #065f46", padding: "3px 10px", borderRadius: "20px" }}>{daysLeft}d {hoursLeft}h left</span>
                }
                <span style={{ fontSize: "11px", color: "#555" }}>{expanded ? "▲ Hide" : "▼ View"}</span>
              </div>
            </div>
            {expanded && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "12px", background: "#111", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>📅 Duration: <span style={{ color: "#c8a97e", fontWeight: "700" }}>{rental.days} day{rental.days > 1 ? "s" : ""}</span></div>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{rental.lenderGets || rental.rentalCost}</span></div>
                  {rental.depositAmount > 0 && <div>🔒 Deposit: <span style={{ color: "#fcd34d" }}>₵{rental.depositAmount}</span></div>}
                  {rental.renterConfirmed
                    ? <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Renter confirmed return — please confirm on your end</div>
                    : <div style={{ background: "#1e1e2e", border: "1px solid #2a2a40", borderRadius: "8px", padding: "8px 12px", color: "#666", fontSize: "12px" }}>⏳ Renter has not yet confirmed return</div>
                  }
                </div>
                {(isNearEnd || isExpired) && (
                  <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fcd34d" }}>
                    {isExpired ? "⏰ Rental period ended. Please confirm whether the item was returned." : "⚠️ Less than 24 hours remaining."}
                  </div>
                )}
                <div style={{ fontSize: "13px", color: "#888" }}>Was the item returned to you in good condition?</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleLenderConfirm(rental.id, false)}
                    style={{ flex: 1, background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    ✅ No Damage
                  </button>
                  <button onClick={() => handleLenderConfirm(rental.id, true)}
                    style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                    ⚠️ Damaged
                  </button>
                </div>
                {rental.depositAmount > 0 && (
                  <div style={{ fontSize: "12px", color: "#555", textAlign: "center" }}>
                    No damage → ₵{rental.depositAmount} refunded to renter. Damaged → deposit kept by you.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Active Services — Provider View ──────────────────────────────────────────
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
    <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", border: "1px solid #1e1e1e", textAlign: "center", color: "#555", fontSize: "13px" }}>
      No active services right now.
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {services.map(service => {
        const expanded = expandedId === service.id
        return (
          <div key={service.id} style={{ background: "#1a1a1a", borderRadius: "12px", border: "1px solid #1e1e1e", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : service.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{service.service?.title || "Service"}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{service.id}</span></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", background: "#1e3a5f22", color: "#93c5fd", border: "1px solid #1d4ed8", padding: "3px 10px", borderRadius: "20px" }}>Active</span>
                <span style={{ fontSize: "11px", color: "#555" }}>{expanded ? "▲ Hide" : "▼ View"}</span>
              </div>
            </div>
            {expanded && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ paddingTop: "12px", background: "#111", borderRadius: "10px", padding: "14px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>💰 You receive: <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{service.providerGets}</span></div>
                  <div>📋 Type: <span style={{ color: "#aaa" }}>{service.service?.liveSession ? "🔴 Live Session" : service.service?.delivery === "online" ? "🌐 Online" : "📍 In-Person"}</span></div>
                  <div>📅 Booked: <span style={{ color: "#aaa" }}>{service.createdAt ? new Date(service.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span></div>
                  {service.buyerConfirmed
                    ? <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>✅ Buyer confirmed — confirm on your end to release payment</div>
                    : <div style={{ background: "#1e1e2e", border: "1px solid #2a2a40", borderRadius: "8px", padding: "8px 12px", color: "#666", fontSize: "12px" }}>⏳ Waiting for buyer to confirm completion</div>
                  }
                </div>
                <button onClick={() => handleProviderConfirm(service.id)}
                  style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
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

export default function Account({ user, onSignOut, onClose, onUserUpdate }) {
  const [tab, setTab] = useState("profile")
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

  // Live data
  const [orders, setOrders] = useState([])
  const [sellingOrders, setSellingOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    newMessages: true,
    deliveryConfirmations: true,
  })

  // Load orders when tab opens
  useEffect(() => {
    if (tab === "orders") {
      setLoadingOrders(true)
      Promise.all([getMyOrders(), getSellingOrders()])
        .then(([my, selling]) => {
          setOrders(Array.isArray(my) ? my : [])
          setSellingOrders(Array.isArray(selling) ? selling : [])
        })
        .catch(() => {})
        .finally(() => setLoadingOrders(false))
    }
  }, [tab])

  // Load listings when tab opens
  useEffect(() => {
    if (tab === "listings") {
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
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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
      if (data.message === "Account deleted successfully.") {
        localStorage.removeItem("silkroad_token"); onSignOut()
      } else { setDeleteError(data.message || "Something went wrong.") }
    } catch { setDeleteError("Something went wrong.") }
    setDeleteLoading(false)
  }

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Remove this listing?")) return
    try {
      await deleteListing(id)
      setListings(l => l.filter(x => x._id !== id))
    } catch { alert("Could not remove listing. Try again.") }
  }

  const inputStyle = (hasError) => ({
    width: "100%", background: "#1e1e1e",
    border: `1px solid ${hasError ? "#991b1b" : "#333"}`,
    color: "#fff", padding: "12px 16px", borderRadius: "10px",
    fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  })

  const TABS = [
    { id: "profile", label: "👤 Profile" },
    { id: "orders", label: "📦 Orders" },
    { id: "listings", label: "🏷️ Listings" },
    { id: "settings", label: "⚙️ Settings" },
  ]

  const orderStatusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE["Pending"]

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontSize: "17px", fontWeight: "700" }}>My Account</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        {/* User banner */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: "14px", background: "#1a1a1a" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "700", color: "#000", flexShrink: 0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#f0ede8" }}>{user.name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>{user.email} · {user.university}</div>
            <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Member since {user.joined}</div>
          </div>
          <button onClick={onSignOut}
            style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "inherit" }}>
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e", padding: "0 24px", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: "transparent", border: "none", color: tab === t.id ? "#c8a97e" : "#555", cursor: "pointer", fontSize: "13px", fontWeight: "600", padding: "14px 16px", borderBottom: `2px solid ${tab === t.id ? "#c8a97e" : "transparent"}`, fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>Edit Profile</h3>
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>FULL NAME</div>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle(editErrors.name)} />
                {editErrors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.name}</div>}
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>EMAIL</div>
                <input value={user.email} disabled style={{ ...inputStyle(false), background: "#141414", color: "#444", cursor: "not-allowed", border: "1px solid #222" }} />
                <div style={{ fontSize: "11px", color: "#444", marginTop: "4px" }}>Email cannot be changed.</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px" }}>UNIVERSITY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  {UNIS.map(u => (
                    <button key={u} onClick={() => setEditForm(f => ({ ...f, university: u }))}
                      style={{ padding: "8px 4px", borderRadius: "8px", border: `1.5px solid ${editForm.university === u ? "#c8a97e" : "#2a2a2a"}`, background: editForm.university === u ? "#c8a97e22" : "#1a1a1a", color: editForm.university === u ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "11px", textAlign: "center", fontFamily: "inherit" }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>PHONE NUMBER</div>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(editErrors.phone)} />
                {editErrors.phone && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {editErrors.phone}</div>}
              </div>
              {saveError && (
                <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>🚫 {saveError}</div>
              )}
              <button onClick={handleSaveProfile}
                style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
                {saving ? "⏳ Saving..." : saved ? "✅ Profile Saved!" : "Save Changes"}
              </button>
            </>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>My Orders</h3>
              {loadingOrders ? (
                <div style={{ textAlign: "center", color: "#555", padding: "32px", fontSize: "13px" }}>⏳ Loading orders...</div>
              ) : orders.length === 0 && sellingOrders.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "32px", textAlign: "center", border: "1px solid #1e1e1e", color: "#555", fontSize: "13px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>📦</div>
                  No orders yet. Start shopping!
                </div>
              ) : (
                <>
                  {orders.length > 0 && (
                    <>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>Purchases</div>
                      {orders.map(order => (
                        <div key={order._id} style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                          <div style={{ width: "52px", height: "52px", borderRadius: "8px", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📦</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{order.listing?.title || "Order"}</div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                              {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.amount}</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>{order._id}</div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: orderStatusStyle(order.status).bg, color: orderStatusStyle(order.status).color, border: `1px solid ${orderStatusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>
                            {order.status}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {sellingOrders.length > 0 && (
                    <>
                      <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginTop: "8px" }}>Sales</div>
                      {sellingOrders.map(order => (
                        <div key={order._id} style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                          <div style={{ width: "52px", height: "52px", borderRadius: "8px", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🏷️</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{order.listing?.title || "Sale"}</div>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                              Buyer: {order.buyer?.name || "Unknown"} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{order.sellerAmount}</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>{order._id}</div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", background: orderStatusStyle(order.status).bg, color: orderStatusStyle(order.status).color, border: `1px solid ${orderStatusStyle(order.status).border}`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>
                            {order.status}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── LISTINGS ── */}
          {tab === "listings" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>My Listings</h3>
              </div>

              {loadingListings ? (
                <div style={{ textAlign: "center", color: "#555", padding: "32px", fontSize: "13px" }}>⏳ Loading listings...</div>
              ) : listings.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "32px", textAlign: "center", border: "1px solid #1e1e1e", color: "#555", fontSize: "13px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>🏷️</div>
                  No listings yet. Click + Sell to create one!
                </div>
              ) : (
                listings.map(listing => (
                  <div key={listing._id} style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px", display: "flex", gap: "12px", alignItems: "center", border: "1px solid #1e1e1e" }}>
                    {listing.image
                      ? <img src={listing.image} alt={listing.title} style={{ width: "52px", height: "52px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: "52px", height: "52px", borderRadius: "8px", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📦</div>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{listing.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {listing.category} · <span style={{ color: "#c8a97e", fontWeight: "700" }}>
                          {listing.type === "rent" ? `₵${listing.dailyRate}/day` : `₵${listing.price}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", background: STATUS_STYLE[listing.status]?.bg || STATUS_STYLE["Active"].bg, color: STATUS_STYLE[listing.status]?.color || STATUS_STYLE["Active"].color, border: `1px solid ${STATUS_STYLE[listing.status]?.border || STATUS_STYLE["Active"].border}`, padding: "3px 10px", borderRadius: "20px" }}>
                        {listing.status || "Active"}
                      </span>
                      <button onClick={() => handleDeleteListing(listing._id)}
                        style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Active Rentals — Lender View */}
              <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: "16px", marginTop: "4px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>📦 Active Rentals</h3>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>Items you've lent out that are currently active.</p>
                <ActiveRentals />
              </div>

              {/* Active Services — Provider View */}
              <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: "16px", marginTop: "4px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>🛠️ Active Services</h3>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>Services you're currently providing.</p>
                <ActiveServices />
              </div>
            </>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>Account Settings</h3>

              {/* Change password */}
              <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #1e1e1e" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8" }}>🔒 Change Password</div>
                <input placeholder="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle(false)} />
                <input placeholder="Confirm new password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle(false)} />
                {passwordError && <div style={{ fontSize: "12px", color: "#fca5a5" }}>⚠️ {passwordError}</div>}
                <button onClick={handleSavePassword}
                  style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "11px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                  {passwordSaving ? "⏳ Updating..." : passwordSaved ? "✅ Password Updated!" : "Update Password"}
                </button>
              </div>

              {/* Notifications — actually working toggles */}
              <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", border: "1px solid #1e1e1e" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", marginBottom: "12px" }}>🔔 Notifications</div>
                {[
                  { key: "orderUpdates", label: "Order updates via SMS" },
                  { key: "newMessages", label: "New messages from sellers" },
                  { key: "deliveryConfirmations", label: "Delivery confirmations" },
                ].map((n, i, arr) => (
                  <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #222" : "none" }}>
                    <span style={{ fontSize: "13px", color: "#aaa" }}>{n.label}</span>
                    <div onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                      style={{ width: "36px", height: "20px", background: notifications[n.key] ? "#c8a97e" : "#2a2a2a", borderRadius: "20px", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: "3px", left: notifications[n.key] ? "18px" : "3px", width: "14px", height: "14px", background: "#fff", borderRadius: "50%", transition: "left .2s" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Danger zone */}
              <div style={{ background: "#7f1d1d22", borderRadius: "12px", padding: "18px", border: "1px solid #7f1d1d" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#fca5a5", marginBottom: "8px" }}>⚠️ Danger Zone</div>
                <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
                  Deleting your account is permanent. All your listings, orders and data will be removed.
                </p>
                {deleteConfirm && (
                  <div style={{ background: "#7f1d1d", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "13px", color: "#fca5a5" }}>
                    ⚠️ Are you absolutely sure? This cannot be undone.
                  </div>
                )}
                {deleteError && <div style={{ fontSize: "12px", color: "#fca5a5", marginBottom: "10px" }}>🚫 {deleteError}</div>}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button onClick={handleDeleteAccount}
                    style={{ background: "#7f1d1d", border: "1px solid #991b1b", color: "#fca5a5", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
                    {deleteLoading ? "⏳ Deleting..." : deleteConfirm ? "⚠️ Yes, Delete My Account" : "Delete My Account"}
                  </button>
                  {deleteConfirm && (
                    <button onClick={() => setDeleteConfirm(false)}
                      style={{ background: "transparent", border: "1px solid #333", color: "#aaa", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}