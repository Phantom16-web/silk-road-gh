import { useEffect, useRef, useState } from 'react'
import { listingPath } from './router'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const TYPES = [{ value: '', label: 'Everything' }, { value: 'product', label: 'Buy' }, { value: 'rent', label: 'Rent' }, { value: 'service', label: 'Services' }]
const TYPE_NAMES = { product: 'Products', rent: 'Rentals', service: 'Services' }
// The server resolves any spelling ("UCC", "u.c.c", "University of Cape Coast"); these are just hints.
const CAMPUS_HINTS = ['UCC', 'KNUST', 'Legon', 'UEW', 'UDS', 'UMaT', 'UHAS', 'UPSA', 'GIMPA', 'Ashesi', 'UENR', 'GCTU', 'VVU', 'CKT-UTAS', 'AAMUSTED']
const GOLD = '#c8a97e'
const btn = { border: '1px solid #53432f', background: '#201c17', color: '#f2e4cf', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }
const field = { ...btn, background: '#181818', width: '100%', boxSizing: 'border-box', cursor: 'text' }
const chip = { border: '1px solid #53432f', background: '#1b1814', color: '#e8d8bd', borderRadius: 999, padding: '4px 10px', fontSize: 12 }
const money = n => `GH₵ ${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`
const today = () => new Date().toISOString().slice(0, 10)

function chipLabel({ kind, value }) {
  if (kind === 'type') return TYPE_NAMES[value] || value
  if (kind === 'maxPrice') return `Under ${money(value)}`
  if (kind === 'minPrice') return `Over ${money(value)}`
  if (kind === 'campus') return `Campus: ${String(value).toUpperCase()}`
  return String(value)
}

function ResultCard({ item, onOpen }) {
  const price = item.type === 'rent' ? item.dailyRate : item.price
  // A real link: tap to open, long-press / right-click to copy the address, middle-click for a new tab.
  return <a
    href={listingPath(item._id)}
    onClick={e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onOpen(item)
    }}
    style={{ ...btn, padding: 0, overflow: 'hidden', textAlign: 'left', textDecoration: 'none', display: 'block' }}
  >
    <div style={{ height: 125, background: '#242424' }}>{item.image && <img src={item.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}</div>
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: GOLD, textTransform: 'uppercase' }}>{item.type} · {item.category}</div>
      <div style={{ fontWeight: 700, margin: '6px 0', color: '#f5f1e9', lineHeight: 1.3 }}>{item.title}</div>
      <div style={{ color: GOLD }}>{money(price)}{item.type === 'rent' ? ' / day' : ''}</div>
      {item.reviews > 0 && <div style={{ color: '#d9b873', fontSize: 12, marginTop: 4 }}>★ {Number(item.rating).toFixed(1)} <span style={{ color: '#888' }}>({item.reviews})</span></div>}
      <div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>{item.seller?.university || ''}</div>
    </div>
  </a>
}

const SkeletonCard = () => <div aria-hidden="true" className="sr-skel" style={{ borderRadius: 10, height: 235, background: 'linear-gradient(90deg,#1b1814 25%,#262018 50%,#1b1814 75%)', backgroundSize: '200% 100%' }} />

/**
 * Props
 *   query         text typed in the header search box
 *   initial       params restored from the URL (/search?q=...&type=...), so Back and refresh work
 *   campus        the signed-in user's university; search quietly ranks their campus higher
 *   onClose       close the search view
 *   onOpenListing called with the clicked result; the app opens the real listing page
 *   onNavigate    legacy alias of onOpenListing
 */
export default function AdvancedSearch({ query, initial = {}, campus = '', onClose, onOpenListing, onNavigate }) {
  const open = onOpenListing || onNavigate
  const [q, setQ] = useState(initial.q ?? query ?? '')
  const [type, setType] = useState(initial.type || '')
  const [category, setCategory] = useState(initial.category || '')
  const [university, setUniversity] = useState(initial.university || '')
  const [minPrice, setMinPrice] = useState(initial.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice || '')
  const [sort, setSort] = useState(initial.sort || 'relevant')
  const [startDate, setStartDate] = useState(initial.startDate || '')
  const [endDate, setEndDate] = useState(initial.endDate || '')
  const [literal, setLiteral] = useState(initial.interpret === '0')
  const [page, setPage] = useState(Math.max(1, parseInt(initial.page, 10) || 1))
  const [data, setData] = useState({ items: [], total: 0, pages: 0, facets: { categories: [], types: [] }, interpreted: [] })
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const firstRun = useRef(true)

  useEffect(() => { if (query && initial.q === undefined) setQ(query) }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock page scroll behind the overlay and close on Escape. onClose lives in a ref so this runs once.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') closeRef.current?.() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey) }
  }, [])

  // Any filter change returns to page 1 (but not the very first render, which may carry ?page=3 from the URL).
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    setPage(1)
  }, [q, type, category, university, minPrice, maxPrice, sort, startDate, endDate, literal])

  // Keep the address bar in step with the filters so the exact search can be shared, refreshed or returned to.
  useEffect(() => {
    if (window.location.pathname !== '/search') return
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ q, type, category, university, minPrice, maxPrice, ...(type === 'rent' ? { startDate, endDate } : {}) })) if (value) params.set(key, value)
    if (sort !== 'relevant') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    if (literal) params.set('interpret', '0')
    const qs = params.toString()
    const url = '/search' + (qs ? '?' + qs : '')
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, '', url)
  }, [q, type, category, university, minPrice, maxPrice, sort, page, startDate, endDate, literal])

  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      if (type === 'rent' && ((startDate && !endDate) || (!startDate && endDate))) { setError('Select both rental dates.'); setLoading(false); return }
      setLoading(true); setError('')
      const params = new URLSearchParams({ q, page: String(page), limit: '16', sort })
      for (const [key, value] of Object.entries({ type, category, university, minPrice, maxPrice, campus, ...(type === 'rent' && startDate && endDate ? { startDate, endDate } : {}) })) if (value !== '' && value != null) params.set(key, value)
      if (literal) params.set('interpret', '0')
      try {
        const res = await fetch(`${API}/search?${params}`, { signal: ctrl.signal })
        if (res.status === 429) throw new Error('Too many searches. Please wait a moment and try again.')
        if (!res.ok) throw new Error('Search could not load. Try again.')
        setData(await res.json())
      } catch (err) { if (err.name !== 'AbortError') setError(err.message || 'Search could not load. Try again.') }
      finally { if (!ctrl.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [q, type, category, university, minPrice, maxPrice, sort, page, startDate, endDate, literal, campus, retry])

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

  const reset = () => { setType(''); setCategory(''); setUniversity(''); setMinPrice(''); setMaxPrice(''); setSort('relevant'); setStartDate(''); setEndDate(''); setLiteral(false) }
  const typeCounts = Object.fromEntries((data.facets?.types || []).map(t => [t.name, t.count]))
  const everything = Object.values(typeCounts).reduce((a, b) => a + b, 0)
  const interpreted = literal ? [] : (data.interpreted || [])
  const showSkeleton = loading && !data.items.length

  return <div role="dialog" aria-modal="true" aria-label="Marketplace search" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 350, background: '#000d', padding: 'min(5vh,36px) 12px', display: 'flex', justifyContent: 'center' }}>
    <style>{`@keyframes srShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.sr-skel{animation:srShimmer 1.4s linear infinite}`}</style>
    <div onClick={e => e.stopPropagation()} style={{ background: '#101010', color: '#f5f1e9', border: '1px solid #433a2e', borderRadius: 18, width: '100%', maxWidth: 950, maxHeight: '91vh', overflowY: 'auto', padding: '18px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><h2 style={{ margin: '0 0 14px' }}>Explore Silk Road</h2><button style={btn} onClick={onClose} aria-label="Close search">✕</button></div>
      <input autoFocus aria-label="Search listings" value={q} onChange={e => setQ(e.target.value)} placeholder="Try “laptop under 2000”, “room for rent UCC”…" style={{ ...field, fontSize: 16, marginBottom: 10 }} />
      {suggestions.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }} aria-label="Search suggestions">{suggestions.slice(0, 5).map(s => <button key={s._id} onClick={() => setQ(s.title)} style={{ ...btn, padding: '5px 9px', fontSize: 12 }}>{s.title}</button>)}</div>}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>{TYPES.map(t => {
        const count = t.value ? typeCounts[t.value] : everything
        return <button key={t.value} onClick={() => { setType(t.value); setCategory(''); setStartDate(''); setEndDate('') }} style={{ ...btn, background: type === t.value ? '#87693e' : '#201c17' }}>{t.label}{count != null && !loading ? ` (${count})` : ''}</button>
      })}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginBottom: 12 }}>
        {type === 'rent' && <><label style={{ fontSize: 12 }}>Rental start<input aria-label="Rental start date" type="date" min={today()} value={startDate} onChange={e => setStartDate(e.target.value)} style={field} /></label><label style={{ fontSize: 12 }}>Rental return<input aria-label="Rental return date" type="date" min={startDate || today()} value={endDate} onChange={e => setEndDate(e.target.value)} style={field} /></label></>}
        <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)} style={{ ...field, cursor: 'pointer' }}><option value="">All categories</option>{data.facets.categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}{category && !data.facets.categories.some(c => c.name === category) && <option value={category}>{category}</option>}</select>
        <input aria-label="University" list="sr-campus-hints" placeholder="Campus (e.g. UCC)" value={university} onChange={e => setUniversity(e.target.value)} style={field} />
        <datalist id="sr-campus-hints">{CAMPUS_HINTS.map(c => <option key={c} value={c} />)}</datalist>
        <input aria-label="Minimum price" type="number" min="0" inputMode="decimal" placeholder="Min GHS" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={field} />
        <input aria-label="Maximum price" type="number" min="0" inputMode="decimal" placeholder="Max GHS" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={field} />
        <select aria-label="Sort results" value={sort} onChange={e => setSort(e.target.value)} style={{ ...field, cursor: 'pointer' }}><option value="relevant">Most relevant</option><option value="newest">Newest</option><option value="price_asc">Lowest price</option><option value="price_desc">Highest price</option><option value="rating">Top rated</option></select>
        <button onClick={reset} style={btn}>Clear filters</button>
      </div>
      {interpreted.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }} aria-label="How your search was understood">
        <span style={{ fontSize: 12, color: '#9d917c' }}>Understood as:</span>
        {interpreted.map(i => <span key={i.kind} style={chip}>{chipLabel(i)}</span>)}
        <button onClick={() => setLiteral(true)} style={{ background: 'none', border: 0, color: GOLD, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Search exactly as typed</button>
      </div>}
      {literal && <div style={{ marginBottom: 10, fontSize: 12, color: '#9d917c' }}>Searching exactly as typed. <button onClick={() => setLiteral(false)} style={{ background: 'none', border: 0, color: GOLD, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Use smart search</button></div>}
      {data.didYouMean && !loading && <p style={{ margin: '0 0 10px', fontSize: 14 }}>Did you mean <button onClick={() => setQ(data.didYouMean)} style={{ background: 'none', border: 0, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>{data.didYouMean}</button>?</p>}
      <p style={{ color: '#c7b99e', fontSize: 13 }}>{loading ? 'Searching…' : `${data.total} matching listing${data.total === 1 ? '' : 's'}${data.approximate ? ' · approximate matches' : ''}`}{type === 'rent' ? ' · Rental prices are per day' : ''}</p>
      {type === 'rent' && startDate && endDate && <p style={{ fontSize: 12, color: '#c7b99e' }}>Date filtering excludes items currently reserved or rented. Future dates are not guaranteed; availability is checked again at checkout.</p>}
      {error && <div role="alert" style={{ color: '#ff9b9b', marginBottom: 12 }}>{error} <button onClick={() => setRetry(n => n + 1)} style={{ ...btn, padding: '4px 10px', fontSize: 12, marginLeft: 6 }}>Retry</button></div>}
      {!loading && !error && !data.items.length && <div style={{ padding: 30, textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
        <div>No active listings match{q.trim() ? ` “${q.trim()}”` : ''}.</div>
        <div style={{ fontSize: 13, marginTop: 6, color: '#888' }}>Try fewer filters or a different keyword. Searches nobody can fill help us decide which sellers to invite.</div>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))', gap: 12, opacity: loading && data.items.length ? 0.6 : 1, transition: 'opacity .15s' }}>
        {showSkeleton ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />) : data.items.map(item => <ResultCard key={item._id} item={item} onOpen={open} />)}
      </div>
      {data.pages > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}><button style={btn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page} / {data.pages}</span><button style={btn} disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </div>
  </div>
}
