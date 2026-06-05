import { useState, useEffect } from "react"

const DELIVERY_FEE = 10 // ₵ — editable by admin

// ── Sample deliveries for demo ─────────────────────────────────────────────
const SAMPLE_DELIVERIES = [
  {
    id: "DEL-001",
    orderId: "SR-A1B2C3",
    item: "Calculus Textbook",
    buyer: "Kwame A.",
    buyerContact: "0241234567",
    seller: "Ahmad K.",
    sellerContact: "0551234567",
    pickupLocation: "Mensah Sarbah Hall, UG Legon",
    deliveryLocation: "Volta Hall, UG Legon",
    zone: "UG Legon",
    fee: DELIVERY_FEE,
    status: "Pending", // Pending | Accepted | PickedUp | Delivered | Declined
    assignedAt: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "DEL-002",
    orderId: "SR-D4E5F6",
    item: "Desk Lamp",
    buyer: "Ama S.",
    buyerContact: "0271234567",
    seller: "Omar A.",
    sellerContact: "0201234567",
    pickupLocation: "Unity Hall, KNUST",
    deliveryLocation: "Queens Hall, KNUST",
    zone: "KNUST",
    fee: DELIVERY_FEE,
    status: "Accepted",
    assignedAt: Date.now() - 1000 * 60 * 15,
  },
  {
    id: "DEL-003",
    orderId: "SR-G7H8I9",
    item: "Scientific Calculator",
    buyer: "Kofi T.",
    buyerContact: "0241111222",
    seller: "Abena M.",
    sellerContact: "0557654321",
    pickupLocation: "Main Gate Area, KNUST",
    deliveryLocation: "Republic Hall, KNUST",
    zone: "KNUST",
    fee: DELIVERY_FEE,
    status: "PickedUp",
    assignedAt: Date.now() - 1000 * 60 * 30,
  },
]

const STATUS_META = {
  Pending: { color: "#fcd34d", bg: "#78350f22", border: "#92400e", label: "⏳ Pending", desc: "Waiting for you to accept" },
  Accepted: { color: "#93c5fd", bg: "#1e3a5f22", border: "#1d4ed8", label: "✅ Accepted", desc: "Head to pickup location" },
  PickedUp: { color: "#c4b5fd", bg: "#2a1a3f22", border: "#7c3aed", label: "📦 Picked Up", desc: "En route to buyer" },
  Delivered: { color: "#6ee7b7", bg: "#064e3b22", border: "#065f46", label: "🎉 Delivered", desc: "Completed" },
  Declined: { color: "#fca5a5", bg: "#7f1d1d22", border: "#7f1d1d", label: "❌ Declined", desc: "You declined this delivery" },
}

function DeliveryCard({ delivery, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const meta = STATUS_META[delivery.status]

  const timeSince = (ts) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  return (
    <div style={{ background: "#1a1a1a", borderRadius: "14px", border: `1px solid ${meta.border}`, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8", marginBottom: "3px" }}>{delivery.item}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            To: <span style={{ color: "#aaa" }}>{delivery.buyer}</span> · {delivery.zone} · {timeSince(delivery.assignedAt)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, padding: "3px 10px", borderRadius: "20px" }}>
            {meta.label}
          </span>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#c8a97e" }}>₵{delivery.fee}</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #222", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Details */}
          <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#111", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", marginBottom: "2px" }}>DELIVERY DETAILS</div>
              <div>📦 Order ID: <span style={{ color: "#c8a97e", fontFamily: "monospace" }}>{delivery.orderId}</span></div>
              <div>🏪 Pickup: <span style={{ color: "#aaa" }}>{delivery.pickupLocation}</span></div>
              <div>📍 Deliver to: <span style={{ color: "#aaa" }}>{delivery.deliveryLocation}</span></div>
            </div>

            {/* Contacts — revealed after acceptance */}
            {delivery.status !== "Pending" && delivery.status !== "Declined" && (
              <div style={{ background: "#1e3a5f22", border: "1px solid #1d4ed8", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: "600", marginBottom: "2px" }}>🔓 CONTACT DETAILS</div>
                <div>👤 Seller: <span style={{ color: "#f0ede8", fontWeight: "600" }}>{delivery.seller}</span> · <span style={{ color: "#c8a97e" }}>{delivery.sellerContact}</span></div>
                <div>🙋 Buyer: <span style={{ color: "#f0ede8", fontWeight: "600" }}>{delivery.buyer}</span> · <span style={{ color: "#c8a97e" }}>{delivery.buyerContact}</span></div>
              </div>
            )}

            {delivery.status === "Pending" && (
              <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#fcd34d" }}>
                ⚠️ Accept to reveal seller and buyer contact details.
              </div>
            )}
          </div>

          {/* Actions */}
          {delivery.status === "Pending" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => onUpdate(delivery.id, "Declined")}
                style={{ flex: 1, background: "#7f1d1d22", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                ❌ Decline
              </button>
              <button onClick={() => onUpdate(delivery.id, "Accepted")}
                style={{ flex: 2, background: "#c8a97e", border: "none", color: "#000", padding: "12px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
                ✅ Accept Delivery — ₵{delivery.fee}
              </button>
            </div>
          )}

          {delivery.status === "Accepted" && (
            <button onClick={() => onUpdate(delivery.id, "PickedUp")}
              style={{ background: "#7c3aed", border: "none", color: "#fff", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
              📦 I've Picked Up the Item
            </button>
          )}

          {delivery.status === "PickedUp" && (
            <button onClick={() => onUpdate(delivery.id, "Delivered")}
              style={{ background: "#064e3b", border: "1px solid #065f46", color: "#6ee7b7", padding: "13px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>
              🎉 Mark as Delivered
            </button>
          )}

          {delivery.status === "Delivered" && (
            <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>🎉</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#6ee7b7" }}>Delivery Complete</div>
              <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>₵{delivery.fee} will be sent to your MTN MoMo</div>
            </div>
          )}

          {delivery.status === "Declined" && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", textAlign: "center", fontSize: "13px", color: "#fca5a5" }}>
              You declined this delivery. It has been reassigned.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RiderDashboard({ user, onClose }) {
  const [deliveries, setDeliveries] = useState(SAMPLE_DELIVERIES)
  const [activeTab, setActiveTab] = useState("active")
  const [earnings, setEarnings] = useState({ today: 30, week: 120, total: 480, pending: 10 })
  const [isOnline, setIsOnline] = useState(true)

  const activeDeliveries = deliveries.filter(d => ["Pending", "Accepted", "PickedUp"].includes(d.status))
  const completedDeliveries = deliveries.filter(d => d.status === "Delivered")
  const declinedDeliveries = deliveries.filter(d => d.status === "Declined")

  const handleUpdate = (id, newStatus) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d))
    if (newStatus === "Delivered") {
      setEarnings(e => ({ ...e, today: e.today + DELIVERY_FEE, week: e.week + DELIVERY_FEE, total: e.total + DELIVERY_FEE, pending: Math.max(0, e.pending - DELIVERY_FEE) }))
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "17px", fontWeight: "700" }}>🛵 Rider Dashboard</span>
            <div onClick={() => setIsOnline(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: isOnline ? "#064e3b22" : "#1e1e1e", border: `1px solid ${isOnline ? "#065f46" : "#333"}`, borderRadius: "20px", padding: "4px 12px", cursor: "pointer" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isOnline ? "#6ee7b7" : "#555" }} />
              <span style={{ fontSize: "12px", fontWeight: "600", color: isOnline ? "#6ee7b7" : "#555" }}>{isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Rider profile strip */}
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid #1e1e1e" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg,#c8a97e,#9a7040)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: "#000", flexShrink: 0 }}>
              {user?.name?.charAt(0)?.toUpperCase() || "R"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#f0ede8" }}>{user?.name || "Rider"}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>{user?.university || "Campus Rider"} · 🛵 Active Zone</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#c8a97e" }}>₵{earnings.total}</div>
              <div style={{ fontSize: "11px", color: "#555" }}>Total earned</div>
            </div>
          </div>

          {/* Earnings cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              ["Today", `₵${earnings.today}`, "#6ee7b7"],
              ["This Week", `₵${earnings.week}`, "#93c5fd"],
              ["Pending", `₵${earnings.pending}`, "#fcd34d"],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px", border: "1px solid #1e1e1e", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "3px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Offline warning */}
          {!isOnline && (
            <div style={{ background: "#78350f22", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fcd34d", textAlign: "center" }}>
              ⚠️ You're offline. You won't receive new delivery assignments.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", background: "#1a1a1a", borderRadius: "10px", padding: "4px", gap: "4px" }}>
            {[
              { id: "active", label: `Active (${activeDeliveries.length})` },
              { id: "completed", label: `Completed (${completedDeliveries.length})` },
              { id: "declined", label: `Declined (${declinedDeliveries.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "12px", fontFamily: "inherit", background: activeTab === t.id ? "#c8a97e" : "transparent", color: activeTab === t.id ? "#000" : "#666", transition: "all .2s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Active deliveries */}
          {activeTab === "active" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeDeliveries.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "32px", textAlign: "center", border: "1px solid #1e1e1e" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛵</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#888", marginBottom: "6px" }}>No active deliveries</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{isOnline ? "New assignments will appear here automatically." : "Go online to receive delivery assignments."}</div>
                </div>
              ) : (
                activeDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} onUpdate={handleUpdate} />)
              )}
            </div>
          )}

          {/* Completed deliveries */}
          {activeTab === "completed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {completedDeliveries.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "32px", textAlign: "center", border: "1px solid #1e1e1e", color: "#555", fontSize: "13px" }}>
                  No completed deliveries yet.
                </div>
              ) : (
                completedDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} onUpdate={handleUpdate} />)
              )}
            </div>
          )}

          {/* Declined deliveries */}
          {activeTab === "declined" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {declinedDeliveries.length === 0 ? (
                <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "32px", textAlign: "center", border: "1px solid #1e1e1e", color: "#555", fontSize: "13px" }}>
                  No declined deliveries.
                </div>
              ) : (
                declinedDeliveries.map(d => <DeliveryCard key={d.id} delivery={d} onUpdate={handleUpdate} />)
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}