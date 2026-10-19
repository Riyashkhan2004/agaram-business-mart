import { products as localProducts, activeCoupons, type Product } from './data/products'

export const API_URL = (import.meta.env.VITE_API_URL || 'https://agaram-business-mart.onrender.com').replace(/\/$/, '')

export type ApiOrder = {
  id: string
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
  gstin: string
}

async function request<T>(route: string, options: RequestInit = {}): Promise<T> {
  const url = API_URL ? `${API_URL}${route}` : route
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body as T
}

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const data = await request<Product[]>('/api/products')
    if (Array.isArray(data) && data.length > 0) return data
  } catch {
    // Graceful fallback to rich local product catalog
  }
  return localProducts
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

export const signUp = (name: string, email: string, password: string) =>
  request<{ message: string }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })

export const verifyEmail = (token: string) =>
  request<{ user: { id: string; name: string; email: string } }>('/api/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) })

export const resendVerificationEmail = (email: string) =>
  request<{ message: string }>('/api/auth/email/resend', { method: 'POST', body: JSON.stringify({ email }) })

export const customerLogin = (email: string, password: string) =>
  request<{ user: { id: string; name: string; email: string } }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const adminLogin = (email: string, password: string) =>
  request<{ email: string }>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const getSession = () =>
  request<{ role: 'customer' | 'admin'; user: { id?: string; name?: string; phone?: string; email?: string } }>('/api/auth/session')

export const logout = () =>
  request<void>('/api/auth/logout', { method: 'POST' })

export const saveProduct = (product: Product) =>
  request<{ product: Product }>(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })

export const deleteProduct = (id: number) =>
  request<{ deleted: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' })

export const createOrder = (order: Pick<ApiOrder, 'items' | 'customerName' | 'phone' | 'email' | 'address' | 'city' | 'pincode' | 'gstin'>) =>
  request<{ order: ApiOrder }>('/api/orders', { method: 'POST', body: JSON.stringify(order) })

export const fetchOrders = () =>
  request<ApiOrder[]>('/api/orders')

export const fetchAdminOrders = () =>
  request<ApiOrder[]>('/api/admin/orders')
