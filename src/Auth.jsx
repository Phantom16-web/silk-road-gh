import { useState } from "react"
import "./AuthStyles.css"
import { AIcon } from "./AccountIcons"
import { registerUser, loginUser } from "./api"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

function Field({ id, label, icon, error, children }) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className={`au-input ${error ? "bad" : ""}`}>
        <AIcon name={icon} size={19} />
        {children}
      </div>
      {error && <div className="au-err" role="alert"><AIcon name="alert" size={14} />{error}</div>}
    </div>
  )
}

function PasswordInput({ id, value, onChange, placeholder, autoComplete, onEnter }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} onKeyDown={e => e.key === "Enter" && onEnter?.()} />
      <button type="button" className="au-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}><AIcon name={show ? "eyeoff" : "eye"} size={19} /></button>
    </>
  )
}

function strength(pw) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const METER = [["#3a352b", "Use at least 6 characters"], ["#e07474", "Weak"], ["#f0b45c", "Fair"], ["#9fd05c", "Good"], ["#4fbf8a", "Strong"]]

const toUser = data => ({
  _id: data._id, name: data.name, email: data.email, university: data.university, phone: data.phone, role: data.role,
  joined: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
})

function Shell({ onClose, title, sub, children }) {
  return (
    <div className="au-layer" onClick={onClose} role="presentation">
      <section className="au-card" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <aside className="au-side" aria-hidden="true">
          <span className="orb" />
          <div className="au-brand"><span className="au-logo">S</span><b>Silk Road</b></div>
          <div className="au-pitch">
            <h2>Your campus, <em>one tap away.</em></h2>
            <p>Buy, sell and rent with students you can trust, and get it delivered to your door.</p>
          </div>
          <ul className="au-perks">
            <li><span className="ic"><AIcon name="shield" size={18} /></span>Escrow keeps your money safe until delivery</li>
            <li><span className="ic"><AIcon name="bike" size={18} /></span>Verified riders deliver to your hostel</li>
            <li><span className="ic"><AIcon name="phone" size={18} /></span>Pay with MTN, Telecel or AT Mobile Money</li>
          </ul>
        </aside>
        <div className="au-main">
          <button type="button" className="au-close" onClick={onClose} aria-label="Close"><AIcon name="close" size={18} /></button>
          <h3>{title}</h3>
          <p className="au-sub">{sub}</p>
          {children}
        </div>
      </section>
    </div>
  )
}

// ── Sign in ──────────────────────────────────────────────────────────────────
function SignIn({ onAuth, onClose, onGoToSignUp }) {
  const [form, setForm] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const update = (field, value) => { setForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = "Please enter your email."
    else if (!form.email.includes("@")) e.email = "Please enter a valid email."
    if (!form.password.trim()) e.password = "Please enter your password."
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters."
    return e
  }
  const handleSubmit = async () => {
    if (loading) return
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setLoading(true); setServerError("")
    try {
      const data = await loginUser({ email: form.email, password: form.password })
      if (data.message) { setServerError(data.message); setLoading(false); return }
      localStorage.setItem("silkroad_token", data.token)
      onAuth(toUser(data))
    } catch { setServerError("Could not connect to server. Please check your connection.") }
    setLoading(false)
  }

  return (
    <Shell onClose={onClose} title="Welcome back" sub="Sign in to pick up where you left off.">
      <div className="au-form">
        <Field id="au-email" label="Email" icon="mail" error={errors.email}>
          <input id="au-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus />
        </Field>
        <Field id="au-pass" label="Password" icon="lock" error={errors.password}>
          <PasswordInput id="au-pass" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Your password" autoComplete="current-password" onEnter={handleSubmit} />
        </Field>
        {serverError && <div className="au-alert" role="alert"><AIcon name="alert" size={17} />{serverError}</div>}
        <button type="button" className="au-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="au-spin" />Signing in…</> : <>Sign in <AIcon name="arrow" size={19} stroke={2.5} /></>}
        </button>
      </div>
      <div className="au-switch">New to Silk Road?<button type="button" onClick={onGoToSignUp}>Create an account</button></div>
      <div className="au-secure"><AIcon name="lock" size={13} />Your details are encrypted</div>
      <p className="au-fine">By continuing you agree to Silk Road GH’s Terms and Privacy Policy.</p>
    </Shell>
  )
}

// ── Create account ───────────────────────────────────────────────────────────
function SignUp({ onAuth, onClose, onGoToSignIn }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", university: "", phone: "" })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const update = (field, value) => { setForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: undefined })) }
  const score = strength(form.password)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = "Please enter your full name."
    if (!form.university) e.university = "Please select your university."
    if (!form.phone.trim()) e.phone = "Please enter your phone number."
    if (!form.email.trim()) e.email = "Please enter your email."
    else if (!form.email.includes("@")) e.email = "Please enter a valid email."
    if (!form.password.trim()) e.password = "Please enter your password."
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters."
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match."
    return e
  }
  const handleSubmit = async () => {
    if (loading) return
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setLoading(true); setServerError("")
    try {
      const data = await registerUser({ name: form.name, email: form.email, password: form.password, university: form.university, phone: form.phone })
      if (data.message) { setServerError(data.message); setLoading(false); return }
      localStorage.setItem("silkroad_token", data.token)
      onAuth(toUser(data))
    } catch { setServerError("Could not connect to server. Please check your connection.") }
    setLoading(false)
  }

  return (
    <Shell onClose={onClose} title="Create your account" sub="Free forever. It takes less than a minute.">
      <div className="au-form">
        <Field id="au-name" label="Full name" icon="user" error={errors.name}>
          <input id="au-name" autoComplete="name" placeholder="e.g. Kwame Asante" value={form.name} onChange={e => update("name", e.target.value)} autoFocus />
        </Field>
        <div className="au-field">
          <span className="au-label">University</span>
          <div className="au-unis" role="radiogroup" aria-label="University">
            {UNIS.map(u => <button key={u} type="button" role="radio" aria-checked={form.university === u} className={form.university === u ? "on" : ""} onClick={() => update("university", u)}>{u}</button>)}
          </div>
          {errors.university && <div className="au-err" role="alert"><AIcon name="alert" size={14} />{errors.university}</div>}
        </div>
        <Field id="au-phone" label="Phone number" icon="phone" error={errors.phone}>
          <input id="au-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 0241234567" value={form.phone} onChange={e => update("phone", e.target.value)} />
        </Field>
        <Field id="au-email2" label="Email" icon="mail" error={errors.email}>
          <input id="au-email2" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} />
        </Field>
        <div className="au-row2">
          <div className="au-field">
            <Field id="au-pw1" label="Password" icon="lock" error={errors.password}>
              <PasswordInput id="au-pw1" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
            </Field>
            <div className="au-meter" aria-hidden="true">{[1, 2, 3, 4].map(n => <i key={n} style={{ background: score >= n ? METER[score][0] : undefined }} />)}</div>
            <span className="au-meter-txt">{form.password ? METER[score][1] : METER[0][1]}</span>
          </div>
          <Field id="au-pw2" label="Confirm password" icon="lock" error={errors.confirmPassword}>
            <PasswordInput id="au-pw2" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} placeholder="Re-enter password" autoComplete="new-password" onEnter={handleSubmit} />
          </Field>
        </div>
        {serverError && <div className="au-alert" role="alert"><AIcon name="alert" size={17} />{serverError}</div>}
        <button type="button" className="au-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="au-spin" />Creating account…</> : <>Create account <AIcon name="arrow" size={19} stroke={2.5} /></>}
        </button>
      </div>
      <div className="au-switch">Already have an account?<button type="button" onClick={onGoToSignIn}>Sign in</button></div>
      <p className="au-fine">By continuing you agree to Silk Road GH’s Terms and Privacy Policy.</p>
    </Shell>
  )
}

export default function Auth({ onAuth, onClose }) {
  const [screen, setScreen] = useState("signin")
  return screen === "signin"
    ? <SignIn onAuth={onAuth} onClose={onClose} onGoToSignUp={() => setScreen("signup")} />
    : <SignUp onAuth={onAuth} onClose={onClose} onGoToSignIn={() => setScreen("signin")} />
}
