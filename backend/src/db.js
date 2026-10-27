import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const here = path.dirname(fileURLToPath(import.meta.url))

export function sanitizeDatabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('DATABASE_URL must be configured in the service environment before starting the API.')
  }
  let cleaned = raw.trim()
  // Strip accidental prefix like "DATABASE_URL=postgres..." or "database_url: postgres..."
  cleaned = cleaned.replace(/^(?:DATABASE_URL|DATABASE_URI|DATABASE)\s*[:=]\s*/i, '').trim()
  // Strip enclosing quotes
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim()
  // If empty, or corrupted to literal 'base', or missing protocol '://'
  if (!cleaned || cleaned === 'base' || !cleaned.includes('://')) {
    throw new Error('DATABASE_URL is malformed. Configure a valid PostgreSQL connection string in the service environment.')
  }
  let parsed
  try {
    parsed = new URL(cleaned)
  } catch {
    throw new Error('DATABASE_URL is malformed. Configure a valid PostgreSQL connection string in the service environment.')
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol.')
  }
  const channelBinding = parsed.searchParams.get('channel_binding')?.toLowerCase()
  if (channelBinding === 'verify-full') parsed.searchParams.set('channel_binding', 'require')
  else if (channelBinding && !['disable', 'prefer', 'require'].includes(channelBinding)) {
    throw new Error('DATABASE_URL channel_binding must be disable, prefer, or require.')
  }
  return parsed.toString()
}

const connectionString = sanitizeDatabaseUrl(process.env.DATABASE_URL)

export const pool = new Pool({
  connectionString,
  enableChannelBinding: true,
  // Keep a small application pool so multiple API instances or overlapping
  // restarts do not exhaust the database connection limit.
  max: Math.max(1, Math.min(10, Number(process.env.PG_POOL_SIZE || 5))),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  idle_in_transaction_session_timeout: 15000,
})

pool.on('error', (err) => {
  console.error('Unexpected pg-pool error:', err.message)
})

export async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS public; SET search_path TO public;')
    const schema = await fs.readFile(path.join(here, 'schema.sql'), 'utf8')
    await client.query(schema)
  } finally {
    client.release()
  }
}

export function camelProduct(row) {
  if (!row) return null
  const gal = Array.isArray(row.gallery) && row.gallery.length > 0 ? row.gallery : [row.image]
  return {
    id: Number(row.id), name: row.name, category: row.category, ...(row.subcategory ? { subcategory: row.subcategory } : {}), business: row.business,
    brand: row.brand, price: Number(row.price), mrp: Number(row.mrp), unit: row.unit,
    image: row.image, gallery: gal, tiers: Array.isArray(row.tiers) ? row.tiers : [], ...(row.badge ? { badge: row.badge } : {}), description: row.description,
    stock: Number(row.stock), gst: Number(row.gst), sku: row.sku,
  }
}

export function camelOrder(row, items = []) {
  const inclusiveTax = Number(row.pricing_version || 1) >= 2
  return {
    id: row.order_no, userId: row.user_id, date: new Date(row.created_at).toISOString(),
    items: items.map(item => {
      const base = Number(item.unit_price) * Number(item.quantity)
      const discount = inclusiveTax ? Number(item.discount_amount || 0) : 0
      const gross = base - discount
      const tax = inclusiveTax
        ? Math.round(gross * Number(item.gst_rate) / (100 + Number(item.gst_rate)) * 100) / 100
        : Math.round(base * Number(item.gst_rate)) / 100
      return { productId: Number(item.product_id), quantity: Number(item.quantity), name: item.product_name, sku: item.sku, price: Number(item.unit_price), gst: Number(item.gst_rate), discount, lineTotal: inclusiveTax ? gross : base + tax, tax }
    }),
    total: Number(row.total), subtotal: Number(row.subtotal), tax: Number(row.tax), discount: inclusiveTax ? Number(row.discount || 0) : 0, couponCode: row.coupon_code || '', deliveryFee: Number(row.delivery_fee || 0), pricingVersion: Number(row.pricing_version || 1),
    customerType: row.customer_type || 'retail', coinsEarned: Math.floor(Number(row.total) / 100),
    customerName: row.customer_name, email: row.email || '', phone: row.phone,
    address: row.address, city: row.city, pincode: row.pincode, gstin: row.gstin || '',
    status: row.status,
    paymentMethod: row.payment_method || 'cod', paymentStatus: row.payment_status || 'due_on_delivery',
    shippingProvider: row.shipping_provider || '', trackingNumber: row.tracking_number || '', trackingUrl: row.tracking_url || '',
    deliveryDriverName: row.delivery_driver_name || '', deliveryDriverPhone: row.delivery_driver_phone || '',
    estimatedDeliveryAt: row.estimated_delivery_at ? new Date(row.estimated_delivery_at).toISOString() : '',
    customerNotes: row.customer_notes || '', adminNotes: row.admin_notes || '',
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [], updatedAt: new Date(row.updated_at || row.created_at).toISOString(),
  }
}
