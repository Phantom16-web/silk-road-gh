import { useEffect, useState } from 'react'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const format = date => new Date(date).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' })
export default function OwnerCommissionStudio({ adminToken, onNeedReAuth }) {
 const [data, setData] = useState(null), [rate, setRate] = useState(''), [date, setDate] = useState(''), [time, setTime] = useState('00:00'), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
 const load = async () => { const r = await fetch(`${API}/commission/owner`, { headers: { Authorization: `Bearer ${adminToken}` } }); const j = await r.json(); if (!r.ok) throw Error(j.message || 'Unable to load commission settings'); setData(j) }
 useEffect(() => { if (adminToken) load().catch(e => setError(e.message)) }, [adminToken])
 const authorized = async (callback) => {
  if (typeof onNeedReAuth !== 'function') { setError('Owner reauthentication is required.'); return }
  onNeedReAuth(async token => { setBusy(true); setError(''); setMessage(''); try { await callback(token); await load() } catch (e) { setError(e.message) } finally { setBusy(false) } })
 }
 const request = async (path, body, token) => { const r = await fetch(`${API}/commission/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-reauth-token': token }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Error(j.message || 'Operation failed'); setMessage(j.message || 'Saved') }
 const schedule = () => { if (!date || !/^\d{2}:\d{2}$/.test(time)) return setError('Choose a date and time in Ghana time.'); const timestamp = new Date(`${date}T${time}:00Z`).toISOString(); authorized(token => request('owner/schedule', { ratePercent: Number(rate), effectiveAt: timestamp, reason }, token)) }
 const pending = data?.schedules?.filter(s => s.status === 'scheduled' && !s.effective) || []
 const box = { background: '#171717', border: '1px solid #51432e', borderRadius: 16, padding: 20 }
 const field = { width: '100%', padding: 12, background: '#25221d', border: '1px solid #6d593b', borderRadius: 9, color: 'white', boxSizing: 'border-box' }
 const btn = { background: '#d6b477', color: '#17110b', border: 0, padding: '12px 18px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }
 return <div style={{ display: 'grid', gap: 18, maxWidth: 780, color: '#f5eddd' }}>
  <div style={box}><div style={{ color: '#d8b57d', fontSize: 12, letterSpacing: 2 }}>OWNER · COMMISSION POLICY</div><h2 style={{ fontSize: 36, margin: '10px 0' }}>{data ? `${data.currentRatePercent.toFixed(2)}%` : '—'}</h2><p style={{ color: '#bcb0a1' }}>Current platform commission · Ghana time (GMT). New checkouts use the effective server rate; existing orders retain their original fee.</p></div>
  {error && <div role="alert" style={{ color: '#ffaaaa' }}>{error}</div>}{message && <div role="status" style={{ color: '#b3f3cb' }}>{message}</div>}
  <div style={box}><h3>Schedule a commission change</h3><p style={{ color: '#bcb0a1' }}>Increases require seven days' notice. Decreases require at least one hour. Only one future change can be pending.</p><div style={{ display: 'grid', gap: 12 }}><label>New commission (%)<input style={field} type="number" min="0" max="100" step="0.01" value={rate} onChange={e => setRate(e.target.value)}/></label><label>Effective date (Ghana)<input style={field} type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Effective time (GMT)<input style={field} type="time" value={time} onChange={e => setTime(e.target.value)}/></label><label>Reason for change<textarea style={field} rows={3} value={reason} onChange={e => setReason(e.target.value)}/></label><button style={btn} disabled={busy || pending.length > 0} onClick={schedule}>{busy ? 'Saving…' : 'Schedule change (Owner reauthentication)'}</button></div></div>
  <div style={box}><h3>Upcoming change</h3>{pending.length === 0 ? <p>No upcoming changes.</p> : pending.map(s => <div key={s._id} style={{ display: 'grid', gap: 8 }}><strong>{s.previousRatePercent.toFixed(2)}% → {s.ratePercent.toFixed(2)}%</strong><span>Effective {format(s.effectiveAt)}</span><span>Seller in-app notifications: {s.noticeStatus} ({s.noticeCount || 0} recorded)</span><button style={btn} disabled={busy} onClick={() => authorized(token => request(`owner/${s._id}/cancel`, {}, token))}>Cancel scheduled change</button></div>)}</div>
  <div style={box}><h3>Commission history</h3>{data?.schedules?.map(s => <div key={s._id} style={{ padding: '12px 0', borderBottom: '1px solid #433b30' }}><strong>{s.ratePercent.toFixed(2)}%</strong> · {format(s.effectiveAt)} · {s.status}{s.effective ? ' (active or historical)' : ''}<div style={{ fontSize: 12, color: '#bcb0a1' }}>{s.reason}</div></div>)}</div>
 </div>
}
