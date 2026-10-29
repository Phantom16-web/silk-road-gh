import { useEffect, useState } from 'react'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const types = [{ value: '', label: 'Everything' }, { value: 'product', label: 'Buy' }, { value: 'rent', label: 'Rent' }, { value: 'service', label: 'Services' }]
const btn = { border: '1px solid #53432f', background: '#201c17', color: '#f2e4cf', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }
const field = { ...btn, background: '#181818', width: '100%', boxSizing: 'border-box' }
export default function AdvancedSearch({ query, onClose, onNavigate }) {
  const [q, setQ] = useState(query || '')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [university, setUniversity] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('relevant')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 0, facets: { categories: [], types: [] } })
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (query) setQ(query) }, [query])
  useEffect(() => { setPage(1) }, [q, type, category, university, minPrice, maxPrice, sort, startDate, endDate])
  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      if (type === 'rent' && ((startDate && !endDate) || (!startDate && endDate))) { setError('Select both rental dates.'); setLoading(false); return }
      setLoading(true); setError('')
      const params = new URLSearchParams({ q, page: String(page), limit: '16', sort })
      for (const [key, value] of Object.entries({ type, category, university, minPrice, maxPrice, ...(type === 'rent' && startDate && endDate ? { startDate, endDate } : {}) })) if (value !== '') params.set(key, value)
      try {
        const res = await fetch(`${API}/search?${params}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('Search could not load. Try again.')
        setData(await res.json())
      } catch (err) { if (err.name !== 'AbortError') setError(err.message) }
      finally { if (!ctrl.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [q, type, category, university, minPrice, maxPrice, sort, page, startDate, endDate])
  useEffect(() => {
    const ctrl = new AbortController()
    if (q.trim().length < 2) { setSuggestions([]); return () => ctrl.abort() }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, ...(type ? { type } : {}) })
        const res = await fetch(`${API}/search/suggest?${params}`, { signal: ctrl.signal })
        if (res.ok) setSuggestions((await res.json()).suggestions || [])
      } catch { /* autocomplete is optional; full search remains usable */ }
    }, 200)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [q, type])
  const reset = () => { setType(''); setCategory(''); setUniversity(''); setMinPrice(''); setMaxPrice(''); setSort('relevant'); setStartDate(''); setEndDate('') }
  return <div role="dialog" aria-modal="true" aria-label="Marketplace search" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 350, background: '#000d', padding: 'min(5vh,36px) 12px', display: 'flex', justifyContent: 'center' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: '#101010', color: '#f5f1e9', border: '1px solid #433a2e', borderRadius: 18, width: '100%', maxWidth: 950, maxHeight: '91vh', overflowY: 'auto', padding: '18px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><h2 style={{ margin: '0 0 14px' }}>Explore Silk Road</h2><button style={btn} onClick={onClose} aria-label="Close search">✕</button></div>
      <input autoFocus aria-label="Search listings" value={q} onChange={e => setQ(e.target.value)} placeholder="Search products, rentals and services" style={{ ...field, fontSize: 16, marginBottom: 10 }} />
      {suggestions.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }} aria-label="Search suggestions">{suggestions.slice(0, 5).map(s => <button key={s._id} onClick={() => setQ(s.title)} style={{ ...btn, padding: '5px 9px', fontSize: 12 }}>{s.title}</button>)}</div>}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>{types.map(t => <button key={t.value} onClick={() => { setType(t.value); setCategory(''); setStartDate(''); setEndDate('') }} style={{ ...btn, background: type === t.value ? '#87693e' : '#201c17' }}>{t.label}</button>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginBottom: 12 }}>
        {type === 'rent' && <><label style={{fontSize:12}}>Rental start<input aria-label="Rental start date" type="date" min={new Date().toISOString().slice(0,10)} value={startDate} onChange={e => setStartDate(e.target.value)} style={field} /></label><label style={{fontSize:12}}>Rental return<input aria-label="Rental return date" type="date" min={startDate || new Date().toISOString().slice(0,10)} value={endDate} onChange={e => setEndDate(e.target.value)} style={field} /></label></>}
        <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)} style={field}><option value="">All categories</option>{data.facets.categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}{category && !data.facets.categories.some(c => c.name === category) && <option value={category}>{category}</option>}</select>
        <input aria-label="University" placeholder="University (e.g. UCC)" value={university} onChange={e => setUniversity(e.target.value)} style={field} />
        <input aria-label="Minimum price" type="number" min="0" placeholder="Min GHS" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={field} />
        <input aria-label="Maximum price" type="number" min="0" placeholder="Max GHS" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={field} />
        <select aria-label="Sort results" value={sort} onChange={e => setSort(e.target.value)} style={field}><option value="relevant">Most relevant</option><option value="newest">Newest</option><option value="price_asc">Lowest price</option><option value="price_desc">Highest price</option><option value="rating">Top rated</option></select>
        <button onClick={reset} style={btn}>Clear filters</button>
      </div>
      <p style={{ color: '#c7b99e', fontSize: 13 }}>{loading ? 'Searching…' : `${data.total} matching listings${data.approximate ? " · approximate matches" : ""}`}{type === 'rent' ? ' · Rental prices are per day' : ''}</p>
      {type === 'rent' && startDate && endDate && <p style={{fontSize:12,color:'#c7b99e'}}>Date filtering excludes items currently reserved or rented. Future dates are not guaranteed; availability is checked again at checkout.</p>}
      {error && <p role="alert" style={{ color: '#ff9b9b' }}>{error}</p>}
      {!loading && !error && !data.items.length && <p style={{ padding: 30, textAlign: 'center', color: '#aaa' }}>No active listings match. Try fewer filters or a different keyword.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(195px,1fr))', gap: 12 }}>{data.items.map(item => <button key={item._id} onClick={() => { onNavigate(item); onClose() }} style={{ ...btn, padding: 0, overflow: 'hidden', textAlign: 'left' }}>
        {item.image && <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: 125, objectFit: 'contain', background: '#242424' }} />}
        <div style={{ padding: 12 }}><div style={{ fontSize: 11, color: '#c8a97e', textTransform: 'uppercase' }}>{item.type} · {item.category}</div><div style={{ fontWeight: 700, margin: '6px 0' }}>{item.title}</div><div style={{ color: '#c8a97e' }}>GH₵ {item.type === 'rent' ? item.dailyRate : item.price}{item.type === 'rent' ? ' / day' : ''}</div><div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>{item.seller?.university || ''}</div></div>
      </button>)}</div>
      {data.pages > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}><button style={btn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page} / {data.pages}</span><button style={btn} disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </div>
  </div>
}
