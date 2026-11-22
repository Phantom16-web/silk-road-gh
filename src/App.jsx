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
    <footer style={{ background: "#0a0a0a", borderTop: "1px solid #1e1e1e", marginTop: "60px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px 24px" }}>
        <div style={{ display: "flex", gap: "48px", flexWrap: "wrap", marginBottom: "40px" }}>
          <div style={{ flex: 2, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg,#c8a97e,#9a7040)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                🕸
              </div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>
                Silk Road GH
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.7", maxWidth: "280px" }}>
              {siteSettings.footerTagline}
            </p>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>
              Company
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button onClick={() => onOpen("about")} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                About Silk Road
              </button>
              <button onClick={() => onOpen("privacy")} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                Privacy Policy
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>
              Contact Us
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href={`tel:+${siteSettings.contactWhatsApp}`} style={{ color: "#c8a97e", fontSize: "14px", textDecoration: "none", fontWeight: "600" }}>
                📞 {siteSettings.contactPhone}
              </a>
              <a href={`https://wa.me/${siteSettings.contactWhatsApp}`} target="_blank" rel="noreferrer" style={{ color: "#888", fontSize: "14px", textDecoration: "none" }}>
                💬 WhatsApp Us
              </a>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>
              Payments
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[["MTN MoMo", "#ffcc00"], ["Telecel Cash", "#e60000"], ["AT Money", "#1e88e5"], ["Card", "#9aa4b2"]].map(([label, color]) => (
                  <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "999px", padding: "6px 10px", fontSize: "11px", color: "#ccc" }}>
                    <i style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, display: "block" }} />{label}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: "11px", color: "#555" }}>
                Secured escrow payments
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#444" }}>
            © {new Date().getFullYear()} Silk Road GH. All rights reserved.
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>
            Built for Ghanaian students 🇬🇭
          </div>
        </div>
      </div>
    </footer>
  )
}
// ── Skeleton ───────────────────────────────────────────────────────────────────
function ListingSkeleton() {
  return (
    <div style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      <div style={{ width: "100%", height: "180px", background: "#1a1a1a", animation: "shimmer 1.5s ease infinite" }} />
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: "10px", background: "#1a1a1a", borderRadius: "4px", width: "40%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "16px", background: "#1a1a1a", borderRadius: "4px", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "10px", background: "#1a1a1a", borderRadius: "4px", width: "60%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "24px", background: "#1a1a1a", borderRadius: "4px", width: "50%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "36px", background: "#1a1a1a", borderRadius: "8px", animation: "shimmer 1.5s ease infinite" }} />
      </div>
    </div>
  )
}

// Authenticated identity: deliberately self-contained so App.jsx is the only replacement.
function AccountIdentity({ user, onClick, compact = false }) {
  if (!user) return null
  const name = String(user.name || user.fullName || user.username || user.email?.split("@")[0] || "Member").trim()
  const firstName = name.split(/\s+/)[0]
  return (
    <button type="button" className={`sr-identity ${compact ? "sr-identity--compact" : ""}`}
      onClick={onClick} title={`Signed in as ${name}`}
      aria-label={`Signed in as ${name}. Open your account`}>
      <span className="sr-identity__avatar" aria-hidden="true">
        {firstName.charAt(0).toUpperCase() || "S"}
        <span className="sr-identity__online" />
      </span>
      <span className="sr-identity__copy">
        <span className="sr-identity__eyebrow"><span className="sr-identity__dot" /> SIGNED IN · SILK ROAD</span>
        <span className="sr-identity__name">Hi, {firstName}<span className="sr-identity__chevron">⌄</span></span>
      </span>
    </button>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [rate, setRate]                       = useState(null)
  const [rateLoading, setRateLoading]         = useState(true)
  const [cart, setCart]                       = useState([])
  const [cartOpen, setCartOpen]               = useState(false)
  const [checkoutOpen, setCheckoutOpen]       = useState(false)
  const [activePage, setActivePage]           = useState("buy")
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false)
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
    } catch {}
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
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }

        /* Marketplace grid: prevent the 130px desktop-card regression. */
        .sr-listing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 700px) { .sr-listing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 1050px) { .sr-listing-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 420px) { .sr-listing-grid { gap: 10px !important; } }

        /* Premium signed-in identity, desktop and mobile */
        .sr-identity { display:inline-flex;align-items:center;gap:10px;max-width:220px;min-width:0;padding:6px 12px 6px 6px;border:1px solid #c8a97e55;border-radius:15px;background:linear-gradient(135deg,#29231b 0%,#141414 65%,#101010 100%);color:#f8f2e9;cursor:pointer;text-align:left;box-shadow:0 2px 14px #0005,inset 0 1px #ffffff0b;transition:transform .18s,border-color .18s,box-shadow .18s;flex-shrink:0; }
        .sr-identity:hover,.sr-identity:focus-visible { border-color:#c8a97e;box-shadow:0 0 0 3px #c8a97e22;transform:translateY(-1px); }
        .sr-identity__avatar { position:relative;flex:none;width:37px;height:37px;border-radius:12px;background:linear-gradient(135deg,#f1d5a5,#b38b51);color:#1b140d;display:grid;place-items:center;font-size:17px;font-weight:850;box-shadow:inset 0 1px #fff6; }
        .sr-identity__online { position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;background:#22c55e;border:2px solid #161616;border-radius:50%; }
        .sr-identity__copy { display:flex;flex-direction:column;gap:2px;min-width:0; }
        .sr-identity__eyebrow { color:#d5bd95;font-size:8px;font-weight:800;letter-spacing:.1em;white-space:nowrap; }
        .sr-identity__dot { display:inline-block;width:5px;height:5px;margin-right:3px;border-radius:50%;background:#22c55e;vertical-align:middle; }
        .sr-identity__name { font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px; }
        .sr-identity__chevron { margin-left:7px;color:#c8a97e; }
        .sr-identity--compact { padding:4px 7px 4px 4px;border-radius:13px;max-width:160px;gap:7px; }
        .sr-identity--compact .sr-identity__avatar { width:32px;height:32px;border-radius:10px;font-size:14px; }
        .sr-identity--compact .sr-identity__eyebrow { font-size:7px; }
        .sr-identity--compact .sr-identity__name { font-size:11px;max-width:105px; }
        @media(max-width:640px) { .sr-mobile-controls { gap:5px;min-width:0; } .sr-mobile-controls > button { flex-shrink:0; } .sr-topbar { gap:6px; } }
        @media(max-width:360px) { .sr-identity--compact { max-width:125px; } .sr-identity--compact .sr-identity__eyebrow { display:none; } .sr-identity--compact .sr-identity__name { max-width:70px; } }
        @media(prefers-reduced-motion:reduce) { .sr-identity { transition:none; } }
        .sr-desktop-actions { display: flex; align-items: center; gap: 6px; }
        .sr-mobile-controls { display: none; align-items: center; gap: 8px; }
        .sr-mobile-menu { display: none; }
        .sr-mobile-action { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: #151515; border: 1px solid #292929; border-radius: 9px; color: #eee; text-align: left; font: inherit; cursor: pointer; }
        .sr-mobile-action-primary { color: #c8a97e; font-weight: 700; }
        @media (max-width: 640px) {
          .sr-desktop-actions { display: none !important; }
          .sr-mobile-controls { display: flex; }
          .sr-mobile-menu { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #0d0d0d; border-bottom: 1px solid #292929; }
          .sr-topbar { padding: 10px 12px !important; }
          .sr-brand { font-size: 18px !important; }
          .sr-nav-links { padding: 0 10px !important; }
          .sr-nav-links button { padding: 11px 12px !important; font-size: 12px !important; }
          .sr-search-wrap { padding: 8px 12px 10px !important; }
        }
      `}</style>
      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 90 }}>
        <div className="sr-topbar" style={{ background: "#0a0a0a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a1a" }}>
          <h1
            className="sr-brand"
            onClick={() => { changePage("buy"); setMobileMenuOpen(false) }}
            style={{ color: "#c8a97e", fontWeight: "bold", fontSize: "20px", flexShrink: 0, cursor: "pointer", margin: 0 }}
          >
            Silk Road
          </h1>
          <div className="sr-desktop-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setShowSell(true)}
              style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              + Sell
            </button>
            <button
              onClick={() => setShowRiderAuth(true)}
              style={{ background: "transparent", border: "1px solid #333", color: "#aaa", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
              title="Rider Login"
            >
              🛵
            </button>
            <button
              onClick={() => setShowTracker(true)}
              style={{ background: "transparent", border: "1px solid #333", color: "#aaa", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
              title="Track Order"
            >
              📦
            </button>
            {user && (
              <NotificationBell
                sellerId={user._id}
                onClick={() => setShowAccount(true)}
              />
            )}
            {user ? (
              <AccountIdentity user={user} onClick={() => setShowAccount(true)} />
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{ background: "#c8a97e", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setCartOpen(true)}
              style={{ position: "relative", background: "transparent", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}
            >
              🛒
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
          <div className="sr-mobile-controls">
            {user && <AccountIdentity user={user} compact onClick={() => setShowAccount(true)} />}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              style={{ position: "relative", background: "transparent", border: "1px solid #333", borderRadius: "8px", color: "#fff", fontSize: "21px", cursor: "pointer", padding: "6px 9px", minWidth: "42px", minHeight: "40px" }}
            >
              🛒
              {cartCount > 0 && <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
            <button
              onClick={() => setMobileMenuOpen(open => !open)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              style={{ background: mobileMenuOpen ? "#292929" : "#151515", border: "1px solid #333", borderRadius: "8px", color: "#eee", fontSize: "21px", cursor: "pointer", padding: "6px 10px", minWidth: "42px", minHeight: "40px" }}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sr-mobile-menu">
            <button className="sr-mobile-action sr-mobile-action-primary" onClick={() => { setShowSell(true); setMobileMenuOpen(false) }}>＋ Sell an item</button>
            <button className="sr-mobile-action" onClick={() => { setShowTracker(true); setMobileMenuOpen(false) }}>📦 Track an order</button>
            <button className="sr-mobile-action" onClick={() => { setShowRiderAuth(true); setMobileMenuOpen(false) }}>🛵 Rider login</button>
            {user ? (
              <button className="sr-mobile-action" onClick={() => { setShowAccount(true); setMobileMenuOpen(false) }}>👤 My account ({user.name})</button>
            ) : (
              <button className="sr-mobile-action sr-mobile-action-primary" onClick={() => { setShowAuth(true); setMobileMenuOpen(false) }}>↪ Sign in / Create account</button>
            )}
            {user && <button className="sr-mobile-action" onClick={() => { setShowAccount(true); setMobileMenuOpen(false) }}>🔔 Notifications</button>}
          </div>
        )}
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e" }}>
          <div className="sr-nav-links" style={{ padding: "0 16px", display: "flex", gap: "4px", overflowX: "auto" }}>
            {[
              { label: "Buy Products", page: "buy" },
              { label: "Rent Items", page: "rent" },
              { label: "Request Service", page: "service" },
            ].map(link => (
              <button
                key={link.page}
                onClick={() => { changePage(link.page); setMobileMenuOpen(false) }}
                style={{ background: "transparent", border: "none", color: activePage === link.page ? "#c8a97e" : "#aaa", cursor: "pointer", fontSize: "13px", fontWeight: "600", borderBottom: activePage === link.page ? "2px solid #c8a97e" : "2px solid transparent", padding: "12px 14px", whiteSpace: "nowrap", fontFamily: "inherit" }}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="sr-search-wrap" style={{ padding: "8px 16px 12px" }}>
            <div ref={searchRef} style={{ position: "relative" }}>
              <input
                placeholder="Search products, rentals, services..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onKeyDown={handleSearchKey}
                onFocus={() =>
                  searchQuery.trim() && setShowDropdown(true)
                }
                style={{ width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px", border: "none", background: "#1e1e1e", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setShowDropdown(false)
                    setShowFullResults(false)
                    if (route.name === "search") goBackOrHome()
                  }}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "15px" }}
                >
                  ✕
                </button>
              ) : (
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", opacity: .4, pointerEvents: "none" }}>
                  🔍
                </span>
              )}
              {showDropdown &&
                searchQuery.trim() &&
                dropdownResults.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", zIndex: 500, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
                    {dropdownResults.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setShowDropdown(false)
                          openListing(item.id)
                        }}
                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #222" }}
                        onMouseEnter={e =>
                          e.currentTarget.style.background = "#222"
                        }
                        onMouseLeave={e =>
                          e.currentTarget.style.background = "transparent"
                        }
                      >
                        <img
                          src={item.image || "/favicon.svg"}
                          alt={item.title}
                          style={{ width: "34px", height: "34px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: "11px", color: "#555" }}>
                            {item.category}
                          </div>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[item.section], background: `${SECTION_COLOR[item.section]}22`, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                          {SECTION_LABEL[item.section].split(" ").slice(1).join(" ")}
                        </span>
                      </div>
                    ))}
                    <div
                      onClick={openSearchResults}
                      style={{ padding: "10px 14px", textAlign: "center", fontSize: "13px", color: "#c8a97e", cursor: "pointer", fontWeight: "600" }}
                      onMouseEnter={e =>
                        e.currentTarget.style.background = "#222"
                      }
                      onMouseLeave={e =>
                        e.currentTarget.style.background = "transparent"
                      }
                    >
                      See all results →
                    </div>
                  </div>
                )}
              {showDropdown &&
                searchQuery.trim() &&
                dropdownResults.length === 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", zIndex: 500, padding: "14px", textAlign: "center", color: "#555", fontSize: "13px" }}>
                    {searchLoading
                      ? "⏳ Searching..."
                      : `No results for "${searchQuery}"`}
                  </div>
                )}
            </div>
          </div>
        </div>
      </nav>
      {/* ── PAGES ── */}
      <div style={{ flex: 1 }}>
        {activePage === "buy" && (
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: rateLoading ? "#444" : "#22c55e", animation: rateLoading ? "none" : "livePulse 2s ease infinite", flexShrink: 0 }} />
                <span style={{ color: "#666", fontSize: "13px" }}>
                  {rateLoading
                    ? "Fetching live rate..."
                    : `$1 USD = ₵${rate?.toFixed(2)} GHS`}
                </span>
              </div>
              <button
                onClick={fetchRate}
                style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}
              >
                ↻ Refresh
              </button>
            </div>
            <div className="sr-listing-grid" style={{ display: "grid", gap: "16px", minWidth: 0 }}>
              {listingsLoading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <ListingSkeleton key={i} />
                  ))
                : displayListings.map(item => (
                    <ProductCard
                      key={getItemId(item)}
                      item={item}
                      rate={rate}
                      onSelect={() => (item._id ? openListing(item._id, item) : setSelectedProduct(item))}
                      onAddToCart={() => addToCart(item)}
                    />
                  ))}
            </div>
            {loadingMore && (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#555", fontSize: "13px" }}>
                ⏳ Loading more listings...
              </div>
            )}
            {!hasMore && displayListings.length > PAGE_SIZE && (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#333", fontSize: "12px" }}>
                You've seen all listings
              </div>
            )}
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
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div
            onClick={() => setCartOpen(false)}
            style={{ flex: 1, background: "#000000aa" }}
          />
          <div style={{ width: "340px", background: "#111", borderLeft: "1px solid #1e1e1e", display: "flex", flexDirection: "column", height: "100vh", animation: "slideIn 0.3s ease" }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
            <div style={{ padding: "20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>
                Your Cart ({cartCount})
              </span>
              <button
                onClick={() => setCartOpen(false)}
                style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", paddingTop: "60px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>
                    🛒
                  </div>
                  <div>Your cart is empty</div>
                </div>
              ) : (
                cart.map(item => {
                  const itemId    = getItemId(item)
                  const itemPrice = item.price || item.dailyRate || 0
                  const itemImage = item.image || `https://picsum.photos/seed/${item.id}/300/200`
                  return (
                    <div
                      key={itemId}
                      style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #1e1e1e", alignItems: "center" }}
                    >
                      <img
                        src={itemImage}
                        alt={item.title}
                        style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "13px", color: "#c8a97e", fontWeight: "700" }}>
                          ₵{(itemPrice * item.qty).toLocaleString()}
                          <span style={{ color: "#555", fontWeight: "400" }}>
                            {" "}
                            (${(itemPrice * item.qty / (rate || 1)).toFixed(2)})
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                          <button
                            onClick={() => updateQty(itemId, -1)}
                            style={{ width: "26px", height: "26px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: "13px" }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(itemId, 1)}
                            style={{ width: "26px", height: "26px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItem(itemId)}
                            style={{ marginLeft: "8px", background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "12px" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "20px", borderTop: "1px solid #1e1e1e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ color: "#888" }}>
                    Total
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e" }}>
                    ₵{cartTotal.toLocaleString()}
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {" "}
                      (${(cartTotal / (rate || 1)).toFixed(2)})
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCartOpen(false)
                    setCheckoutOpen(true)
                  }}
                  style={{ width: "100%", background: "#c8a97e", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
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
      <ToastContainer />
    </div>
  )
}
export default App
