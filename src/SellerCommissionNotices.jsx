import { useEffect, useState } from 'react'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export default function SellerCommissionNotices({ userToken }) {
 const [notices, setNotices] = useState([]), [error, setError] = useState('')
 const load = async () => { const r = await fetch(`${API}/commission/seller/notices`, { headers: { Authorization: `Bearer ${userToken}` } }); const j = await r.json(); if (!r.ok) throw Error(j.message || 'Unable to load notifications'); setNotices(j.notices || []) }
 useEffect(() => { if (userToken) load().catch(e => setError(e.message)) }, [userToken])
 const read = async id => { try { const r = await fetch(`${API}/commission/seller/notices/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } }); if (!r.ok) throw Error('Unable to acknowledge'); await load() } catch(e) { setError(e.message) } }
 return <section style={{ display: 'grid', gap: 12, color: '#f3ebdc' }}><h3>Platform commission notices</h3>{error && <p role="alert">{error}</p>}{notices.length === 0 && <p>No commission notices yet.</p>}{notices.map(n => <div key={n._id} style={{ background: '#24201a', border: '1px solid #715b3b', padding: 14, borderRadius: 12 }}><strong>{n.title}</strong><p>{n.message}</p>{!n.readAt && <button onClick={() => read(n._id)}>Mark as read</button>}</div>)}</section>
}
