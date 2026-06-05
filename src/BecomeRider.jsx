import { useState, useRef } from "react"

const UNIS = ["KNUST", "UG Legon", "Ashesi", "UDS", "UCC", "GIJ", "UHAS", "Other"]

const ZONES = [
  "East Legon", "Ayeduase", "Kotei", "Bomso", "Pokuase",
  "Adenta", "Madina", "Spintex", "Tema", "Kumasi Central",
  "KNUST Area", "Oduom", "Nhyiaeso", "Takoradi", "Cape Coast Central"
]

const AVAILABILITY = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
]

export default function BecomeRider() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    baseArea: "",
    vehicle: "",
    zones: [],
    availFrom: "",
    availTo: "",
    photo: null,
    photoPreview: null,
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const toggleZone = (zone) => {
    setForm(f => ({
      ...f,
      zones: f.zones.includes(zone) ? f.zones.filter(z => z !== zone) : [...f.zones, zone]
    }))
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, photo: "Please select a valid image file." }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, photo: file, photoPreview: reader.result }))
      setErrors(prev => ({ ...prev, photo: null }))
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = "Please enter your full name."
    if (!form.phone.trim()) e.phone = "Please enter your MTN number for payouts."
    if (!form.baseArea) e.baseArea = "Please select your university or base area."
    if (!form.vehicle) e.vehicle = "Please select your mode of transport."
    if (form.zones.length === 0) e.zones = "Please select at least one zone you can cover."
    if (!form.availFrom) e.availFrom = "Please select your availability start time."
    if (!form.availTo) e.availTo = "Please select your availability end time."
    if (form.availFrom && form.availTo && AVAILABILITY.indexOf(form.availFrom) >= AVAILABILITY.indexOf(form.availTo)) {
      e.availTo = "End time must be after start time."
    }
    if (!form.photo) e.photo = "Please upload a profile photo."
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitted(true)
  }

  const ErrorMsg = ({ field }) => errors[field]
    ? <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "6px" }}>⚠️ {errors[field]}</div>
    : null

  if (submitted) return (
    <div style={{ maxWidth: "600px", margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ background: "#111", borderRadius: "20px", border: "1px solid #1e1e1e", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>

        {/* Profile photo */}
        <div style={{ position: "relative" }}>
          <img src={form.photoPreview} alt="Profile" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "3px solid #c8a97e" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, background: "#6ee7b7", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>✓</div>
        </div>

        <div>
          <h2 style={{ fontFamily: "serif", fontSize: "28px", fontWeight: "700", color: "#c8a97e", marginBottom: "8px" }}>You're a Rider! 🛵</h2>
          <p style={{ color: "#888", fontSize: "14px", lineHeight: "1.6" }}>Welcome to the Silk Road rider crew, <strong style={{ color: "#f0ede8" }}>{form.name}</strong>. You can now start receiving delivery requests in your area.</p>
        </div>

        {/* Summary card */}
        <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "20px", width: "100%", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
          <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".06em" }}>Your Rider Profile</div>
          {[
            ["📱 Payout Number", form.phone],
            ["🏫 Base Area", form.baseArea],
            ["🚗 Vehicle", form.vehicle],
            ["⏰ Availability", `${form.availFrom} — ${form.availTo}`],
            ["📍 Zones", form.zones.join(", ")],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: "10px", fontSize: "13px" }}>
              <span style={{ color: "#666", minWidth: "140px" }}>{label}</span>
              <span style={{ color: "#f0ede8", fontWeight: "500" }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#064e3b22", border: "1px solid #065f46", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#6ee7b7", textAlign: "center", width: "100%" }}>
          🔔 You'll receive delivery requests on your MTN number. Stay active in your zones!
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: "620px", margin: "40px auto", padding: "0 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>Become a Rider 🛵</h2>
        <p style={{ color: "#666", fontSize: "14px" }}>Earn money delivering on campus. Flexible hours, paid via MTN MoMo.</p>
      </div>

      {/* Perks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          ["🛵", "Flexible Hours", "Deliver on your schedule"],
          ["💰", "₵15–₵50/drop", "Earn per delivery"],
          ["📍", "Campus Routes", "Short, easy zones"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>{icon}</div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0ede8", marginBottom: "4px" }}>{title}</div>
            <div style={{ fontSize: "11px", color: "#666" }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#111", borderRadius: "16px", border: "1px solid #1e1e1e", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Profile photo */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: ".06em" }}>Profile Photo</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Preview */}
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#1a1a1a", border: `2px solid ${form.photoPreview ? "#c8a97e" : "#2a2a2a"}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {form.photoPreview
                ? <img src={form.photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "28px" }}>👤</span>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhoto} style={{ display: "none" }} />
              <input type="file" accept="image/*" capture="user" ref={cameraInputRef} onChange={handlePhoto} style={{ display: "none" }} />
              <button
                onClick={() => fileInputRef.current.click()}
                style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", textAlign: "left" }}>
                📁 Choose from Device
              </button>
              <button
                onClick={() => cameraInputRef.current.click()}
                style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", textAlign: "left" }}>
                📷 Take a Photo
              </button>
            </div>
          </div>
          <ErrorMsg field="photo" />
        </div>

        {/* Name */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>Full Name</div>
          <input
            placeholder="e.g. Kwame Asante"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", background: "#1e1e1e", border: `1px solid ${errors.name ? "#991b1b" : "#333"}`, color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
          <ErrorMsg field="name" />
        </div>

        {/* MTN number */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>MTN Number (for payouts)</div>
          <input
            placeholder="e.g. 0241234567"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            style={{ width: "100%", background: "#1e1e1e", border: `1px solid ${errors.phone ? "#991b1b" : "#333"}`, color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
          <ErrorMsg field="phone" />
        </div>

        {/* Base area */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>University / Base Area</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
            {UNIS.map(u => (
              <button
                key={u}
                onClick={() => setForm(f => ({ ...f, baseArea: u }))}
                style={{ padding: "10px 8px", borderRadius: "8px", border: `1.5px solid ${form.baseArea === u ? "#c8a97e" : "#2a2a2a"}`, background: form.baseArea === u ? "#c8a97e22" : "#1a1a1a", color: form.baseArea === u ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "12px", textAlign: "center" }}>
                {u}
              </button>
            ))}
          </div>
          <ErrorMsg field="baseArea" />
        </div>

        {/* Vehicle */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Mode of Transport</div>
          <div style={{ display: "flex", gap: "10px" }}>
            {[["🚲", "Bicycle"], ["🛵", "Motorbike"], ["🚶", "Walking"], ["🚗", "Car"]].map(([icon, label]) => (
              <button
                key={label}
                onClick={() => setForm(f => ({ ...f, vehicle: label }))}
                style={{ flex: 1, padding: "14px 8px", borderRadius: "10px", border: `1.5px solid ${form.vehicle === label ? "#c8a97e" : "#2a2a2a"}`, background: form.vehicle === label ? "#c8a97e22" : "#1a1a1a", color: form.vehicle === label ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
                {label}
              </button>
            ))}
          </div>
          <ErrorMsg field="vehicle" />
        </div>

        {/* Availability */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Availability Hours</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", fontWeight: "600" }}>FROM</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                {AVAILABILITY.map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, availFrom: t }))}
                    style={{ padding: "8px 4px", borderRadius: "6px", border: `1.5px solid ${form.availFrom === t ? "#c8a97e" : "#2a2a2a"}`, background: form.availFrom === t ? "#c8a97e22" : "#1a1a1a", color: form.availFrom === t ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "10px", textAlign: "center" }}>
                    {t}
                  </button>
                ))}
              </div>
              <ErrorMsg field="availFrom" />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", fontWeight: "600" }}>TO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                {AVAILABILITY.map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, availTo: t }))}
                    style={{ padding: "8px 4px", borderRadius: "6px", border: `1.5px solid ${form.availTo === t ? "#c8a97e" : "#2a2a2a"}`, background: form.availTo === t ? "#c8a97e22" : "#1a1a1a", color: form.availTo === t ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "10px", textAlign: "center" }}>
                    {t}
                  </button>
                ))}
              </div>
              <ErrorMsg field="availTo" />
            </div>
          </div>

          {/* Availability summary */}
          {form.availFrom && form.availTo && (
            <div style={{ marginTop: "10px", background: "#c8a97e22", border: "1px solid #c8a97e44", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#c8a97e", fontWeight: "600" }}>
              ⏰ Available: {form.availFrom} — {form.availTo}
            </div>
          )}
        </div>

        {/* Zones */}
        <div>
          <div style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Zones You Can Cover <span style={{ color: "#555", fontWeight: "400", textTransform: "none" }}>(select all that apply)</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {ZONES.map(zone => (
              <button
                key={zone}
                onClick={() => toggleZone(zone)}
                style={{ padding: "8px 14px", borderRadius: "100px", border: `1.5px solid ${form.zones.includes(zone) ? "#c8a97e" : "#2a2a2a"}`, background: form.zones.includes(zone) ? "#c8a97e22" : "#1a1a1a", color: form.zones.includes(zone) ? "#c8a97e" : "#888", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
                {form.zones.includes(zone) ? "✓ " : ""}{zone}
              </button>
            ))}
          </div>
          <ErrorMsg field="zones" />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{ background: "#c8a97e", border: "none", padding: "15px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "16px", marginTop: "8px" }}>
          🛵 Join the Rider Crew
        </button>

        <div style={{ textAlign: "center", fontSize: "12px", color: "#555" }}>
          By signing up you agree to deliver responsibly within your selected zones and availability hours.
        </div>

      </div>
    </div>
  )
}