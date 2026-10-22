import { products as localProducts, activeCoupons, type Product } from './data/products'

export const API_URL = (import.meta.env.VITE_API_URL || 'https://agaram-business-mart.onrender.com').replace(/\/$/, '')

export type ApiOrder = {
  id: string
  userId?: string
  date: string
  items: { productId: number; quantity: number }[]
  total: number
  subtotal: number
  tax: number
  discount: number
  customerType: 'retail' | 'wholesale'
  coinsEarned: number
  customerName: string
  email: string
  phone: string
  address: string
  city: string
  pincode: string
  gstin?: string
  status?: string
}

export type ApiUser = {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  email_verified_at?: string
  created_at?: string
  createdAt?: string
}

export type AdminStats = {
  products: number
  lowStock: number
  orders: number
  pendingOrders: number
  deliveredOrders: number
  revenue: number
  customers: number
}

async function request<T>(route: string, options: RequestInit = {}): Promise<T> {
  const url = API_URL ? `${API_URL}${route}` : route
  const token = localStorage.getItem('abm_auth_token') || localStorage.getItem('abm_admin_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body as T
}

export const pingBackend = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(6000) })
    return res.ok
  } catch {
    return false
  }
}

export const fetchProducts = async (): Promise<Product[]> => {
  let backendProducts: Product[] = []
  try {
    const data = await request<Product[]>('/api/products')
    if (Array.isArray(data) && data.length > 0) backendProducts = data
  } catch {
    // Graceful fallback
  }

  // Read any custom products added or updated via Admin portal
  let customProducts: Product[] = []
  try {
    const raw = localStorage.getItem('abm_custom_products')
    if (raw) customProducts = JSON.parse(raw)
  } catch {}

  const baseList = backendProducts.length > 0 ? backendProducts : localProducts
  if (!customProducts.length) return baseList

  // Merge custom products: update existing or prepend new
  const map = new Map<number, Product>()
  for (const p of baseList) map.set(p.id, p)
  for (const cp of customProducts) map.set(cp.id, cp)
  return Array.from(map.values())
}

export const validateCoupon = async (code: string, total: number) => {
  try {
    const res = await request<{ valid: boolean; coupon: { code: string; discountPct: number; minOrder: number; description: string } }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, total }),
    })
    return res.coupon
  } catch {
    // Local fallback
    const match = activeCoupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase())
    if (!match) throw new Error('Invalid coupon code')
    if (total < match.minOrder) throw new Error(`Requires a minimum order of ₹${match.minOrder}`)
    return match
  }
}

export const signUp = async (name: string, email: string, password: string) => {
  const res = await request<{ message: string; user?: { id: string; name: string; email: string }; token?: string; autoVerified?: boolean }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const verifyEmail = async (token: string) => {
  const res = await request<{ user: { id: string; name: string; email: string }; token?: string }>('/api/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const resendVerificationEmail = (email: string) =>
  request<{ message: string }>('/api/auth/email/resend', { method: 'POST', body: JSON.stringify({ email }) })

export const customerLogin = async (email: string, password: string) => {
  const res = await request<{ user: { id: string; name: string; email: string }; token?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const adminLogin = async (email: string, password: string) => {
  const res = await request<{ email: string; token?: string }>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.token) localStorage.setItem('abm_admin_token', res.token)
  return res
}

export const getSession = () =>
  request<{ role: 'customer' | 'admin'; user: { id?: string; name?: string; phone?: string; email?: string } }>('/api/auth/session')

export const logout = async () => {
  try { await request<void>('/api/auth/logout', { method: 'POST' }) } catch {}
  localStorage.removeItem('abm_auth_token')
  localStorage.removeItem('abm_admin_token')
}

export const saveProduct = async (product: Product) => {
  try {
    const raw = localStorage.getItem('abm_custom_products')
    const list: Product[] = raw ? JSON.parse(raw) : []
    const idx = list.findIndex(p => p.id === product.id)
    if (idx >= 0) list[idx] = product
    else list.unshift(product)
    localStorage.setItem('abm_custom_products', JSON.stringify(list))
  } catch {}
  return request<{ product: Product }>(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
}

export const deleteProduct = async (id: number) => {
  try {
    const raw = localStorage.getItem('abm_custom_products')
    if (raw) {
      const list: Product[] = JSON.parse(raw)
      localStorage.setItem('abm_custom_products', JSON.stringify(list.filter(p => p.id !== id)))
    }
  } catch {}
  return request<{ deleted: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' })
}

export const createOrder = (order: {
  items: { productId: number; quantity: number }[]
  customerName: string
  phone: string
  email: string
  address: string
  city: string
  pincode: string
  gstin?: string
  userId?: string
}) =>
  request<{ order: ApiOrder }>('/api/orders', { method: 'POST', body: JSON.stringify(order) })

export const fetchOrders = () =>
  request<ApiOrder[]>('/api/orders')

export const fetchUserOrders = async (userEmail?: string, userId?: string): Promise<ApiOrder[]> => {
  try {
    const data = await request<ApiOrder[]>('/api/orders')
    if (Array.isArray(data) && data.length > 0) return data
  } catch {}

  // Strict user isolation: never cross-show orders between accounts (e.g. Praveen vs Spideyriyas)
  try {
    const raw = localStorage.getItem('abm_orders')
    if (raw) {
      const all: ApiOrder[] = JSON.parse(raw)
      if (!userEmail && !userId) return []
      return all.filter(o => {
        const matchesEmail = userEmail && o.email && o.email.toLowerCase().trim() === userEmail.toLowerCase().trim()
        const matchesId = userId && (o as any).userId === userId
        return matchesEmail || matchesId
      })
    }
  } catch {}
  return []
}

export const fetchAdminOrders = () =>
  request<ApiOrder[]>('/api/admin/orders')

export const updateOrderStatus = (orderId: string, status: string) =>
  request<{ success: boolean; order: any }>(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const deleteAdminOrder = (orderId: string) =>
  request<{ success: boolean }>(`/api/admin/orders/${orderId}`, { method: 'DELETE' })

export const fetchAdminUsers = () =>
  request<ApiUser[]>('/api/admin/users')

export const fetchAdminStats = () =>
  request<AdminStats>('/api/admin/stats')
