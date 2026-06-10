const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const getHeaders = () => {
  const token = localStorage.getItem("silkroad_token")
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export const getMe = async () => {
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() })
  return res.json()
}

export const updateProfile = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/update`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export const changePassword = async (newPassword) => {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ newPassword }),
  })
  return res.json()
}

export const deleteAccount = async () => {
  const res = await fetch(`${BASE_URL}/auth/delete`, {
    method: "DELETE",
    headers: getHeaders(),
  })
  return res.json()
}

// ── LISTINGS ──────────────────────────────────────────────────────────────────
export const getListings = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  const res = await fetch(`${BASE_URL}/listings?${params}`)
  return res.json()
}

export const getMyListings = async () => {
  const res = await fetch(`${BASE_URL}/listings/my`, { headers: getHeaders() })
  return res.json()
}

export const getListing = async (id) => {
  const res = await fetch(`${BASE_URL}/listings/${id}`)
  return res.json()
}

export const createListing = async (formData) => {
  const token = localStorage.getItem("silkroad_token")
  const res = await fetch(`${BASE_URL}/listings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  return res.json()
}

export const updateListing = async (id, data) => {
  const res = await fetch(`${BASE_URL}/listings/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export const deleteListing = async (id) => {
  const res = await fetch(`${BASE_URL}/listings/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  })
  return res.json()
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const createOrder = async (data) => {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export const getMyOrders = async () => {
  const res = await fetch(`${BASE_URL}/orders/my`, { headers: getHeaders() })
  return res.json()
}

export const getSellingOrders = async () => {
  const res = await fetch(`${BASE_URL}/orders/selling`, { headers: getHeaders() })
  return res.json()
}

export const confirmDelivery = async (orderId) => {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/confirm-delivery`, {
    method: "PUT",
    headers: getHeaders(),
  })
  return res.json()
}

export const cancelOrder = async (orderId) => {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
  })
  return res.json()
}

export const confirmReturn = async (orderId, role) => {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/confirm-return`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  })
  return res.json()
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
export const verifyPayment = async (reference) => {
  const res = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ reference }),
  })
  return res.json()
}

// ── RIDERS ────────────────────────────────────────────────────────────────────
export const registerRider = async (formData) => {
  const res = await fetch(`${BASE_URL}/riders`, {
    method: "POST",
    body: formData,
  })
  return res.json()
}

export const getRiders = async () => {
  const res = await fetch(`${BASE_URL}/riders`)
  return res.json()
}
