import { useState, useEffect, useRef } from "react"

const API_URL    = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000"

const STORAGE_KEY = "silkroad_orders"
const NOTIF_KEY   = "silkroad_seller_notifications"

const socketRegistry = {}
let   socketInstance = null
let   registeredId   = null

// ── Order storage helpers ─────────────────────────────────────────────────────
export function generateOrderId() {
  return `SR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function saveOrder(order) {
  try {
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    orders[order.id] = { ...order, updatedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {}
}

export function getOrder(id) {
  try {
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return orders[id] || null
  } catch { return null }
}

export function getOrders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }
  catch { return {} }
}

export function updateOrder(id, patch) {
  try {
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    if (orders[id]) {
      orders[id] = { ...orders[id], ...patch, updatedAt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
    }
  } catch {}
}

// ── Notification helpers ──────────────────────────────────────────────────────
export function getSellerNotifications(sellerId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]")
    return all.filter(n => n.sellerId === String(sellerId)).sort((a, b) => b.createdAt - a.createdAt)
  } catch { return [] }
}

export function markAllNotificationsRead(sellerId) {
  try {
    const all     = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]")
    const updated = all.map(n => n.sellerId === String(sellerId) ? { ...n, status: "read" } : n)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated))
  } catch {}
}

function saveNotification(notif) {
  try {
    const all    = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]")
    const exists = all.find(n => n.id === notif.id)
    if (!exists) {
      all.unshift(notif)
      if (all.length > 200) all.splice(200)
      localStorage.setItem(NOTIF_KEY, JSON.stringify(all))
    }
  } catch {}
}

// ── Toast store ───────────────────────────────────────────────────────────────
const toastListeners = new Set()
let   toastQueue     = []

function fireToast(toast) {
  toastQueue = [...toastQueue, { ...toast, id: Date.now() + Math.random() }]
  toastListeners.forEach(cb => cb([...toastQueue]))
}

function dismissToast(id) {
  toastQueue = toastQueue.filter(t => t.id !== id)
  toastListeners.forEach(cb => cb([...toastQueue]))
}

// ── Socket singleton ──────────────────────────────────────────────────────────
export function connectSellerSocket(sellerId) {
  if (!sellerId) return
  const id = String(sellerId)

  if (socketInstance?.connected && registeredId === id) {
    socketInstance.emit("register_seller", id)
    return
  }

  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
    registeredId   = null
  }

  import("socket.io-client").then(({ io }) => {
    const s = io(SOCKET_URL, {
      autoConnect:          true,
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: Infinity,
      transports:           ["websocket", "polling"],
    })

    s.on("connect", () => {
      console.log(`🔌 Socket connected: ${s.id} — registering seller ${id}`)
      s.emit("register_seller", id)
      registeredId = id
    })

    s.on("seller_registered", (data) => {
      console.log(`✅ Registered as seller ${data.sellerId}`)
    })

    s.on("reconnect", (attempt) => {
      console.log(`🔄 Reconnected after ${attempt} attempt(s) — re-registering seller ${id}`)
      s.emit("register_seller", id)
    })

    s.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${reason}`)
      if (reason === "io server disconnect") s.connect()
    })

    s.on("new_order", (data) => {
      const notif = {
        id:             data.orderId || `notif-${Date.now()}`,
        sellerId:       id,
        orderId:        data.orderId,
        itemTitle:      data.itemTitle     || "New Order",
        itemImage:      data.itemImage     || null,
        amount:         data.amount        || 0,
        buyerName:      data.buyerName     || "A buyer",
        buyerContact:   data.buyerContact  || "",
        location:       data.location      || "",
        landmark:       data.landmark      || "",
        paymentRef:     data.paymentRef    || "",
        paymentMethod:  data.paymentMethod || "manual_momo",
        deliveryMethod: data.deliveryMethod|| "pickup",
        discount:       data.discount      || 0,
        promoCode:      data.promoCode     || null,
        status:         "unread",
        createdAt:      Date.now(),
      }
      saveNotification(notif)
      Object.values(socketRegistry).forEach(cb => cb(notif))
      window.dispatchEvent(new CustomEvent("silkroad_new_order", { detail: notif }))
      fireToast({
        type:       "order",
        title:      "🛒 New Order!",
        message:    `${data.buyerName || "Someone"} ordered ${data.itemTitle || "your item"} · ₵${data.amount || 0}`,
        persistent: false,
      })
    })

    s.on("delivery_accepted", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_update", { detail: d }))
      fireToast({ type: "delivery", title: "✅ Rider Accepted!", message: d.message || "A rider accepted your delivery job.", persistent: false })
    })

    s.on("delivery_picked_up", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_update", { detail: d }))
      fireToast({ type: "delivery", title: "📦 Package Picked Up", message: d.message || "Rider picked up the package.", persistent: false })
    })

    s.on("delivery_at_door", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_update", { detail: d }))
      if (d.otp) window.dispatchEvent(new CustomEvent("silkroad_delivery_otp", { detail: d }))
      fireToast({ type: "otp", title: "🚪 Package at Door!", message: "Package delivered. Waiting for buyer OTP confirmation.", persistent: true })
    })

    s.on("delivery_completed", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_update", { detail: d }))
      fireToast({ type: "success", title: "🎉 Delivery Complete!", message: d.message || "OTP confirmed. Payment released.", persistent: false })
    })

    s.on("delivery_cancelled_by_rider", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_update", { detail: d }))
      fireToast({ type: "warning", title: "⚠️ Rider Cancelled", message: d.message || "Rider cancelled. Job is back on the board.", persistent: false })
    })

    s.on("delivery_otp", (d) => {
      window.dispatchEvent(new CustomEvent("silkroad_delivery_otp", { detail: d }))
    })

    socketInstance = s
  }).catch(() => {})
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
    registeredId   = null
  }
}

// ── Toast container ───────────────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastListeners.add(setToasts)
    return () => toastListeners.delete(setToasts)
  }, [])

  useEffect(() => {
    const nonPersistent = toasts.filter(t => !t.persistent)
    if (nonPersistent.length === 0) return
    const timer = setTimeout(() => dismissToast(nonPersistent[0].id), 5000)
    return () => clearTimeout(timer)
  }, [toasts])

  if (toasts.length === 0) return null

  const STYLES = {
    order:    { bg: "#161a1e", border: "#c8a97e", accent: "#c8a97e" },
    delivery: { bg: "#0d1a2e", border: "#1d4ed8", accent: "#93c5fd" },
    otp:      { bg: "#064e3b", border: "#065f46", accent: "#6ee7b7" },
    success:  { bg: "#064e3b18", border: "#065f46", accent: "#6ee7b7" },
    warning:  { bg: "#78350f18", border: "#92400e", accent: "#fcd34d" },
  }

  return (
    <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px", maxWidth: "320px", pointerEvents: "none" }}>
      <style>{`@keyframes slideInToast { from { transform: translateX(110%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
      {toasts.map(toast => {
        const s = STYLES[toast.type] || STYLES.order
        return (
          <div key={toast.id}
            style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "14px", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start", boxShadow: "0 8px 32px rgba(0,0,0,.6)", pointerEvents: "all", animation: "slideInToast .25s ease" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: s.accent, marginBottom: "4px" }}>
                {toast.title}
                {toast.persistent && (
                  <span style={{ marginLeft: "8px", fontSize: "10px", fontWeight: "600", background: s.border + "44", color: s.accent, padding: "2px 7px", borderRadius: "20px", letterSpacing: ".04em" }}>STAY</span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: toast.type === "otp" ? "#a7f3d0" : "#888", lineHeight: "1.5", fontWeight: toast.type === "otp" ? "600" : "400" }}>
                {toast.message}
              </div>
            </div>
            <button onClick={() => dismissToast(toast.id)}
              style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: "18px", minHeight: "auto", padding: "0", flexShrink: 0, lineHeight: 1, fontWeight: "700" }}>✕</button>
          </div>
        )
      })}
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────
export function NotificationBell({ sellerId, onClick }) {
  const [count, setCount] = useState(0)

  const refresh = () => {
    if (!sellerId) return
    setCount(getSellerNotifications(sellerId).filter(n => n.status === "unread").length)
  }

  useEffect(() => {
    refresh()
    const key = String(sellerId || "bell")
    socketRegistry[key] = refresh
    window.addEventListener("silkroad_new_order", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      delete socketRegistry[key]
      window.removeEventListener("silkroad_new_order", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [sellerId])

  return (
    <button onClick={onClick}
      style={{ position: "relative", background: "transparent", border: "none", color: "#aaa", fontSize: "22px", cursor: "pointer", padding: "4px" }}>
      🔔
      {count > 0 && (
        <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  )
}

// ── Order ID banner ───────────────────────────────────────────────────────────
export function OrderIdBanner({ orderId }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(orderId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div style={{ background: "#161616", border: "1px solid #c8a97e44", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
      <div>
        <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "4px" }}>YOUR ORDER ID</div>
        <div style={{ fontSize: "16px", fontWeight: "800", color: "#f0ede8", fontFamily: "monospace", letterSpacing: ".04em" }}>{orderId}</div>
        <div style={{ fontSize: "11px", color: "#444", marginTop: "3px" }}>Save this to track your order anytime</div>
      </div>
      <button onClick={copy}
        style={{ background: copied ? "#064e3b" : "#1a1a1a", border: `1px solid ${copied ? "#065f46" : "#222"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        {copied ? "✅ Copied!" : "📋 Copy"}
      </button>
    </div>
  )
}

// ── Main OrderTracker modal ───────────────────────────────────────────────────
export default function OrderTracker({ onClose, onOpenOrder }) {
  const [input, setInput]             = useState("")
  const [order, setOrder]             = useState(null)
  const [notFound, setNotFound]       = useState(false)
  const [searching, setSearching]     = useState(false)
  const [deliveryOtp, setDeliveryOtp] = useState(null)
  const pollRef                       = useRef(null)

  const search = async () => {
    const id = input.trim().toUpperCase()
    if (!id) return

    setSearching(true)
    setNotFound(false)
    setOrder(null)
    setDeliveryOtp(null)

    // Step 1: check localStorage first (instant, works on same device)
    const local = getOrder(id)
    if (local) {
      setOrder(local)
      setSearching(false)
      return
    }

    // Step 2: fall back to backend — works cross-device, different browser, after clearing cache
    try {
      const res  = await fetch(`${API_URL}/orders/track/${encodeURIComponent(id)}`)
      const data = await res.json()

      if (!res.ok || !data.id) {
        setNotFound(true)
        setSearching(false)
        return
      }

      // Reconstruct a minimal order object matching the localStorage shape
      const recovered = {
        id:             data.id,
        backendOrderId: data.backendOrderId,
        type:           "buy",
        cart:           data.itemTitle ? [{ title: data.itemTitle, image: data.itemImage, qty: 1, price: data.amount }] : [],
        total:          data.amount,
        subtotal:       data.amount,
        deliveryMethod: data.deliveryMethod || "pickup",
        paymentMethod:  data.paymentMethod  || "manual_momo",
        location:       data.location       || null,
        manualLocation: data.location       || null,
        landmark:       data.landmark       || null,
        extraInfo:      data.extraInfo      || null,
        payerName:      data.payerName      || null,
        status:         data.status         || "In Escrow",
        delivered:      data.delivered,
        promoCode:      data.promoCode      || null,
        discount:       data.discount       || 0,
        createdAt:      new Date(data.createdAt).getTime(),
        recoveredFromBackend: true,
      }

      // Save to localStorage so future lookups on this device are instant
      saveOrder(recovered)
      setOrder(recovered)
    } catch {
      setNotFound(true)
    }

    setSearching(false)
  }

  // Poll for OTP when viewing a rider order
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const isRider = order?.deliveryMethod === "rider"
    if (!order || !isRider || order.delivered !== null) return

    const poll = async () => {
      try {
        const res  = await fetch(`${API_URL}/deliveries/otp-for-order/${encodeURIComponent(order.id)}`)
        const data = await res.json()
        if (data.otp) {
          setDeliveryOtp(data)
          clearInterval(pollRef.current)
        }
      } catch {}
    }

    poll()
    pollRef.current = setInterval(poll, 5000)
    return () => clearInterval(pollRef.current)
  }, [order])

  // Socket listener for instant OTP
  useEffect(() => {
    if (!order || order.deliveryMethod !== "rider") return
    const handler = (e) => {
      const d = e.detail
      if (d?.otp) {
        setDeliveryOtp(d)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    window.addEventListener("silkroad_delivery_otp", handler)
    return () => window.removeEventListener("silkroad_delivery_otp", handler)
  }, [order])

  const fmt = (ts) => new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const isRiderOrder = order?.deliveryMethod === "rider"

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "17px", fontWeight: "700" }}>📦 Track Your Order</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>

          <div>
            <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>ENTER YOUR ORDER ID</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="e.g. SR-M5X3K2-AB12"
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && search()}
                style={{ flex: 1, background: "#161616", border: "1px solid #1e1e1e", color: "#f0ede8", padding: "12px 16px", borderRadius: "10px", fontSize: "15px", fontFamily: "monospace", letterSpacing: ".04em", outline: "none" }}
              />
              <button onClick={search} disabled={searching}
                style={{ background: "#c8a97e", border: "none", padding: "12px 20px", borderRadius: "10px", fontWeight: "700", cursor: searching ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "inherit", color: "#000", whiteSpace: "nowrap", opacity: searching ? 0.7 : 1 }}>
                {searching ? "⏳" : "Track →"}
              </button>
            </div>
            {searching && (
              <div style={{ fontSize: "12px", color: "#555", marginTop: "8px" }}>Checking across devices...</div>
            )}
          </div>

          {notFound && (
            <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "12px", padding: "14px 16px", fontSize: "13px", color: "#fca5a5" }}>
              ⚠️ Order not found. Double-check the ID — it looks like <span style={{ fontFamily: "monospace" }}>SR-XXXXX-XXXX</span>
            </div>
          )}

          {order && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {order.recoveredFromBackend && (
                <div style={{ background: "#1e3a5f18", border: "1px solid #1d4ed8", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#93c5fd" }}>
                  ℹ️ Order retrieved from server — now saved on this device for quick access.
                </div>
              )}

              <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "14px", padding: "16px 18px" }}>
                <div style={{ fontSize: "11px", color: "#6ee7b7", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>STATUS</div>
                <div style={{ fontSize: "17px", fontWeight: "800", color: "#6ee7b7" }}>
                  {order.delivered === true  ? "✅ Delivered & Complete"
                  : order.delivered === false ? "❌ Cancelled / Refund Pending"
                  : isRiderOrder             ? "🛵 Rider Delivery in Progress"
                  :                            "⏳ Awaiting Delivery"}
                </div>
              </div>

              <div style={{ background: "#161616", borderRadius: "14px", padding: "16px 18px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "4px" }}>ORDER DETAILS</div>
                <div>🏷️ ID: <span style={{ color: "#c8a97e", fontFamily: "monospace", fontWeight: "700" }}>{order.id}</span></div>
                <div>💰 Total: <span style={{ color: "#aaa" }}>₵{order.total?.toLocaleString()}</span></div>
                <div>🚚 Delivery: <span style={{ color: "#aaa" }}>{order.deliveryMethod === "rider" ? "🛵 Rider" : "📍 Pickup"}</span></div>
                {order.location
                  ? <div>📍 GPS: <span style={{ color: "#aaa", fontFamily: "monospace", fontSize: "11px" }}>{typeof order.location === "object" ? `${order.location.lat}, ${order.location.lng}` : order.location}</span></div>
                  : order.manualLocation ? <div>📍 <span style={{ color: "#aaa" }}>{order.manualLocation}</span></div> : null}
                {order.landmark && <div>🗺️ <span style={{ color: "#aaa" }}>{order.landmark}</span></div>}
                <div>📅 Placed: <span style={{ color: "#aaa" }}>{fmt(order.createdAt)}</span></div>
              </div>

              {/* OTP section — rider orders only */}
              {isRiderOrder && order.delivered === null && (
                deliveryOtp ? (
                  <div style={{ background: "#064e3b18", border: "2px solid #065f46", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "28px" }}>🚪</div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#6ee7b7", marginBottom: "6px" }}>Your Package Has Arrived!</div>
                      <div style={{ fontSize: "13px", color: "#888" }}>Read this 6-digit code to the rider to confirm delivery</div>
                    </div>
                    <div style={{ fontSize: "52px", fontWeight: "900", color: "#c8a97e", fontFamily: "monospace", letterSpacing: ".2em", background: "#161616", borderRadius: "14px", padding: "20px 12px", border: "2px solid #c8a97e44" }}>
                      {deliveryOtp.otp}
                    </div>
                    {deliveryOtp.expiresAt && (
                      <div style={{ fontSize: "12px", color: "#555" }}>
                        ⏰ Expires at {new Date(deliveryOtp.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    <div style={{ background: "#78350f18", border: "1px solid #92400e", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fcd34d", lineHeight: "1.6" }}>
                      ⚠️ Only share this with the rider delivering your package.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c8a97e", flexShrink: 0 }} />
                      <div style={{ fontSize: "13px", color: "#888" }}>Waiting for rider to deliver...</div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#444", lineHeight: "1.7" }}>
                      When the rider arrives and marks your package delivered, a 6-digit OTP will appear here automatically.
                    </div>
                  </div>
                )
              )}

              {order.delivered === null && (
                <button onClick={() => { onOpenOrder(order); onClose() }}
                  style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                  📂 Open Full Order View
                </button>
              )}

              {order.delivered === true && (
                <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#6ee7b7", textAlign: "center" }}>
                  🎉 Order complete! Payment has been released to the seller.
                </div>
              )}

              {order.delivered === false && (
                <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
                  Your refund of ₵{order.total?.toLocaleString()} is being processed.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
