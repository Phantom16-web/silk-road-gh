// src/router.js
//
// A tiny History-API router with NO dependencies (so package.json and package-lock.json
// stay untouched). It only understands the two URLs the marketplace shares:
//
//   /listing/<24-hex id>      one listing, opened for real
//   /search?q=...&type=...    search results
//
// Everything else (/, /admin, /owner/paystack-test ...) is "home" and is left alone,
// so existing special pages keep working exactly as before.

import { useEffect, useState } from "react"

const LISTING_PATH = /^\/listing\/([a-fA-F0-9]{24})$/

export const listingPath = id => `/listing/${id}`

// Pure: turns a location into a route object. Exported for tests.
export function parseRoute(loc = window.location) {
  const path = (loc.pathname || "/").replace(/\/+$/, "") || "/"
  const listing = LISTING_PATH.exec(path)
  if (listing) return { name: "listing", id: listing[1] }
  if (path === "/search") return { name: "search", params: Object.fromEntries(new URLSearchParams(loc.search || "")) }
  return { name: "home" }
}

// Push (or replace) a URL and tell every subscriber. history.pushState does not fire an event by itself.
export function navigate(url, { replace = false } = {}) {
  if (typeof window === "undefined") return
  const current = window.location.pathname + window.location.search
  if (url === current && !replace) return
  window.history[replace ? "replaceState" : "pushState"]({ sr: true }, "", url)
  window.dispatchEvent(new Event("sr:navigate"))
}

// "Close" for listing and search views. If the previous history entry belongs to this app, go back
// to it (so the browser Back button and the close button agree). If the page was opened directly
// from a shared link there is nothing to go back to, so land on the marketplace home instead.
export function goBackOrHome() {
  if (typeof window === "undefined") return
  if (window.history.state && window.history.state.sr) window.history.back()
  else navigate("/", { replace: true })
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute())
  useEffect(() => {
    const update = () => setRoute(prev => { const next = parseRoute(); return JSON.stringify(prev) === JSON.stringify(next) ? prev : next })
    window.addEventListener("popstate", update)
    window.addEventListener("sr:navigate", update)
    update() // pick up any change that happened between first render and subscribing
    return () => {
      window.removeEventListener("popstate", update)
      window.removeEventListener("sr:navigate", update)
    }
  }, [])
  return route
}
