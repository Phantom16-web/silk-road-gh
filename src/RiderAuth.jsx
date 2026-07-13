import { useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const UNIS     = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]
const VEHICLES = [
  { id: "motorbike", label: "🛵 Motorbike", desc: "Fastest, best for longer distances" },
  { id: "bicycle",   label: "🚲 Bicycle",   desc: "Eco-friendly, great on campus" },
  { id: "walking",   label: "🚶 Walking",   desc: "Short distances within campus" },
]

const inp = (err) => ({
  width: "100%", background: "#161616",
  border: `1px solid ${err ? "#991b1b" : "#1e1e1e"}`,
  color: "#fff", padding: "12px 16px", borderRadius: "10px",
  fontSize: "14px", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
})

export default function RiderAuth({ onAuth, onClose }) {
  const [mode, setMode]         = useState("login")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [errors, setErrors]     = useState({})

  const [form, setForm] = useState({
    name:      "",
    phone:     "",
    email:     "",
    password:  "",
    confirm:   "",
    university:"",
    vehicle:   "motorbike",
  })

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: "" }))
    setError("")
  }

  const validateRegister = () => {
    const e = {}
    if (!form.name.trim())     e.name     = "Name is required."
    if (!form.phone.trim())    e.phone    = "Phone is required."
    if (!form.email.trim())    e.email    = "Email is required."
    if (form.password.length < 6) e.password = "Password must be at least 6 characters."
    if (form.password !== form.confirm) e.confirm = "Passwords do not match."
    if (!form.university)      e.university = "Please select your university."
    return e
  }

  const handleSubmit = async () => {
    setError("")
    if (mode === "register") {
      const e = validateRegister()
      if (Object.keys(e).length > 0) { setErrors(e); return }
    }
    setLoading(true)
    try {
      const endpoint = mode === "login" ? "/rider-auth/login" : "/rider-auth/register"
      const body     = mode === "login"
        ? { email: form.email.trim(), password: form.password }
        : { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), password: form.password, university: form.university, vehicle: form.vehicle }

      const res  = await fetch(`${API_URL}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.message || "Something went wrong."); setLoading(false); return }

      // Store rider token separately from seller token
      localStorage.setItem("silkroad_rider_token", data.token)
      localStorage.setItem("silkroad_rider", JSON.stringify(data))
      onAuth(data)
    } catch {
      setError("Could not connect to server. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "460px", maxHeight: "92vh", overflowY: "auto", border: "1px solid #1e1e1e" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>🛵 Rider Portal</div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>Silk Road GH delivery network</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: "16px 24px", display: "flex", gap: "8px" }}>
          {[["login", "Log In"], ["register", "Sign Up"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setErrors({}) }}
              style={{ flex: 1, padding: "11px", borderRadius: "10px", border: `1.5px solid ${mode === m ? "#c8a97e" : "#1e1e1e"}`, background: mode === m ? "#c8a97e18" : "transparent", color: mode === m ? "#c8a97e" : "#555", cursor: "pointer", fontWeight: "700", fontSize: "14px", fontFamily: "inherit", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "0 24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {error && (
            <div style={{ background: "#7f1d1d18", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "#fca5a5" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Register only fields */}
          {mode === "register" && (
            <>
              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "7px", textTransform: "uppercase", letterSpacing: ".06em" }}>FULL NAME</div>
                <input placeholder="Your full name" value={form.name} onChange={e => set("name", e.target.value)} style={inp(errors.name)} />
                {errors.name && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.name}</div>}
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "7px", textTransform: "uppercase", letterSpacing: ".06em" }}>PHONE NUMBER</div>
                <input placeholder="e.g. 0241234567" value={form.phone} onChange={e => set("phone", e.target.value)} style={inp(errors.phone)} />
                {errors.phone && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.phone}</div>}
              </div>
            </>
          )}

          <div>
            <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "7px", textTransform: "uppercase", letterSpacing: ".06em" }}>EMAIL</div>
            <input placeholder="your@email.com" type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inp(errors.email)} />
            {errors.email && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.email}</div>}
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "7px", textTransform: "uppercase", letterSpacing: ".06em" }}>PASSWORD</div>
            <input placeholder="Min. 6 characters" type="password" value={form.password} onChange={e => set("password", e.target.value)} style={inp(errors.password)} />
            {errors.password && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.password}</div>}
          </div>

          {mode === "register" && (
            <>
              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "7px", textTransform: "uppercase", letterSpacing: ".06em" }}>CONFIRM PASSWORD</div>
                <input placeholder="Repeat your password" type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} style={inp(errors.confirm)} />
                {errors.confirm && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.confirm}</div>}
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>YOUR UNIVERSITY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "7px" }}>
                  {UNIS.map(u => (
                    <button key={u} onClick={() => set("university", u)}
                      style={{ padding: "9px 4px", borderRadius: "9px", border: `1.5px solid ${form.university === u ? "#c8a97e" : "#1e1e1e"}`, background: form.university === u ? "#c8a97e18" : "#161616", color: form.university === u ? "#c8a97e" : "#555", cursor: "pointer", fontWeight: "600", fontSize: "11px", textAlign: "center", fontFamily: "inherit" }}>
                      {u}
                    </button>
                  ))}
                </div>
                {errors.university && <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "5px" }}>⚠️ {errors.university}</div>}
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>VEHICLE TYPE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {VEHICLES.map(v => (
                    <button key={v.id} onClick={() => set("vehicle", v.id)}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: `1.5px solid ${form.vehicle === v.id ? "#c8a97e" : "#1e1e1e"}`, background: form.vehicle === v.id ? "#c8a97e18" : "#161616", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "24px" }}>{v.label.split(" ")[0]}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: form.vehicle === v.id ? "#c8a97e" : "#f0ede8" }}>{v.label.split(" ").slice(1).join(" ")}</div>
                        <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{v.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "#064e3b18", border: "1px solid #065f46", borderRadius: "12px", padding: "14px", fontSize: "13px", color: "#6ee7b7", lineHeight: "1.7" }}>
                ✅ By signing up you agree to Silk Road GH's delivery terms. You'll only see jobs when you're online.
              </div>
            </>
          )}

          <button className="btn-gold" onClick={handleSubmit} disabled={loading}
            style={{ padding: "14px", borderRadius: "12px", fontSize: "15px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "⏳ Please wait..." : mode === "login" ? "Log In as Rider →" : "Create Rider Account →"}
          </button>

          <div style={{ textAlign: "center", fontSize: "13px", color: "#555" }}>
            {mode === "login" ? "New rider? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setErrors({}) }}
              style={{ background: "transparent", border: "none", color: "#c8a97e", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
              {mode === "login" ? "Sign up here" : "Log in"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
