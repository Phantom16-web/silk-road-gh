import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

const STORAGE_KEY       = "silkroad_orders"
const NOTIFICATIONS_KEY = "silkroad_seller_notifications"
const EVENT_KEY         = "silkroad_last_event"
const SELLER_ID_KEY     = "silkroad_socket_seller_id"
const API_URL           = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"

// ── Singleton socket ───────────────────────────────────────────────────────────
let _socket          = null
let _currentSellerId = null

function getSocket() {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      autoConnect:          false,
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports:           ["websocket", "polling"],
      timeout:              10000,
    })

    _socket.on("connect", () => {
      console.log("🔌 Socket connected:", _socket.id)
      if (_currentSellerId) {
        _socket.emit("register_seller", String(_currentSellerId))
        console.log("✅ Re-registered seller after connect:", _currentSellerId)
      }
    })

    _socket.on("seller_registered", ({ sellerId, socketId }) => {
      console.log(`✅ Server confirmed — seller: ${sellerId}, socket: ${socketId}`)
    })

    _socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
    })

    _socket.on("connect_error", (err) => {
      console.log("⚠️ Socket connect error:", err.message)
    })
  }
  return _socket
}

export function connectSellerSocket(sellerId) {
  if (!sellerId) return
  const id = String(sellerId)
  _currentSellerId = id
  try { localStorage.setItem(SELLER_ID_KEY, id) } catch {}
  const s = getSocket()
  if (s.connected) {
    s.emit("register_seller", id)
  } else {
    s.connect()
  }
}

export function disconnectSocket() {
  _currentSellerId = null
  try { localStorage.removeItem(SELLER_ID_KEY) } catch {}
  if (_socket) _socket.disconnect()
}

// Restore seller ID on module load
;(function restoreSellerIdOnLoad() {
  try {
    const saved = localStorage.getItem(SELLER_ID_KEY)
    if (saved && !_currentSellerId) _currentSellerId = saved
  } catch {}
})()

// ── Core order storage ─────────────────────────────────────────────────────────
export function saveOrder(order) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    existing[order.id] = order
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    if (order.cart && order.cart.length > 0) notifySellerLocal(order)
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

// ── Local notification (same browser fallback) ─────────────────────────────────
function notifySellerLocal(order) {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    const firstItem     = order.cart?.[0]
    if (!firstItem) return
    const sellerId = firstItem.seller?._id || firstItem.seller
    if (!sellerId) return

    const notification = {
      id:             `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type:           "new_order",
      orderId:        order.id,
      sellerId:       String(sellerId),
      itemTitle:      firstItem.title,
      itemImage:      firstItem.image || null,
      amount:         order.total,
      buyerContact:   order.contactInfo,
      buyerName:      order.payerName || "A buyer",
      deliveryMethod: order.deliveryMethod,
      location:       order.location
        ? `${order.location.lat},${order.location.lng}`
        : order.manualLocation,
      landmark:       order.landmark,
      promoCode:      order.promoCode   || null,
      discount:       order.discount    || 0,
      paymentRef:     order.paymentRef,
      paymentMethod:  order.paymentMethod,
      status:         "unread",
      createdAt:      Date.now(),
    }

    notifications.unshift(notification)
    if (notifications.length > 50) notifications.splice(50)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))

    // Cross-tab broadcast
    localStorage.setItem(EVENT_KEY, JSON.stringify({
      type:           "new_notification",
      sellerId:       String(sellerId),
      notificationId: notification.id,
      ts:             Date.now(),
    }))

    // Same-tab
    window.dispatchEvent(new CustomEvent("silkroad_new_notification", { detail: notification }))
  } catch {}
}

export function storeSocketNotification(notification) {
  try {
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    if (notifications.find(n => n.id === notification.id)) return
    notifications.unshift({ ...notification, status: "unread" })
    if (notifications.length > 50) notifications.splice(50)
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))

    localStorage.setItem(EVENT_KEY, JSON.stringify({
      type:           "new_notification",
      sellerId:       String(notification.sellerId),
      notificationId: notification.id,
      ts:             Date.now(),
    }))

    window.dispatchEvent(new CustomEvent("silkroad_new_notification", { detail: notification }))
  } catch {}
}

export function getSellerNotifications(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    return sellerId ? all.filter(n => n.sellerId === String(sellerId)) : all
  } catch { return [] }
}

export function markNotificationRead(notificationId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(
      all.map(n => n.id === notificationId ? { ...n, status: "read" } : n)
    ))
  } catch {}
}

export function markAllNotificationsRead(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(
      all.map(n => n.sellerId === String(sellerId) ? { ...n, status: "read" } : n)
    ))
  } catch {}
}

export function getUnreadCount(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]")
    return all.filter(n => n.sellerId === String(sellerId) && n.status === "unread").length
  } catch { return 0 }
}

// ── Order ID Banner ────────────────────────────────────────────────────────────
export function OrderIdBanner({ orderId }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #c8a97e44", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
      <div>
        <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", letterSpacing: ".1em", marginBottom: "4px" }}>YOUR ORDER ID</div>
        <div style={{ fontSize: "18px", fontWeight: "800", color: "#f0ede8", fontFamily: "monospace", letterSpacing: ".06em" }}>{orderId}</div>
        <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Works on any device — paste it to track your order</div>
      </div>
      <button onClick={copy}
        style={{ background: copied ? "#064e3b" : "#161616", border: `1px solid ${copied ? "#065f46" : "#2a2a2a"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "9px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}>
        {copied ? "✅ Copied!" : "📋 Copy"}
      </button>
    </div>
  )
}

// ── Notification Bell ──────────────────────────────────────────────────────────
export function NotificationBell({ user, onClick, notifTick }) {
  const [unread, setUnread] = useState(0)
  const userIdRef           = useRef(null)

  useEffect(() => {
    if (!user?._id) return
    userIdRef.current = user._id

    const refresh = () => {
      if (userIdRef.current) setUnread(getUnreadCount(userIdRef.current))
    }
    refresh()

    // Layer 1 — Socket.io cross-device
    const s = getSocket()
    const handleSocketNotif = (notification) => {
      if (String(notification.sellerId) === String(user._id)) {
        storeSocketNotification(notification)
        refresh()
      }
    }
    s.on("new_order_notification", handleSocketNotif)

    // Layer 2 — same-tab
    window.addEventListener("silkroad_new_notification", refresh)

    // Layer 3 — cross-tab
    const handleStorage = (e) => {
      if (e.key === EVENT_KEY || e.key === NOTIFICATIONS_KEY) refresh()
    }
    window.addEventListener("storage", handleStorage)

    // Layer 4 — poll + watchdog
    const interval = setInterval(() => {
      refresh()
      if (_currentSellerId && _socket && !_socket.connected) {
        console.log("🔄 Watchdog: socket down, reconnecting...")
        _socket.connect()
      }
    }, 8000)

    return () => {
      s.off("new_order_notification", handleSocketNotif)
      window.removeEventListener("silkroad_new_notification", refresh)
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [user?._id])

  useEffect(() => {
    if (user?._id) setUnread(getUnreadCount(user._id))
  }, [notifTick, user?._id])

  if (!user) return null

  return (
    <button onClick={onClick}
      style={{ position: "relative", background: unread > 0 ? "#c8a97e14" : "transparent", border: `1px solid ${unread > 0 ? "#c8a97e44" : "#222"}`, color: unread > 0 ? "#c8a97e" : "#888", padding: "7px 10px", borderRadius: "9px", cursor: "pointer", fontSize: "16px", transition: "all 0.2s" }}
      title="Notifications">
      🔔
      {unread > 0 && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "17px", height: "17px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  )
}

// ── Order Tracker Modal ────────────────────────────────────────────────────────
export default function OrderTracker({ onClose, onOpenOrder }) {
  const [idInput, setIdInput]       = useState("")
  const [found, setFound]           = useState(null)
  const [error, setError]           = useState("")
  const [deliveryOtp, setDeliveryOtp] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const otpPollRef                  = useRef(null)

  // Cross-tab: if order updated in another tab, re-read
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && found) {
        const order = getOrder(found.id)
        if (order) setFound(order)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [found])

  // ── Poll for delivery OTP ──────────────────────────────────────────────────
  // When a rider marks the order as delivered, the backend generates an OTP.
  // Guest buyers have no socket, so we poll the public endpoint every 5s.
  // The OTP shows on the buyer's screen — they read it to the rider verbally.
  useEffect(() => {
    // Clear any existing poll
    if (otpPollRef.current) clearInterval(otpPollRef.current)
    setDeliveryOtp(null)

    // Only poll if we have an active order that hasn't been confirmed yet
    if (!found?.id || found?.delivered !== null) return

    const poll = async () => {
      try {
        setOtpLoading(true)
        const res  = await fetch(`${API_URL}/deliveries/otp-for-order/${found.id}`)
        const data = await res.json()
        setOtpLoading(false)
        if (data.otp) {
          setDeliveryOtp(data)
          // Stop polling once we have the OTP
          clearInterval(otpPollRef.current)
        }
      } catch { setOtpLoading(false) }
    }

    poll() // check immediately on search
    otpPollRef.current = setInterval(poll, 5000)

    return () => clearInterval(otpPollRef.current)
  }, [found?.id, found?.delivered])

  const handleSearch = () => {
    setError("")
    setDeliveryOtp(null)
    const trimmed = idInput.trim().toUpperCase()
    if (!trimmed) { setError("Please enter your Order ID."); return }
    const order = getOrder(trimmed)
    if (!order) { setError("Order not found. Check your ID and try again."); return }
    setFound(order)
  }

  const formatDate = (ts) => {
    if (!ts) return "N/A"
    return new Date(ts).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  const statusColor = (s) => {
    if (s === "Pending Confirmation") return { color: "#fcd34d", bg: "#78350f18", border: "#92400e" }
    if (s === "Paid" || s === "Completed") return { color: "#6ee7b7", bg: "#064e3b18", border: "#065f46" }
    if (s === "Cancelled" || s === "Refunded") return { color: "#fca5a5", bg: "#7f1d1d18", border: "#7f1d1d" }
    return { color: "#93c5fd", bg: "#1e3a5f18", border: "#1d4ed8" }
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>📦 Track Order</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>
            Enter your Order ID — works on any device, any browser.
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
            <button className="btn-gold" onClick={handleSearch}
              style={{ padding: "11px 20px", borderRadius: "10px", fontSize: "14px", whiteSpace: "nowrap" }}>
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

              {/* Order summary card */}
              <div style={{ background: "#161616", borderRadius: "14px", padding: "18px", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "4px" }}>ORDER FOUND</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e", fontFamily: "monospace" }}>{found.id}</div>
                  </div>
                  {found.status && (() => {
                    const sc = statusColor(found.status)
                    return (
                      <span style={{ fontSize: "11px", fontWeight: "700", background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: "4px 12px", borderRadius: "20px" }}>
                        {found.status}
                      </span>
                    )
                  })()}
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #1a1a1a", margin: 0 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  {found.cart?.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ color: "#555", flexShrink: 0 }}>Items</span>
                      <span style={{ color: "#888", textAlign: "right" }}>{found.cart.map(i => i.title).join(", ")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#555" }}>Total</span>
                    <span style={{ color: "#c8a97e", fontWeight: "700" }}>₵{found.total?.toLocaleString() || "—"}</span>
                  </div>
                  {found.paymentRef && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ color: "#555", flexShrink: 0 }}>Reference</span>
                      <span style={{ color: "#444", fontSize: "11px", fontFamily: "monospace", textAlign: "right" }}>{found.paymentRef}</span>
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
                      ❌ Cancelled — refund in progress
                    </div>
                  )}
                  {found.delivered === null && !deliveryOtp && (
                    <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "8px", padding: "8px 12px", color: "#fcd34d", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>⏳ In progress — awaiting delivery</span>
                      {otpLoading && <span style={{ fontSize: "11px", color: "#555" }}>checking...</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* ── OTP DISPLAY — shows when rider marks as delivered ── */}
              {deliveryOtp && found.delivered === null && (
                <div style={{ background: "#064e3b18", border: "2px solid #065f46", borderRadius: "16px", padding: "22px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ fontSize: "32px" }}>🚪</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#6ee7b7", marginBottom: "6px" }}>Your Package Has Arrived!</div>
                    <div style={{ fontSize: "13px", color: "#888" }}>Read this code to the rider to confirm delivery</div>
                  </div>

                  {/* Big OTP display */}
                  <div style={{ fontSize: "52px", fontWeight: "900", color: "#c8a97e", fontFamily: "monospace", letterSpacing: ".2em", background: "#161616", borderRadius: "14px", padding: "20px 12px", border: "2px solid #c8a97e44" }}>
                    {deliveryOtp.otp}
                  </div>

                  <div style={{ fontSize: "12px", color: "#555" }}>
                    ⏰ Expires at {new Date(deliveryOtp.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                    ⚠️ Only share this with the person delivering your package. Once the rider enters it, your order is marked complete and payment is released.
                  </div>
                </div>
              )}

              {/* Polling indicator when waiting for rider to deliver */}
              {found.delivered === null && !deliveryOtp && (
                <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#444", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#555", animation: "pulse 2s infinite", flexShrink: 0 }} />
                  <span>Watching for delivery updates — this page checks automatically every 5 seconds.</span>
                </div>
              )}

              {/* Reopen order button */}
              {found.delivered === null && (
                <button className="btn-gold" onClick={() => { onOpenOrder(found); onClose() }}
                  style={{ width: "100%", padding: "13px", borderRadius: "12px", fontSize: "15px" }}>
                  📦 Reopen This Order
                </button>
              )}

            </div>
          )}

          <div style={{ background: "#161616", borderRadius: "12px", padding: "14px", fontSize: "12px", color: "#444", lineHeight: "1.7" }}>
            <div style={{ fontWeight: "600", color: "#555", marginBottom: "4px" }}>Works on any device</div>
            Your Order ID (e.g. SR-AB3DEF) is shown after checkout. Enter it here on any phone or computer to track your order and receive your delivery OTP.
          </div>

        </div>
      </div>
    </div>
  )
}
