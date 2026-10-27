import { products as localProducts, type Product, type StationeryCategory } from './data/products'
import type { SavedAddress } from './utils/savedAddresses'

// Production calls the live API directly; do not let an old Netlify
// VITE_API_URL override point the frontend at the retired Render service.
export const API_URL = (import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:4000')
  : 'https://agaram-business-mart-new.onrender.com').replace(/\/$/, '')

export type ApiOrder = {
  id: string
  userId?: string
  date: string
  items: { productId: number; quantity: number; name?: string; image?: string; sku?: string; price?: number; gst?: number; discount?: number; lineTotal?: number; tax?: number }[]
  total: number
  subtotal: number
  tax: number
  discount: number
  couponCode?: string
  deliveryFee?: number
  pricingVersion?: number
  customerType: 'retail' | 'wholesale'
  coinsEarned: number
  coinsRedeemed?: number
  customerName: string
  email: string
  phone: string
  address: string
  city: string
  pincode: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  gstin?: string
  status?: string
  paymentMethod?: 'upi' | 'card' | 'cod'
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'due_on_delivery' | 'refunded'
  shippingProvider?: string
  trackingNumber?: string
  trackingUrl?: string
  deliveryDriverName?: string
  deliveryDriverPhone?: string
  estimatedDeliveryAt?: string
  customerNotes?: string
  adminNotes?: string
  statusHistory?: { status: string; at: string; note?: string }[]
  updatedAt?: string
}

export type ApiUser = {
  id: string
  name: string
  email: string
  phone?: string
  coin_balance?: number
  coinBalance?: number
  phone_verified_at?: string
  role?: string
  email_verified_at?: string
  created_at?: string
  createdAt?: string
}

export const updateAdminUser = (id: string, details: Pick<ApiUser, 'name' | 'email' | 'phone'>) =>
  request<ApiUser>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(details) })

export const deleteAdminUser = (id: string) =>
  request<{ deleted: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })

export type AdminStats = {
  products: number
  lowStock: number
  orders: number
  pendingOrders: number
  deliveredOrders: number
  revenue: number
  customers: number
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
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
    if (response.status === 404 && route.startsWith('/api/auth/')) {
      throw new ApiError('This sign-in route is missing from the connected backend. Start the updated local backend, or deploy the matching backend to Render and frontend to Netlify.', 404)
    }
    const fieldErrors = body.details?.fieldErrors as Record<string, string[]> | undefined
    const formErrors = body.details?.formErrors as string[] | undefined
    const validationMessages = [
      ...(formErrors || []),
      ...Object.entries(fieldErrors || {}).flatMap(([field, messages]) => messages.map(message => `${field}: ${message}`)),
    ]
    const detail = validationMessages.length ? ` — ${validationMessages.join('; ')}` : ''
    const reference = body.reference ? ` (Reference ${body.reference})` : ''
    throw new ApiError(`${body.error || `Request failed (${response.status})`}${detail}${reference}`, response.status)
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
  const res = await request<{ user: { id: string; name: string; email: string; phone?: string }; token?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const customerNameLogin = async (name: string, password: string) => {
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ token?: string; user: { id: string; name: string; email?: string; phone?: string } }>('/api/auth/name/login', { method: 'POST', body: JSON.stringify({ name, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const requestPhoneCode = (phone: string, name: string) =>
  request<{ message: string }>('/api/auth/phone/send-code', { method: 'POST', body: JSON.stringify({ phone, name }) })

export const verifyPhoneCode = async (phone: string, code: string, name: string, password: string, confirmPassword: string) => {
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ token?: string; user: { id: string; name: string; email?: string; phone: string; coinBalance: number } }>('/api/auth/phone/verify-code', { method: 'POST', body: JSON.stringify({ phone, code, name, password, confirmPassword }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const customerPhoneLogin = async (phone: string, password: string) => {
  localStorage.removeItem('abm_admin_token')
  const res = await request<{ token?: string; user: { id: string; name: string; email?: string; phone: string; coinBalance: number } }>('/api/auth/phone/login', { method: 'POST', body: JSON.stringify({ phone, password }) })
  if (res.token) localStorage.setItem('abm_auth_token', res.token)
  return res
}

export const fetchCustomerProfile = () =>
  request<{ id: string; name: string; email: string; phone: string; coinBalance: number }>('/api/customer/profile')

export const setCustomerCoins = (id: string, balance: number, reason?: string) =>
  request<{ id: string; coinBalance: number }>(`/api/admin/users/${encodeURIComponent(id)}/coins`, { method: 'PATCH', body: JSON.stringify({ balance, reason }) })

export const adminLogin = async (email: string, password: string) => {
  localStorage.removeItem('abm_auth_token')
  const res = await request<{ email: string; token?: string }>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.token) localStorage.setItem('abm_admin_token', res.token)
  return res
}

export const getSession = () =>
  request<{ role: 'customer' | 'admin'; user: { id?: string; name?: string; phone?: string; email?: string; coinBalance?: number } }>('/api/auth/session')

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
  paymentMethod?: 'cod'
  customerNotes?: string
  coinsToRedeem?: number
  deliveryLatitude?: number
  deliveryLongitude?: number
  couponCode?: string
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

export const updateOrderDetails = (orderId: string, details: Pick<ApiOrder, 'paymentStatus' | 'shippingProvider' | 'trackingNumber' | 'trackingUrl' | 'deliveryDriverName' | 'deliveryDriverPhone' | 'estimatedDeliveryAt' | 'adminNotes'>) =>
  request<{ order: ApiOrder }>(`/api/admin/orders/${encodeURIComponent(orderId)}/details`, { method: 'PATCH', body: JSON.stringify(details) })

export type DriverLocation = { latitude: number; longitude: number; updatedAt: string; destinationLatitude?: number | null; destinationLongitude?: number | null }
export const publishDriverLocation = (orderId: string, latitude: number, longitude: number) =>
  request<{ success: boolean; updatedAt: string }>(`/api/admin/orders/${encodeURIComponent(orderId)}/driver-location`, { method: 'POST', body: JSON.stringify({ latitude, longitude }) })
export const fetchDriverLocation = (orderId: string) =>
  request<DriverLocation>(`/api/orders/${encodeURIComponent(orderId)}/driver-location`)

export const deleteAdminOrder = (orderId: string) =>
  request<{ success: boolean }>(`/api/admin/orders/${orderId}`, { method: 'DELETE' })

export const fetchAdminUsers = () =>
  request<ApiUser[]>('/api/admin/users')

export const fetchAdminStats = () =>
  request<AdminStats>('/api/admin/stats')
