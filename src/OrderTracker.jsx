import { useState, useEffect, useRef } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "")
const STORAGE_KEY = "silkroad_orders"
const NOTIF_KEY = "silkroad_seller_notifications"
let socketInstance = null
let registeredId = null
let connectionSequence = 0
const notificationListeners = new Set()
const toastListeners = new Set()
let toastQueue = []
const readCache = () => { try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]") } catch { return [] } }
const notify = () => { notificationListeners.forEach(fn => fn()); window.dispatchEvent(new Event("silkroad_notifications_changed")) }
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("silkroad_token") || ""}` })

export function generateOrderId() { return `SR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` }
export function getOrders() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } catch { return {} } }
export function getOrder(id) { return getOrders()[id] || null }
export function saveOrder(order) { try { const all = getOrders(); all[order.id] = { ...order, updatedAt: Date.now() }; localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) } catch {} }
export function updateOrder(id, patch) { const order = getOrder(id); if (order) saveOrder({ ...order, ...patch }) }
export function getSellerNotifications(sellerId) { return readCache().filter(n => String(n.sellerId) === String(sellerId)).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) }
function setSellerNotifications(sellerId, incoming) {
  const others = readCache().filter(n => String(n.sellerId) !== String(sellerId))
  localStorage.setItem(NOTIF_KEY, JSON.stringify([...incoming, ...others].slice(0, 500)))
  notify()
}
export async function refreshSellerNotifications(sellerId) {
  if (!sellerId || !localStorage.getItem("silkroad_token")) return getSellerNotifications(sellerId)
  try {
    const response = await fetch(`${API_URL}/seller-notifications`, { headers: authHeaders() })
    if (!response.ok) return getSellerNotifications(sellerId)
    const data = await response.json()
    setSellerNotifications(sellerId, data.notifications || [])
  } catch (err) { console.warn("Notification sync unavailable", err) }
  return getSellerNotifications(sellerId)
}
export function markAllNotificationsRead(sellerId) {
  setSellerNotifications(sellerId, readCache().filter(n => String(n.sellerId) === String(sellerId)).map(n => ({ ...n, status: "read" })))
  if (!localStorage.getItem("silkroad_token")) return
  fetch(`${API_URL}/seller-notifications/read-all`, { method: "PUT", headers: authHeaders() })
    .then(res => { if (!res.ok) throw new Error("Could not mark read") })
    .catch(() => refreshSellerNotifications(sellerId))
}
function fireToast(toast) { toastQueue = [...toastQueue, { ...toast, id: Date.now() + Math.random() }]; toastListeners.forEach(fn => fn([...toastQueue])) }
function dismissToast(id) { toastQueue = toastQueue.filter(t => t.id !== id); toastListeners.forEach(fn => fn([...toastQueue])) }

export function connectSellerSocket(sellerId) {
  if (!sellerId) return
  const id = String(sellerId)
  const token = localStorage.getItem("silkroad_token")
  if (!token) return
  if (socketInstance && registeredId === id) { refreshSellerNotifications(id); return }
  disconnectSocket()
  const seq = ++connectionSequence
  refreshSellerNotifications(id)
  import("socket.io-client").then(({ io }) => {
    if (seq !== connectionSequence) return
    const socket = io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: Infinity, transports: ["websocket", "polling"] })
    socketInstance = socket
    registeredId = id
    socket.on("connect", () => { socket.emit("register_seller", id); refreshSellerNotifications(id) })
    socket.on("new_order", data => {
      if (String(data.sellerId) !== id) return
      const existing = getSellerNotifications(id)
      if (existing.some(n => n.id === data.id)) return
      setSellerNotifications(id, [{ ...data, sellerId: id, status: "unread" }, ...existing])
      window.dispatchEvent(new CustomEvent("silkroad_new_order", { detail: data }))
      fireToast({ type: "order", title: "🛒 New Paid Order!", message: `An order worth ₵${Number(data.amount || 0).toLocaleString()} is ready for fulfillment.` })
    })
    const events = {
      delivery_accepted: ["silkroad_delivery_update", "✅ Rider Accepted!"],
      delivery_picked_up: ["silkroad_delivery_update", "📦 Package Picked Up"],
      delivery_at_door: ["silkroad_delivery_update", "🚪 Package at Door!"],
      sale_completed: ["silkroad_sale_completed", "🎉 Sale Complete!"],
      delivery_completed: ["silkroad_delivery_update", "✅ Delivery Confirmed!"],
      delivery_cancelled_by_rider: ["silkroad_delivery_update", "⚠️ Rider Cancelled"],
      delivery_otp: ["silkroad_delivery_otp", null],
    }
    Object.entries(events).forEach(([event, [custom, title]]) => socket.on(event, data => {
      window.dispatchEvent(new CustomEvent(custom, { detail: data }))
      if (title) fireToast({ type: event === "delivery_at_door" ? "otp" : "delivery", title, message: data?.message || "Your order status has changed.", persistent: event === "delivery_at_door" })
    }))
  }).catch(err => console.warn("Socket initialization failed", err))
}
export function disconnectSocket() { ++connectionSequence; socketInstance?.disconnect(); socketInstance = null; registeredId = null }

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => { toastListeners.add(setToasts); return () => { toastListeners.delete(setToasts) } }, [])
  useEffect(() => { const first = toasts.find(t => !t.persistent); if (!first) return; const t = setTimeout(() => dismissToast(first.id), 5000); return () => clearTimeout(t) }, [toasts])
  return <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, maxWidth: 330, display: "grid", gap: 10 }}>{toasts.map(t => <div key={t.id} style={{ background: "#161a1e", border: "1px solid #c8a97e", borderRadius: 14, padding: 16, color: "#ddd", boxShadow: "0 8px 30px #0008" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><strong style={{ color: "#c8a97e" }}>{t.title}</strong><button onClick={() => dismissToast(t.id)} style={{ background: "none", border: 0, color: "#ddd", cursor: "pointer" }}>✕</button></div><div style={{ fontSize: 12, marginTop: 7 }}>{t.message}</div></div>)}</div>
}
export function NotificationBell({ sellerId, onClick }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => setCount(getSellerNotifications(sellerId).filter(n => n.status === "unread").length)
    refresh(); refreshSellerNotifications(sellerId)
    notificationListeners.add(refresh)
    window.addEventListener("storage", refresh)
    const timer = setInterval(() => refreshSellerNotifications(sellerId), 30000)
    return () => { notificationListeners.delete(refresh); window.removeEventListener("storage", refresh); clearInterval(timer) }
  }, [sellerId])
  return <button onClick={onClick} aria-label={`Notifications: ${count} unread`} style={{ position: "relative", background: "transparent", border: 0, fontSize: 22, cursor: "pointer", padding: 4 }}>🔔{count > 0 && <span style={{ position: "absolute", top: -3, right: -3, background: "#c8a97e", color: "#000", borderRadius: 20, fontSize: 10, fontWeight: 800, minWidth: 17, height: 17, display: "grid", placeItems: "center" }}>{count > 9 ? "9+" : count}</span>}</button>
}
export function OrderIdBanner({ orderId }) {
  const [copied, setCopied] = useState(false)
  return <div style={{ background: "#161616", border: "1px solid #c8a97e44", borderRadius: 14, padding: 18, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><small style={{ color: "#c8a97e" }}>YOUR ORDER ID</small><div style={{ fontFamily: "monospace", fontWeight: 800 }}>{orderId}</div><small>Save this to track your order</small></div><button onClick={() => navigator.clipboard.writeText(orderId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}>{copied ? "Copied!" : "Copy"}</button></div>
}
export default function OrderTracker({ onClose, onOpenOrder }) {
  const [input, setInput] = useState("")
  const [order, setOrder] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)
  const [deliveryOtp, setDeliveryOtp] = useState(null)
  const [completed, setCompleted] = useState(false)
  const pollRef = useRef(null)
  const search = async () => {
    const id = input.trim().toUpperCase(); if (!id) return
    setSearching(true); setNotFound(false); setOrder(null); setDeliveryOtp(null); setCompleted(false)
    let found = getOrder(id)
    if (!found) try {
      const [o, d] = await Promise.all([fetch(`${API_URL}/orders/by-local-id/${encodeURIComponent(id)}`), fetch(`${API_URL}/deliveries/by-order/${encodeURIComponent(id)}`)])
      const orderData = o.ok ? await o.json() : null
      const deliveryData = d.ok ? await d.json() : null
      const delivery = deliveryData?.delivery
      if (orderData || delivery) {
        found = { id, total: orderData?.amount || 0, deliveryMethod: orderData?.deliveryMethod || (delivery ? "rider" : "pickup"), location: orderData?.location || null, landmark: orderData?.landmark || null, status: orderData?.status || "Pending Confirmation", delivered: orderData?.status === "Completed" ? true : orderData?.status === "Refunded" ? false : null, createdAt: orderData?.createdAt ? new Date(orderData.createdAt).getTime() : Date.now(), cart: [], _fromBackend: true }
        saveOrder(found)
        if (delivery?.status === "completed") setCompleted(true)
      }
    } catch (err) { console.warn("Order lookup failed", err) }
    setOrder(found); setNotFound(!found); setSearching(false)
  }
  useEffect(() => {
    if (!order || order.deliveryMethod !== "rider" || completed) return
    const poll = async () => {
      try {
        const r = await fetch(`${API_URL}/deliveries/otp-for-order/${encodeURIComponent(order.id)}`)
        if (r.ok) { const d = await r.json(); if (d?.otp) setDeliveryOtp(d) }
        if (deliveryOtp?.deliveryId) {
          const statusRes = await fetch(`${API_URL}/deliveries/${deliveryOtp.deliveryId}`)
          if (statusRes.ok && (await statusRes.json())?.status === "completed") { setCompleted(true); updateOrder(order.id, { delivered: true, status: "Completed" }) }
        }
      } catch {}
    }
    poll(); pollRef.current = setInterval(poll, 5000)
    return () => clearInterval(pollRef.current)
  }, [order, completed, deliveryOtp?.deliveryId])
  useEffect(() => {
    if (!order) return
    const otp = e => { if (e.detail?.otp) setDeliveryOtp(e.detail) }
    const done = e => { if (e.detail?.localOrderId === order.id || e.detail?.orderId === order.id) { setCompleted(true); updateOrder(order.id, { delivered: true, status: "Completed" }) } }
    window.addEventListener("silkroad_delivery_otp", otp); window.addEventListener("silkroad_sale_completed", done)
    return () => { window.removeEventListener("silkroad_delivery_otp", otp); window.removeEventListener("silkroad_sale_completed", done) }
  }, [order])
  const btn = { border: 0, borderRadius: 10, background: "#c8a97e", color: "#000", padding: "12px 16px", fontWeight: 700, cursor: "pointer" }
  return <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 200, display: "grid", placeItems: "center", padding: 20 }}><div className="modal-content" style={{ background: "#111", color: "#eee", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", borderRadius: 20, border: "1px solid #333", padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3>📦 Track Your Order</h3><button onClick={onClose} style={{ background: "none", border: 0, color: "#ddd", cursor: "pointer" }}>✕</button></div><div style={{ display: "flex", gap: 8, marginTop: 18 }}><input value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && search()} placeholder="Enter SR- order ID" style={{ minWidth: 0, flex: 1, borderRadius: 10, padding: 12, background: "#222", border: "1px solid #444", color: "#fff" }}/><button onClick={search} disabled={searching} style={btn}>{searching ? "Searching" : "Track"}</button></div>{notFound && <p style={{ color: "#fca5a5" }}>Order not found. Check your order ID.</p>}{order && <div style={{ marginTop: 20, display: "grid", gap: 14 }}><div style={{ border: "1px solid #c8a97e55", padding: 16, borderRadius: 12 }}><strong>{completed || order.delivered === true ? "✅ Delivered & Complete" : order.delivered === false ? "❌ Cancelled / Refund Pending" : order.status || "⏳ Awaiting Delivery"}</strong></div><div style={{ background: "#191919", padding: 16, borderRadius: 12, display: "grid", gap: 8 }}><div>ID: {order.id}</div><div>Total: ₵{Number(order.total || 0).toLocaleString()}</div><div>Delivery: {order.deliveryMethod === "rider" ? "Rider" : "Pickup"}</div><div>Placed: {new Date(order.createdAt).toLocaleString()}</div></div>{order.deliveryMethod === "rider" && !completed && (deliveryOtp?.otp ? <div style={{ textAlign: "center", border: "1px solid #065f46", borderRadius: 12, padding: 20 }}><h4>🚪 Your Package Has Arrived!</h4><p>Read this code only to the rider delivering your package.</p><div style={{ fontSize: 40, letterSpacing: 6, color: "#c8a97e", fontWeight: 900 }}>{deliveryOtp.otp}</div></div> : <p>Waiting for rider delivery and OTP confirmation…</p>)}{!completed && order.delivered !== false && <button style={btn} onClick={() => { onOpenOrder?.(order); onClose?.() }}>📂 Open Full Order View</button>}{completed && <p style={{ color: "#6ee7b7" }}>🎉 Order complete. Delivery confirmed.</p>}</div>}</div></div>
}
