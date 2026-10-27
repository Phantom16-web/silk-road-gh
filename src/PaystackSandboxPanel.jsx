import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function PaystackSandboxPanel() {
  const [reauthToken, setReauthToken] = useState('')
  const [settings, setSettings] = useState(null)
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('5.00')
  const [reference, setReference] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const token = (() => { try { return localStorage.getItem('silkroad_admin_token') } catch { return null } })()
  const user = (() => { try { return JSON.parse(localStorage.getItem('silkroad_admin_user') || 'null') } catch { return null } })()
  const owner = user?.tier === 'owner'

  const call = async (path, options = {}, requireFreshAuth = false) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    if (requireFreshAuth) {
      if (!reauthToken.trim()) throw new Error('Enter a fresh Owner re-authentication token before changing the toggle.')
      headers['x-reauth-token'] = reauthToken.trim()
    }
    const response = await fetch(`${API}/paystack-sandbox${path}`, { ...options, headers })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`)
    return body
  }
  useEffect(() => {
    if (!token || !owner) return
    let active = true
    call('/settings').then(s => { if (active) setSettings(s) }).catch(e => { if (active) setResult(e.message) })
    return () => { active = false }
  }, [token, owner])
  const execute = async fn => { setBusy(true); setResult(''); try { await fn() } catch (e) { setResult(e.message) } finally { setBusy(false) } }
  const card = { maxWidth: 580, margin: '50px auto', padding: 28, background: '#111', border: '1px solid #c8a97e', borderRadius: 16, color: '#f0ede8', fontFamily: 'system-ui, sans-serif' }
  const field = { display: 'block', width: '100%', padding: 11, marginTop: 5, marginBottom: 15, borderRadius: 8, border: '1px solid #555', background: '#222', color: '#fff', boxSizing: 'border-box' }
  const button = { background: '#c8a97e', color: '#111', border: 0, borderRadius: 8, padding: '12px 18px', cursor: 'pointer', marginBottom: 12, fontWeight: 700 }
  if (!token || !owner) return <main style={card}><h2>Owner access required</h2><p>Sign in through Silk Road's Owner panel first.</p><a href="/" style={{color:'#c8a97e'}}>Return to Silk Road</a></main>
  return <main style={card}>
    <a href="/" style={{ color: '#c8a97e' }}>← Silk Road</a>
    <h1>Paystack Test Console</h1>
    <p>Simulated Paystack transactions only. This console cannot fund real orders, escrow, or rider payouts.</p>
    <p>Server permission: {settings?.serverAllowed ? 'Allowed' : 'Disabled'} · Test key: {settings?.configured ? 'Configured' : 'Missing'} · Toggle: {settings?.enabled ? 'ON' : 'OFF'}</p>
    <label>Owner re-authentication token (required for toggle)<input style={field} type="password" autoComplete="off" value={reauthToken} onChange={e => setReauthToken(e.target.value)} /></label>
    <button style={button} disabled={busy || !settings} onClick={() => execute(async () => {
      const s = await call('/settings', { method: 'PUT', body: JSON.stringify({ enabled: !settings.enabled }) }, true)
      setSettings({ ...settings, ...s }); setResult(`Paystack simulator ${s.enabled ? 'enabled' : 'disabled'}.`)
    })}>{settings?.enabled ? 'Disable simulator' : 'Enable simulator'}</button>
    <hr style={{ borderColor: '#333' }} />
    <label>Test customer email<input style={field} type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Test amount (GHS)<input style={field} type="number" min="1" max="1000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
    <button style={button} disabled={busy || !settings?.enabled} onClick={() => execute(async () => {
      const r = await call('/initialize', { method: 'POST', body: JSON.stringify({ email, amountGhs: Number(amount) }) })
      setReference(r.reference)
      const newWindow = window.open(r.authorizationUrl, '_blank', 'noopener,noreferrer')
      if (!newWindow) setResult(`Popup blocked. Open Paystack checkout using the browser after allowing popups. Reference: ${r.reference}`)
      else setResult('Test checkout opened. Return here after completing the test payment.')
    })}>Start Paystack test</button>
    <label>Paystack test reference<input style={field} value={reference} onChange={e => setReference(e.target.value)} /></label>
    <button style={button} disabled={busy || !reference} onClick={() => execute(async () => {
      const r = await call(`/verify/${encodeURIComponent(reference)}`)
      setResult(`Provider status: ${r.status}. This does not create a real payment or rider balance.`)
    })}>Verify transaction</button>
    {result && <p role="status" style={{ padding: 12, border: '1px solid #555', borderRadius: 8 }}>{result}</p>}
  </main>
}
