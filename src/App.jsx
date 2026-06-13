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
import OrderTracker from "./OrderTracker"
import RiderDashboard from "./RiderDashboard"
import { getListings } from "./api"

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
  { id: 101, title: "Canon EOS M50 Camera",          category: "Electronics", image: 21, section: "rent" },
  { id: 102, title: "Projector – Epson X41",         category: "Electronics", image: 22, section: "rent" },
  { id: 103, title: "Mountain Bike",                 category: "Sports",      image: 23, section: "rent" },
  { id: 104, title: "MacBook Air M1",                category: "Electronics", image: 24, section: "rent" },
  { id: 105, title: "Acoustic Guitar",               category: "Music",       image: 25, section: "rent" },
  { id: 106, title: "Camping Tent (4-person)",       category: "Outdoors",    image: 26, section: "rent" },
  { id: 107, title: "PS5 Console + 2 Controllers",   category: "Gaming",      image: 27, section: "rent" },
  { id: 108, title: "Scientific Calculator (Casio)", category: "Academic",    image: 28, section: "rent" },
]

const SERVICES_SEARCH = [
  { id: 201, title: "Mathematics Private Lessons",     category: "Lessons",       image: 31, section: "service" },
  { id: 202, title: "Concert & Event Photography",     category: "Photography",   image: 32, section: "service" },
  { id: 203, title: "Room & Hostel Cleaning",          category: "Cleaning",      image: 33, section: "service" },
  { id: 204, title: "Python & Data Science Tutoring",  category: "Lessons",       image: 34, section: "service" },
  { id: 205, title: "Graphic Design – Logo & Branding",category: "Design",        image: 35, section: "service" },
  { id: 206, title: "DJ Services for Events",          category: "Entertainment", image: 36, section: "service" },
  { id: 207, title: "French Language Lessons",         category: "Lessons",       image: 37, section: "service" },
  { id: 208, title: "CV & Cover Letter Writing",       category: "Career",        image: 38, section: "service" },
]

const ALL_ITEMS = [
  ...ALL_LISTINGS.map(i => ({ ...i, imageId: i.id })),
  ...RENTALS_SEARCH.map(i => ({ ...i, imageId: i.image })),
  ...SERVICES_SEARCH.map(i => ({ ...i, imageId: i.image })),
]

const SECTION_LABEL = { buy: "🛒 Buy Products", rent: "📦 Rent Items", service: "🛠️ Request Service" }
const SECTION_COLOR = { buy: "#c8a97e", rent: "#93c5fd", service: "#6ee7b7" }
const PAGE_SIZE = 16

const SECTION_KEYWORDS = {
  buy:     ["buy", "purchase", "product", "products", "shop", "shopping"],
  rent:    ["rent", "rental", "rentals", "borrow", "lease", "hire"],
  service: ["service", "services", "request", "booking", "book"],
}

const DEFAULT_SITE_SETTINGS = {
  contactPhone:    "054 388 3608",
  contactWhatsApp: "233543883608",
  aboutText:       "Silk Road GH is Ghana's premier student marketplace — built by students, for students. Whether you're buying textbooks, renting equipment, requesting services, or making extra income, Silk Road GH is your go-to campus platform.",
  privacyText:     "We collect your name, contact information, location data (only during checkout), and transaction history to facilitate buying, selling, and delivery on the platform.",
  footerTagline:   "Ghana's student marketplace. Buy, sell, rent, and request services — all secured by escrow and powered by MTN MoMo.",
  deliveryFee:     10,
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

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ item, onClose, onCart, toUSD }) {
  if (!item) return null
  const isDbItem = !!item._id
  const sellerName = isDbItem ? item.seller?.name : item.seller
  const university = isDbItem ? item.seller?.university : item.university
  const itemImage = item.image || `https://picsum.photos/seed/${item.id}/600/350`
  const delivery = item.delivery || []

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <img src={itemImage} alt={item.title} style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "16px 16px 0 0" }} />
          <button onClick={onClose} style={{ position: "absolute", top: "12px", right: "12px", background: "#000000aa", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "6px" }}>{item.category}</div>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>{item.title}</h2>
            <div style={{ fontSize: "13px", color: "#666" }}>Listed by <span style={{ color: "#aaa", fontWeight: "600" }}>{sellerName}</span></div>
            {university && <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>🎓 {university}</div>}
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {item.rating > 0 && (
              <div style={{ fontSize: "14px", color: "#c8a97e" }}>{"★".repeat(Math.round(item.rating))}{"☆".repeat(5 - Math.round(item.rating))} <span style={{ color: "#666", fontSize: "13px" }}>{item.rating}</span></div>
            )}
            {item.condition && item.condition !== "N/A" && (
              <div style={{ fontSize: "13px", color: "#888" }}>Condition: <span style={{ color: "#f0ede8", fontWeight: "600" }}>{item.condition}</span></div>
            )}
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: ".06em" }}>About this item</div>
            <p style={{ fontSize: "14px", color: "#aaa", lineHeight: "1.7", margin: 0 }}>{item.desc}</p>
          </div>
          {delivery.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Delivery Options</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {delivery.map(d => (
                  <span key={d} style={{ fontSize: "12px", background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#aaa", padding: "5px 12px", borderRadius: "20px", fontWeight: "600" }}>
                    {d === "Pickup" ? "📍 Campus Pickup" : d === "Rider" ? "🛵 Rider Delivery" : "📦 Shipping"}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "16px" }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", color: "#c8a97e" }}>₵{(item.price || 0).toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#555" }}>${toUSD(item.price || 0)} USD</div>
            </div>
            <button onClick={() => { onCart(item); onClose() }} style={{ background: "#c8a97e", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
              🛒 Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Footer Modal ──────────────────────────────────────────────────────────────
function FooterModal({ type, onClose, siteSettings }) {
  if (!type) return null
  const content = {
    about: {
      title: "About Silk Road GH",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", color: "#aaa", lineHeight: "1.8" }}>
          <p>{siteSettings.aboutText}</p>
          <p>We connect university students across Ghana to buy, sell, rent, and trade goods and services safely. Every transaction is protected by our escrow system — your money is held securely until you confirm everything is good.</p>
          <p>Our rider network ensures fast, reliable on-campus delivery so you never have to worry about getting your items safely.</p>
          <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: ".06em" }}>Our Values</div>
            {[
              "🔒 Security — Every payment is held in escrow until delivery is confirmed.",
              "⚡ Speed — Campus riders deliver fast within your zone.",
              "🤝 Trust — Verified student community with ratings and reviews.",
              "💰 Fairness — We only take 8% when a transaction is completed.",
            ].map(v => <div key={v} style={{ fontSize: "13px", color: "#aaa" }}>{v}</div>)}
          </div>
          <p style={{ fontSize: "13px", color: "#666" }}>Silk Road GH is proudly built for Ghanaian university students. Payments powered by MTN Mobile Money via Paystack.</p>
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
            ["💳 Payment Information", "All payments are processed securely via Paystack. Silk Road GH does not store your MTN MoMo PIN or full payment credentials."],
            ["🤝 Data Sharing", "Your contact details are only shared with the relevant seller or rider after a confirmed payment. No data is shared with advertisers or unrelated third parties."],
            ["🗑️ Data Deletion", "You may request deletion of your account and associated data at any time by contacting us directly."],
            ["📞 Contact", `For any privacy concerns, reach us at ${siteSettings.contactPhone}.`],
          ].map(([title, text]) => (
            <div key={title}>
              <div style={{ fontWeight: "700", color: "#f0ede8", marginBottom: "6px" }}>{title}</div>
              <p style={{ margin: 0 }}>{text}</p>
            </div>
          ))}
          <p style={{ fontSize: "12px", color: "#555" }}>Last updated: {new Date().getFullYear()}. Silk Road GH reserves the right to update this policy.</p>
        </div>
      )
    }
  }
  const c = content[type]
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "85vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#f0ede8" }}>{c.title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{c.body}</div>
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ onOpen, siteSettings }) {
  return (
    <footer style={{ background: "#0a0a0a", borderTop: "1px solid #1e1e1e", marginTop: "60px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px 24px" }}>
        <div style={{ display: "flex", gap: "48px", flexWrap: "wrap", marginBottom: "40px" }}>
          <div style={{ flex: 2, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg,#c8a97e,#9a7040)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🕸</div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "#c8a97e" }}>Silk Road GH</span>
            </div>
            <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.7", maxWidth: "280px" }}>{siteSettings.footerTagline}</p>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>Company</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button onClick={() => onOpen("about")} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", textAlign: "left", padding: 0, fontFamily: "inherit" }}>About Silk Road</button>
              <button onClick={() => onOpen("privacy")} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", textAlign: "left", padding: 0, fontFamily: "inherit" }}>Privacy Policy</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>Contact Us</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href={`tel:+${siteSettings.contactWhatsApp}`} style={{ color: "#c8a97e", fontSize: "14px", textDecoration: "none", fontWeight: "600" }}>📞 {siteSettings.contactPhone}</a>
              <a href={`https://wa.me/${siteSettings.contactWhatsApp}`} target="_blank" rel="noreferrer" style={{ color: "#888", fontSize: "14px", textDecoration: "none" }}>💬 WhatsApp Us</a>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "16px" }}>Payments</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#ffd700", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: "700", color: "#1a1a00", display: "inline-flex", alignItems: "center", gap: "6px", width: "fit-content" }}>📱 MTN MoMo</div>
              <div style={{ fontSize: "11px", color: "#555" }}>Secured by Paystack</div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#444" }}>© {new Date().getFullYear()} Silk Road GH. All rights reserved.</div>
          <div style={{ fontSize: "12px", color: "#444" }}>Built for Ghanaian students 🇬🇭</div>
        </div>
      </div>
    </footer>
  )
}

// ── Search Results ────────────────────────────────────────────────────────────
function SearchResults({ query, onClose, onNavigate }) {
  const { detectedSection, keyword } = parseSearch(query)
  const [dbResults, setDbResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = keyword || query
    getListings({ search: q, limit: 20 })
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

  const dbBuyResults = (detectedSection && detectedSection !== "buy") ? [] : dbResults.map(item => ({
    id: item._id,
    imageId: item._id,
    title: item.title,
    category: item.category,
    section: "buy",
    image: item.image,
  }))

  const results = [...dbBuyResults, ...staticResults]

  const grouped = {
    buy:     results.filter(r => r.section === "buy"),
    rent:    results.filter(r => r.section === "rent"),
    service: results.filter(r => r.section === "service"),
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px 20px" }} onClick={onClose}>
      <div style={{ background: "#111", borderRadius: "16px", width: "100%", maxWidth: "680px", maxHeight: "80vh", overflowY: "auto", border: "1px solid #1e1e1e" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <div>
            <span style={{ fontSize: "14px", color: "#888" }}>
              {loading ? "Searching..." : `${results.length} results for`} <strong style={{ color: "#f0ede8" }}>"{query}"</strong>
            </span>
            {detectedSection && (
              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "700", color: SECTION_COLOR[detectedSection], background: `${SECTION_COLOR[detectedSection]}22`, padding: "2px 8px", borderRadius: "20px" }}>
                {SECTION_LABEL[detectedSection]}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#555" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⏳</div>
            <div style={{ fontSize: "14px" }}>Searching...</div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#555" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px", color: "#888" }}>No results found</div>
            <div style={{ fontSize: "13px" }}>Try searching for something else</div>
          </div>
        ) : (
          <div style={{ padding: "16px" }}>
            {Object.entries(grouped).map(([section, items]) => items.length > 0 && (
              <div key={section} style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: SECTION_COLOR[section], textTransform: "uppercase", letterSpacing: ".06em" }}>{SECTION_LABEL[section]}</div>
                  <button onClick={() => { onNavigate(section); onClose() }} style={{ background: "transparent", border: "none", color: "#555", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>See all →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {items.map(item => (
                    <div key={item.id} onClick={() => { onNavigate(item.section); onClose() }}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", borderRadius: "10px", background: "#1a1a1a", cursor: "pointer", border: "1px solid #1e1e1e", transition: "border .2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#c8a97e44"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}>
                      <img src={item.image || `https://picsum.photos/seed/${item.imageId}/100/100`} alt={item.title} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0ede8", marginBottom: "2px" }}>{item.title}</div>
                        <div style={{ fontSize: "11px", color: "#666" }}>{item.category}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[item.section], background: `${SECTION_COLOR[item.section]}22`, padding: "3px 10px", borderRadius: "20px", flexShrink: 0 }}>
                        {SECTION_LABEL[item.section].split(" ").slice(1).join(" ")}
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

// ── Skeleton loader ───────────────────────────────────────────────────────────
function ListingSkeleton() {
  return (
    <div style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e" }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      <div style={{ width: "100%", height: "180px", background: "#1a1a1a", animation: "shimmer 1.5s ease infinite" }} />
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: "10px", background: "#1a1a1a", borderRadius: "4px", width: "40%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "16px", background: "#1a1a1a", borderRadius: "4px", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "10px", background: "#1a1a1a", borderRadius: "4px", width: "60%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "10px", background: "#1a1a1a", borderRadius: "4px", width: "50%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "24px", background: "#1a1a1a", borderRadius: "4px", width: "50%", animation: "shimmer 1.5s ease infinite" }} />
        <div style={{ height: "36px", background: "#1a1a1a", borderRadius: "8px", animation: "shimmer 1.5s ease infinite" }} />
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [rate, setRate] = useState(null)
  const [rateLoading, setRateLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [activePage, setActivePage] = useState("buy")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [footerModal, setFooterModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [showFullResults, setShowFullResults] = useState(false)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showSell, setShowSell] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showTracker, setShowTracker] = useState(false)
  const [showRiderDashboard, setShowRiderDashboard] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState(null)
  const [authCallback, setAuthCallback] = useState(null)
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS)

  // Listings state
  const [dbListings, setDbListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsPage, setListingsPage] = useState(1)
  const [hasMoreListings, setHasMoreListings] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Search state
  const [dbSearchResults, setDbSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef(null)

  const bottomReachedTimerRef = useRef(null)
  const isAtBottomRef = useRef(false)
  const searchRef = useRef(null)

  // Use DB listings if available, otherwise fall back to static
  const usingDb = dbListings.length > 0
  const displayListings = usingDb ? dbListings : ALL_LISTINGS.slice(0, visibleCount)
  const hasMore = usingDb ? hasMoreListings : visibleCount < ALL_LISTINGS.length

  // Fetch real listings from backend
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
    } catch {
      // silently fall back to static data
    }
    setListingsLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (activePage === "buy") fetchListings(1, true)
    setVisibleCount(PAGE_SIZE)
  }, [activePage])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10
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
                  setVisibleCount(c => Math.min(c + PAGE_SIZE, ALL_LISTINGS.length))
                  setLoadingMore(false)
                }, 600)
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
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (bottomReachedTimerRef.current) clearTimeout(bottomReachedTimerRef.current)
    }
  }, [hasMore, loadingMore, activePage, usingDb, listingsPage])

  // Debounced live search against backend
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDbSearchResults([])
      return
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const { keyword } = parseSearch(searchQuery)
        const q = keyword || searchQuery
        const data = await getListings({ search: q, limit: 10 })
        setDbSearchResults(Array.isArray(data) ? data : [])
      } catch {
        setDbSearchResults([])
      }
      setSearchLoading(false)
    }, 350)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchQuery])

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Ctrl+Shift+A admin shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") setShowAdmin(true)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // /admin route
  useEffect(() => {
    if (window.location.pathname === "/admin") setShowAdmin(true)
  }, [])

  // Restore session from token
  useEffect(() => {
    const token = localStorage.getItem("silkroad_token")
    if (token && !user) {
      import("./api").then(({ getMe }) => {
        getMe().then(data => {
          if (data && data._id) {
            setUser({
              _id: data._id,
              name: data.name,
              email: data.email,
              university: data.university,
              phone: data.phone,
              role: data.role,
              joined: new Date(data.createdAt || Date.now()).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
            })
          }
        }).catch(() => {})
      })
    }
  }, [])

  const fetchRate = async () => {
    setRateLoading(true)
    try {
      const res = await axios.get("https://open.er-api.com/v6/latest/GHS")
      setRate(res.data.rates.USD)
    } catch {}
    setRateLoading(false)
  }

  useEffect(() => { fetchRate() }, [])

  const toUSD = (ghs) => rate ? (ghs * rate).toFixed(2) : "..."

  const getItemId = (item) => item._id || item.id

  const addToCart = (item) => {
    setCart(prev => {
      const id = getItemId(item)
      const exists = prev.find(i => getItemId(i) === id)
      if (exists) return prev.map(i => getItemId(i) === id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }

  const updateQty = (id, delta) => setCart(prev => prev.map(i => getItemId(i) === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  const removeItem = (id) => setCart(prev => prev.filter(i => getItemId(i) !== id))
  const cartTotal = cart.reduce((sum, i) => sum + (i.price || i.dailyRate || 0) * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) { setShowDropdown(false); setShowFullResults(true) }
  }

  const dropdownResults = (() => {
    if (!searchQuery.trim()) return []
    const { detectedSection, keyword } = parseSearch(searchQuery)

    // Static rent/service items (DB doesn't have these for search yet)
    const staticMatches = ALL_ITEMS.filter(item => {
      if (item.section === "buy") return false
      const matchesSection = detectedSection ? item.section === detectedSection : true
      const matchesKeyword = keyword ? item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword) : true
      return matchesSection && matchesKeyword
    })

    // Real DB results for buy section
    const dbMatches = (detectedSection && detectedSection !== "buy")
      ? []
      : dbSearchResults.map(item => ({
          id: item._id,
          imageId: item._id,
          title: item.title,
          category: item.category,
          section: "buy",
          image: item.image,
        }))

    return [...dbMatches, ...staticMatches].slice(0, 8)
  })()

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 90 }}>

        {/* Top row */}
        <div style={{ background: "#0a0a0a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a1a" }}>

          <h1 onClick={() => setActivePage("buy")}
            style={{ color: "#c8a97e", fontWeight: "bold", fontSize: "20px", flexShrink: 0, cursor: "pointer", margin: 0 }}>
            Silk Road
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button onClick={() => setShowSell(true)}
              style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              + Sell
            </button>

            {user?.isRider && (
              <button onClick={() => setShowRiderDashboard(true)}
                style={{ background: "transparent", border: "1px solid #333", color: "#aaa", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
                title="Rider Dashboard">
                🛵
              </button>
            )}

            <button onClick={() => setShowTracker(true)}
              style={{ background: "transparent", border: "1px solid #333", color: "#aaa", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
              title="Track Order">
              📦
            </button>

            {user ? (
              <button onClick={() => setShowAccount(true)}
                style={{ background: "#c8a97e", border: "none", width: "34px", height: "34px", borderRadius: "50%", fontWeight: "800", cursor: "pointer", fontSize: "14px", color: "#000", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                style={{ background: "#c8a97e", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                Sign In
              </button>
            )}

            <button onClick={() => setCartOpen(true)}
              style={{ position: "relative", background: "transparent", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer", padding: "4px" }}>
              🛒
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#c8a97e", color: "#000", fontSize: "9px", fontWeight: "800", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom nav + search */}
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e" }}>

          {/* Nav tabs */}
          <div style={{ padding: "0 16px", display: "flex", gap: "4px", overflowX: "auto" }}>
            {[
              { label: "Buy Products",    page: "buy" },
              { label: "Rent Items",      page: "rent" },
              { label: "Request Service", page: "service" },
              { label: "Become a Rider",  page: "rider" },
            ].map(link => (
              <button key={link.page} onClick={() => setActivePage(link.page)}
                style={{ background: "transparent", border: "none", color: activePage === link.page ? "#c8a97e" : "#aaa", cursor: "pointer", fontSize: "13px", fontWeight: "600", borderBottom: activePage === link.page ? "2px solid #c8a97e" : "2px solid transparent", padding: "12px 14px", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                {link.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ padding: "8px 16px 12px" }}>
            <div ref={searchRef} style={{ position: "relative" }}>
              <input
                placeholder="Search e.g. 'rent guitar', 'buy electronics', 'service cleaning'..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                onKeyDown={handleSearchKey}
                onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                style={{ width: "100%", padding: "10px 36px 10px 14px", borderRadius: "8px", border: "none", background: "#1e1e1e", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
              {searchQuery ? (
                <button onClick={() => { setSearchQuery(""); setShowDropdown(false); setShowFullResults(false) }}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "15px" }}>✕</button>
              ) : (
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", opacity: .4, pointerEvents: "none" }}>🔍</span>
              )}

              {showDropdown && searchQuery.trim() && dropdownResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", zIndex: 500, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
                  {dropdownResults.map(item => (
                    <div key={item.id} onClick={() => { setActivePage(item.section); setShowDropdown(false) }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #222" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#222"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <img src={item.image || `https://picsum.photos/seed/${item.imageId}/100/100`} alt={item.title} style={{ width: "34px", height: "34px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0ede8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                        <div style={{ fontSize: "11px", color: "#555" }}>{item.category}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: SECTION_COLOR[item.section], background: `${SECTION_COLOR[item.section]}22`, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                        {SECTION_LABEL[item.section].split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                  ))}
                  <div onClick={() => { setShowDropdown(false); setShowFullResults(true) }}
                    style={{ padding: "10px 14px", textAlign: "center", fontSize: "13px", color: "#c8a97e", cursor: "pointer", fontWeight: "600" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#222"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    See all results →
                  </div>
                </div>
              )}

              {showDropdown && searchQuery.trim() && dropdownResults.length === 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", zIndex: 500, padding: "14px", textAlign: "center", color: "#555", fontSize: "13px" }}>
                  {searchLoading ? "⏳ Searching..." : `No results for "${searchQuery}"`}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── PAGES ── */}
      <div style={{ flex: 1 }}>

        {/* BUY */}
        {activePage === "buy" && (
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>
                {rateLoading ? "Fetching live rate..." : `Live rate: ₵1 = $${rate?.toFixed(4)}`}
              </span>
              <button onClick={fetchRate} style={{ background: "#1e1e1e", border: "1px solid #333", color: "#c8a97e", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                ↻ Refresh
              </button>
            </div>

            {/* Listings grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {listingsLoading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ListingSkeleton key={i} />)
                : displayListings.map(item => {
                    const itemId = getItemId(item)
                    const isDbItem = !!item._id
                    const sellerName = isDbItem ? item.seller?.name : item.seller
                    const university = isDbItem ? item.seller?.university : item.university
                    const itemPrice = item.price || item.dailyRate || 0
                    const itemImage = item.image || `https://picsum.photos/seed/${item.id}/300/200`

                    return (
                      <div key={itemId}
                        style={{ background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #1e1e1e", transition: "transform 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        <img src={itemImage} alt={item.title}
                          onClick={() => setSelectedProduct(item)}
                          style={{ width: "100%", height: "180px", objectFit: "cover", cursor: "pointer", display: "block" }} />
                        <div style={{ padding: "14px" }}>
                          <div style={{ fontSize: "11px", color: "#c8a97e", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>{item.category}</div>
                          <div onClick={() => setSelectedProduct(item)} style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#f0ede8", cursor: "pointer" }}>{item.title}</div>
                          <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>by {sellerName}</div>
                          <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>🎓 {university} · {item.condition || "N/A"}</div>
                          {item.rating > 0 && (
                            <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>{"★".repeat(Math.round(item.rating))} {item.rating}</div>
                          )}
                          <div style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e" }}>
                            ₵{itemPrice.toLocaleString()}
                            <span style={{ fontSize: "13px", color: "#666", fontWeight: "400" }}> (${toUSD(itemPrice)})</span>
                          </div>
                          <button onClick={() => addToCart(item)}
                            style={{ marginTop: "10px", width: "100%", background: "#c8a97e", border: "none", padding: "9px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            {loadingMore && (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#555", fontSize: "13px" }}>⏳ Loading more listings...</div>
            )}
            {!hasMore && displayListings.length > PAGE_SIZE && (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#333", fontSize: "12px" }}>You've seen all listings</div>
            )}
          </div>
        )}

        {activePage === "rent"    && <RentItems rate={rate} />}
        {activePage === "service" && <RequestService rate={rate} />}
        {activePage === "rider"   && <BecomeRider />}
      </div>

      {/* ── FOOTER ── */}
      <Footer onOpen={setFooterModal} siteSettings={siteSettings} />

      {/* ── MODALS ── */}
      <FooterModal type={footerModal} onClose={() => setFooterModal(null)} siteSettings={siteSettings} />

      {showFullResults && searchQuery.trim() && (
        <SearchResults query={searchQuery} onClose={() => setShowFullResults(false)} onNavigate={(section) => { setActivePage(section); setShowFullResults(false) }} />
      )}

      {selectedProduct && (
        <ProductModal item={selectedProduct} onClose={() => setSelectedProduct(null)} onCart={addToCart} toUSD={toUSD} />
      )}

      {showAuth && (
        <Auth
          onAuth={(userData) => {
            setUser(userData)
            setShowAuth(false)
            if (authCallback) { authCallback(); setAuthCallback(null) }
          }}
          onClose={() => { setShowAuth(false); setAuthCallback(null) }}
        />
      )}

      {showAccount && user && (
        <Account
          user={user}
          onSignOut={() => { setUser(null); setShowAccount(false); localStorage.removeItem("silkroad_token") }}
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
          onOpenOrder={(order) => {
            setTrackedOrder(order)
            setShowTracker(false)
            setCheckoutOpen(true)
          }}
        />
      )}

      {showRiderDashboard && (
        <RiderDashboard user={user} onClose={() => setShowRiderDashboard(false)} />
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div onClick={() => setCartOpen(false)} style={{ flex: 1, background: "#000000aa" }} />
          <div style={{ width: "340px", background: "#111", borderLeft: "1px solid #1e1e1e", display: "flex", flexDirection: "column", height: "100vh", animation: "slideIn 0.3s ease" }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
            <div style={{ padding: "20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700" }}>Your Cart ({cartCount})</span>
              <button onClick={() => setCartOpen(false)} style={{ background: "transparent", border: "none", color: "#666", fontSize: "22px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", paddingTop: "60px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛒</div>
                  <div>Your cart is empty</div>
                </div>
              ) : cart.map(item => {
                const itemId = getItemId(item)
                const itemPrice = item.price || item.dailyRate || 0
                const itemImage = item.image || `https://picsum.photos/seed/${item.id}/300/200`
                return (
                  <div key={itemId} style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #1e1e1e", alignItems: "center" }}>
                    <img src={itemImage} alt={item.title} style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{item.title}</div>
                      <div style={{ fontSize: "13px", color: "#c8a97e", fontWeight: "700" }}>
                        ₵{(itemPrice * item.qty).toLocaleString()}
                        <span style={{ color: "#555", fontWeight: "400" }}> (${toUSD(itemPrice * item.qty)})</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => updateQty(itemId, -1)} style={{ width: "26px", height: "26px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>−</button>
                        <span style={{ fontSize: "13px" }}>{item.qty}</span>
                        <button onClick={() => updateQty(itemId, 1)} style={{ width: "26px", height: "26px", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>+</button>
                        <button onClick={() => removeItem(itemId)} style={{ marginLeft: "8px", background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "20px", borderTop: "1px solid #1e1e1e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ color: "#888" }}>Total</span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#c8a97e" }}>
                    ₵{cartTotal.toLocaleString()}
                    <span style={{ fontSize: "13px", color: "#555" }}> (${toUSD(cartTotal)})</span>
                  </span>
                </div>
                <button onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  style={{ width: "100%", background: "#c8a97e", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                  📱 Checkout with MTN MoMo
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
