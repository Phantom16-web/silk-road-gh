import { useState, useEffect } from "react"

// ── Order Store (in-memory, persisted to localStorage) ─────────────────────
export const saveOrder = (order) => {
  const orders = getOrders()
  orders[order.id] = order
  localStorage.setItem("silkroad_orders", JSON.stringify(orders))
}

export const getOrders = () => {
  try {
    return JSON.parse(localStorage.getItem("silkroad_orders") || "{}")
  } catch {
    return {}
  }
}

export const getOrder = (id) => {
  const orders = getOrders()
  const order = orders[id]
  if (!order) return null

  // Check expiry
  if (order.expiresAt && Date.now() > order.expiresAt) {
    // Check if 48hrs past expiry — delete permanently
    if (Date.now() > order.expiresAt + 48 * 60 * 60 * 1000) {
      const all = getOrders()
      delete all[id]
      localStorage.setItem("silkroad_orders", JSON.stringify(all))
      return null
    }
    return { ...order, expired: true }
  }

  return order
}

export const updateOrder = (id, updates) => {
  const orders = getOrders()
  if (orders[id]) {
    orders[id] = { ...orders[id], ...updates }
    localStorage.setItem("silkroad_orders", JSON.stringify(orders))
  }
}

export const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let id = "SR-"
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ── Tracker Drawer ─────────────────────────────────────────────────────────
export default function OrderTracker({ onClose, onOpenOrder }) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  const handleTrack = () => {
    const id = input.trim().toUpperCase()
    if (!id) { setError("Please enter an Order ID."); return }

    const order = getOrder(id)

    if (!order) {
      setError("No order found with that ID. It may have expired or never existed.")
      return
    }

    if (order.expired) {
      setError("This order has expired or been completed. It will be fully removed from our system soon.")
      return
    }

    setError("")
    onClose()
    onOpenOrder(order)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
      <div onClick={onClose} style={{ flex: 1, background: "#000000aa" }} />
      <div style={{ width: "340px", background: "#111", borderLeft: "1px solid #1e1e1e", display: "flex", flexDirection: "column", height: "100vh", animation: "slideIn 0.3s ease" }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ padding: "20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: "700" }}>📦 Track Order</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
            Enter your Order ID to resume tracking your delivery, rental or service session.
          </p>

          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>ORDER ID</div>
            <input
              placeholder="e.g. SR-A1B2C3"
              value={input}
              onChange={e => { setInput(e.target.value.toUpperCase()); setError("") }}
              onKeyDown={e => e.key === "Enter" && handleTrack()}
              style={{ width: "100%", background: "#1e1e1e", border: `1px solid ${error ? "#991b1b" : "#333"}`, color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "15px", outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: ".08em" }}
            />
          </div>

          {error && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>
              🚫 {error}
            </div>
          )}

          <button
            onClick={handleTrack}
            style={{ background: "#c8a97e", border: "none", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
            Track Order →
          </button>

          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#666", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontWeight: "600", color: "#888", marginBottom: "2px" }}>Order ID Expiry</div>
            <div>🛒 <span style={{ color: "#aaa" }}>Buy Products</span> — 24 hours after order</div>
            <div>📦 <span style={{ color: "#aaa" }}>Rent Items</span> — until rental period ends</div>
            <div>🛠️ <span style={{ color: "#aaa" }}>Services</span> — until service is completed</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Copy ID Banner (shown after payment) ──────────────────────────────────
export function OrderIdBanner({ orderId }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(orderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #c8a97e44", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>Your Order ID</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: ".12em", flex: 1 }}>{orderId}</div>
        <button
          onClick={copy}
          style={{ background: copied ? "#064e3b" : "#1e1e1e", border: `1px solid ${copied ? "#065f46" : "#333"}`, color: copied ? "#6ee7b7" : "#c8a97e", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .2s" }}>
          {copied ? "✅ Copied!" : "📋 Copy"}
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "#555" }}>
        Save this ID — use it to track your order anytime, even after leaving the site.
      </div>
    </div>
  )
}