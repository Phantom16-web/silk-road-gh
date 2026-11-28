import { useState } from "react"
import { cedi, cediShort, useCountUp } from "./accountUtils"

export const CountMoney = ({ value, short }) => { const v = useCountUp(value); return <>{short ? cediShort(v) : cedi(v)}</> }

// Smooth area chart (inline SVG, no library). points: [{label, value}]
export function AreaChart({ points, height = 170, format = cedi }) {
  const w = 560, pad = 8, max = Math.max(1, ...points.map(p => p.value))
  const x = i => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1)
  const y = v => height - 22 - (v / max) * (height - 44)
  const path = points.map((p, i) => {
    if (i === 0) return `M${x(0)},${y(p.value)}`
    const cx = (x(i - 1) + x(i)) / 2
    return `C${cx},${y(points[i - 1].value)} ${cx},${y(p.value)} ${x(i)},${y(p.value)}`
  }).join(" ")
  const [hover, setHover] = useState(null)
  const active = hover ?? points.length - 1
  return <div className="ac-chart">
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)} role="img" aria-label="Earnings over time">
      <defs><linearGradient id="acArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e4c892" stopOpacity=".42" /><stop offset="1" stopColor="#e4c892" stopOpacity="0" /></linearGradient>
        <linearGradient id="acLine" x1="0" x2="1"><stop offset="0" stopColor="#b8935a" /><stop offset="1" stopColor="#f3dfae" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={w} y1={height - 22 - f * (height - 44)} y2={height - 22 - f * (height - 44)} className="grid" />)}
      <path d={`${path} L${x(points.length - 1)},${height - 22} L${x(0)},${height - 22} Z`} fill="url(#acArea)" className="area" />
      <path d={path} fill="none" stroke="url(#acLine)" strokeWidth="2.6" strokeLinecap="round" className="line" />
      {points.map((p, i) => <rect key={i} x={x(i) - (w / points.length) / 2} y="0" width={w / points.length} height={height} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />)}
      <line x1={x(active)} x2={x(active)} y1="6" y2={height - 22} className="cursor" />
      <circle cx={x(active)} cy={y(points[active]?.value || 0)} r="5" className="dot" />
    </svg>
    <div className="ac-chart-tip"><b>{format(points[active]?.value)}</b><span>{points[active]?.label}</span></div>
    <div className="ac-chart-axis"><span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span></div>
  </div>
}

// Ring chart. parts: [{label, value, color}]
export function Donut({ parts, center }) {
  const total = parts.reduce((s, p) => s + p.value, 0), R = 54, C = 2 * Math.PI * R
  let offset = 0
  return <div className="ac-donut">
    <svg viewBox="0 0 140 140" role="img" aria-label="Order pipeline">
      <circle cx="70" cy="70" r={R} className="track" />
      {total > 0 && parts.filter(p => p.value > 0).map(p => {
        const len = (p.value / total) * C, el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="14" strokeLinecap="butt" strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
        offset += len; return el
      })}
      <text x="70" y="66" textAnchor="middle" className="big">{center?.value}</text><text x="70" y="84" textAnchor="middle" className="small">{center?.label}</text>
    </svg>
    <ul>{parts.map(p => <li key={p.label}><i style={{ background: p.color }} />{p.label}<b>{p.value}</b></li>)}</ul>
  </div>
}

export function Bars({ rows, format = cedi }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return <ul className="ac-bars">{rows.map(r => <li key={r.label}><span title={r.label}>{r.label}</span><div><i style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }} /></div><b>{format(r.value)}</b></li>)}</ul>
}

