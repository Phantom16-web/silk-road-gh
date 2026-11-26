import { useState } from "react"
import "./AuthStyles.css"
import { AIcon } from "./AccountIcons"

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
const VEHICLES = [["motorbike", "Motorbike", "bike"], ["bicycle", "Bicycle", "bike"], ["walking", "On foot", "user"]]

/** Rider login and application. Registration needs a clear face photo that an admin reviews before jobs unlock. */
export default function RiderAuth({ onAuth, onClose }) {
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", university: "UCC", vehicle: "motorbike" })
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showPw, setShowPw] = useState(false)
  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))
  const register = mode === "register"

  async function submit(e) {
    e.preventDefault()
    setError(""); setMessage("")
    if (register && (!photo || !photo.type.startsWith("image/"))) { setError("Upload a clear photograph of your face to apply as a rider."); return }
    if (register && form.password.length < 8) { setError("Password must contain at least 8 characters."); return }
    setBusy(true)
    try {
      const body = register ? new FormData() : JSON.stringify({ email: form.email, password: form.password })
      if (register) {
        for (const key of ["name", "phone", "email", "password", "university", "vehicle"]) body.append(key, form[key])
        body.append("photo", photo)
      }
      const response = await fetch(`${API}/rider-auth/${register ? "register" : "login"}`, { method: "POST", body, ...(register ? {} : { headers: { "Content-Type": "application/json" } }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || "Unable to continue. Please retry.")
      const rider = result.rider || result
      if (register) { setMessage(result.message || "Application received. We’ll review your photo and notify you once you’re approved."); setMode("login"); setPhoto(null); return }
      if (rider.isApproved === false || rider.photoReviewStatus === "pending" || rider.photoReviewStatus === "rejected") {
        setMessage("Signed in. Your application is awaiting identity approval, so you can’t accept jobs yet.")
      }
      onAuth?.(result)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const input = (name, label, icon, props = {}) => (
    <div className="au-field">
      <label htmlFor={`ra-${name}`}>{label}</label>
      <div className="au-input"><AIcon name={icon} size={19} /><input id={`ra-${name}`} name={name} value={form[name]} onChange={change} {...props} /></div>
    </div>
  )

  return (
    <div className="au-layer" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <section className="au-card" role="dialog" aria-modal="true" aria-label="Rider account">
        <aside className="au-side" aria-hidden="true">
          <span className="orb" />
          <div className="au-brand"><span className="au-logo">S</span><b>Silk Road Riders</b></div>
          <div className="au-pitch"><h2>Earn on your <em>own schedule.</em></h2><p>Deliver campus orders when you’re free. See the fee before you accept, and get paid for every confirmed delivery.</p></div>
          <ul className="au-perks">
            <li><span className="ic"><AIcon name="bolt" size={18} /></span>Jobs appear instantly, accept with one tap</li>
            <li><span className="ic"><AIcon name="wallet" size={18} /></span>Transparent fees, no surprises</li>
            <li><span className="ic"><AIcon name="shield" size={18} /></span>Verified riders only, for everyone’s safety</li>
          </ul>
        </aside>
        <div className="au-main">
          <button type="button" className="au-close" onClick={onClose} aria-label="Close"><AIcon name="close" size={18} /></button>
          <h3>{register ? "Apply to ride" : "Rider sign in"}</h3>
          <p className="au-sub">{register ? "Tell us about you. An admin reviews your photo before you can take jobs." : "Welcome back. Sign in to start delivering."}</p>
          <div className="au-unis" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }} role="tablist">
            {[["login", "Log in"], ["register", "Apply as rider"]].map(([value, text]) => (
              <button key={value} type="button" role="tab" aria-selected={mode === value} className={mode === value ? "on" : ""} onClick={() => { setMode(value); setError(""); setMessage("") }}>{text}</button>
            ))}
          </div>
          <form className="au-form" onSubmit={submit}>
            {register && <>
              {input("name", "Full name", "user", { required: true, autoComplete: "name" })}
              {input("phone", "Phone number", "phone", { required: true, autoComplete: "tel", type: "tel" })}
              {input("university", "University", "graduation")}
              <div className="au-field"><span className="au-label">How will you deliver?</span>
                <div className="au-unis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {VEHICLES.map(([value, text]) => <button key={value} type="button" className={form.vehicle === value ? "on" : ""} onClick={() => setForm(v => ({ ...v, vehicle: value }))}>{text}</button>)}
                </div></div>
              <div className="au-field"><label htmlFor="ra-photo">Clear photo of your face</label>
                <input id="ra-photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => setPhoto(e.target.files?.[0] || null)}
                  style={{ padding: 14, borderRadius: 16, border: "1.5px dashed #5a4a2e", background: "#141210", color: "#d7b982", fontSize: 14 }} />
                {photo && <span className="au-meter-txt">Selected: {photo.name}</span>}
                <span className="au-meter-txt">Face clearly visible, good light, no filters or sunglasses.</span></div>
            </>}
            {input("email", "Email", "mail", { type: "email", required: true, autoComplete: "email", inputMode: "email" })}
            <div className="au-field">
              <label htmlFor="ra-password">Password</label>
              <div className="au-input"><AIcon name="lock" size={19} />
                <input id="ra-password" name="password" type={showPw ? "text" : "password"} value={form.password} onChange={change} required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} />
                <button type="button" className="au-eye" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Hide password" : "Show password"}><AIcon name={showPw ? "eyeoff" : "eye"} size={19} /></button></div>
            </div>
            {error && <div className="au-alert" role="alert"><AIcon name="alert" size={17} />{error}</div>}
            {message && <div className="au-alert" role="status" style={{ color: "#a9ecc9", background: "#10231a55", borderColor: "#1f5c3f" }}><AIcon name="check" size={17} />{message}</div>}
            <button type="submit" className="au-submit" disabled={busy}>{busy ? <><span className="au-spin" />Please wait…</> : <>{register ? "Submit application" : "Sign in"} <AIcon name="arrow" size={19} stroke={2.5} /></>}</button>
          </form>
        </div>
      </section>
    </div>
  )
}
