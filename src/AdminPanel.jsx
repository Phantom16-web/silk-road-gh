import { useState, useEffect, useCallback } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getAdminToken() { try { return localStorage.getItem("silkroad_admin_token") || null } catch { return null } }
function getAdminUser()  { try { return JSON.parse(localStorage.getItem("silkroad_admin_user") || "null") } catch { return null } }
function setAdminSession(token, user) {
  localStorage.setItem("silkroad_admin_token", token)
  localStorage.setItem("silkroad_admin_user", JSON.stringify(user))
}
function clearAdminSession() {
  localStorage.removeItem("silkroad_admin_token")
  localStorage.removeItem("silkroad_admin_user")
}

async function adminFetch(path, options = {}) {
  const token = getAdminToken()
  const res   = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#080808",
  surface:   "#0f0f0f",
  surface2:  "#161616",
  border:    "#1e1e1e",
  border2:   "#2a2a2a",
  gold:      "#c8a97e",
  goldDim:   "#c8a97e18",
  goldMid:   "#c8a97e44",
  green:     "#22c55e",
  greenDim:  "#22c55e18",
  red:       "#ef4444",
  redDim:    "#ef444418",
  blue:      "#3b82f6",
  blueDim:   "#3b82f618",
  yellow:    "#f59e0b",
  yellowDim: "#f59e0b18",
  text:      "#f0ede8",
  textMid:   "#888888",
  textDim:   "#444444",
}

const tier_meta = {
  owner:       { label: "Owner",       color: C.red,  dim: C.redDim  },
  super_admin: { label: "Super Admin", color: C.gold, dim: C.goldDim },
  admin:       { label: "Admin",       color: C.blue, dim: C.blueDim },
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Badge({ label, color, dim }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color, background: dim, border: `1px solid ${color}44`, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" }}>
      {label}
    </span>
  )
}

function StatusDot({ status }) {
  const map = {
    Active: C.green, Completed: C.green, completed: C.green,
    Suspended: C.red, Cancelled: C.red, cancelled: C.red, Refunded: C.red,
    "In Escrow": C.blue, accepted: C.blue, picked_up: C.blue,
    Pending: C.yellow, pending: C.yellow, "Pending Confirmation": C.yellow,
    Flagged: C.yellow, delivered: C.yellow,
  }
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: map[status] || C.textDim, marginRight: 6, flexShrink: 0 }} />
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ borderTop: `2px solid ${accent || C.border2}`, paddingTop: 14 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMid, marginTop: 6, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Table({ columns, rows, empty = "No records." }) {
  if (!rows.length) return (
    <div style={{ padding: "48px 0", textAlign: "center", color: C.textDim, fontSize: 13 }}>{empty}</div>
  )
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, color: C.textDim, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: "11px 14px", color: C.text, verticalAlign: "middle", whiteSpace: col.wrap ? "normal" : "nowrap" }}>
                  {col.render ? col.render(row) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 20, justifyContent: "flex-end" }}>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: page <= 1 ? C.textDim : C.text, padding: "6px 12px", borderRadius: 4, cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "inherit" }}>←</button>
      <span style={{ fontSize: 12, color: C.textMid }}>Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: page >= pages ? C.textDim : C.text, padding: "6px 12px", borderRadius: 4, cursor: page >= pages ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "inherit" }}>→</button>
    </div>
  )
}

function Input({ label, type = "text", value, onChange, placeholder, error, mono }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: C.textMid, fontWeight: 600 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: C.surface2, border: `1px solid ${error ? C.red : C.border}`, color: C.text, padding: "10px 14px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: mono ? "monospace" : "inherit", width: "100%", boxSizing: "border-box" }} />
      {error && <div style={{ fontSize: 11, color: C.red }}>{error}</div>}
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = "primary", size = "md", fullWidth }) {
  const variants = {
    primary: { bg: C.gold,     color: "#000",   border: C.gold    },
    danger:  { bg: C.redDim,   color: C.red,    border: C.red     },
    ghost:   { bg: "transparent", color: C.textMid, border: C.border },
    success: { bg: C.greenDim, color: C.green,  border: C.green   },
  }
  const sizes = { sm: "6px 12px", md: "10px 20px", lg: "13px 28px" }
  const v = variants[variant] || variants.primary
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.color, padding: sizes[size], borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: size === "sm" ? 11 : 13, fontFamily: "inherit", opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : "auto" }}>
      {children}
    </button>
  )
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>{"✕"}</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Alert({ type = "info", children }) {
  const map = { info: [C.blue, C.blueDim], warn: [C.yellow, C.yellowDim], error: [C.red, C.redDim], success: [C.green, C.greenDim] }
  const [color, bg] = map[type] || map.info
  return (
    <div style={{ background: bg, border: `1px solid ${color}44`, borderRadius: 6, padding: "11px 14px", fontSize: 12, color, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <div style={{ fontSize: 12, color: C.textDim }}>Loading...</div>
    </div>
  )
}

function EmptyState({ message }) {
  return <div style={{ padding: "60px 0", textAlign: "center", color: C.textDim, fontSize: 13 }}>{message}</div>
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>
}

function SearchBar({ value, onChange, onSearch, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 8, flex: 1 }}>
      <input
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSearch()}
        style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "8px 14px", borderRadius: 6, fontSize: 13, outline: "none", minWidth: 0 }}
      />
      <Btn size="sm" onClick={onSearch}>Search</Btn>
    </div>
  )
}

const fmt    = ts => ts ? new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
const fmtGHS = n  => `₵${(n || 0).toLocaleString()}`

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function OwnerLogin({ onSuccess }) {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [secretKey, setKey]     = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/owner/login", {
      method: "POST", body: JSON.stringify({ email, password, secretKey }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Login failed."); return }
    setAdminSession(data.token, { tier: "owner", email: data.email, unusedRecoveryCodes: data.unusedRecoveryCodes })
    onSuccess()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "12px 16px", fontSize: 12, color: C.red, lineHeight: 1.7 }}>
        <strong>Owner access.</strong> All actions are logged and audited.
      </div>
      <Input label="Email"            type="email"    value={email}     onChange={setEmail}     placeholder="owner@silkroadgh.com" />
      <Input label="Password"         type="password" value={password}  onChange={setPassword}  placeholder="••••••••••••••••" />
      <Input label="Owner Secret Key" type="password" value={secretKey} onChange={setKey}       placeholder="Your secret key" mono />
      {error && <Alert type="error">{error}</Alert>}
      <Btn onClick={handle} disabled={loading || !email || !password || !secretKey} fullWidth>
        {loading ? "Verifying..." : "Access Owner Panel"}
      </Btn>
    </div>
  )
}

function OwnerRecovery({ onSuccess, onBack }) {
  const [mode, setMode]       = useState("recovery")
  const [email, setEmail]     = useState("")
  const [code, setCode]       = useState("")
  const [ek1, setEk1]         = useState("")
  const [ek2, setEk2]         = useState("")
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  const handleRecovery = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/owner/recover", {
      method: "POST", body: JSON.stringify({ email, recoveryCode: code }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Recovery failed."); return }
    setAdminSession(data.token, { tier: "owner", email: data.email })
    onSuccess()
  }

  const handleEmergency = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/owner/emergency", {
      method: "POST", body: JSON.stringify({ email, emergencyKey1: ek1, emergencyKey2: ek2 }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Emergency access failed."); return }
    setAdminSession(data.token, { tier: "owner", email: data.email })
    onSuccess()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["recovery", "emergency"].map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, padding: 9, borderRadius: 6, border: `1px solid ${mode === m ? C.red : C.border}`, background: mode === m ? C.redDim : "transparent", color: mode === m ? C.red : C.textMid, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            {m === "recovery" ? "Recovery Code" : "Emergency Keys"}
          </button>
        ))}
      </div>
      <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="owner@silkroadgh.com" />
      {mode === "recovery"
        ? <Input label="Recovery Code" value={code} onChange={setCode} placeholder="XXXXXX-XXXXXX-XXXXXX" mono />
        : <>
            <Alert type="warn">Both emergency keys are required. They will be burned after use.</Alert>
            <Input label="Emergency Key 1" type="password" value={ek1} onChange={setEk1} placeholder="Emergency key 1" mono />
            <Input label="Emergency Key 2" type="password" value={ek2} onChange={setEk2} placeholder="Emergency key 2" mono />
          </>}
      {error && <Alert type="error">{error}</Alert>}
      <Btn onClick={mode === "recovery" ? handleRecovery : handleEmergency} disabled={loading} fullWidth variant="danger">
        {loading ? "Verifying..." : mode === "recovery" ? "Use Recovery Code" : "Use Emergency Keys"}
      </Btn>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.textMid, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
        {"←"} Back to login
      </button>
    </div>
  )
}

function SuperAdminLogin({ onSuccess }) {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [secretKey, setKey]     = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/super-admin/login", {
      method: "POST", body: JSON.stringify({ email, password, secretKey }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Login failed."); return }
    setAdminSession(data.token, data.admin)
    onSuccess()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input label="Email"      type="email"    value={email}     onChange={setEmail}     placeholder="superadmin@silkroadgh.com" />
      <Input label="Password"   type="password" value={password}  onChange={setPassword}  placeholder="••••••••••••" />
      <Input label="Secret Key" type="password" value={secretKey} onChange={setKey}       placeholder="Your assigned secret key" mono />
      {error && <Alert type="error">{error}</Alert>}
      <Btn onClick={handle} disabled={loading || !email || !password || !secretKey} fullWidth>
        {loading ? "Verifying..." : "Sign In"}
      </Btn>
    </div>
  )
}

function AdminLogin({ onSuccess }) {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/admin/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Login failed."); return }
    setAdminSession(data.token, data.admin)
    onSuccess()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input label="Email"    type="email"    value={email}    onChange={setEmail}    placeholder="admin@silkroadgh.com" />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••" />
      {error && <Alert type="error">{error}</Alert>}
      <Btn onClick={handle} disabled={loading || !email || !password} fullWidth>
        {loading ? "Signing in..." : "Sign In"}
      </Btn>
    </div>
  )
}

function LoginScreen({ onSuccess }) {
  const [tier, setTier]         = useState("admin")
  const [recovery, setRecovery] = useState(false)

  const tierConfig = {
    owner:       { label: "Owner",       accent: C.red,  desc: "Root platform authority"  },
    super_admin: { label: "Super Admin", accent: C.gold, desc: "Platform administration"  },
    admin:       { label: "Admin",       accent: C.blue, desc: "Operational access"       },
  }
  const tc = tierConfig[tier]

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.gold}, #9a7040)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"🕸"}</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.gold, letterSpacing: "-0.02em" }}>Silk Road GH</span>
          </div>
          <div style={{ fontSize: 12, color: C.textDim, letterSpacing: ".04em" }}>ADMINISTRATION PORTAL</div>
        </div>

        <div style={{ display: "flex", gap: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, marginBottom: 28 }}>
          {Object.entries(tierConfig).map(([t, cfg]) => (
            <button key={t} onClick={() => { setTier(t); setRecovery(false) }}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 6, border: "none", background: tier === t ? C.surface2 : "transparent", color: tier === t ? cfg.accent : C.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
              {cfg.label}
            </button>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${tier === "owner" ? C.red + "44" : tier === "super_admin" ? C.goldMid : C.border}`, borderRadius: 10, padding: 28 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {recovery ? "Account Recovery" : `${tc.label} Login`}
            </div>
            <div style={{ fontSize: 12, color: C.textMid }}>{tc.desc}</div>
          </div>

          {tier === "owner" && !recovery && <OwnerLogin onSuccess={onSuccess} />}
          {tier === "owner" &&  recovery  && <OwnerRecovery onSuccess={onSuccess} onBack={() => setRecovery(false)} />}
          {tier === "super_admin"          && <SuperAdminLogin onSuccess={onSuccess} />}
          {tier === "admin"                && <AdminLogin onSuccess={onSuccess} />}

          {tier === "owner" && !recovery && (
            <button onClick={() => setRecovery(true)}
              style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer", fontSize: 11, fontFamily: "inherit", marginTop: 16, display: "block", width: "100%", textAlign: "center" }}>
              Lost access? Use recovery code or emergency keys →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-AUTH MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ReAuthModal({ onSuccess, onClose }) {
  const [password, setPassword] = useState("")
  const [secretKey, setKey]     = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    setError(""); setLoading(true)
    const { ok, data } = await adminFetch("/admin-auth/owner/reauth", {
      method: "POST", body: JSON.stringify({ password, secretKey }),
    })
    setLoading(false)
    if (!ok) { setError(data.message || "Re-auth failed."); return }
    onSuccess(data.reAuthToken)
  }

  return (
    <Modal title="Re-authentication Required" onClose={onClose} width={400}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Alert type="warn">Critical action. Re-enter your credentials to proceed. Expires in 5 minutes.</Alert>
        <Input label="Password"         type="password" value={password}  onChange={setPassword} placeholder="Your password" />
        <Input label="Owner Secret Key" type="password" value={secretKey} onChange={setKey}      placeholder="Your secret key" mono />
        {error && <Alert type="error">{error}</Alert>}
        <Btn onClick={handle} disabled={loading || !password || !secretKey} fullWidth>
          {loading ? "Verifying..." : "Confirm Identity"}
        </Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch("/admin/dashboard").then(({ data }) => { setData(data); setLoading(false) })
  }, [])

  if (loading) return <LoadingState />
  if (!data)   return <EmptyState message="Could not load dashboard." />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <div>
        <SectionTitle>Platform Overview</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20, marginTop: 20 }}>
          <Stat label="Total Users"       value={data.users?.toLocaleString()}            accent={C.gold}  />
          <Stat label="Active Listings"   value={data.listings?.toLocaleString()}                          />
          <Stat label="Total Orders"      value={data.orders?.toLocaleString()}                            />
          <Stat label="Riders"            value={data.riders?.toLocaleString()}            accent={C.blue} />
          <Stat label="Active Deliveries" value={data.activeDeliveries?.toLocaleString()}  accent={C.blue} />
          <Stat label="Completed Orders"  value={data.completedOrders?.toLocaleString()}   accent={C.green}/>
        </div>
      </div>
      <div>
        <SectionTitle>Financials</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20, marginTop: 20 }}>
          <Stat label="Platform Revenue"  value={fmtGHS(data.revenue)}      accent={C.gold}   sub="Completed orders" />
          <Stat label="Total GMV"         value={fmtGHS(data.totalVolume)}   accent={C.green}  sub="Gross merchandise value" />
          <Stat label="In Escrow"         value={fmtGHS(data.escrowHeld)}    accent={C.yellow} sub="Held pending delivery" />
          <Stat label="Pending Orders"    value={data.pendingOrders}         accent={C.yellow} />
          <Stat label="Escrow Orders"     value={data.escrowOrders}          accent={C.blue}   />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [search, setSearch]   = useState("")
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/users?page=${p}&search=${encodeURIComponent(q)}&limit=30`)
    setUsers(data.users || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }, [search])

  useEffect(() => { load(1) }, [])

  const suspend   = async u => { await adminFetch(`/admin/users/${u._id}/suspend`,   { method: "PUT", body: JSON.stringify({ reason: "Suspended by admin" }) }); load(page) }
  const reinstate = async u => { await adminFetch(`/admin/users/${u._id}/reinstate`,  { method: "PUT" }); load(page) }

  const columns = [
    { key: "name",       label: "Name",       render: u => <span style={{ color: C.text, fontWeight: 600 }}>{u.name}</span> },
    { key: "email",      label: "Email",      render: u => <span style={{ color: C.textMid, fontSize: 12 }}>{u.email}</span> },
    { key: "university", label: "University", render: u => u.university || "—" },
    { key: "status",     label: "Status",     render: u => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={u.status || "Active"} />{u.status || "Active"}</span> },
    { key: "createdAt",  label: "Joined",     render: u => fmt(u.createdAt) },
    { key: "actions",    label: "",           render: u => (
      <div style={{ display: "flex", gap: 6 }}>
        {u.status === "Suspended"
          ? <Btn size="sm" variant="success" onClick={() => setConfirm({ action: "reinstate", user: u })}>Reinstate</Btn>
          : <Btn size="sm" variant="danger"  onClick={() => setConfirm({ action: "suspend",   user: u })}>Suspend</Btn>}
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <SectionTitle>Users <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total})</span></SectionTitle>
        <SearchBar value={search} onChange={setSearch} onSearch={() => load(1, search)} placeholder="Search name or email..." />
      </div>
      {loading ? <LoadingState /> : <Table columns={columns} rows={users} empty="No users found." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
      {confirm && (
        <Modal title={confirm.action === "suspend" ? "Suspend User" : "Reinstate User"} onClose={() => setConfirm(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: C.textMid, fontSize: 13, margin: 0 }}>
              {confirm.action === "suspend"
                ? `Suspend ${confirm.user.name}? They will lose access to their account.`
                : `Reinstate ${confirm.user.name}?`}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
              <Btn variant={confirm.action === "suspend" ? "danger" : "success"} onClick={async () => {
                confirm.action === "suspend" ? await suspend(confirm.user) : await reinstate(confirm.user)
                setConfirm(null)
              }}>{confirm.action === "suspend" ? "Suspend" : "Reinstate"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ListingsTab() {
  const [listings, setListings] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [search, setSearch]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [confirm, setConfirm]   = useState(null)

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/listings?page=${p}&search=${encodeURIComponent(q)}&limit=30`)
    setListings(data.listings || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }, [search])

  useEffect(() => { load(1) }, [])

  const flag   = async l => { await adminFetch(`/admin/listings/${l._id}/flag`, { method: "PUT" }); load(page) }
  const remove = async l => { await adminFetch(`/admin/listings/${l._id}`,       { method: "DELETE" }); load(page) }

  const columns = [
    { key: "image",    label: "",         render: l => l.image ? <img src={l.image} alt={l.title} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} /> : <div style={{ width: 36, height: 36, background: C.surface2, borderRadius: 4 }} /> },
    { key: "title",    label: "Title",    render: l => <span style={{ color: C.text, fontWeight: 600 }}>{l.title}</span>, wrap: true },
    { key: "category", label: "Category" },
    { key: "seller",   label: "Seller",   render: l => l.seller?.name || "—" },
    { key: "price",    label: "Price",    render: l => l.price ? fmtGHS(l.price) : l.dailyRate ? `${fmtGHS(l.dailyRate)}/day` : "—" },
    { key: "status",   label: "Status",   render: l => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={l.status || "Active"} />{l.status || "Active"}</span> },
    { key: "actions",  label: "",         render: l => (
      <div style={{ display: "flex", gap: 6 }}>
        {l.status !== "Flagged" && <Btn size="sm" variant="ghost" onClick={() => setConfirm({ action: "flag", listing: l })}>Flag</Btn>}
        <Btn size="sm" variant="danger" onClick={() => setConfirm({ action: "remove", listing: l })}>Remove</Btn>
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <SectionTitle>Listings <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total})</span></SectionTitle>
        <SearchBar value={search} onChange={setSearch} onSearch={() => load(1, search)} placeholder="Search title or category..." />
      </div>
      {loading ? <LoadingState /> : <Table columns={columns} rows={listings} empty="No listings found." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
      {confirm && (
        <Modal title={confirm.action === "flag" ? "Flag Listing" : "Remove Listing"} onClose={() => setConfirm(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: C.textMid, fontSize: 13, margin: 0 }}>
              {confirm.action === "flag"
                ? `Flag "${confirm.listing.title}"? It will be marked for review.`
                : `Permanently remove "${confirm.listing.title}"? This cannot be undone.`}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={async () => {
                confirm.action === "flag" ? await flag(confirm.listing) : await remove(confirm.listing)
                setConfirm(null)
              }}>{confirm.action === "flag" ? "Flag" : "Remove Permanently"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders]   = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [search, setSearch]   = useState("")
  const [status, setStatus]   = useState("")
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [msg, setMsg]         = useState("")

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/orders?page=${p}&limit=30&search=${encodeURIComponent(search)}&status=${status}`)
    setOrders(data.orders || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }, [search, status])

  useEffect(() => { load(1) }, [status])

  const doAction = async (action, order) => {
    const path = action === "release" ? `/admin/orders/${order._id}/release` : `/admin/orders/${order._id}/refund`
    const { ok, data } = await adminFetch(path, { method: "PUT", body: JSON.stringify({ reason: "Admin action" }) })
    if (ok) { setMsg(data.message); load(page) }
    setConfirm(null)
  }

  const columns = [
    { key: "localOrderId", label: "Order ID",  render: o => <span style={{ fontFamily: "monospace", color: C.gold, fontSize: 12 }}>{o.localOrderId || o._id?.slice(-8)}</span> },
    { key: "buyer",        label: "Buyer",      render: o => o.buyer?.name || o.payerName || "Guest" },
    { key: "seller",       label: "Seller",     render: o => o.seller?.name || "—" },
    { key: "amount",       label: "Amount",     render: o => <span style={{ color: C.gold, fontWeight: 700 }}>{fmtGHS(o.amount)}</span> },
    { key: "status",       label: "Status",     render: o => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={o.status} />{o.status}</span> },
    { key: "createdAt",    label: "Date",       render: o => fmt(o.createdAt) },
    { key: "actions",      label: "",           render: o => (
      <div style={{ display: "flex", gap: 6 }}>
        {(o.status === "In Escrow" || o.status === "Pending Confirmation") && (
          <>
            <Btn size="sm" variant="success" onClick={() => setConfirm({ action: "release", order: o })}>Release</Btn>
            <Btn size="sm" variant="danger"  onClick={() => setConfirm({ action: "refund",  order: o })}>Refund</Btn>
          </>
        )}
      </div>
    )},
  ]

  const statuses = ["", "In Escrow", "Pending Confirmation", "Completed", "Refunded", "Cancelled"]

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <SectionTitle>Orders <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total})</span></SectionTitle>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
          {statuses.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
        <SearchBar value={search} onChange={setSearch} onSearch={() => load(1)} placeholder="Search by Order ID..." />
      </div>
      {msg && <div style={{ marginBottom: 16 }}><Alert type="success">{msg}</Alert></div>}
      {loading ? <LoadingState /> : <Table columns={columns} rows={orders} empty="No orders found." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
      {confirm && (
        <Modal title={confirm.action === "release" ? "Release Payment" : "Issue Refund"} onClose={() => setConfirm(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Alert type={confirm.action === "release" ? "info" : "warn"}>
              {confirm.action === "release"
                ? `Release ${fmtGHS(confirm.order.amount)} to the seller?`
                : `Refund ${fmtGHS(confirm.order.amount)} to buyer? This cannot be undone.`}
            </Alert>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
              <Btn variant={confirm.action === "release" ? "success" : "danger"} onClick={() => doAction(confirm.action, confirm.order)}>
                {confirm.action === "release" ? "Release Payment" : "Issue Refund"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function RidersTab() {
  const [riders, setRiders]   = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [search, setSearch]   = useState("")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/riders?page=${p}&search=${encodeURIComponent(q)}&limit=30`)
    setRiders(data.riders || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }, [search])

  useEffect(() => { load(1) }, [])

  const toggle = async rider => {
    const path = rider.isActive ? `/admin/riders/${rider._id}/deactivate` : `/admin/riders/${rider._id}/activate`
    await adminFetch(path, { method: "PUT" })
    load(page)
  }

  const columns = [
    { key: "name",            label: "Name",       render: r => <span style={{ color: C.text, fontWeight: 600 }}>{r.name}</span> },
    { key: "phone",           label: "Phone" },
    { key: "vehicle",         label: "Vehicle" },
    { key: "totalDeliveries", label: "Deliveries", render: r => r.totalDeliveries || 0 },
    { key: "totalEarned",     label: "Earned",     render: r => fmtGHS(r.totalEarned) },
    { key: "status",          label: "Status",     render: r => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={r.isActive ? "Active" : "Suspended"} />{r.isActive ? "Active" : "Inactive"}</span> },
    { key: "actions",         label: "",           render: r => <Btn size="sm" variant={r.isActive ? "danger" : "success"} onClick={() => toggle(r)}>{r.isActive ? "Deactivate" : "Activate"}</Btn> },
  ]

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <SectionTitle>Riders <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total})</span></SectionTitle>
        <SearchBar value={search} onChange={setSearch} onSearch={() => load(1, search)} placeholder="Search name or phone..." />
      </div>
      {loading ? <LoadingState /> : <Table columns={columns} rows={riders} empty="No riders found." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERIES TAB
// ─────────────────────────────────────────────────────────────────────────────

function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [pages, setPages]           = useState(1)
  const [status, setStatus]         = useState("")
  const [loading, setLoading]       = useState(false)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/deliveries?page=${p}&limit=30&status=${status}`)
    setDeliveries(data.deliveries || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }, [status])

  useEffect(() => { load(1) }, [status])

  const statuses = ["", "pending", "accepted", "picked_up", "delivered", "completed", "cancelled"]

  const columns = [
    { key: "localOrderId", label: "Order",    render: d => <span style={{ fontFamily: "monospace", color: C.gold, fontSize: 12 }}>{d.localOrderId || "—"}</span> },
    { key: "itemTitle",    label: "Item",     render: d => d.itemTitle || "—", wrap: true },
    { key: "rider",        label: "Rider",    render: d => d.rider?.name || "Unassigned" },
    { key: "distanceKm",   label: "Distance", render: d => d.distanceKm ? `${d.distanceKm} km` : "—" },
    { key: "deliveryFee",  label: "Fee",      render: d => fmtGHS(d.deliveryFee) },
    { key: "status",       label: "Status",   render: d => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={d.status} />{d.status}</span> },
    { key: "createdAt",    label: "Date",     render: d => fmt(d.createdAt) },
  ]

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <SectionTitle>Deliveries <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total})</span></SectionTitle>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
          {statuses.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
      </div>
      {loading ? <LoadingState /> : <Table columns={columns} rows={deliveries} empty="No deliveries found." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE TAB
// ─────────────────────────────────────────────────────────────────────────────

function FinanceTab() {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [from, setFrom]       = useState("")
  const [to, setTo]           = useState("")

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to)   params.set("to",   to)
    const { data } = await adminFetch(`/admin/reports/financial?${params}`)
    setReport(data); setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <SectionTitle>Financial Reports</SectionTitle>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: C.textMid, fontWeight: 600 }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, color: C.textMid, fontWeight: 600 }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          </div>
          <Btn onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply"}</Btn>
          <Btn variant="ghost" onClick={() => { setFrom(""); setTo(""); setTimeout(load, 50) }}>Reset</Btn>
        </div>
      </div>

      {loading && <LoadingState />}

      {report && !loading && (
        <>
          <div>
            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 16 }}>SUMMARY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
              <Stat label="Platform Revenue"  value={fmtGHS(report.summary?.totalRevenue)}  accent={C.gold}  />
              <Stat label="Total GMV"         value={fmtGHS(report.summary?.totalVolume)}   accent={C.green} />
              <Stat label="Completed Orders"  value={report.summary?.totalOrders}            />
              <Stat label="Avg. Order Value"  value={fmtGHS(report.summary?.avgOrderValue)} />
            </div>
          </div>

          {report.byMethod?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 16 }}>BY PAYMENT METHOD</div>
              <Table columns={[
                { key: "_id",   label: "Method", render: r => r._id || "Unknown" },
                { key: "count", label: "Orders" },
                { key: "total", label: "Volume", render: r => fmtGHS(r.total) },
              ]} rows={report.byMethod} />
            </div>
          )}

          {report.topSellers?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 16 }}>TOP SELLERS</div>
              <Table columns={[
                { key: "sellerName",    label: "Seller",  render: r => <span style={{ color: C.text, fontWeight: 600 }}>{r.sellerName || "—"}</span> },
                { key: "orderCount",    label: "Orders" },
                { key: "totalSales",    label: "GMV",     render: r => fmtGHS(r.totalSales) },
                { key: "totalEarnings", label: "Earned",  render: r => fmtGHS(r.totalEarnings) },
              ]} rows={report.topSellers} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY TAB
// ─────────────────────────────────────────────────────────────────────────────

function SecurityTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch("/admin/security/activity").then(({ data }) => { setData(data); setLoading(false) })
  }, [])

  if (loading) return <LoadingState />
  if (!data)   return <EmptyState message="Could not load security data." />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {data.suspicious?.length > 0 && (
        <div>
          <SectionTitle>Suspicious Activity</SectionTitle>
          <div style={{ marginTop: 8, marginBottom: 16 }}><Alert type="warn">Multiple orders from the same phone within 1 hour.</Alert></div>
          <Table columns={[
            { key: "_id",    label: "Phone",       render: r => <span style={{ fontFamily: "monospace", color: C.yellow }}>{r._id}</span> },
            { key: "count",  label: "Order Count", render: r => <span style={{ color: C.red, fontWeight: 700 }}>{r.count}</span> },
            { key: "orders", label: "Order IDs",   render: r => <span style={{ fontSize: 11, color: C.textMid }}>{r.orders?.join(", ")}</span>, wrap: true },
          ]} rows={data.suspicious} />
        </div>
      )}

      {data.suspendedUsers?.length > 0 && (
        <div>
          <SectionTitle>Suspended Users</SectionTitle>
          <Table columns={[
            { key: "name",        label: "Name",         render: u => <span style={{ color: C.text }}>{u.name}</span> },
            { key: "email",       label: "Email",        render: u => <span style={{ color: C.textMid, fontSize: 12 }}>{u.email}</span> },
            { key: "suspendedAt", label: "Suspended At", render: u => fmt(u.suspendedAt) },
          ]} rows={data.suspendedUsers} empty="No suspended users." />
        </div>
      )}

      {data.flaggedListings?.length > 0 && (
        <div>
          <SectionTitle>Flagged Listings</SectionTitle>
          <Table columns={[
            { key: "title",  label: "Title",  render: l => <span style={{ color: C.text }}>{l.title}</span>, wrap: true },
            { key: "seller", label: "Seller", render: l => l.seller?.name || "—" },
          ]} rows={data.flaggedListings} empty="No flagged listings." />
        </div>
      )}

      {!data.suspicious?.length && !data.suspendedUsers?.length && !data.flaggedListings?.length && (
        <EmptyState message="No security alerts at this time." />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────

function AdminsTab({ adminUser, reAuthToken, onNeedReAuth }) {
  const [admins, setAdmins]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setCreate]   = useState(false)
  const [createMode, setCreateMode] = useState("admin")
  const [confirm, setConfirm]     = useState(null)

  const [saName, setSaName]         = useState("")
  const [saEmail, setSaEmail]       = useState("")
  const [saPassword, setSaPassword] = useState("")
  const [saError, setSaError]       = useState("")
  const [saResult, setSaResult]     = useState(null)

  const [aName, setAName]         = useState("")
  const [aEmail, setAEmail]       = useState("")
  const [aPassword, setAPassword] = useState("")
  const [aRole, setARole]         = useState("support")
  const [aError, setAError]       = useState("")

  const ROLES = ["operations","user_seller","finance","dispute","moderation","support","delivery","security"]

  const load = async () => {
    setLoading(true)
    const { data } = await adminFetch("/admin-auth/admins")
    setAdmins(data.admins || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createSuperAdmin = async () => {
    if (!reAuthToken) { onNeedReAuth(); return }
    setSaError("")
    const { ok, data } = await adminFetch("/admin-auth/super-admin/create", {
      method: "POST", headers: { "x-reauth-token": reAuthToken },
      body: JSON.stringify({ name: saName, email: saEmail, password: saPassword }),
    })
    if (!ok) { setSaError(data.message || "Failed."); return }
    setSaResult(data); load()
  }

  const createAdmin = async () => {
    setAError("")
    const { ok, data } = await adminFetch("/admin-auth/admin/create", {
      method: "POST",
      body: JSON.stringify({ name: aName, email: aEmail, password: aPassword, role: aRole }),
    })
    if (!ok) { setAError(data.message || "Failed."); return }
    setCreate(false); setAName(""); setAEmail(""); setAPassword(""); setARole("support"); load()
  }

  const suspend   = async a => { await adminFetch(`/admin-auth/admin/${a._id}/suspend`,   { method: "PUT" }); load() }
  const reinstate = async a => { await adminFetch(`/admin-auth/admin/${a._id}/reinstate`,  { method: "PUT" }); load() }
  const revoke    = async a => {
    if (!reAuthToken) { onNeedReAuth(); return }
    await adminFetch(`/admin-auth/super-admin/${a._id}/revoke`, { method: "DELETE", headers: { "x-reauth-token": reAuthToken } })
    load()
  }
  const deleteAdmin = async a => {
    if (!reAuthToken) { onNeedReAuth(); return }
    await adminFetch(`/admin-auth/admin/${a._id}`, { method: "DELETE", headers: { "x-reauth-token": reAuthToken } })
    load(); setConfirm(null)
  }

  const columns = [
    { key: "name",      label: "Name",     render: a => <span style={{ color: C.text, fontWeight: 600 }}>{a.name}</span> },
    { key: "email",     label: "Email",    render: a => <span style={{ color: C.textMid, fontSize: 12 }}>{a.email}</span> },
    { key: "tier",      label: "Role",     render: a => a.tier === "super_admin" ? <Badge label="Super Admin" color={C.gold} dim={C.goldDim} /> : <Badge label={a.role || "admin"} color={C.blue} dim={C.blueDim} /> },
    { key: "lastLogin", label: "Last Login", render: a => fmt(a.lastLogin) },
    { key: "status",    label: "Status",   render: a => <span style={{ display: "flex", alignItems: "center" }}><StatusDot status={a.isActive ? "Active" : "Suspended"} />{a.isActive ? "Active" : "Suspended"}</span> },
    { key: "actions",   label: "",         render: a => (
      <div style={{ display: "flex", gap: 6 }}>
        {a.tier === "super_admin" && adminUser.tier === "owner" && (
          <Btn size="sm" variant="danger" onClick={() => revoke(a)}>Revoke</Btn>
        )}
        {a.tier === "admin" && (
          <>
            {a.isActive
              ? <Btn size="sm" variant="danger"   onClick={() => suspend(a)}>Suspend</Btn>
              : <Btn size="sm" variant="success"  onClick={() => reinstate(a)}>Reinstate</Btn>}
            {adminUser.tier === "owner" && (
              <Btn size="sm" variant="danger" onClick={() => setConfirm({ action: "delete", admin: a })}>Delete</Btn>
            )}
          </>
        )}
      </div>
    )},
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SectionTitle>Admin Accounts</SectionTitle>
        <div style={{ flex: 1 }} />
        {adminUser.tier === "owner" && (
          <Btn size="sm" onClick={() => { setCreateMode("super_admin"); setCreate(true); setSaResult(null) }}>
            + New Super Admin
          </Btn>
        )}
        <Btn size="sm" variant="ghost" onClick={() => { setCreateMode("admin"); setCreate(true) }}>
          + New Admin
        </Btn>
      </div>

      {loading ? <LoadingState /> : <Table columns={columns} rows={admins} empty="No admins yet." />}

      {showCreate && (
        <Modal title={createMode === "super_admin" ? "Create Super Admin" : "Create Admin"} onClose={() => { setCreate(false); setSaResult(null); setSaError(""); setAError("") }}>
          {saResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Alert type="success">Super Admin created.</Alert>
              <Alert type="warn">
                <strong>Secret Key — shown once only. Save immediately.</strong>
                <div style={{ fontFamily: "monospace", fontSize: 12, marginTop: 8, wordBreak: "break-all", background: C.surface, padding: "10px 12px", borderRadius: 6, color: C.gold }}>{saResult.secretKey}</div>
              </Alert>
              <Btn onClick={() => { setCreate(false); setSaResult(null); setSaName(""); setSaEmail(""); setSaPassword("") }} fullWidth>Done</Btn>
            </div>
          ) : createMode === "super_admin" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Alert type="warn">Requires re-authentication. Secret key shown once — save it immediately.</Alert>
              <Input label="Full Name" value={saName}     onChange={setSaName}     placeholder="Jane Smith" />
              <Input label="Email"     value={saEmail}    onChange={setSaEmail}    placeholder="jane@silkroadgh.com" type="email" />
              <Input label="Password"  value={saPassword} onChange={setSaPassword} placeholder="Min 12 characters" type="password" />
              {saError && <Alert type="error">{saError}</Alert>}
              <Btn onClick={createSuperAdmin} fullWidth>Create Super Admin</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Full Name" value={aName}     onChange={setAName}     placeholder="John Doe" />
              <Input label="Email"     value={aEmail}    onChange={setAEmail}    placeholder="john@silkroadgh.com" type="email" />
              <Input label="Password"  value={aPassword} onChange={setAPassword} placeholder="Min 10 characters" type="password" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: C.textMid, fontWeight: 600 }}>Role</label>
                <select value={aRole} onChange={e => setARole(e.target.value)}
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </div>
              {aError && <Alert type="error">{aError}</Alert>}
              <Btn onClick={createAdmin} fullWidth>Create Admin</Btn>
            </div>
          )}
        </Modal>
      )}

      {confirm?.action === "delete" && (
        <Modal title="Delete Admin" onClose={() => setConfirm(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Alert type="error">Permanently delete {confirm.admin.name}? This cannot be undone. Requires re-authentication.</Alert>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => deleteAdmin(confirm.admin)}>Delete Permanently</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG TAB
// ─────────────────────────────────────────────────────────────────────────────

function AuditTab() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    const { data } = await adminFetch(`/admin/audit-logs?page=${p}&limit=50`)
    setLogs(data.logs || []); setTotal(data.total || 0); setPage(data.page || 1); setPages(data.pages || 1)
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  const columns = [
    { key: "at",         label: "Time",   render: l => <span style={{ fontFamily: "monospace", fontSize: 11, color: C.textDim }}>{fmt(l.at)}</span> },
    { key: "adminEmail", label: "By",     render: l => <span style={{ fontSize: 12, color: C.textMid }}>{l.adminEmail || l.by || "—"}</span> },
    { key: "adminRole",  label: "Role",   render: l => l.adminRole ? <Badge label={l.adminRole} color={C.blue} dim={C.blueDim} /> : "—" },
    { key: "action",     label: "Action", render: l => <span style={{ fontFamily: "monospace", fontSize: 12, color: C.gold }}>{l.action}</span> },
    { key: "entity",     label: "Entity", render: l => l.entity || "—" },
    { key: "ip",         label: "IP",     render: l => <span style={{ fontFamily: "monospace", fontSize: 11, color: C.textDim }}>{l.ip || "—"}</span> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Audit Log <span style={{ color: C.textDim, fontWeight: 400, fontSize: 14 }}>({total} entries)</span></SectionTitle>
      </div>
      {loading ? <LoadingState /> : <Table columns={columns} rows={logs} empty="No audit entries." />}
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p) }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN PANEL
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPanel({ onClose }) {
  const [adminUser, setAdminUser]         = useState(getAdminUser)
  const [authed, setAuthed]               = useState(!!getAdminToken())
  const [tab, setTab]                     = useState("dashboard")
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [reAuthToken, setReAuthToken]     = useState(null)
  const [showReAuth, setShowReAuth]       = useState(false)
  const [reAuthCallback, setReAuthCallback] = useState(null)

  const signOut = () => {
    clearAdminSession()
    setAdminUser(null)
    setAuthed(false)
    setReAuthToken(null)
    setSidebarOpen(false)
    setTab("dashboard")
  }

  const onLogin = () => {
    setAdminUser(getAdminUser())
    setAuthed(true)
  }

  const handleNeedReAuth = (cb) => {
    setReAuthCallback(() => cb)
    setShowReAuth(true)
  }

  const handleReAuthSuccess = (token) => {
    setReAuthToken(token)
    setShowReAuth(false)
    if (reAuthCallback) { reAuthCallback(token); setReAuthCallback(null) }
  }

  const goTo = (id) => {
    setTab(id)
    setSidebarOpen(false)
  }

  const buildNav = () => {
    if (!adminUser) return []
    const { tier, permissions = [] } = adminUser
    const isOwner = tier === "owner"
    const isSA    = tier === "super_admin"
    const has     = (...p) => isOwner || isSA || p.some(x => permissions.includes(x))

    return [
      { id: "dashboard",  label: "Dashboard",     icon: "◈",  show: true },
      { id: "users",      label: "Users",          icon: "⊙",  show: has("view_users", "manage_users") },
      { id: "listings",   label: "Listings",       icon: "⊞",  show: has("view_listings", "manage_listings") },
      { id: "orders",     label: "Orders",         icon: "⊟",  show: has("view_orders", "manage_orders", "view_payments") },
      { id: "riders",     label: "Riders",         icon: "⊛",  show: has("view_riders", "manage_riders") },
      { id: "deliveries", label: "Deliveries",     icon: "⊕",  show: has("view_deliveries", "view_delivery_status") },
      { id: "finance",    label: "Finance",        icon: "⊜",  show: has("view_financial_reports", "view_payments") },
      { id: "security",   label: "Security",       icon: "⊘",  show: has("view_activity_logs") },
      { id: "admins",     label: "Admin Accounts", icon: "⊗",  show: isOwner || isSA },
      { id: "audit",      label: "Audit Log",      icon: "⊙",  show: isOwner || isSA },
    ].filter(n => n.show)
  }

  const nav       = buildNav()
  const tierMeta  = tier_meta[adminUser?.tier] || tier_meta.admin
  const tabLabel  = nav.find(n => n.id === tab)?.label || "Dashboard"

  if (!authed) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
        <style>{`* { box-sizing: border-box } input, select, button { font-family: inherit } input::placeholder { color: #444 }`}</style>
        <LoginScreen onSuccess={onLogin} />
        {onClose && (
          <button onClick={onClose}
            style={{ position: "fixed", top: 16, right: 16, background: C.surface, border: `1px solid ${C.border}`, color: C.textMid, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            {"←"} Back to site
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box }
        input, select, button, textarea { font-family: inherit }
        input::placeholder { color: #444 }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideInSidebar { from { transform: translateX(-100%) } to { transform: translateX(0) } }
      `}</style>

      {/* ── Overlay when sidebar open ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 10 }} />
      )}

      {/* ── Sidebar — slides in from left, same as Account panel ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 240,
        background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", zIndex: 20,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* Sidebar header */}
        <div style={{ padding: "16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMid, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, minHeight: "auto" }}>
            {"✕"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${C.gold}, #9a7040)`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{"🕸"}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>Silk Road GH</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: ".06em" }}>ADMIN</div>
            </div>
          </div>
        </div>

        {/* Current user pill */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ background: C.surface2, border: `1px solid ${tierMeta.color}33`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>
              {adminUser?.name || adminUser?.email}
            </div>
            <Badge label={tierMeta.label} color={tierMeta.color} dim={tierMeta.dim} />
          </div>
        </div>

        {/* Re-auth active indicator */}
        {reAuthToken && adminUser?.tier === "owner" && (
          <div style={{ margin: "10px 12px 0", background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 6, padding: "7px 10px", fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: ".04em" }}>
            RE-AUTH ACTIVE · 5 MIN
          </div>
        )}

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => goTo(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: tab === item.id ? C.goldDim : "transparent",
                border: `1px solid ${tab === item.id ? C.goldMid : "transparent"}`,
                color: tab === item.id ? C.gold : C.textMid,
                padding: "11px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 13, fontWeight: tab === item.id ? 700 : 500,
                marginBottom: 3, textAlign: "left",
              }}>
              <span style={{ fontSize: 15, fontFamily: "monospace", opacity: tab === item.id ? 1 : 0.5 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          {adminUser?.tier === "owner" && (
            <button onClick={() => { setSidebarOpen(false); setShowReAuth(true) }}
              style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left" }}>
              Re-authenticate
            </button>
          )}
          {onClose && (
            <button onClick={() => { setSidebarOpen(false); onClose() }}
              style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left" }}>
              {"←"} Back to site
            </button>
          )}
          <button onClick={signOut}
            style={{ width: "100%", background: C.redDim, border: `1px solid ${C.red}44`, color: C.red, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "left" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>

        {/* Hamburger — same style as Account panel */}
        <button onClick={() => setSidebarOpen(true)}
          style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.gold, width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0, minHeight: "auto" }}>
          <span style={{ display: "block", width: 16, height: 2, background: C.gold, borderRadius: 2 }} />
          <span style={{ display: "block", width: 16, height: 2, background: C.gold, borderRadius: 2 }} />
          <span style={{ display: "block", width: 16, height: 2, background: C.gold, borderRadius: 2 }} />
        </button>

        {/* Current tab label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tabLabel}</div>
          <div style={{ fontSize: 11, color: C.textDim }}>
            {adminUser?.name || adminUser?.email}
            {adminUser?.role ? ` · ${adminUser.role.replace("_", " ")}` : ""}
          </div>
        </div>

        {/* Tier badge in top bar */}
        <Badge label={tierMeta.label} color={tierMeta.color} dim={tierMeta.dim} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
          {tab === "dashboard"  && <DashboardTab />}
          {tab === "users"      && <UsersTab />}
          {tab === "listings"   && <ListingsTab />}
          {tab === "orders"     && <OrdersTab />}
          {tab === "riders"     && <RidersTab />}
          {tab === "deliveries" && <DeliveriesTab />}
          {tab === "finance"    && <FinanceTab />}
          {tab === "security"   && <SecurityTab />}
          {tab === "admins"     && <AdminsTab adminUser={adminUser} reAuthToken={reAuthToken} onNeedReAuth={() => handleNeedReAuth(null)} />}
          {tab === "audit"      && <AuditTab />}
        </div>
      </div>

      {/* Re-auth modal */}
      {showReAuth && (
        <ReAuthModal onSuccess={handleReAuthSuccess} onClose={() => { setShowReAuth(false); setReAuthCallback(null) }} />
      )}
    </div>
  )
}
