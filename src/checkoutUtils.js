// src/checkoutUtils.js
// Pure helpers for the checkout flow (no React, no network) so the rules that matter
// (phone numbers, totals, payment instructions) can be tested on their own.

export const isMongoId = value => /^[a-f\d]{24}$/i.test(String(value ?? ""))

// ---- Ghana phone numbers ---------------------------------------------------
// Accepts 024 123 4567, 0241234567, +233 24 123 4567, 233241234567.
export function normalizeGhPhone(input) {
  const digits = String(input ?? "").replace(/[\s\-().]/g, "")
  const match = /^(?:\+233|233|0)(\d{9})$/.exec(digits)
  if (!match) return { ok: false, local: "", intl: "" }
  return { ok: true, local: "0" + match[1], intl: "+233" + match[1] }
}

// ---- Mobile money networks -------------------------------------------------
export const NETWORKS = {
  MTN: { key: "MTN", name: "MTN MoMo", ussd: "*170#", color: "#ffcc00", prefixes: ["24", "25", "53", "54", "55", "59"] },
  Telecel: { key: "Telecel", name: "Telecel Cash", ussd: "*110#", color: "#e60000", prefixes: ["20", "50"] },
  AT: { key: "AT", name: "AT Money", ussd: "*500#", color: "#1e88e5", prefixes: ["26", "27", "56", "57"] },
}
export const NETWORK_KEYS = Object.keys(NETWORKS)

// A hint only: numbers can be ported between networks, so the buyer can always switch.
export function guessNetwork(phone) {
  const parsed = normalizeGhPhone(phone)
  if (!parsed.ok) return null
  const prefix = parsed.local.slice(1, 3)
  return NETWORK_KEYS.find(key => NETWORKS[key].prefixes.includes(prefix)) || null
}

// Step-by-step instructions for paying the platform's receiving number FROM any network.
export function momoSteps({ from, to, amount, reference, number, accountName }) {
  const source = NETWORKS[from] || NETWORKS.MTN
  const target = NETWORKS[to] || NETWORKS.MTN
  const sameNetwork = source.key === target.key
  const steps = [
    `Dial ${source.ussd} on your ${source.name} line, or open your ${source.name} app.`,
    "Choose Send Money (or Transfer Money).",
    sameNetwork ? `Choose ${source.name} user.` : `Choose Other Networks, then ${target.name}.`,
    `Enter the number ${number}.${accountName ? ` The name shown should be ${accountName}.` : ""}`,
    `Enter the amount ${formatCedi(amount)} exactly.`,
  ]
  if (reference) steps.push(`If it asks for a reference or reason, enter ${reference}.`)
  steps.push("Approve with your PIN, then keep the confirmation SMS. It has the transaction ID you will need.")
  return steps
}

// ---- Money -----------------------------------------------------------------
export const formatCedi = value => `GH₵${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const formatCediShort = value => `GH₵${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
export const formatUsd = (cedis, rate) => `$${(Number(cedis || 0) / (Number(rate) || 1)).toFixed(2)}`
export const cartSubtotal = items => items.reduce((sum, item) => sum + Number(item.price || item.dailyRate || 0) * Number(item.qty || 1), 0)

// The server is the only source of truth for the amount. Reports whether its total is usable and
// whether it differs from what the buyer was shown.
export function checkServerTotal(serverTotal, shownTotal) {
  const total = Number(serverTotal)
  if (!Number.isFinite(total) || total <= 0) return { usable: false, total: 0, changed: false }
  return { usable: true, total, changed: Math.abs(total - Number(shownTotal)) > 0.01 }
}

// ---- Form rules ------------------------------------------------------------
export function validateDelivery({ locationText, pin, name, phone }) {
  const errors = {}
  if (!pin && String(locationText || "").trim().length < 5) errors.location = "Tell us where to deliver. Type your hostel or area, or tap “Use my current location”."
  if (String(name || "").trim().length < 2) errors.name = "Enter your name."
  if (!normalizeGhPhone(phone).ok) errors.phone = "Enter a Ghana phone number, like 024 123 4567."
  return errors
}

// With a GPS pin the coordinates are the location (riders can navigate to them) and the typed
// text rides along as the landmark. Without a pin the typed text is the location.
export function locationFields({ pin, locationText }) {
  const text = String(locationText || "").trim()
  if (pin) return { location: `${pin.lat},${pin.lng}`, landmark: text }
  return { location: text, landmark: "" }
}

export function buildCheckoutPayload({ cart, localOrderId, form }) {
  const items = cart.map(item => ({ listingId: item._id || item.id, quantity: Number(item.qty || 1) }))
  if (!items.length || items.some(item => !isMongoId(item.listingId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("Your cart contains an invalid listing or quantity.")
  }
  const phone = normalizeGhPhone(form.phone)
  if (!phone.ok) throw new Error("Enter a valid Ghana phone number.")
  const { location, landmark } = locationFields(form)
  return {
    items, localOrderId, location, landmark,
    extraInfo: String(form.extraInfo || "").trim(),
    contactInfo: phone.local,
    payerName: String(form.name || "").trim(),
    payerPhone: phone.local,
    promoCode: null,
  }
}

// ---- Payment status wording ------------------------------------------------
// tone: wait | review | ok | stop | alert
export function paymentStatusView(status) {
  switch (status) {
    case "pending": return { tone: "wait", title: "Waiting for your payment", detail: "Your order is saved. Complete payment below so the seller can start." }
    case "submitted":
    case "under_review": return { tone: "review", title: "We’re confirming your payment", detail: "You don’t need to do anything else. This page updates by itself." }
    case "verified": return { tone: "ok", title: "Payment confirmed", detail: "Your seller can now prepare your order." }
    case "cancelled": return { tone: "stop", title: "Order cancelled", detail: "No payment is needed for this order." }
    default: return { tone: "alert", title: "This order needs attention", detail: "Please contact Silk Road support before taking another step." }
  }
}

export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())
