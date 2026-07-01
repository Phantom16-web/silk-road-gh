import { useState, useEffect } from "react"

const STORAGE_KEY = "silkroad_orders"
const NOTIFICATIONS_KEY = "silkroad_seller_notifications"

// ── Core order storage ─────────────────────────────────────────────────────────
export function saveOrder(order) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    existing[order.id] = order
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    if (order.cart && order.cart.length > 0) notifySeller(order)
  } catch {}
}

export function getOrder(id) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return all[id] || null
  } catch { return null }
}

export function getOrders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }
  catch { return {} }
}

export function updateOrder(id, updates) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    if (all[id]) {
      all[id] = { ...all[id], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    }
  } catch {}
}

export function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let id = "SR-"
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ── Seller notification system ─────────────────────────────────────────────────
function notifySeller(order) {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    const firstItem = order.cart?.[0]
    if (!firstItem) return
    const sellerId = firstItem.seller?._id || firstItem.seller
    if (!sellerId) return

    const notification = {
      id: `NOTIF-${Date.now()}`,
      type: "new_order",
      orderId: order.id,
      sellerId,
      itemTitle: firstItem.title,
      itemImage: firstItem.image || null,
      amount: order.total,
      buyerContact: order.contactInfo,
      buyerName: order.payerName || "A buyer",
      deliveryMethod: order.deliveryMethod,
      location: order.location
        ? `${order.location.lat}, ${order.location.lng}`
        : order.manualLocation,
      landmark: order.landmark,
      promoCode: order.promoCode || null,
      discount: order.discount || 0,
      paymentRef: order.paymentRef,
      paymentMethod: order.paymentMethod,
      status: "unread",
      createdAt: Date.now(),
    }

    notifications.unshift(notification)
    if (notifications.length > 50) notifications.splice(50)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))
    window.dispatchEvent(new CustomEvent("silkroad_new_notification", { detail: notification }))
  } catch {}
}

export function getSellerNotifications(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    return sellerId
      ? all.filter(n => n.sellerId === sellerId || n.sellerId === String(sellerId))
      : all
  } catch { return [] }
}

export function markNotificationRead(notificationId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    const updated = all.map(n => n.id === notificationId ? { ...n, status: "read" } : n)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))
  } catch {}
}

export function markAllNotificationsRead(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    const updated = all.map(n =>
      (n.sellerId === sellerId || n.sellerId === String(sellerId))
        ? { ...n, status: "read" } : n
    )
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))
  } catch {}
}

export function getUnreadCount(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    return all.filter(n =>
      (n.sellerId === sellerId || n.sellerId === String(sellerId)) && n.status === "unread"
    ).length
  } catch { return 0 }
}

// ── Order ID Banner ────────────────────────────────────────────────────────────
export function OrderIdBanner({ orderId }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #c8a97e44",
      borderRadius: "12px", padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    }}>
      <div>
        <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".1em", marginBottom: "4px" }}>YOUR ORDER ID</div>
        <div style={{ fontSize: "18px", fontWeight: "800", color: "#f0ede8", fontFamily: "monospace", letterSpacing: ".06em" }}>{orderId}</div>
        <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Save this to track or reopen your order anytime</div>
      </div>
      <button onClick={handleCopy}
        style={{ background: copied ? "#064e3b" : "#161616", border: `1px solid ${copied ? "#065f46" : "#2a2a2a"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "9px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
        {copied ? "✅ Copied!" : "📋 Copy"}
      </button>
    </div>
  )
}

// ── Notification Bell (goes in navbar) ────────────────────────────────────────
export function NotificationBell({ user, onClick }) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?._id) return
    setUnread(getUnreadCount(user._id))

    const handleNew = () => setUnread(getUnreadCount(user._id))
    window.addEventListener("silkroad_new_notification", handleNew)
    const interval = setInterval(() => setUnread(getUnreadCount(user._id)), 10000)
    return () => {
      window.removeEventListener("silkroad_new_notification", handleNew)
      clearInterval(interval)
    }
  }, [user?._id])

  if (!user) return null

  return (
    <button onClick={onClick}
      style={{ position: "relative", background: unread > 0 ? "#c8a97e14" : "transparent", border: `1px solid ${unread > 0 ? "#c8a97e44" : "#222"}`, color: unread > 0 ? "#c8a97e" : "#888", padding: "7px 10px", borderRadius: "9px", cursor: "pointer", fontSize: "16px" }}
      title="Seller Notifications">
      🔔
      {unread > 0 && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "17px", height: "17px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  )
}

// ── Order Tracker Modal (buyer) ────────────────────────────────────────────────
export default function OrderTracker({ onClose, onOpenOrder }) {
  const [idInput, setIdInput] = useState("")
  const [found, setFound] = useState(null)
  const [error, setError] = useState("")

  const handleSearch = () => {
    setError("")
    const trimmed = idInput.trim().toUpperCase()
    if (!trimmed) { setError("Please enter your Order ID."); return }
    const order = getOrder(trimmed)
    if (!order) { setError("Order not found. Check your ID and try again."); return }
    if (order.expiresAt && order.expiresAt < Date.now() && order.delivered !== null) {
      setError("This order has expired and been archived."); return
    }
    setFound(order)
  }

  const formatDate = (ts) => {
    if (!ts) return "N/A"
    return new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const getStatusColor = (status) => {
    if (status === "Pending Confirmation") return { color: "#fcd34d", bg: "#78350f18", border: "#92400e" }
    if (status === "Paid" || status === "Completed") return { color: "#6ee7b7", bg: "#064e3b18", border: "#065f46" }
    if (status === "Cancelled") return { color: "#fca5a5", bg: "#7f1d1d18", border: "#7f1d1d" }
    return { color: "#93c5fd", bg: "#1e3a5f18", border: "#1d4ed8" }
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>📦 Track Order</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>
            Enter your Order ID to check status, view details, or reopen an active order.
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              className="search-input"
              placeholder="e.g. SR-AB3DEF"
              value={idInput}
              onChange={e => { setIdInput(e.target.value.toUpperCase()); setError(""); setFound(null) }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, fontFamily: "monospace", fontSize: "15px", letterSpacing: ".05em" }}
            />
            <button className="btn-gold" onClick={handleSearch} style={{ padding: "11px 20px", borderRadius: "10px", fontSize: "14px", whiteSpace: "nowrap" }}>
              Search
            </button>
          </div>

          {error && (
            <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>
              ⚠️ {error}
            </div>
          )}

          {found && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "4px" }}>ORDER FOUND</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e", fontFamily: "monospace" }}>{found.id}</div>
                  </div>
                  {found.status && (
                    <span style={{ fontSize: "11px", fontWeight: "700", background: getStatusColor(found.status).bg, color: getStatusColor(found.status).color, border: `1px solid ${getStatusColor(found.status).border}`, padding: "4px 12px", borderRadius: "20px" }}>
                      {found.status}
                    </span>
                  )}
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #1a1a1a", margin: 0 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  {found.cart?.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>Items</span>
                      <span style={{ color: "#888", textAlign: "right", maxWidth: "200px" }}>{found.cart.map(i => i.title).join(", ")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#555" }}>Total</span>
                    <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{found.total?.toLocaleString() || "—"}</span>
                  </div>
                  {found.paymentRef && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>Reference</span>
                      <span style={{ color: "#444", fontSize: "11px", fontFamily: "monospace" }}>{found.paymentRef}</span>
                    </div>
                  )}
                  {found.deliveryMethod && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>Delivery</span>
                      <span style={{ color: "#888" }}>{found.deliveryMethod === "rider" ? "🛵 Rider" : "📍 Pickup"}</span>
                    </div>
                  )}
                  {found.promoCode && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>Promo</span>
                      <span style={{ color: "#6ee7b7" }}>🎟️ {found.promoCode}</span>
                    </div>
                  )}
                  {found.createdAt && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>Placed</span>
                      <span style={{ color: "#888" }}>{formatDate(found.createdAt)}</span>
                    </div>
                  )}

                  {found.delivered === true && (
                    <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "8px", padding: "8px 12px", color: "#6ee7b7", fontSize: "12px" }}>
                      ✅ Delivery confirmed — order complete
                    </div>
                  )}
                  {found.delivered === false && (
                    <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "8px 12px", color: "#fca5a5", fontSize: "12px" }}>
                      ❌ Order cancelled — refund in progress
                    </div>
                  )}
                  {found.delivered === null && found.status === "Pending Confirmation" && (
                    <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "8px", padding: "8px 12px", color: "#fcd34d", fontSize: "12px" }}>
                      ⏳ Payment submitted — awaiting confirmation
                    </div>
                  )}
                </div>
              </div>

              {found.delivered === null && (
                <button className="btn-gold" onClick={() => { onOpenOrder(found); onClose() }}
                  style={{ width: "100%", padding: "13px", borderRadius: "12px", fontSize: "15px" }}>
                  📦 Reopen This Order
                </button>
              )}
            </div>
          )}

          <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#444", lineHeight: "1.7" }}>
            <div style={{ fontWeight: "600", color: "#555", marginBottom: "4px" }}>Where's my Order ID?</div>
            Shown after checkout (e.g. SR-AB3DEF). Orders stay active for 48 hours after delivery confirmation.
          </div>
        </div>
      </div>
    </div>
  )
}
