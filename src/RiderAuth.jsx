import { useState } from "react"

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid #45403b", background: "#1b1b1b", color: "#fff", fontSize: 14 }
const labelStyle = { display: "grid", gap: 6, fontSize: 12, color: "#d6c7b3", fontWeight: 600 }

/** App.jsx already opens this modal via the Rider login button.
 * This replaces the active RiderAuth component; BecomeRider.jsx is a separate registration page.
 */
export default function RiderAuth({ onAuth, onClose }) {
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", university: "UCC", vehicle: "motorbike" })
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))
  async function submit(e) {
    e.preventDefault()
    setError(""); setMessage("")
    if (mode === "register" && (!photo || !photo.type.startsWith("image/"))) {
      setError("Upload a clear photograph of your face to apply as a rider."); return
    }
    if (mode === "register" && form.password.length < 8) {
      setError("Password must contain at least 8 characters."); return
    }
    setBusy(true)
    try {
      const register = mode === "register"
      const body = register ? new FormData() : JSON.stringify({ email: form.email, password: form.password })
      if (register) {
        for (const key of ["name", "phone", "email", "password", "university", "vehicle"]) body.append(key, form[key])
        body.append("photo", photo)
      }
      const response = await fetch(`${API}/rider-auth/${register ? "register" : "login"}`, {
        method: "POST", body,
        ...(register ? {} : { headers: { "Content-Type": "application/json" } }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || "Unable to continue. Please retry.")
      const rider = result.rider || result
      if (register) {
        setMessage(result.message || "Application received. Await administrative approval.")
        setMode("login")
        setPhoto(null)
        return
      }
      if (rider.isApproved === false || rider.photoReviewStatus === "pending" || rider.photoReviewStatus === "rejected") {
        setMessage("Signed in. Your rider application is awaiting identity/photo approval; you cannot accept jobs yet.")
      }
      onAuth?.(result)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
    style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#000b", display: "grid", placeItems: "center", padding: 16, overflowY: "auto" }}>
    <section role="dialog" aria-modal="true" aria-label="Rider account" style={{ background: "#111", border: "1px solid #4b3c29", color: "#f5efe8", borderRadius: 18, width: "100%", maxWidth: 460, padding: 24, boxSizing: "border-box", maxHeight: "95vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, color: "#d6b78a" }}>🛵 Silk Road Riders</h2>
        <button type="button" aria-label="Close" onClick={onClose} style={{ background: "transparent", border: 0, color: "#fff", fontSize: 26, cursor: "pointer" }}>×</button>
      </div>
      <p style={{ color: "#aaa", fontSize: 13 }}>Sign in or apply to deliver for Silk Road GH.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["login", "Log In"], ["register", "Apply as Rider"]].map(([value, text]) =>
          <button type="button" key={value} onClick={() => { setMode(value); setError(""); setMessage("") }}
            style={{ flex: 1, padding: 11, borderRadius: 9, border: "1px solid #66513b", background: mode === value ? "#d6b78a" : "#222", color: mode === value ? "#111" : "#eee", fontWeight: 700, cursor: "pointer" }}>{text}</button>)}
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        {mode === "register" && <>
          <label style={labelStyle}>Full name<input style={inputStyle} name="name" value={form.name} onChange={change} required autoComplete="name" /></label>
          <label style={labelStyle}>Phone number<input style={inputStyle} name="phone" value={form.phone} onChange={change} required autoComplete="tel" /></label>
          <label style={labelStyle}>University<input style={inputStyle} name="university" value={form.university} onChange={change} /></label>
          <label style={labelStyle}>Vehicle<select style={inputStyle} name="vehicle" value={form.vehicle} onChange={change}><option value="motorbike">Motorbike</option><option value="bicycle">Bicycle</option><option value="walking">Walking</option></select></label>
          <label style={labelStyle}>Clear face photograph<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => setPhoto(e.target.files?.[0] || null)} style={inputStyle} /></label>
          {photo && <p style={{ fontSize: 12, color: "#93c5fd", margin: 0 }}>Selected: {photo.name}</p>}
          <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>Your application remains pending until an administrator approves your photograph and account. Do not upload someone else's photograph.</p>
        </>}
        <label style={labelStyle}>Email<input type="email" style={inputStyle} name="email" value={form.email} onChange={change} required autoComplete="email" /></label>
        <label style={labelStyle}>Password<input type="password" style={inputStyle} name="password" value={form.password} onChange={change} required minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
        {error && <p role="alert" style={{ color: "#fca5a5", margin: 0, fontSize: 13 }}>{error}</p>}
        {message && <p role="status" style={{ color: "#86efac", margin: 0, fontSize: 13 }}>{message}</p>}
        <button type="submit" disabled={busy} style={{ padding: 13, border: 0, borderRadius: 10, background: "#d6b78a", color: "#111", fontWeight: 800, cursor: "pointer" }}>{busy ? "Please wait…" : mode === "register" ? "Submit Rider Application" : "Log In"}</button>
      </form>
    </section>
  </div>
}
