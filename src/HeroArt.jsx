import { useRef } from "react"
import { AIcon } from "./AccountIcons"

// A floating stack of real listings in perspective, with a gold coin and live badges.
// It reacts to the pointer (desktop) and falls back to illustrated tiles when there are no listings yet.
const TILES = [
  { title: "Study lamp", price: 85, hue: "#c9a46a" },
  { title: "Wireless speaker", price: 380, hue: "#7da7c9" },
  { title: "Fresh sneakers", price: 450, hue: "#c97d7d" },
]

function Glyph({ i }) {
  const common = { fill: "none", stroke: "#f4e0b0", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }
  return (
    <svg viewBox="0 0 64 64" width="46%" aria-hidden="true">
      {i === 0 && <g {...common}><path d="M20 50h24M32 50V30M22 30l10-18 10 18z" /></g>}
      {i === 1 && <g {...common}><rect x="18" y="12" width="28" height="40" rx="8" /><circle cx="32" cy="36" r="8" /><circle cx="32" cy="22" r="2" /></g>}
      {i === 2 && <g {...common}><path d="M10 40c10 0 12-12 22-12s10 12 22 12v6H10z" /><path d="M22 40v-6M32 40v-8" /></g>}
    </svg>
  )
}

export default function HeroArt({ items = [] }) {
  const ref = useRef(null)
  const real = items.filter(i => i && i.image).slice(0, 3)
  const cards = (real.length >= 3 ? real : [...real, ...TILES.slice(real.length)]).slice(0, 3)

  const move = e => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty("--ry", `${-16 + x * 14}deg`); el.style.setProperty("--rx", `${8 - y * 12}deg`)
  }
  const reset = () => { const el = ref.current; if (el) { el.style.removeProperty("--ry"); el.style.removeProperty("--rx") } }

  return (
    <div className="sr-art" ref={ref} onPointerMove={move} onPointerLeave={reset} aria-hidden="true">
      <span className="ring r1" /><span className="ring r2" /><span className="halo" />
      <div className="stage">
        {cards.map((c, i) => (
          <figure key={c._id || c.id || i} className={`tile t${i}`}>
            {c.image ? <img src={c.image} alt="" loading="lazy" />
              : <span className="ph" style={{ background: `radial-gradient(circle at 30% 20%, ${c.hue}, #17120c 85%)` }}><Glyph i={i} /></span>}
            <figcaption><b>{c.title}</b><span>₵{Number(c.price || c.dailyRate || 0).toLocaleString()}</span></figcaption>
          </figure>
        ))}
        <span className="coin"><b>₵</b></span>
        <span className="float f1"><AIcon name="shield" size={14} stroke={2.2} />Escrow protected</span>
        <span className="float f2"><AIcon name="bike" size={14} stroke={2.2} />Rider on the way</span>
      </div>
    </div>
  )
}
