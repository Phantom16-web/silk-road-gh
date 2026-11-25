import { useState, useEffect, useRef } from "react"

export const cedi = n => `GH\u20B5${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const cediShort = n => { const v = Number(n || 0); return v >= 10000 ? `GH\u20B5${(v / 1000).toFixed(1)}k` : `GH\u20B5${v.toLocaleString("en-GH", { maximumFractionDigits: 0 })}` }
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
export const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("silkroad_token") || ""}` })
export async function apiJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(data.message || "Something went wrong."), { status: response.status })
  return data
}

// Numbers glide up to their value instead of snapping.
export function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), begin = from.current, end = Number(target) || 0
    let frame
    const step = now => {
      const t = Math.min(1, (now - start) / ms), eased = 1 - Math.pow(1 - t, 3)
      setValue(begin + (end - begin) * eased)
      if (t < 1) frame = requestAnimationFrame(step); else from.current = end
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])
  return value
}
export const timeAgo = value => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" })
}

// Where an order is in its life, in plain words. Drives the stepper, the chip and which actions show.
export function orderStage(o) {
  if (o.paymentStatus === "released") return "settled"
  if (o.paymentStatus === "release_pending") return "releasing"
  const d = o.delivery, fs = o.fulfillmentStatus
  if (fs === "delivered_pending_otp") return "awaiting_code"
  if (fs === "delivery_in_progress") {
    if (!d || d.status === "pending") return "finding_rider"
    if (d.status === "accepted") return "rider_assigned"
    if (d.status === "picked_up") return "on_the_way"
    return "awaiting_code"
  }
  return "choose"
}
