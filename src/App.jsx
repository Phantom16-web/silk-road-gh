import { useState, useEffect, useRef } from "react"
import axios from "axios"
import Checkout from "./Checkout"
import RentItems from "./RentItems"
import RequestService from "./RequestService"
import Auth from "./Auth"
import Account from "./Account"
import SellListing from "./SellListing"
import AdminPanel from "./AdminPanel"
import OrderTracker, {
  connectSellerSocket,
  disconnectSocket,
  ToastContainer,
  getOrders,
} from "./OrderTracker"
import { NotificationBell } from "./NotificationCenter"
import RiderAuth from "./RiderAuth"
import RiderApp from "./RiderApp"
import { getListings, getListing } from "./api"
import "./Home.css"
import { AIcon } from "./AccountIcons"
import HeroArt from "./HeroArt"
import ProductCard from "./ProductCard"
import ProductModal from "./ProductModal"
import AdvancedSearch from "./AdvancedSearch"
import { useRoute, navigate, listingPath, goBackOrHome } from "./router"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const ALL_LISTINGS = [
  { id: 1,  title: "Calculus Textbook",       price: 380,  category: "Books",       seller: "Ahmad K.",  university: "KNUST",    rating: 4.8, condition: "Good",      desc: "8th edition, some highlights but all pages intact. Perfect for MTH 151.",                       delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 2,  title: "MacBook Pro M2",           price: 8500, category: "Electronics", seller: "Priya S.",  university: "UG Legon", rating: 5.0, condition: "Excellent", desc: "Used for one semester only. Comes with original box and charger.",                            delivery: ["Pickup", "Rider", "Shipping"], section: "buy" },
  { id: 3,  title: "University Hoodie",        price: 120,  category: "Clothing",    seller: "Tobias M.", university: "Ashesi",   rating: 4.5, condition: "Good",      desc: "Navy blue XL hoodie. Barely worn, washed once.",                                             delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 4,  title: "Room Sublet",              price: 1800, category: "Housing",     seller: "Leila N.",  university: "UG Legon", rating: 4.9, condition: "N/A",       desc: "Single en-suite room, 10 min walk to campus. Bills included. June–August.",                  delivery: ["Pickup"],                     section: "buy" },
  { id: 5,  title: "Python Tutoring",          price: 80,   category: "Services",    seller: "James O.",  university: "KNUST",    rating: 4.7, condition: "N/A",       desc: "1hr session. Covers data structures, algorithms, and ML basics. Zoom or campus.",           delivery: ["Pickup"],                     section: "buy" },
  { id: 6,  title: "Organic Chemistry Book",   price: 420,  category: "Books",       seller: "Sara B.",   university: "UDS",      rating: 4.6, condition: "Fair",      desc: "McMurry 9th edition. Annotated throughout — actually helpful for exams.",                    delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 7,  title: "Mini Fridge",              price: 550,  category: "Electronics", seller: "Chen W.",   university: "UCC",      rating: 4.4, condition: "Good",      desc: "3.2 cu ft, perfect dorm size. Works great. Moving out sale.",                                delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 8,  title: "Meal Plan Credits",        price: 160,  category: "Food",        seller: "Maya R.",   university: "UG Legon", rating: 4.9, condition: "N/A",       desc: "200 meal plan points. Selling before they expire end of semester.",                         delivery: ["Pickup"],                     section: "buy" },
  { id: 9,  title: "Trek Bicycle",             price: 1800, category: "Sports",      seller: "Elias T.",  university: "Ashesi",   rating: 5.0, condition: "Excellent", desc: "Trek FX3 campus commuter. Lock and front light included.",                                   delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 10, title: "Oil Painting",             price: 480,  category: "Art",         seller: "Nour H.",   university: "KNUST",    rating: 4.8, condition: "N/A",       desc: "Original 18x24in abstract canvas, signed. Pickup only — fragile.",                         delivery: ["Pickup"],                     section: "buy" },
  { id: 11, title: "Graphic Design Service",   price: 200,  category: "Services",    seller: "Fiona L.",  university: "Ashesi",   rating: 4.9, condition: "N/A",       desc: "Logos, flyers, social media kits. 48hr turnaround. 3 revisions included.",                  delivery: ["Pickup"],                     section: "buy" },
  { id: 12, title: "Desk Lamp",                price: 95,   category: "Electronics", seller: "Omar A.",   university: "UG Legon", rating: 4.6, condition: "Good",      desc: "LED adjustable brightness, USB charging port on base.",                                     delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 13, title: "Statistics Textbook",      price: 220,  category: "Books",       seller: "Kwame B.",  university: "UCC",      rating: 4.3, condition: "Fair",      desc: "Good notes inside, a few highlighted chapters. Solid for stats courses.",                    delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 14, title: "Dorm Desk Chair",          price: 310,  category: "Furniture",   seller: "Ama S.",    university: "UG Legon", rating: 4.5, condition: "Good",      desc: "Ergonomic with lumbar support. Height adjustable. Minor scratch on base.",                  delivery: ["Pickup"],                     section: "buy" },
  { id: 15, title: "Guitar",                   price: 750,  category: "Music",       seller: "Kofi T.",   university: "KNUST",    rating: 4.7, condition: "Good",      desc: "Acoustic guitar with case and spare strings. Great for beginners.",                        delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 16, title: "Scientific Calculator",    price: 180,  category: "Electronics", seller: "Abena M.",  university: "GIJ",      rating: 4.8, condition: "Excellent", desc: "Casio fx-991EX. Barely used, all functions working perfectly.",                             delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 17, title: "Physics Textbook",         price: 200,  category: "Books",       seller: "Kweku A.",  university: "UDS",      rating: 4.5, condition: "Good",      desc: "Halliday & Resnick 10th edition. Perfect for first year physics.",                         delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 18, title: "Wireless Headphones",      price: 450,  category: "Electronics", seller: "Efua M.",   university: "Ashesi",   rating: 4.7, condition: "Excellent", desc: "Sony WH-1000XM4. Noise cancelling, 30hr battery. Barely used.",                            delivery: ["Pickup", "Rider", "Shipping"], section: "buy" },
  { id: 19, title: "Yoga Mat",                 price: 80,   category: "Sports",      seller: "Adwoa B.",  university: "UG Legon", rating: 4.3, condition: "Good",      desc: "6mm thick, non-slip surface. Comes with carry strap.",                                      delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 20, title: "Room Curtains",            price: 60,   category: "Furniture",   seller: "Kofi A.",   university: "KNUST",    rating: 4.2, condition: "Good",      desc: "Blackout curtains, 2 panels. Fits standard dorm windows.",                                  delivery: ["Pickup"],                     section: "buy" },
  { id: 21, title: "Chemistry Lab Coat",       price: 45,   category: "Clothing",    seller: "Ama K.",    university: "UCC",      rating: 4.6, condition: "Excellent", desc: "Size M lab coat, never used. Required for CHEM labs.",                                      delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 22, title: "Accounting Textbook",      price: 280,  category: "Books",       seller: "Yaw D.",    university: "UG Legon", rating: 4.4, condition: "Fair",      desc: "Financial Accounting 15th edition. Some annotations throughout.",                           delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 23, title: "Electric Kettle",          price: 120,  category: "Electronics", seller: "Abena S.",  university: "KNUST",    rating: 4.8, condition: "Good",      desc: "1.5L capacity, auto shut-off. Perfect for dorm room.",                                      delivery: ["Pickup", "Rider"],            section: "buy" },
  { id: 24, title: "Basketball",               price: 90,   category: "Sports",      seller: "Kwame T.",  university: "Ashesi",   rating: 4.5, condition: "Good",      desc: "Size 7 Spalding basketball. Good grip, minor scuff marks.",                                 delivery: ["Pickup"],                     section: "buy" },
]
const SECTION_LABEL = { buy: "🛒 Buy Products", rent: "📦 Rent Items", service: "🛠️ Request Service" }
const SECTION_COLOR = { buy: "#c8a97e", rent: "#93c5fd", service: "#6ee7b7" }
const PAGE_SIZE = 16
const DEFAULT_SITE_SETTINGS = {
  contactPhone:    "054 388 3608",
  contactWhatsApp: "233543883608",
  aboutText:       "Silk Road GH is Ghana's premier student marketplace — built by students, for students. Whether you're buying textbooks, renting equipment, requesting services, or making extra income, Silk Road GH is your go-to campus platform.",
  privacyText:     "We collect your name, contact information, location data (only during checkout), and transaction history to facilitate buying, selling, and delivery on the platform.",
  footerTagline:   "Ghana's student marketplace. Buy, sell, rent, and request services — all secured by escrow. Pay with Mobile Money or card.",
  deliveryFee:    10,
}
// ── Product Modal ──────────────────────────────────────────────────────────────
// ── Footer Modal ───────────────────────────────────────────────────────────────
function FooterModal({ type, onClose, siteSettings }) {
  if (!type) return null
  const content = {
    about: {
      title: "About Silk Road GH",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#aaa", lineHeight: "1.8" }}>
          <p>{siteSettings.aboutText}</p>
          <p>
            We connect university students across Ghana to buy, sell, rent, and trade goods and services safely. Every transaction is protected by our escrow system — your money is held securely until you confirm everything is good.
          </p>
          <p>
            Our rider network ensures fast, reliable on-campus delivery so you never have to worry about getting your items safely.
          </p>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Our Values
            </div>
            {[
              "🔒 Security — Every payment is held in escrow until delivery is confirmed.",
              "⚡ Speed — Campus riders deliver fast within your zone.",
              "🤝 Trust — Verified student community with ratings and reviews.",
              "💰 Fairness — We only take 8% when a transaction is completed.",
            ].map(v => (
              <div key={v} style={{ fontSize: "13px", color: "#aaa" }}>
                {v}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "#666" }}>
            Silk Road GH is proudly built for Ghanaian university students. Pay with Mobile Money or card.
          </p>
        </div>
      )
    },
    privacy: {
      title: "Privacy Policy",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#aaa", lineHeight: "1.8" }}>
          {[
            ["📋 Information We Collect", siteSettings.privacyText],
            ["🔒 How We Use Your Data", "Your data is used solely to process transactions, connect buyers with sellers, coordinate deliveries, and improve the platform. We do not sell your personal information to third parties."],
            ["📍 Location Data", "Location is only accessed during checkout when you choose to share it. It is used to coordinate delivery and is shared only with the seller or rider fulfilling your order."],
            ["💳 Payment Information", "Payments are made with Mobile Money (MTN, Telecel or AT) or card, through our payment partner or by direct Mobile Money transfer. Silk Road GH does not store your MoMo PIN or full payment credentials."],
            ["🤝 Data Sharing", "Your contact details are only shared with the relevant seller or rider after a confirmed payment. No data is shared with advertisers or unrelated third parties."],
            ["🗑️ Data Deletion", "You may request deletion of your account and associated data at any time by contacting us directly."],
            ["📞 Contact", `For any privacy concerns, reach us at ${siteSettings.contactPhone}.`],
          ].map(([title, text]) => (
            <div key={title}>
              <div style={{ fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>
                {title}
              </div>
              <p style={{ margin: 0 }}>{text}</p>
            </div>
          ))}
          <p style={{ fontSize: "12px", color: "#555" }}>
            Last updated: {new Date().getFullYear()}. Silk Road GH reserves the right to update this policy.
          </p>
        </div>
      )
    }
  }
  const c = content[type]
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "85vh", overflowY: "auto", border: "1px solid #1e1e1e" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>
            {c.title}
          </span>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "24px" }}>
          {c.body}
        </div>
      </div>
    </div>
  )
}
// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer({ onOpen, siteSettings }) {
  return (
    <footer className="sr-footer">
      <div className="sr-footer-in">
        <div className="sr-fgrid">
          <div>
            <div className="sr-brand" style={{ cursor: "default" }}><span className="sr-logo">S</span><span><b>Silk Road GH</b></span></div>
            <p>{siteSettings.footerTagline}</p>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><button className="sr-flink" onClick={() => onOpen("about")}>About Silk Road</button></li>
              <li><button className="sr-flink" onClick={() => onOpen("privacy")}>Privacy Policy</button></li>
            </ul>
          </div>
          <div>
            <h5>Contact us</h5>
            <ul>
              <li><a className="sr-flink" href={`tel:+${siteSettings.contactWhatsApp}`} style={{ color: "var(--sr-gold)", fontWeight: 700 }}>{siteSettings.contactPhone}</a></li>
              <li><a className="sr-flink" href={`https://wa.me/${siteSettings.contactWhatsApp}`} target="_blank" rel="noreferrer">WhatsApp us</a></li>
            </ul>
          </div>
          <div>
            <h5>Payments</h5>
            <div className="sr-pay">
              {[["MTN MoMo", "#ffcc00"], ["Telecel Cash", "#e60000"], ["AT Money", "#1e88e5"], ["Card", "#9aa4b2"]].map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}
            </div>
            <p style={{ marginTop: 12 }}>Secured escrow payments: sellers are only paid once you confirm delivery.</p>
          </div>
        </div>
        <div className="sr-fbottom"><span>© {new Date().getFullYear()} Silk Road GH. All rights reserved.</span><span>Built for Ghanaian students</span></div>
      </div>
    </footer>
  )
}
// ── Skeleton ───────────────────────────────────────────────────────────────────
const CATEGORY_ICONS = { All: "grid", Electronics: "bolt", Fashion: "bag", Food: "heart", Books: "package", Beauty: "sparkle", Appliances: "gear", Furniture: "store", Sports: "trend", Services: "tool" }

function ListingSkeleton() {
  return (
    <div className="hm-skel" aria-hidden="true">
      <i style={{ height: 250 }} />
      <div style={{ padding: 16, display: "grid", gap: 10 }}>
        <i style={{ height: 14, borderRadius: 7, width: "85%" }} /><i style={{ height: 12, borderRadius: 6, width: "55%" }} />
        <i style={{ height: 22, borderRadius: 8, width: "45%", marginTop: 6 }} /><i style={{ height: 44, borderRadius: 14, marginTop: 4 }} />
      </div>
    </div>
  )
}

// Signed-in identity: a green-ringed chip that says "Signed in" in plain words.
function AccountIdentity({ user, onClick }) {
  if (!user) return null
  const name = String(user.name || user.fullName || user.username || user.email?.split("@")[0] || "Member").trim()
  const firstName = name.split(/\s+/)[0]
  return (
    <button type="button" className="sr-me" onClick={onClick} title={`Signed in as ${name}`} aria-label={`Signed in as ${name}. Open your account`}>
      <span className="av" aria-hidden="true">{firstName.charAt(0).toUpperCase() || "S"}</span>
      <span className="tx"><small>Signed in</small><b>{firstName}</b></span>
      <AIcon name="chevron" size={16} />
    </button>
  )
}

// Live exchange rate with a refresh that spins while it works and says how fresh the number is.
function LiveRate({ rate, loading, at, onRefresh }) {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force(n => n + 1), 15000); return () => clearInterval(t) }, [])
  const secs = at ? Math.max(0, Math.floor((Date.now() - at) / 1000)) : null
  const age = secs == null ? "" : secs < 20 ? "just now" : secs < 3600 ? `${Math.floor(secs / 60) || 1}m ago` : "over an hour ago"
  return (
    <div className={`sr-rate ${loading ? "loading" : ""}`} role="status" aria-live="polite">
      <span className="live"><i />{loading ? "UPDATING" : "LIVE"}</span>
      <span className="val"><small>$1 =</small>₵{rate ? rate.toFixed(2) : "--"}</span>
      {age && !loading && <span className="age">{age}</span>}
      <button type="button" className={loading ? "spin" : ""} onClick={onRefresh} disabled={loading} aria-label="Refresh live exchange rate"><AIcon name="refresh" size={16} stroke={2.2} /></button>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [rate, setRate]                       = useState(null)
  const [rateLoading, setRateLoading]         = useState(true)
  const [rateAt, setRateAt]                   = useState(null)
  const [activeCategory, setActiveCategory]   = useState("All")
  const [favs, setFavs]                       = useState(() => { try { return JSON.parse(localStorage.getItem("silkroad_favs") || "[]") } catch { return [] } })
  const toggleFav = id => setFavs(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; try { localStorage.setItem("silkroad_favs", JSON.stringify(next)) } catch { /* private mode */ } return next })
  const [cart, setCart]                       = useState([])
  const [cartOpen, setCartOpen]               = useState(false)
  const [checkoutOpen, setCheckoutOpen]       = useState(false)
  const [activePage, setActivePage]           = useState("buy")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSearchListing, setSelectedSearchListing] = useState(null)
  const [footerModal, setFooterModal]         = useState(null)
  const [searchQuery, setSearchQuery]         = useState("")
  const [showDropdown, setShowDropdown]       = useState(false)
  const [showFullResults, setShowFullResults] = useState(false)
  const [user, setUser]                       = useState(null)
  const [showAuth, setShowAuth]               = useState(false)
  const [showAccount, setShowAccount]         = useState(false)
  const [showSell, setShowSell]               = useState(false)
  const [showAdmin, setShowAdmin]             = useState(false)
  const [showTracker, setShowTracker]         = useState(false)
  const [trackedOrder, setTrackedOrder]       = useState(null)
  const [authCallback, setAuthCallback]       = useState(null)
  const [siteSettings, setSiteSettings]       = useState(DEFAULT_SITE_SETTINGS)
  const [notifTick, setNotifTick]             = useState(0)
  const [riderUser, setRiderUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("silkroad_rider") || "null")
    } catch {
      return null
    }
  })
  const [showRiderAuth, setShowRiderAuth] = useState(false)
  useEffect(() => {
    const token = localStorage.getItem("silkroad_rider_token")
    if (!token) {
      localStorage.removeItem("silkroad_rider")
      setRiderUser(null)
      return
    }
    let cancelled = false
    fetch(`${API_URL}/rider-auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (!cancelled && localStorage.getItem("silkroad_rider_token") === token) {
            localStorage.removeItem("silkroad_rider_token")
            localStorage.removeItem("silkroad_rider")
            setRiderUser(null)
          }
          return
        }
        if (!response.ok) return // Preserve session during temporary network/server outages.
        const rider = await response.json()
        if (!cancelled && localStorage.getItem("silkroad_rider_token") === token && rider?._id) {
          localStorage.setItem("silkroad_rider", JSON.stringify(rider))
          setRiderUser(rider)
        }
      }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [dbListings, setDbListings]           = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsPage, setListingsPage]       = useState(1)
  const [hasMoreListings, setHasMoreListings] = useState(true)
  const [loadingMore, setLoadingMore]         = useState(false)
  const [visibleCount, setVisibleCount]       = useState(PAGE_SIZE)
  const [dbSearchResults, setDbSearchResults] = useState([])
  const [searchLoading, setSearchLoading]     = useState(false)
  const searchDebounceRef     = useRef(null)
  const bottomReachedTimerRef = useRef(null)
  const isAtBottomRef         = useRef(false)
  const searchRef             = useRef(null)
  const usingDb         = dbListings.length > 0
  const displayListings = usingDb ? dbListings : ALL_LISTINGS.slice(0, visibleCount)
  const hasMore         = usingDb ? hasMoreListings : visibleCount < ALL_LISTINGS.length
  const fetchListings = async (page = 1, reset = false) => {
    if (page === 1) setListingsLoading(true)
    else setLoadingMore(true)
    try {
      const data = await getListings({
        type: "product",
        page,
        limit: PAGE_SIZE
      })
      if (Array.isArray(data) && data.length > 0) {
        if (reset || page === 1) setDbListings(data)
        else setDbListings(prev => [...prev, ...data])
        setHasMoreListings(data.length === PAGE_SIZE)
        setListingsPage(page)
      } else if (Array.isArray(data) && data.length === 0 && page === 1) {
        setDbListings([])
        setHasMoreListings(false)
      }
    } catch {}
    setListingsLoading(false)
    setLoadingMore(false)
  }
  useEffect(() => {
    if (activePage === "buy") fetchListings(1, true)
    setVisibleCount(PAGE_SIZE)
  }, [activePage])
  useEffect(() => {
    const handleScroll = () => {
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 10
      if (atBottom && hasMore && !loadingMore && activePage === "buy") {
        if (!isAtBottomRef.current) {
          isAtBottomRef.current = true
          bottomReachedTimerRef.current = setTimeout(() => {
            if (isAtBottomRef.current) {
              if (usingDb) {
                fetchListings(listingsPage + 1)
              } else {
                setLoadingMore(true)
                setTimeout(() => {
                  setVisibleCount(c =>
                    Math.min(c + PAGE_SIZE, ALL_LISTINGS.length)
                  )
                  setLoadingMore(false)
                }, 600)
              }
            }
          }, 1000)
        }
      } else {
        isAtBottomRef.current = false
        if (bottomReachedTimerRef.current) {
          clearTimeout(bottomReachedTimerRef.current)
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (bottomReachedTimerRef.current) {
        clearTimeout(bottomReachedTimerRef.current)
      }
    }
  }, [hasMore, loadingMore, activePage, usingDb, listingsPage])
  useEffect(() => {
    if (!searchQuery.trim()) { setDbSearchResults([]); setSearchLoading(false); return }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${base}/search/suggest?q=${encodeURIComponent(searchQuery.trim())}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('Suggestions unavailable')
        const result = await res.json()
        if (!ctrl.signal.aborted) setDbSearchResults(result.suggestions || [])
      } catch { if (!ctrl.signal.aborted) setDbSearchResults([]) }
      finally { if (!ctrl.signal.aborted) setSearchLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [searchQuery])
  // ── Real, shareable URLs for listings and search results ─────────────────────
  // /listing/<id> and /search?q=… decide what is open. A tap on any result navigates to the listing's
  // URL; this effect then fetches the COMPLETE listing and opens the right view with full data, so
  // results genuinely open, and refresh, the Back button and shared links all behave.
  const route = useRoute()
  const routeKey = route.name === "listing" ? `listing:${route.id}` : route.name
  const [listingState, setListingState] = useState({ status: "idle", id: null }) // idle | loading | unavailable | error
  const [listingRetry, setListingRetry] = useState(0)
  const [pageEpoch, setPageEpoch] = useState(0) // bumped when a listing view closes so Rent/Service pages reset
  const prefillRef = useRef(null)
  const prevRouteRef = useRef("home")
  const openListing = (idOrItem, prefill = null) => {
    const id = typeof idOrItem === "string" ? idOrItem : idOrItem?._id
    if (!id) return
    prefillRef.current = prefill && prefill._id === id ? prefill : null
    navigate(listingPath(id))
  }
  const closeListing = () => {
    setListingState({ status: "idle", id: null })
    goBackOrHome()
  }
  const changePage = page => {
    setSelectedProduct(null)
    setSelectedSearchListing(null)
    if (route.name !== "home") navigate("/", { replace: true })
    setActivePage(page)
  }
  const openSearchResults = () => {
    const text = searchQuery.trim()
    if (!text) return
    setShowDropdown(false)
    navigate(`/search?q=${encodeURIComponent(text)}`)
  }
  useEffect(() => {
    const previous = prevRouteRef.current
    prevRouteRef.current = route.name
    if (route.name === "listing") {
      const id = route.id
      const prefilled = prefillRef.current && prefillRef.current._id === id ? prefillRef.current : null
      prefillRef.current = null
      const show = listing => {
        const section = listing.type === "product" ? "buy" : listing.type
        setShowFullResults(false)
        setActivePage(section)
        if (section === "buy") { setSelectedSearchListing(null); setSelectedProduct(listing) }
        else { setSelectedProduct(null); setSelectedSearchListing(listing) }
        setListingState({ status: "idle", id })
      }
      if (prefilled) { show(prefilled); return undefined }
      let cancelled = false
      setSelectedProduct(null)
      setListingState({ status: "loading", id })
      getListing(id)
        .then(data => {
          if (cancelled) return
          if (data && data._id) show(data)
          else setListingState({ status: data?.code === "LISTING_UNAVAILABLE" ? "unavailable" : "error", id })
        })
        .catch(() => { if (!cancelled) setListingState({ status: "error", id }) })
      return () => { cancelled = true }
    }
    // Not a listing: browsing normally, or Back / close brought us here.
    setListingState(prev => (prev.id === null && prev.status === "idle" ? prev : { status: "idle", id: null }))
    setSelectedProduct(null)
    setSelectedSearchListing(null)
    if (previous === "listing") setPageEpoch(n => n + 1)
    if (route.name === "search") { setSearchQuery(route.params?.q || ""); setShowFullResults(true) }
    else setShowFullResults(false)
    return undefined
  }, [routeKey, listingRetry]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const open = route.name === "listing" ? (selectedProduct || selectedSearchListing) : null
    document.title = open?.title ? `${open.title} — Silk Road GH` : "Silk Road GH — Ghana's Student Marketplace"
  }, [route.name, selectedProduct, selectedSearchListing])
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        setShowAdmin(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
  useEffect(() => {
    if (window.location.pathname === "/admin") {
      setShowAdmin(true)
    }
  }, [])
  useEffect(() => {
    const token = localStorage.getItem("silkroad_token")
    if (token && !user) {
      import("./api")
        .then(({ getMe }) => {
          getMe()
            .then(data => {
              if (data && data._id) {
                const u = {
                  _id: data._id,
                  name: data.name,
                  email: data.email,
                  university: data.university,
                  phone: data.phone,
                  role: data.role,
                  joined: new Date(
                    data.createdAt || Date.now()
                  ).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric"
                  }),
                }
                setUser(u)
                connectSellerSocket(data._id)
              }
            })
            .catch(() => {})
        })
    }
  }, [])
  useEffect(() => {
    const handler = () => setNotifTick(t => t + 1)
    window.addEventListener("silkroad_new_order", handler)
    return () =>
      window.removeEventListener("silkroad_new_order", handler)
  }, [])
  const fetchRate = async () => {
    setRateLoading(true)
    try {
      const res = await axios.get(
        "https://open.er-api.com/v6/latest/USD"
      )
      setRate(res.data.rates.GHS)
      setRateAt(Date.now())
    } catch { /* keep the last known rate */ }
    setRateLoading(false)
  }
  useEffect(() => {
    fetchRate()
  }, [])
  const getItemId = (item) => item._id || item.id
  const addToCart = (item) => {
    setCart(prev => {
      const id = getItemId(item)
      const exists = prev.find(i => getItemId(i) === id)
      if (exists) {
        return prev.map(i =>
          getItemId(i) === id
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      }
      return [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }
  const updateQty = (id, delta) =>
    setCart(prev =>
      prev.map(i =>
        getItemId(i) === id
          ? { ...i, qty: Math.max(1, i.qty + delta) }
          : i
      )
    )
  const removeItem = (id) =>
    setCart(prev => prev.filter(i => getItemId(i) !== id))
  const cartTotal = cart.reduce(
    (sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty,
    0
  )
  const cartCount = cart.reduce(
    (sum, i) => sum + i.qty,
    0
  )
  const handleSearchKey = (e) => {
    if (e.key === "Enter") openSearchResults()
    else if (e.key === "Escape") setShowDropdown(false)
  }
  const dropdownResults = dbSearchResults.map(item => ({
    id: item._id, imageId: item._id, title: item.title, category: item.category,
    section: item.type === 'product' ? 'buy' : item.type, image: item.image
  })).slice(0, 8)
  if (riderUser) {
    return (
      <>
        <RiderApp
          rider={riderUser}
          onSignOut={() => {
            localStorage.removeItem("silkroad_rider_token")
            localStorage.removeItem("silkroad_rider")
            setRiderUser(null)
          }}
        />
        <ToastContainer />
      </>
    )
  }
  const categoryList = (() => {
    const counts = {}
    displayListings.forEach(i => { const c = (i.category || "").trim(); if (c) counts[c] = (counts[c] || 0) + 1 })
    return [["All", displayListings.length], ...Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)]
  })()
  const shownListings = activeCategory === "All" ? displayListings : displayListings.filter(i => (i.category || "").trim() === activeCategory)

  return (
    <div className="sr-app">
      <header className="sr-header">
        <div className="sr-bar">
          <button type="button" className="sr-brand" onClick={() => changePage("buy")} aria-label="Silk Road home">
            <span className="sr-logo" aria-hidden="true">S</span>
            <span><b>Silk Road</b><small>Student marketplace</small></span>
          </button>

          <div className="sr-search" ref={searchRef}>
            <span className="lead"><AIcon name="search" size={18} /></span>
            <input
              type="search"
              placeholder="Search products, rentals, services..."
              aria-label="Search the marketplace"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
              onKeyDown={handleSearchKey}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            />
            {searchQuery && (
              <button type="button" className="clear" aria-label="Clear search" onClick={() => { setSearchQuery(""); setShowDropdown(false); setShowFullResults(false); if (route.name === "search") goBackOrHome() }}>
                <AIcon name="close" size={14} stroke={2.4} />
              </button>
            )}
            {showDropdown && searchQuery.trim() && dropdownResults.length > 0 && (
              <div className="sr-drop" role="listbox">
                {dropdownResults.map(item => (
                  <div key={item.id} className="sr-drop-item" role="option" onClick={() => { setShowDropdown(false); openListing(item.id) }}>
                    <img src={item.image || "/favicon.svg"} alt="" />
                    <div className="t"><b>{item.title}</b><span>{item.category}</span></div>
                    <span className="sr-tag" style={{ "--c": SECTION_COLOR[item.section] }}>{SECTION_LABEL[item.section].split(" ").slice(1).join(" ")}</span>
                  </div>
                ))}
                <div className="sr-drop-more" onClick={openSearchResults}>See all results →</div>
              </div>
            )}
            {showDropdown && searchQuery.trim() && dropdownResults.length === 0 && (
              <div className="sr-drop"><div className="sr-drop-empty">{searchLoading ? "Searching..." : `No results for "${searchQuery}"`}</div></div>
            )}
          </div>

          <div className="sr-actions">
            <button type="button" className="sr-link" onClick={() => setShowTracker(true)}><AIcon name="pin" size={17} />Track order</button>
            <button type="button" className="sr-link" onClick={() => setShowRiderAuth(true)}><AIcon name="bike" size={17} />Ride with us</button>
            <button type="button" className="sr-sell" onClick={() => setShowSell(true)}><AIcon name="plus" size={17} stroke={2.6} />Sell</button>
            <button type="button" className="sr-cartbtn" onClick={() => setCartOpen(true)} aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}>
              <AIcon name="cart" size={18} /><span className="lbl">Cart</span>
              {cartCount > 0 && <span className="n" key={cartCount}>{cartCount}</span>}
            </button>
            {user && <NotificationBell sellerId={user._id} onClick={() => setShowAccount(true)} />}
            {user ? <AccountIdentity user={user} onClick={() => setShowAccount(true)} />
              : <button type="button" className="sr-signin" onClick={() => setShowAuth(true)}><AIcon name="user" size={17} />Sign in</button>}
          </div>
        </div>
      </header>

      <div className="sr-subnav">
        <div className="sr-tabs" role="tablist" aria-label="Marketplace sections">
          {[["buy", "Buy", "bag"], ["rent", "Rent", "calendar"], ["service", "Services", "tool"]].map(([page, label, icon]) => (
            <button key={page} type="button" role="tab" aria-selected={activePage === page} className={`sr-tab ${activePage === page ? "on" : ""}`} onClick={() => changePage(page)}>
              <AIcon name={icon} size={16} />{label}
            </button>
          ))}
        </div>

        {user && (
          <div className="sr-welcome" role="status">
            <div>
              <span className="pulse" aria-hidden="true" />
              <span>You’re signed in as <b>{String(user.name || user.email || "you").split(" ")[0]}</b><span className="long">{user.university ? ` · ${user.university}` : ""}</span></span>
              <button type="button" onClick={() => setShowAccount(true)}>My account <AIcon name="arrow" size={14} stroke={2.4} /></button>
            </div>
          </div>
        )}
      </div>
      {/* ── PAGES ── */}
      <div style={{ flex: 1 }}>
        {activePage === "buy" && (
          <div className="sr-wrap">
            <section className="sr-hero">
              <span className="orb o1" aria-hidden="true" /><span className="orb o2" aria-hidden="true" />
              <div className="sr-hero-grid">
                <div className="sr-hero-in">
                  {user ? (<>
                    <span className="sr-eyebrow">Welcome back</span>
                    <h2>Hi {String(user.name || "there").split(" ")[0]}, <em>what are you after today?</em></h2>
                    <p>Pick up where you left off, check an order, or list something to sell.</p>
                    <div className="sr-quick">
                      <button type="button" onClick={() => setShowAccount(true)}><span className="ic"><AIcon name="user" size={19} /></span>My account</button>
                      <button type="button" onClick={() => setShowTracker(true)}><span className="ic"><AIcon name="pin" size={19} /></span>Track an order</button>
                      <button type="button" onClick={() => setShowSell(true)}><span className="ic"><AIcon name="plus" size={19} stroke={2.6} /></span>Sell an item</button>
                    </div>
                  </>) : (<>
                    <span className="sr-eyebrow">Ghana’s campus marketplace</span>
                    <h2>Buy, sell and rent <em>anything on campus.</em></h2>
                    <p>Trusted student sellers, safe escrow payments with Mobile Money, and verified riders to bring it to your door.</p>
                    <div className="sr-cta">
                      <button type="button" className="sr-btn primary" onClick={() => document.getElementById("sr-listings")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Start shopping <AIcon name="arrow" size={18} stroke={2.4} /></button>
                      <button type="button" className="sr-btn ghost" onClick={() => setShowAuth(true)}>Create free account</button>
                    </div>
                    <div className="sr-trust">
                      <span><AIcon name="shield" size={15} />Escrow protected</span>
                      <span><AIcon name="bike" size={15} />Verified riders</span>
                      <span><AIcon name="phone" size={15} />Pay with MoMo</span>
                    </div>
                    <div className="sr-minilinks">
                      <button type="button" onClick={() => setShowTracker(true)}><AIcon name="pin" size={14} />Track an order</button>
                      <button type="button" onClick={() => setShowRiderAuth(true)}><AIcon name="bike" size={14} />Ride with Silk Road</button>
                    </div>
                  </>)}
                </div>
                <HeroArt items={displayListings} />
              </div>
            </section>

            <div className="sr-cats" role="tablist" aria-label="Categories">
              {categoryList.map(([name, count]) => (
                <button key={name} type="button" role="tab" aria-selected={activeCategory === name} className={`sr-cat ${activeCategory === name ? "on" : ""}`} onClick={() => setActiveCategory(name)}>
                  <span className="ic"><AIcon name={CATEGORY_ICONS[name] || "tag"} size={17} /></span>{name}{name !== "All" && <em>{count}</em>}
                </button>
              ))}
            </div>

            <div className="sr-sectionhead" id="sr-listings">
              <div><h3>Fresh on the marketplace</h3><p>Handpicked by students, delivered to your hostel.</p></div>
              <LiveRate rate={rate} loading={rateLoading} at={rateAt} onRefresh={fetchRate} />
            </div>

            <div className="sr-listing-grid">
              {listingsLoading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ListingSkeleton key={i} />)
                : shownListings.map(item => (
                    <ProductCard
                      key={getItemId(item)}
                      item={item}
                      isFav={favs.includes(getItemId(item))}
                      onToggleFav={() => toggleFav(getItemId(item))}
                      rate={rate}
                      onSelect={() => (item._id ? openListing(item._id, item) : setSelectedProduct(item))}
                      onAddToCart={() => addToCart(item)}
                    />
                  ))}
            </div>
            {!listingsLoading && shownListings.length === 0 && <div className="sr-more">No listings in “{activeCategory}” yet. <button type="button" className="sr-flink" style={{ color: "var(--sr-gold)", fontWeight: 700 }} onClick={() => setActiveCategory("All")}>Show everything</button></div>}
            {loadingMore && <div className="sr-more">Loading more listings...</div>}
            {!hasMore && displayListings.length > PAGE_SIZE && <div className="sr-more">You’ve seen all listings</div>}
          </div>
        )}
        {activePage === "rent" && <RentItems key={`rent-${pageEpoch}`} rate={rate} initialListing={selectedSearchListing?.type === "rent" ? selectedSearchListing : null} />}
        {activePage === "service" && <RequestService key={`service-${pageEpoch}`} rate={rate} initialListing={selectedSearchListing?.type === "service" ? selectedSearchListing : null} />}
      </div>
      <Footer onOpen={setFooterModal} siteSettings={siteSettings} />
      <FooterModal
        type={footerModal}
        onClose={() => setFooterModal(null)}
        siteSettings={siteSettings}
      />
      {showFullResults && (
        <AdvancedSearch
          query={searchQuery}
          initial={route.name === "search" ? route.params : {}}
          campus={user?.university || ""}
          onClose={() => { if (route.name === "search") goBackOrHome(); else setShowFullResults(false) }}
          onOpenListing={item => openListing(item._id)}
        />
      )}
      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          onClose={() => (route.name === "listing" ? closeListing() : setSelectedProduct(null))}
          onCart={addToCart}
          toUSD={ghs => (ghs / (rate || 1)).toFixed(2)}
        />
      )}
      {listingState.status !== "idle" && (
        <div role="dialog" aria-modal="true" aria-label="Opening listing" style={{ position: "fixed", inset: 0, zIndex: 420, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "28px 24px", maxWidth: "360px", width: "100%", textAlign: "center", color: "#f0ede8" }}>
            {listingState.status === "loading" && (
              <>
                <div style={{ color: "#c8a97e", fontSize: "14px", marginBottom: "14px" }}>⏳ Opening listing...</div>
                <button onClick={closeListing} style={{ background: "transparent", border: "none", color: "#777", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Cancel</button>
              </>
            )}
            {listingState.status === "unavailable" && (
              <>
                <div style={{ fontSize: "34px", marginBottom: "8px" }}>🔍</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "17px" }}>This listing is no longer available</h3>
                <p style={{ margin: "0 0 18px", color: "#999", fontSize: "13px", lineHeight: 1.5 }}>It may have been sold or removed by the seller, or the link may be incorrect.</p>
                <button onClick={closeListing} style={{ background: "#c8a97e", color: "#17120b", border: "none", borderRadius: "10px", padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Browse the marketplace</button>
              </>
            )}
            {listingState.status === "error" && (
              <>
                <div style={{ fontSize: "34px", marginBottom: "8px" }}>📡</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "17px" }}>Couldn't load this listing</h3>
                <p style={{ margin: "0 0 18px", color: "#999", fontSize: "13px", lineHeight: 1.5 }}>Check your connection and try again.</p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button onClick={() => setListingRetry(n => n + 1)} style={{ background: "#c8a97e", color: "#17120b", border: "none", borderRadius: "10px", padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
                  <button onClick={closeListing} style={{ background: "#222", color: "#ddd", border: "1px solid #333", borderRadius: "10px", padding: "11px 18px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showAuth && (
        <Auth
          onAuth={userData => {
            setUser(userData)
            setShowAuth(false)
            connectSellerSocket(userData._id)
            if (authCallback) {
              authCallback()
              setAuthCallback(null)
            }
          }}
          onClose={() => {
            setShowAuth(false)
            setAuthCallback(null)
          }}
        />
      )}
      {showAccount && user && (
        <Account
          user={user}
          onSignOut={() => {
            disconnectSocket()
            setUser(null)
            setShowAccount(false)
            localStorage.removeItem("silkroad_token")
          }}
          onClose={() => setShowAccount(false)}
          onUserUpdate={updatedUser => setUser(updatedUser)}
          notifTick={notifTick}
        />
      )}
      {showSell && (
        <SellListing
          user={user}
          onRequestAuth={cb => {
            setAuthCallback(() => cb)
            setShowSell(false)
            setShowAuth(true)
          }}
          onClose={() => {
            setShowSell(false)
            fetchListings(1, true)
          }}
        />
      )}
      {showAdmin && (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
          siteSettings={siteSettings}
          onUpdateSiteSettings={setSiteSettings}
        />
      )}
      {showTracker && (
        <OrderTracker
          onClose={() => setShowTracker(false)}
          onOpenOrder={order => {
            setTrackedOrder(order)
            setShowTracker(false)
            setCheckoutOpen(true)
          }}
        />
      )}
      {showRiderAuth && (
        <RiderAuth
          onAuth={payload => {
            const token = payload?.token
            const rider = payload?.rider || payload
            if (!token || !rider?._id) return
            localStorage.setItem("silkroad_rider_token", token)
            localStorage.setItem("silkroad_rider", JSON.stringify(rider))
            setRiderUser(rider)
            setShowRiderAuth(false)
          }}
          onClose={() => setShowRiderAuth(false)}
        />
      )}
      {cartOpen && (
        <div className="sr-cart-layer" role="presentation">
          <div className="sr-cart-backdrop" onClick={() => setCartOpen(false)} />
          <aside className="sr-cart" role="dialog" aria-modal="true" aria-label="Your cart">
            <header>
              <div><h3>Your cart</h3><small>{cartCount === 0 ? "Nothing here yet" : `${cartCount} ${cartCount === 1 ? "item" : "items"}`}</small></div>
              <button type="button" className="sr-x" onClick={() => setCartOpen(false)} aria-label="Close cart"><AIcon name="close" size={18} /></button>
            </header>
            <div className="sr-cart-list">
              {cart.length === 0 ? (
                <div className="sr-cart-empty">
                  <div className="art"><AIcon name="cart" size={32} /></div>
                  <b>Your cart is empty</b>
                  <span>Find something you love and it will show up here.</span>
                  <button type="button" className="sr-btn primary" style={{ marginTop: 8 }} onClick={() => setCartOpen(false)}>Keep browsing</button>
                </div>
              ) : cart.map(item => {
                const itemId = getItemId(item)
                const itemPrice = item.price || item.dailyRate || 0
                const itemImage = item.image || `https://picsum.photos/seed/${item.id}/300/200`
                return (
                  <div key={itemId} className="sr-line">
                    <img src={itemImage} alt="" />
                    <div>
                      <b>{item.title}</b>
                      <div className="p">₵{(itemPrice * item.qty).toLocaleString()}<small>${(itemPrice * item.qty / (rate || 1)).toFixed(2)}</small></div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div className="sr-qty">
                          <button type="button" onClick={() => updateQty(itemId, -1)} aria-label="Decrease quantity">−</button>
                          <span>{item.qty}</span>
                          <button type="button" onClick={() => updateQty(itemId, 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" className="rm" onClick={() => removeItem(itemId)}>Remove</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {cart.length > 0 && (
              <footer>
                <div className="sr-total"><span>Total</span><b>₵{cartTotal.toLocaleString()}</b></div>
                <div className="sr-usd">≈ ${(cartTotal / (rate || 1)).toFixed(2)} USD</div>
                <button type="button" className="sr-btn primary" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>Checkout <AIcon name="arrow" size={18} stroke={2.4} /></button>
                <div className="sr-secure"><AIcon name="lock" size={13} />Escrow protected · pay with MoMo</div>
              </footer>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <Checkout
          cart={trackedOrder?.cart || cart}
          rate={rate}
          onClose={() => {
            setCheckoutOpen(false)
            setTrackedOrder(null)
          }}
          initialOrder={trackedOrder}
          siteSettings={siteSettings}
          user={user}
          onOrderPlaced={() => setCart([])}
        />
      )}
      <nav className="sr-bottom" aria-label="Main navigation">
        <button type="button" className={activePage === "buy" ? "on" : ""} onClick={() => changePage("buy")}><AIcon name="home" size={21} /><span>Shop</span></button>
        <button type="button" className={activePage === "rent" ? "on" : ""} onClick={() => changePage("rent")}><AIcon name="calendar" size={21} /><span>Rent</span></button>
        <button type="button" className="sell" onClick={() => setShowSell(true)} aria-label="Sell an item"><AIcon name="plus" size={24} stroke={2.8} /><span>Sell</span></button>
        <button type="button" className={activePage === "service" ? "on" : ""} onClick={() => changePage("service")}><AIcon name="tool" size={21} /><span>Services</span></button>
        <button type="button" onClick={() => (user ? setShowAccount(true) : setShowAuth(true))}>
          <AIcon name="user" size={21} /><span>{user ? "Me" : "Sign in"}</span>{user && <i className="dot" aria-hidden="true" />}
        </button>
      </nav>
      <ToastContainer />
    </div>
  )
}
export default App
