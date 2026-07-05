import { useState, useEffect, useRef } from "react"
import axios from "axios"
import Checkout from "./Checkout"
import RentItems from "./RentItems"
import RequestService from "./RequestService"
import BecomeRider from "./BecomeRider"
import Auth from "./Auth"
import Account from "./Account"
import SellListing from "./SellListing"
import AdminPanel from "./AdminPanel"
import OrderTracker, { NotificationBell, connectSellerSocket, disconnectSocket } from "./OrderTracker"
import RiderDashboard from "./RiderDashboard"
import { getListings } from "./api"

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

const RENTALS_SEARCH = [
  { id: 101, title: "Canon EOS M50 Camera",          category: "Electronics", imageId: 21, section: "rent" },
  { id: 102, title: "Projector – Epson X41",          category: "Electronics", imageId: 22, section: "rent" },
  { id: 103, title: "Mountain Bike",                  category: "Sports",      imageId: 23, section: "rent" },
  { id: 104, title: "MacBook Air M1",                 category: "Electronics", imageId: 24, section: "rent" },
  { id: 105, title: "Acoustic Guitar",                category: "Music",       imageId: 25, section: "rent" },
  { id: 106, title: "Camping Tent (4-person)",        category: "Outdoors",    imageId: 26, section: "rent" },
  { id: 107, title: "PS5 Console + 2 Controllers",   category: "Gaming",      imageId: 27, section: "rent" },
  { id: 108, title: "Scientific Calculator (Casio)",  category: "Academic",    imageId: 28, section: "rent" },
]

const SERVICES_SEARCH = [
  { id: 201, title: "Mathematics Private Lessons",      category: "Lessons",       imageId: 31, section: "service" },
  { id: 202, title: "Concert & Event Photography",      category: "Photography",   imageId: 32, section: "service" },
  { id: 203, title: "Room & Hostel Cleaning",           category: "Cleaning",      imageId: 33, section: "service" },
  { id: 204, title: "Python & Data Science Tutoring",   category: "Lessons",       imageId: 34, section: "service" },
  { id: 205, title: "Graphic Design – Logo & Branding", category: "Design",        imageId: 35, section: "service" },
  { id: 206, title: "DJ Services for Events",           category: "Entertainment", imageId: 36, section: "service" },
  { id: 207, title: "French Language Lessons",          category: "Lessons",       imageId: 37, section: "service" },
  { id: 208, title: "CV & Cover Letter Writing",        category: "Career",        imageId: 38, section: "service" },
]

const ALL_ITEMS = [
  ...ALL_LISTINGS.map(i => ({ ...i, imageId: i.id })),
  ...RENTALS_SEARCH,
  ...SERVICES_SEARCH,
]

const SECTION_LABEL = { buy: "🛒 Buy",     rent: "📦 Rent",    service: "🛠️ Service" }
const SECTION_COLOR = { buy: "#c8a97e",   rent: "#93c5fd",   service: "#6ee7b7" }
const PAGE_SIZE = 16

const SECTION_KEYWORDS = {
  buy:     ["buy", "purchase", "product", "products", "shop", "shopping"],
  rent:    ["rent", "rental", "rentals", "borrow", "lease", "hire"],
  service: ["service", "services", "request", "booking", "book"],
}

const DEFAULT_SITE_SETTINGS = {
  contactPhone:    "054 388 3608",
  contactWhatsApp: "233543883608",
  aboutText:       "Silk Road GH is Ghana's premier student marketplace — built by students, for students.",
  privacyText:     "We collect your name, contact information, location data (only during checkout), and transaction history to facilitate buying, selling, and delivery on the platform.",
  footerTagline:   "Ghana's student marketplace. Buy, sell, rent, and request services — all secured by escrow and powered by MTN MoMo.",
  deliveryFee:     10,
  paymentMode:     "manual",
}

const parseSearch = (query) => {
  const q = query.toLowerCase().trim()
  const words = q.split(" ")
  let detectedSection = null
  let remainingWords = [...words]
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (words.includes(kw)) {
        detectedSection = section
        remainingWords = words.filter(w => w !== kw)
        break
      }
    }
    if (detectedSection) break
  }
  return { detectedSection, keyword: remainingWords.join(" ").trim() }
}

// ── Product Modal ──────────────────────────────────────────────────────────────
function ProductModal({ item, onClose, onCart, rate }) {
  if (!item) return null
  const isDb = !!item._id
  const sellerName = isDb ? item.seller?.name : item.seller
  const university = isDb ? item.seller?.university : item.university
  const itemImage  = item.image || `https://picsum.photos/seed/${item.id}/600/350`
  const delivery   = item.delivery || []
  const toUSD = (ghs) => rate ? (ghs / rate).toFixed(2) : "..."

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={itemImage} alt={item.title} style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #111)", borderRadius: "20px 20px 0 0", pointerEvents: "none" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>{item.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#f0ede8", marginBottom: "6px", letterSpacing: "-0.02em" }}>{item.title}</h2>
            <div style={{ fontSize: "13px", color: "#555" }}>by <span style={{ color: "#888", fontWeight: "600" }}>{sellerName}</span></div>
            {university && <div style={{ fontSize: "12px", color: "#444", marginTop: "3px" }}>🎓 {university}</div>}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {item.rating > 0 && <div style={{ fontSize: "13px", color: "#c8a97e" }}>{"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))} <span style={{ color: "#555", fontSize: "12px" }}>{item.rating}</span></div>}
            {item.condition && item.condition !== "N/A" && <span style={{ fontSize: "11px", color: "#666", background: "#1a1a1a", border: "1px solid #222", padding: "3px 10px", borderRadius: "20px", fontWeight: "600" }}>{item.condition}</span>}
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "16px" }}>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.7", margin: 0 }}>{item.desc}</p>
          </div>
          {delivery.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {delivery.map(d => (
                <span key={d} style={{ fontSize: "11px", background: "#1a1a1a", border: "1px solid #222", color: "#888", padding: "4px 12px", borderRadius: "20px", fontWeight: "600" }}>
                  {d === "Pickup" ? "📍 Campus Pickup" : d === "Rider" ? "🛵 Rider Delivery" : "📦 Shipping"}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1a1a1a", paddingTop: "18px" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.03em" }}>₵{(item.price || 0).toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#444" }}>${toUSD(item.price || 0)} USD</div>
            </div>
            <button className="btn-gold" onClick={() => { onCart(item); onClose() }} style={{ padding: "13px 28px", borderRadius: "12px", fontSize: "14px" }}>
              🛒 Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Footer Modal ───────────────────────────────────────────────────────────────
function FooterModal({ type, onClose, siteSettings }) {
  if (!type) return null
  const content = {
    about: {
      title: "About Silk Road GH",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#888", lineHeight: "1.8" }}>
          <p>{siteSettings.aboutText}</p>
          <p>We connect university students across Ghana to buy, sell, rent, and trade goods and services safely. Every transaction is protected by our escrow system — your money is held securely until you confirm everything is good.</p>
          <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "10px", color: "#444", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em" }}>Our Values</div>
            {["🔒 Security — Every payment is held in escrow until delivery is confirmed.", "⚡ Speed — Campus riders deliver fast within your zone.", "🤝 Trust — Verified student community with ratings and reviews.", "💰 Fairness — We only take 8% when a transaction is completed."].map(v => (
              <div key={v} style={{ fontSize: "13px", color: "#666" }}>{v}</div>
            ))}
          </div>
        </div>
      )
    },
    privacy: {
      title: "Privacy Policy",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#888", lineHeight: "1.8" }}>
          {[
            ["📋 Information We Collect", siteSettings.privacyText],
            ["🔒 How We Use Your Data", "Your data is used solely to process transactions, connect buyers with sellers, coordinate deliveries, and improve the platform. We do not sell your personal information to third parties."],
            ["📍 Location Data", "Location is only accessed during checkout when you choose to share it. It is used to coordinate delivery and is shared only with the seller or rider fulfilling your order."],
            ["💳 Payment Information", "All payments are processed securely. Silk Road GH does not store your MTN MoMo PIN or full payment credentials."],
            ["🗑️ Data Deletion", "You may request deletion of your account and associated data at any time by contacting us directly."],
            ["📞 Contact", `For any privacy concerns, reach us at ${siteSettings.contactPhone}.`],
          ].map(([title, text]) => (
            <div key={title}>
              <div style={{ fontWeight: "700", color: "#f0ede8", marginBottom: "6px", fontSize: "13px" }}>{title}</div>
              <p style={{ margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      )
    }
  }
  const c = content[type]
  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "20px", width: "100%", maxWidth: "560px", maxHeight: "85vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>{c.title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{c.body}</div>
      </div>
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer({ onOpen, siteSettings }) {
  return (
    <footer style={{ background: "#080808", borderTop: "1px solid #141414", marginTop: "80px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "56px 24px 28px" }}>
        <div style={{ display: "flex", gap: "56px", flexWrap: "wrap", marginBottom: "48px" }}>
          <div style={{ flex: 2, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg,#c8a97e,#9a7040)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>🕸</div>
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em" }}>Silk Road GH</span>
            </div>
            <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.8", maxWidth: "260px" }}>{siteSettings.footerTagline}</p>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "18px" }}>Company</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[["About Silk Road", "about"], ["Privacy Policy", "privacy"]].map(([label, key]) => (
                <button key={key} onClick={() => onOpen(key)}
                  style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", textAlign: "left", padding: 0, fontFamily: "inherit", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#c8a97e"}
                  onMouseLeave={e => e.target.style.color = "#555"}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "18px" }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <a href={`tel:+${siteSettings.contactWhatsApp}`} style={{ color: "#c8a97e", fontSize: "14px", textDecoration: "none", fontWeight: "600" }}>📞 {siteSettings.contactPhone}</a>
              <a href={`https://wa.me/${siteSettings.contactWhatsApp}`} target="_blank" rel="noreferrer" style={{ color: "#555", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#c8a97e"}
                onMouseLeave={e => e.target.style.color = "#555"}>
                💬 WhatsApp
              </a>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "18px" }}>Payments</div>
            <div style={{ background: "#ffd700", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", color: "#1a1a00", display: "inline-flex", alignItems: "center", gap: "6px" }}>📱 MTN MoMo</div>
            <div style={{ fontSize: "11px", color: "#333", marginTop: "8px" }}>Escrow protected</div>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #141414" }} />
        <div style={{ paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#333" }}>© {new Date().getFullYear()} Silk Road GH. All rights reserved.</div>
          <div style={{ fontSize: "12px", color: "#333" }}>Built for Ghanaian students 🇬🇭</div>
        </div>
      </div>
    </footer>
  )
}

// ── Search Results ─────────────────────────────────────────────────────────────
function SearchResults({ query, onClose, onNavigate }) {
  const { detectedSection, keyword } = parseSearch(query)
  const [dbResults, setDbResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getListings({ search: keyword || query, limit: 20 })
      .then(data => setDbResults(Array.isArray(data) ? data : []))
      .catch(() => setDbResults([]))
      .finally(() => setLoading(false))
  }, [query])

  const staticResults = ALL_ITEMS.filter(item => {
    if (item.section === "buy") return false
    const matchesSection = detectedSection ? item.section === detectedSection : true
    const matchesKeyword = keyword ? item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword) : true
    return matchesSection && matchesKeyword
  })

  const dbBuyResults = (detectedSection && detectedSection !== "buy") ? []
    : dbResults.map(item => ({ id: item._id, imageId: item._id, title: item.title, category: item.category, section: "buy", image: item.image }))

  const results = [...dbBuyResults, ...staticResults]
  const grouped = { buy: results.filter(r => r.section === "buy"), rent: results.filter(r => r.section === "rent"), service: results.filter(r => r.section === "service") }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px 20px" }} onClick={onClose}>
      <div className="modal-content" style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "680px", maxHeight: "80vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontSize: "14px", color: "#555" }}>
            {loading ? "Searching..." : `${results.length} results for`} <strong style={{ color: "#f0ede8" }}>"{query}"</strong>
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        {loading ? (
          <div className="empty-state"><div className="icon">⏳</div><div className="title">Searching...</div></div>
        ) : results.length === 0 ? (
          <div className="empty-state"><div className="icon">🔍</div><div className="title">No results found</div><div className="sub">Try a different term</div></div>
        ) : (
          <div style={{ padding: "16px" }}>
            {Object.entries(grouped).map(([section, items]) => items.length > 0 && (
              <div key={section} style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[section], textTransform: "uppercase", letterSpacing: ".1em" }}>{SECTION_LABEL[section]}</div>
                  <button onClick={() => { onNavigate(section); onClose() }} style={{ background: "transparent", border: "none", color: "#444", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>See all →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {items.map(item => (
                    <div key={item.id} onClick={() => { onNavigate(item.section); onClose() }}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", background: "#1a1a1a", cursor: "pointer", border: "1px solid #1a1a1a", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8a97e33"; e.currentTarget.style.background = "#1e1e1e" }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.background = "#1a1a1a" }}>
                      <img src={item.image || `https://picsum.photos/seed/${item.imageId}/100/100`} alt={item.title} style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8" }}>{item.title}</div>
                        <div style={{ fontSize: "11px", color: "#444" }}>{item.category}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[item.section], background: `${SECTION_COLOR[item.section]}18`, padding: "3px 10px", borderRadius: "20px" }}>
                        {SECTION_LABEL[item.section]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function ListingSkeleton() {
  return (
    <div style={{ background: "#111", borderRadius: "16px", overflow: "hidden", border: "1px solid #1a1a1a" }}>
      <div style={{ width: "100%", height: "200px", background: "#161616", animation: "shimmer 1.5s ease infinite" }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {[["35%"], ["100%"], ["55%"], ["45%"], ["100%"]].map(([w], i) => (
          <div key={i} style={{ height: i === 4 ? "40px" : i === 3 ? "22px" : "10px", background: "#161616", borderRadius: "4px", width: w, animation: "shimmer 1.5s ease infinite" }} />
        ))}
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [rate, setRate]                   = useState(null)
  const [rateLoading, setRateLoading]     = useState(true)
  const [cart, setCart]                   = useState([])
  const [cartOpen, setCartOpen]           = useState(false)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [activePage, setActivePage]       = useState("buy")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [footerModal, setFooterModal]     = useState(null)
  const [searchQuery, setSearchQuery]     = useState("")
  const [showDropdown, setShowDropdown]   = useState(false)
  const [showFullResults, setShowFullResults] = useState(false)
  const [user, setUser]                   = useState(null)
  const [showAuth, setShowAuth]           = useState(false)
  const [showAccount, setShowAccount]     = useState(false)
  const [showSell, setShowSell]           = useState(false)
  const [showAdmin, setShowAdmin]         = useState(false)
  const [showTracker, setShowTracker]     = useState(false)
  const [showRiderDashboard, setShowRiderDashboard] = useState(false)
  const [trackedOrder, setTrackedOrder]   = useState(null)
  const [authCallback, setAuthCallback]   = useState(null)
  const [siteSettings, setSiteSettings]   = useState(DEFAULT_SITE_SETTINGS)
  const [notifTick, setNotifTick]         = useState(0)

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

  const usingDb        = dbListings.length > 0
  const displayListings = usingDb ? dbListings : ALL_LISTINGS.slice(0, visibleCount)
  const hasMore        = usingDb ? hasMoreListings : visibleCount < ALL_LISTINGS.length

  // ── Site settings ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => { if (data && !data.message) setSiteSettings(prev => ({ ...prev, ...data })) })
      .catch(() => {})
  }, [])

  // ── Live notifications — same-tab custom event ────────────────────────────
  useEffect(() => {
    const handler = () => setNotifTick(n => n + 1)
    window.addEventListener("silkroad_new_notification", handler)
    return () => window.removeEventListener("silkroad_new_notification", handler)
  }, [])

  // ── Fetch listings ───────────────────────────────────────────────────────────
  const fetchListings = async (page = 1, reset = false) => {
    if (page === 1) setListingsLoading(true)
    else setLoadingMore(true)
    try {
      const data = await getListings({ type: "product", page, limit: PAGE_SIZE })
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

  // ── Scroll reveal ────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible") }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    )
    document.querySelectorAll(".reveal").forEach(c => observer.observe(c))
    return () => observer.disconnect()
  }, [displayListings, activePage, listingsLoading])

  // ── Infinite scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10
      if (atBottom && hasMore && !loadingMore && activePage === "buy") {
        if (!isAtBottomRef.current) {
          isAtBottomRef.current = true
          bottomReachedTimerRef.current = setTimeout(() => {
            if (isAtBottomRef.current) {
              if (usingDb) fetchListings(listingsPage + 1)
              else {
                setLoadingMore(true)
                setTimeout(() => { setVisibleCount(c => Math.min(c + PAGE_SIZE, ALL_LISTINGS.length)); setLoadingMore(false) }, 600)
              }
            }
          }, 1000)
        }
      } else {
        isAtBottomRef.current = false
        if (bottomReachedTimerRef.current) clearTimeout(bottomReachedTimerRef.current)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => { window.removeEventListener("scroll", handleScroll); if (bottomReachedTimerRef.current) clearTimeout(bottomReachedTimerRef.current) }
  }, [hasMore, loadingMore, activePage, usingDb, listingsPage])

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setDbSearchResults([]); return }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const { keyword } = parseSearch(searchQuery)
        const data = await getListings({ search: keyword || searchQuery, limit: 10 })
        setDbSearchResults(Array.isArray(data) ? data : [])
      } catch { setDbSearchResults([]) }
      setSearchLoading(false)
    }, 350)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchQuery])

  // ── Close search on outside click ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Admin shortcuts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.ctrlKey && e.shiftKey && e.key === "A") setShowAdmin(true) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => { if (window.location.pathname === "/admin") setShowAdmin(true) }, [])

  // ── Session restore — reconnects socket so seller gets live notifications ────
  useEffect(() => {
    const token = localStorage.getItem("silkroad_token")
    if (token && !user) {
      import("./api").then(({ getMe }) => {
        getMe().then(data => {
          if (data?._id) {
            const userData = {
              _id: data._id, name: data.name, email: data.email,
              university: data.university, phone: data.phone, role: data.role,
              joined: new Date(data.createdAt || Date.now()).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
            }
            setUser(userData)
            // Reconnect socket after page refresh so seller keeps receiving notifications
            connectSellerSocket(userData._id)
          }
        }).catch(() => {})
      })
    }
  }, [])

  // ── Exchange rate — fetch USD base, display as $1 = ₵X ──────────────────────
  const fetchRate = async () => {
    setRateLoading(true)
    try {
      const res = await axios.get("https://open.er-api.com/v6/latest/USD")
      setRate(res.data.rates.GHS)
    } catch {}
    setRateLoading(false)
  }

  useEffect(() => { fetchRate() }, [])

  // rate = GHS per 1 USD → display as "$1 = ₵X"
  const rateDisplay = rate ? `$1 = ₵${rate.toFixed(2)}` : "..."
  const toUSD = (ghs) => rate ? (ghs / rate).toFixed(2) : "..."

  const getItemId  = (item) => item._id || item.id
  const addToCart  = (item) => {
    setCart(prev => {
      const id = getItemId(item)
      const exists = prev.find(i => getItemId(i) === id)
      if (exists) return prev.map(i => getItemId(i) === id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }
  const updateQty  = (id, delta) => setCart(prev => prev.map(i => getItemId(i) === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  const removeItem = (id) => setCart(prev => prev.filter(i => getItemId(i) !== id))
  const cartTotal  = cart.reduce((sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty, 0)
  const cartCount  = cart.reduce((sum, i) => sum + i.qty, 0)

  const handleSearchKey = (e) => { if (e.key === "Enter" && searchQuery.trim()) { setShowDropdown(false); setShowFullResults(true) } }

  const dropdownResults = (() => {
    if (!searchQuery.trim()) return []
    const { detectedSection, keyword } = parseSearch(searchQuery)
    const staticMatches = ALL_ITEMS.filter(item => {
      if (item.section === "buy") return false
      const matchesSection = detectedSection ? item.section === detectedSection : true
      const matchesKeyword = keyword ? item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword) : true
      return matchesSection && matchesKeyword
    })
    const dbMatches = (detectedSection && detectedSection !== "buy") ? []
      : dbSearchResults.map(item => ({ id: item._id, imageId: item._id, title: item.title, category: item.category, section: "buy", image: item.image }))
    return [...dbMatches, ...staticMatches].slice(0, 8)
  })()

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f0ede8", display: "flex", flexDirection: "column" }}>

      {/* ── NAVBAR ── */}
      <nav className="navbar" style={{ position: "sticky", top: 0, zIndex: 90 }}>
        <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 onClick={() => setActivePage("buy")} style={{ color: "#c8a97e", fontWeight: "800", fontSize: "20px", cursor: "pointer", margin: 0, letterSpacing: "-0.03em" }}>
            Silk Road
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setShowSell(true)}
              style={{ background: "#1a1a1a", border: "1px solid #252525", color: "#c8a97e", padding: "8px 14px", borderRadius: "9px", fontWeight: "700", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              + Sell
            </button>
            {user?.isRider && (
              <button onClick={() => setShowRiderDashboard(true)}
                style={{ background: "transparent", border: "1px solid #222", color: "#888", padding: "7px 10px", borderRadius: "9px", cursor: "pointer", fontSize: "16px" }}>
                🛵
              </button>
            )}
            <button onClick={() => setShowTracker(true)}
              style={{ background: "transparent", border: "1px solid #222", color: "#888", padding: "7px 10px", borderRadius: "9px", cursor: "pointer", fontSize: "16px" }}>
              📦
            </button>
            {user ? (
              <>
                {/* NotificationBell handles cross-device socket + cross-tab storage events */}
                <NotificationBell user={user} onClick={() => setShowAccount(true)} notifTick={notifTick} />
                <button onClick={() => setShowAccount(true)}
                  style={{ background: "linear-gradient(135deg,#c8a97e,#9a7040)", border: "none", width: "34px", height: "34px", borderRadius: "50%", fontWeight: "800", cursor: "pointer", fontSize: "14px", color: "#000", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)}
                style={{ background: "#c8a97e", border: "none", padding: "8px 16px", borderRadius: "9px", fontWeight: "700", cursor: "pointer", fontSize: "13px", color: "#000", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                Sign In
              </button>
            )}
            <button onClick={() => setCartOpen(true)}
              style={{ position: "relative", background: "transparent", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}>
              🛒
              {cartCount > 0 && (
                <span className="badge">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #141414" }}>
          <div style={{ padding: "0 18px", display: "flex", gap: "2px", overflowX: "auto" }}>
            {[
              { label: "Buy",      page: "buy" },
              { label: "Rent",     page: "rent" },
              { label: "Services", page: "service" },
              { label: "Ride",     page: "rider" },
            ].map(link => (
              <button key={link.page} onClick={() => setActivePage(link.page)}
                style={{ background: "transparent", border: "none", color: activePage === link.page ? "#c8a97e" : "#444", cursor: "pointer", fontSize: "13px", fontWeight: activePage === link.page ? "700" : "500", borderBottom: activePage === link.page ? "2px solid #c8a97e" : "2px solid transparent", padding: "11px 16px", whiteSpace: "nowrap", fontFamily: "inherit", transition: "color 0.2s" }}>
                {link.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "8px 18px 12px" }}>
            <div ref={searchRef} style={{ position: "relative" }}>
              <input
                className="search-input"
                placeholder="Search listings, rentals, services..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                onKeyDown={handleSearchKey}
                onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              />
              {searchQuery ? (
                <button onClick={() => { setSearchQuery(""); setShowDropdown(false); setShowFullResults(false) }}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "14px", minHeight: "auto" }}>✕</button>
              ) : (
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: .25, pointerEvents: "none" }}>🔍</span>
              )}

              {showDropdown && searchQuery.trim() && dropdownResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", zIndex: 500, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,.7)" }}>
                  {dropdownResults.map(item => (
                    <div key={item.id} onClick={() => { setActivePage(item.section); setShowDropdown(false) }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1a1a1a", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1e1e1e"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <img src={item.image || `https://picsum.photos/seed/${item.imageId}/100/100`} alt={item.title} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                        <div style={{ fontSize: "11px", color: "#444" }}>{item.category}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[item.section], background: `${SECTION_COLOR[item.section]}18`, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                        {SECTION_LABEL[item.section]}
                      </span>
                    </div>
                  ))}
                  <div onClick={() => { setShowDropdown(false); setShowFullResults(true) }}
                    style={{ padding: "10px 14px", textAlign: "center", fontSize: "13px", color: "#c8a97e", cursor: "pointer", fontWeight: "600" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1e1e1e"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    See all results →
                  </div>
                </div>
              )}

              {showDropdown && searchQuery.trim() && dropdownResults.length === 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#161616", border: "1px solid #1e1e1e", borderRadius: "14px", zIndex: 500, padding: "16px", textAlign: "center", color: "#444", fontSize: "13px" }}>
                  {searchLoading ? "⏳ Searching..." : `No results for "${searchQuery}"`}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── PAGES ── */}
      <div style={{ flex: 1 }}>
        {activePage === "buy" && (
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "36px 18px 24px" }}>
            <div style={{ marginBottom: "36px" }}>
              <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: "800", color: "#f0ede8", letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "10px" }}>
                Campus Marketplace 🇬🇭
              </h1>
              <p style={{ fontSize: "14px", color: "#444", maxWidth: "380px", lineHeight: "1.7" }}>
                Buy, sell and trade with students across Ghana. Every transaction secured by escrow.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: rate ? "#6ee7b7" : "#555", animation: rate ? "pulse 2s infinite" : "none" }} />
                <span style={{ fontSize: "12px", color: "#444" }}>
                  {rateLoading ? "Fetching live rate..." : rateDisplay}
                </span>
                <button onClick={fetchRate} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "13px", padding: "2px 6px", minHeight: "auto", borderRadius: "6px", fontFamily: "inherit" }}>↻</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {listingsLoading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ListingSkeleton key={i} />)
                : displayListings.map((item, index) => {
                    const itemId      = getItemId(item)
                    const isDb        = !!item._id
                    const sellerName  = isDb ? item.seller?.name : item.seller
                    const university  = isDb ? item.seller?.university : item.university
                    const itemPrice   = item.price || item.dailyRate || 0
                    const itemImage   = item.image || `https://picsum.photos/seed/${item.id}/300/200`
                    return (
                      <div key={itemId} className="listing-card reveal" style={{ animationDelay: `${(index % 8) * 55}ms` }}>
                        <div style={{ overflow: "hidden", position: "relative" }}>
                          <img src={itemImage} alt={item.title} onClick={() => setSelectedProduct(item)}
                            style={{ width: "100%", height: "200px", objectFit: "cover", cursor: "pointer" }} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70px", background: "linear-gradient(to top, #111 0%, transparent 100%)", pointerEvents: "none" }} />
                        </div>
                        <div style={{ padding: "16px" }}>
                          <div style={{ fontSize: "10px", color: "#c8a97e", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "6px" }}>{item.category}</div>
                          <div onClick={() => setSelectedProduct(item)} style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: "#f0ede8", cursor: "pointer", lineHeight: "1.3", letterSpacing: "-0.01em" }}>{item.title}</div>
                          <div style={{ fontSize: "12px", color: "#444", marginBottom: "2px" }}>by <span style={{ color: "#666" }}>{sellerName}</span></div>
                          <div style={{ fontSize: "11px", color: "#333", marginBottom: "14px" }}>🎓 {university}</div>
                          {item.rating > 0 && <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating}</div>}
                          <div style={{ fontSize: "20px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "14px" }}>
                            ₵{itemPrice.toLocaleString()}
                            <span style={{ fontSize: "12px", color: "#333", fontWeight: "400" }}> (${toUSD(itemPrice)})</span>
                          </div>
                          <button className="btn-gold" onClick={() => addToCart(item)} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: "13px" }}>
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            {loadingMore && <div style={{ padding: "40px 0", textAlign: "center", color: "#333", fontSize: "13px" }}>⏳ Loading more...</div>}
            {!hasMore && displayListings.length > PAGE_SIZE && <div style={{ padding: "32px 0", textAlign: "center", color: "#2a2a2a", fontSize: "12px" }}>You've seen all listings</div>}
          </div>
        )}

        {activePage === "rent"    && <RentItems rate={rate} siteSettings={siteSettings} />}
        {activePage === "service" && <RequestService rate={rate} siteSettings={siteSettings} />}
        {activePage === "rider"   && <BecomeRider />}
      </div>

      <Footer onOpen={setFooterModal} siteSettings={siteSettings} />

      {/* ── MODALS ── */}
      <FooterModal type={footerModal} onClose={() => setFooterModal(null)} siteSettings={siteSettings} />

      {showFullResults && searchQuery.trim() && (
        <SearchResults query={searchQuery} onClose={() => setShowFullResults(false)} onNavigate={(section) => { setActivePage(section); setShowFullResults(false) }} />
      )}

      {selectedProduct && (
        <ProductModal item={selectedProduct} onClose={() => setSelectedProduct(null)} onCart={addToCart} rate={rate} />
      )}

      {showAuth && (
        <Auth
          onAuth={(userData) => {
            setUser(userData)
            setShowAuth(false)
            // Connect socket so seller receives live notifications on this device
            connectSellerSocket(userData._id)
            if (authCallback) { authCallback(); setAuthCallback(null) }
          }}
          onClose={() => { setShowAuth(false); setAuthCallback(null) }}
        />
      )}

      {showAccount && user && (
        <Account
          user={user}
          notifTick={notifTick}
          onSignOut={() => {
            setUser(null)
            setShowAccount(false)
            localStorage.removeItem("silkroad_token")
            // Disconnect socket on sign out
            disconnectSocket()
          }}
          onClose={() => setShowAccount(false)}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}

      {showSell && (
        <SellListing
          user={user}
          onRequestAuth={(cb) => { setAuthCallback(() => cb); setShowSell(false); setShowAuth(true) }}
          onClose={() => { setShowSell(false); fetchListings(1, true) }}
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
          onOpenOrder={(order) => { setTrackedOrder(order); setShowTracker(false); setCheckoutOpen(true) }}
        />
      )}

      {showRiderDashboard && <RiderDashboard user={user} onClose={() => setShowRiderDashboard(false)} />}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div onClick={() => setCartOpen(false)} style={{ flex: 1, background: "#000000bb" }} />
          <div className="cart-drawer" style={{ width: "340px", background: "#111", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100vh" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.01em" }}>Your Cart ({cartCount})</span>
              <button onClick={() => setCartOpen(false)} style={{ background: "transparent", border: "none", color: "#555", fontSize: "22px", cursor: "pointer", minHeight: "auto" }}>✕</button>
            </div>
            <div className="scroll-container" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {cart.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🛒</div>
                  <div className="title">Your cart is empty</div>
                  <div className="sub">Add items to get started</div>
                </div>
              ) : cart.map(item => {
                const itemId    = getItemId(item)
                const itemPrice = item.price || item.dailyRate || 0
                const itemImage = item.image || `https://picsum.photos/seed/${item.id}/300/200`
                return (
                  <div key={itemId} style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
                    <img src={itemImage} alt={item.title} style={{ width: "58px", height: "58px", objectFit: "cover", borderRadius: "10px" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px", color: "#f0ede8", lineHeight: "1.3" }}>{item.title}</div>
                      <div style={{ fontSize: "14px", color: "#c8a97e", fontWeight: "700" }}>
                        ₵{(itemPrice * item.qty).toLocaleString()}
                        <span style={{ fontSize: "11px", color: "#444", fontWeight: "400" }}> (${toUSD(itemPrice * item.qty)})</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => updateQty(itemId, -1)} style={{ width: "28px", height: "28px", background: "#1a1a1a", border: "1px solid #222", color: "#fff", borderRadius: "7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", minHeight: "auto" }}>−</button>
                        <span style={{ fontSize: "13px", fontWeight: "600", minWidth: "20px", textAlign: "center" }}>{item.qty}</span>
                        <button onClick={() => updateQty(itemId, 1)} style={{ width: "28px", height: "28px", background: "#1a1a1a", border: "1px solid #222", color: "#fff", borderRadius: "7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", minHeight: "auto" }}>+</button>
                        <button onClick={() => removeItem(itemId)} style={{ marginLeft: "6px", background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "12px", minHeight: "auto", fontFamily: "inherit" }}>Remove</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "20px", borderTop: "1px solid #1a1a1a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "baseline" }}>
                  <span style={{ color: "#555", fontSize: "14px" }}>Total</span>
                  <div>
                    <span style={{ fontSize: "22px", fontWeight: "800", color: "#c8a97e", letterSpacing: "-0.02em" }}>₵{cartTotal.toLocaleString()}</span>
                    <span style={{ fontSize: "12px", color: "#444" }}> (${toUSD(cartTotal)})</span>
                  </div>
                </div>
                <button className="btn-gold" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", fontSize: "14px" }}>
                  📱 Checkout
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
          onClose={() => { setCheckoutOpen(false); setTrackedOrder(null) }}
          initialOrder={trackedOrder}
          siteSettings={siteSettings}
        />
      )}

    </div>
  )
}

export default App
