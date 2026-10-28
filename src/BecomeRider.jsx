import { useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const initial = { name:'',phone:'',email:'',password:'',confirmPassword:'',university:'',vehicle:'motorbike' }

export default function BecomeRider() {
  const [form,setForm] = useState(initial)
  const [photo,setPhoto] = useState(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [success,setSuccess] = useState(false)
  const update = e => setForm(v => ({...v,[e.target.name]:e.target.value}))
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    if (!photo || !['image/jpeg','image/png','image/webp'].includes(photo.type)) return setError('Select a JPEG, PNG or WebP face photograph.')
    if (photo.size > 5 * 1024 * 1024) return setError('Choose a photo smaller than 5 MB.')
    const data = new FormData()
    for (const key of ['name','phone','email','password','university','vehicle']) data.append(key,form[key].trim())
    data.append('photo',photo)
    setBusy(true)
    try {
      const response = await fetch(`${API_URL}/rider-auth/register`,{method:'POST',body:data})
      const result = await response.json().catch(()=>({}))
      if (!response.ok) throw new Error(result.message || 'Unable to submit rider application.')
      setSuccess(true)
    } catch(err) {setError(err.message || 'Network error. Try again.')}
    finally {setBusy(false)}
  }
  const inputStyle={width:'100%',padding:'12px',borderRadius:9,border:'1px solid #555',background:'#191919',color:'#fff',boxSizing:'border-box'}
  const labelStyle={display:'grid',gap:6,fontSize:14,color:'#ddd'}
  return <main style={{maxWidth:540,margin:'40px auto',padding:24,background:'#111',borderRadius:18,color:'#f3f0e9'}}>
    <h1 style={{color:'#c8a97e'}}>Become a Silk Road rider</h1>
    {success ? <section role="status"><h2>Application received</h2><p>Your photograph and rider account are awaiting admin review. You cannot accept deliveries until both are approved.</p></section> :
    <form onSubmit={submit} style={{display:'grid',gap:16}}>
      <p>Apply with your real details. The approved face photograph will be shown to sellers when you accept their deliveries.</p>
      <label style={labelStyle}>Full name<input style={inputStyle} name="name" required maxLength={100} value={form.name} onChange={update}/></label>
      <label style={labelStyle}>Mobile money / contact phone<input style={inputStyle} name="phone" type="tel" required maxLength={25} value={form.phone} onChange={update}/></label>
      <label style={labelStyle}>Email<input style={inputStyle} name="email" type="email" required value={form.email} onChange={update}/></label>
      <label style={labelStyle}>University / base area<input style={inputStyle} name="university" required value={form.university} onChange={update}/></label>
      <label style={labelStyle}>Transport<select style={inputStyle} name="vehicle" value={form.vehicle} onChange={update}><option value="motorbike">Motorbike</option><option value="bicycle">Bicycle</option><option value="walking">Walking</option></select></label>
      <label style={labelStyle}>Password<input style={inputStyle} name="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={update}/></label>
      <label style={labelStyle}>Confirm password<input style={inputStyle} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={form.confirmPassword} onChange={update}/></label>
      <label style={labelStyle}>Clear photograph of your face<input style={inputStyle} type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setPhoto(e.target.files?.[0]||null)}/><small>Use a recent photograph showing your face clearly. Admin approval is required before you can work.</small></label>
      {error && <p role="alert" style={{color:'#ff9a9a'}}>{error}</p>}
      <button disabled={busy} style={{padding:14,background:'#c8a97e',border:0,borderRadius:9,fontWeight:700,cursor:'pointer'}} type="submit">{busy?'Submitting…':'Submit rider application'}</button>
    </form>}
  </main>
}
