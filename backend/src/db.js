import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const here = path.dirname(fileURLToPath(import.meta.url))
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const production = process.env.NODE_ENV === 'production'
const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_SIZE || 10),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
  idle_in_transaction_session_timeout: 15000,
})

export async function migrate() {
  const schema = await fs.readFile(path.join(here, 'schema.sql'), 'utf8')
  await pool.query(schema)
}

export function camelProduct(row) {
  if (!row) return null
  return {
    id: Number(row.id), name: row.name, category: row.category, business: row.business,
    brand: row.brand, price: Number(row.price), mrp: Number(row.mrp), unit: row.unit,
    image: row.image, ...(row.badge ? { badge: row.badge } : {}), description: row.description,
    stock: Number(row.stock), gst: Number(row.gst), sku: row.sku,
  }
}

export function camelOrder(row, items = []) {
  return {
    id: row.order_no, date: new Date(row.created_at).toLocaleDateString('en-IN'),
    items: items.map(item => ({ productId: Number(item.product_id), quantity: Number(item.quantity), name: item.product_name, sku: item.sku, price: Number(item.unit_price), gst: Number(item.gst_rate) })),
    total: Number(row.total), subtotal: Number(row.subtotal), tax: Number(row.tax), discount: 0,
    customerType: 'retail', coinsEarned: Math.floor(Number(row.total) / 100),
    customerName: row.customer_name, email: row.email || '', phone: row.phone,
    address: row.address, city: row.city, pincode: row.pincode, gstin: row.gstin || '',
    status: row.status,
  }
}
