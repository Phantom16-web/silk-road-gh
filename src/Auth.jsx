import { useState } from "react"
import { registerUser, loginUser } from "./api"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

function PasswordField({ value, onChange, placeholder, show, onToggle, hasError }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder={placeholder}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          background: "#1e1e1e",
          border: `1px solid ${hasError ? "#991b1b" : "#333"}`,
          color: "#fff",
          padding: "12px 44px 12px 16px",
          borderRadius: "10px",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      <button onClick={onToggle} type="button"
        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: show ? "#c8a97e" : "#555", padding: 0 }}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  )
}

// ── SIGN IN ───────────────────────────────────────────────────────────────────
function SignIn({ onAuth, onClose, onGoToSignUp }) {
  const [form, setForm] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = "Please enter your email."
    if (!form.email.includes("@")) e.email = "Please enter a valid email."
    if (!form.password.trim()) e.password = "Please enter your password."
    if (form.password.length < 6) e.password = "Password must be at least 6 characters."
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setLoading(true)
    setServerError("")
    try {
      const data = await loginUser({ email: form.email, password: form.password })
      if (data.message) { setServerError(data.message); setLoading(false); return }
      localStorage.setItem("silkroad_token", data.token)
      onAuth({
        _id: data._id,
        name: data.name,
        email: data.email,
        university: data.university,
        phone: data.phone,
        role: data.role,
        joined: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      })
    } catch {
      setServerError("Could not connect to server. Please check your connection.")
    }
    setLoading(false)
  }

  const inputStyle = (field) => ({
    width: "100%",
    background: "#1e1e1e",
    border: `1px solid ${errors[field] ? "#991b1b" : "#333"}`,
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  })

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "440px", border: "1px solid #1e1e1e", overflow: "hidden" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#c8a97e,#9a7040)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🕸</div>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#f0ede8" }}>Silk Road GH</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Welcome back</h2>
            <p style={{ fontSize: "14px", color: "#666" }}>Sign in to your Silk Road GH account</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>EMAIL</div>
              <input
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={inputStyle("email")}
              />
              {errors.email && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.email}</div>}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontSize: "12px", color: "#888", fontWeight: "600" }}>PASSWORD</div>
                <span style={{ fontSize: "12px", color: "#c8a97e", cursor: "pointer" }}>Forgot password?</span>
              </div>
              <PasswordField
                value={form.password}
                onChange={e => update("password", e.target.value)}
                placeholder="Your password"
                show={showPassword}
                onToggle={() => setShowPassword(p => !p)}
                hasError={!!errors.password}
              />
              {errors.password && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.password}</div>}
            </div>
          </div>

          {serverError && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
              🚫 {serverError}
            </div>
          )}

          <button onClick={handleSubmit}
            style={{ background: "#c8a97e", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
            {loading ? "⏳ Signing in..." : "Sign In →"}
          </button>

          <div style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
            Don't have an account?{" "}
            <span onClick={onGoToSignUp} style={{ color: "#c8a97e", fontWeight: "700", cursor: "pointer" }}>
              Create one
            </span>
          </div>

          <div style={{ textAlign: "center", fontSize: "12px", color: "#444" }}>
            By continuing you agree to Silk Road GH's Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SIGN UP ───────────────────────────────────────────────────────────────────
function SignUp({ onAuth, onClose, onGoToSignIn }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", university: "", phone: "" })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = "Please enter your full name."
    if (!form.university) e.university = "Please select your university."
    if (!form.phone.trim()) e.phone = "Please enter your phone number."
    if (!form.email.trim()) e.email = "Please enter your email."
    if (!form.email.includes("@")) e.email = "Please enter a valid email."
    if (!form.password.trim()) e.password = "Please enter your password."
    if (form.password.length < 6) e.password = "Password must be at least 6 characters."
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match."
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setLoading(true)
    setServerError("")
    try {
      const data = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        university: form.university,
        phone: form.phone,
      })
      if (data.message) { setServerError(data.message); setLoading(false); return }
      localStorage.setItem("silkroad_token", data.token)
      onAuth({
        _id: data._id,
        name: data.name,
        email: data.email,
        university: data.university,
        phone: data.phone,
        role: data.role,
        joined: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      })
    } catch {
      setServerError("Could not connect to server. Please check your connection.")
    }
    setLoading(false)
  }

  const inputStyle = (field) => ({
    width: "100%",
    background: "#1e1e1e",
    border: `1px solid ${errors[field] ? "#991b1b" : "#333"}`,
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  })

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "460px", border: "1px solid #1e1e1e", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#c8a97e,#9a7040)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🕸</div>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#f0ede8" }}>Silk Road GH</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>

          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Create account</h2>
            <p style={{ fontSize: "14px", color: "#666" }}>Join thousands of students on Silk Road GH</p>
          </div>

          {/* Full name */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>FULL NAME</div>
            <input placeholder="e.g. Kwame Asante" value={form.name} onChange={e => update("name", e.target.value)} style={inputStyle("name")} />
            {errors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.name}</div>}
          </div>

          {/* University */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px" }}>UNIVERSITY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {UNIS.map(u => (
                <button key={u} onClick={() => update("university", u)}
                  style={{ padding: "8px 4px", borderRadius: "8px", border: `1.5px solid ${form.university === u ? "#c8a97e" : "#2a2a2a"}`, background: form.university === u ? "#c8a97e22" : "#1a1a1a", color: form.university === u ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "11px", textAlign: "center", fontFamily: "inherit" }}>
                  {u}
                </button>
              ))}
            </div>
            {errors.university && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.university}</div>}
          </div>

          {/* Phone */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>PHONE NUMBER</div>
            <input placeholder="e.g. 0241234567" value={form.phone} onChange={e => update("phone", e.target.value)} style={inputStyle("phone")} />
            {errors.phone && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.phone}</div>}
          </div>

          {/* Email */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>EMAIL</div>
            <input placeholder="you@example.com" type="email" value={form.email} onChange={e => update("email", e.target.value)} style={inputStyle("email")} />
            {errors.email && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.email}</div>}
          </div>

          {/* Password */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>PASSWORD</div>
            <PasswordField
              value={form.password}
              onChange={e => update("password", e.target.value)}
              placeholder="Min. 6 characters"
              show={showPassword}
              onToggle={() => setShowPassword(p => !p)}
              hasError={!!errors.password}
            />
            {errors.password && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.password}</div>}
          </div>

          {/* Confirm password */}
          <div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px" }}>CONFIRM PASSWORD</div>
            <PasswordField
              value={form.confirmPassword}
              onChange={e => update("confirmPassword", e.target.value)}
              placeholder="Re-enter your password"
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(p => !p)}
              hasError={!!errors.confirmPassword}
            />
            {errors.confirmPassword && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.confirmPassword}</div>}
          </div>

          {serverError && (
            <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
              🚫 {serverError}
            </div>
          )}

          <button onClick={handleSubmit}
            style={{ background: "#c8a97e", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>
            {loading ? "⏳ Creating account..." : "Create Account →"}
          </button>

          <div style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
            Already have an account?{" "}
            <span onClick={onGoToSignIn} style={{ color: "#c8a97e", fontWeight: "700", cursor: "pointer" }}>
              Sign in
            </span>
          </div>

          <div style={{ textAlign: "center", fontSize: "12px", color: "#444" }}>
            By continuing you agree to Silk Road GH's Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Auth Controller ───────────────────────────────────────────────────────────
export default function Auth({ onAuth, onClose }) {
  const [screen, setScreen] = useState("signin")

  if (screen === "signin") {
    return (
      <SignIn
        onAuth={onAuth}
        onClose={onClose}
        onGoToSignUp={() => setScreen("signup")}
      />
    )
  }

  return (
    <SignUp
      onAuth={onAuth}
      onClose={onClose}
      onGoToSignIn={() => setScreen("signin")}
    />
  )
}