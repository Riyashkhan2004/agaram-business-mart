import { products as localProducts, activeCoupons, type Product, type StationeryCategory } from './data/products'
import type { SavedAddress } from './utils/savedAddresses'

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
  const requiresAdmin = route.startsWith('/api/admin') || route === '/api/auth/admin/login' || (route === '/api/auth/session' && Boolean(localStorage.getItem('abm_admin_token')))
  const token = requiresAdmin ? localStorage.getItem('abm_admin_token') : localStorage.getItem('abm_auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const response = await fetch(url, {
    ...options,
    cache: options.cache || 'no-store',
    credentials: 'include',
    headers,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fieldErrors = body.details?.fieldErrors as Record<string, string[]> | undefined
    const formErrors = body.details?.formErrors as string[] | undefined
    const validationMessages = [
      ...(formErrors || []),
      ...Object.entries(fieldErrors || {}).flatMap(([field, messages]) => messages.map(message => `${field}: ${message}`)),
    ]
    const detail = validationMessages.length ? ` — ${validationMessages.join('; ')}` : ''
    const reference = body.reference ? ` (Reference ${body.reference})` : ''
    throw new Error(`${body.error || `Request failed (${response.status})`}${detail}${reference}`)
  }
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
  const liveProducts = await request<Product[]>('/api/products')
  return liveProducts.map(product => {
    const localDetails = localProducts.find(local => local.id === product.id)
    return localDetails ? { ...localDetails, ...product, subcategory: product.subcategory || localDetails.subcategory } : product
  })
}

export const fetchStoreCategories = async (): Promise<StationeryCategory[]> => {
  try { return await request<StationeryCategory[]>('/api/categories') } catch { return [] }
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
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ message: string; user?: { id: string; name: string; email: string }; token?: string; autoVerified?: boolean }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const verifyEmail = async (token: string) => {
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ user: { id: string; name: string; email: string }; token?: string }>('/api/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const resendVerificationEmail = (email: string) =>
  request<{ message: string }>('/api/auth/email/resend', { method: 'POST', body: JSON.stringify({ email }) })

export const customerLogin = async (email: string, password: string) => {
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ user: { id: string; name: string; email: string }; token?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const adminLogin = async (email: string, password: string) => {
  localStorage.removeItem('abm_auth_token')
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
  return request<{ product: Product }>(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
}

export const createProduct = async (product: Omit<Product, 'id'>) =>
  request<{ product: Product }>('/api/admin/products', { method: 'POST', body: JSON.stringify(product) })

export const fetchAdminProducts = () => request<Product[]>('/api/admin/products')

export const fetchAdminCategories = () => request<StationeryCategory[]>('/api/admin/categories')

export const saveAdminCategories = (categories: StationeryCategory[]) =>
  request<StationeryCategory[]>('/api/admin/categories', { method: 'PUT', body: JSON.stringify({ categories }) })

export const deleteAdminCategory = (slug: string) =>
  request<{ deleted: boolean }>(`/api/admin/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' })

export type ApiAddress = SavedAddress & { expiresAt: string | null }
export const fetchUserAddresses = () => request<ApiAddress[]>('/api/addresses')
export const saveUserAddressesRemote = (addresses: SavedAddress[]) =>
  request<ApiAddress[]>('/api/addresses', { method: 'PUT', body: JSON.stringify({ addresses }) })

export const deleteProduct = async (id: number) => {
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
  customerType: 'retail' | 'wholesale'
  gstin?: string
  userId?: string
}) =>
  request<{ order: ApiOrder }>('/api/orders', { method: 'POST', body: JSON.stringify(order) })

export const fetchOrders = () =>
  request<ApiOrder[]>('/api/orders')

export const fetchUserOrders = async (_userEmail?: string, userId?: string): Promise<ApiOrder[]> => {
  if (!userId) return []
  return request<ApiOrder[]>('/api/orders')
}

export const cancelCustomerOrder = (orderId: string) =>
  request<{ success: boolean; status: string }>(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'PATCH' })

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
