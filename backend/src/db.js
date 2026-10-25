import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const here = path.dirname(fileURLToPath(import.meta.url))

export const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_72sUImhPHtJW@ep-royal-breeze-b4jg1scq-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

export function sanitizeDatabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return FALLBACK_DATABASE_URL
  let cleaned = raw.trim()
  // Strip accidental prefix like "DATABASE_URL=postgres..." or "database_url: postgres..."
  cleaned = cleaned.replace(/^(?:DATABASE_URL|DATABASE_URI|DATABASE)\s*[:=]\s*/i, '').trim()
  // Strip enclosing quotes
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim()
  // If empty, or corrupted to literal 'base', or missing protocol '://'
  if (!cleaned || cleaned === 'base' || !cleaned.includes('://')) {
    return FALLBACK_DATABASE_URL
  }
  return cleaned
}

const connectionString = sanitizeDatabaseUrl(process.env.DATABASE_URL)
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_SIZE || 10),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  idle_in_transaction_session_timeout: 15000,
})

pool.on('connect', (client) => {
  client.query('SET search_path TO public;').catch(() => {})
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
  return {
    id: row.order_no, userId: row.user_id, date: new Date(row.created_at).toISOString(),
    items: items.map(item => ({ productId: Number(item.product_id), quantity: Number(item.quantity), name: item.product_name, sku: item.sku, price: Number(item.unit_price), gst: Number(item.gst_rate) })),
    total: Number(row.total), subtotal: Number(row.subtotal), tax: Number(row.tax), discount: 0,
    customerType: row.customer_type || 'retail', coinsEarned: Math.floor(Number(row.total) / 100),
    customerName: row.customer_name, email: row.email || '', phone: row.phone,
    address: row.address, city: row.city, pincode: row.pincode, gstin: row.gstin || '',
    status: row.status,
  }
}
