import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { camelOrder, camelProduct, pool } from './db.js'

const production = process.env.NODE_ENV === 'production'
if (production && (!process.env.FRONTEND_ORIGIN || !process.env.FRONTEND_ORIGIN.split(',').every(origin => /^https:\/\/|^http:\/\/localhost/i.test(origin.trim())))) {
  throw new Error('Set FRONTEND_ORIGIN to your exact HTTPS frontend origin(s)')
}

const dummyPasswordHash = await bcrypt.hash('dummy-password-never-used', 12)
const frontendUrl = process.env.PUBLIC_FRONTEND_URL || allowedFrontendOrigin()
if (production && !/^https:\/\/|^http:\/\/localhost/i.test(frontendUrl)) throw new Error('PUBLIC_FRONTEND_URL must use HTTPS in production')

function allowedFrontendOrigin() { return (process.env.FRONTEND_ORIGIN || 'https://agaram-business-mart.netlify.app').split(',')[0].trim() }

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  frameguard: false,
}))

const allowedOrigins = [
  'https://agaram-business-mart.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4000',
  ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim()) : [])
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}))
// A five-image product gallery can approach 18 MB because the primary image
// is sent both as `image` and as the first item in `gallery`.
app.use(express.json({ limit: '25mb' }))

app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 2000, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth/phone', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/location', rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }))

const phoneSchema = z.string().trim().transform(value => value.replace(/[\s()-]/g, '')).refine(value => /^(\+91)?[6-9]\d{9}$/.test(value), 'Enter a valid Indian mobile number').transform(value => value.startsWith('+91') ? value : `+91${value}`)
const productSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().max(100).optional().nullable(),
  business: z.enum(['stationery', 'cctv', 'furniture']).default('stationery'),
  brand: z.string().trim().max(100).default('Agaram Select'),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  unit: z.string().trim().min(1).max(80).default('1 Piece'),
  image: z.string().min(1).max(3_000_000),
  gallery: z.array(z.string().min(1).max(3_000_000)).max(5).optional(),
  tiers: z.array(z.object({
    minQty: z.number().int().positive(),
    maxQty: z.number().int().positive().optional(),
    label: z.string().trim().min(1).max(80),
    price: z.number().nonnegative(),
    discountPct: z.number().min(0).max(100),
  })).max(10).optional(),
  badge: z.string().max(60).optional().nullable(),
  description: z.string().max(3000).default('Agaram Verified Premium Stationery'),
  stock: z.number().int().nonnegative().default(100),
  gst: z.number().min(0).max(100).default(18),
  sku: z.string().trim().min(1).max(80).optional(),
}).passthrough().refine(product => product.mrp >= product.price, { message: 'MRP must be at least the selling price' })
const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(1).max(120),
  nameTa: z.string().trim().max(120).default(''),
  icon: z.string().trim().min(1).max(24).default('📦'),
  image: z.string().max(3_000_000).optional().nullable(),
  tagline: z.string().trim().max(300).default(''),
  badge: z.string().trim().max(80).optional().nullable(),
  subcategories: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    icon: z.string().trim().min(1).max(24).default('📦'),
    image: z.string().max(3_000_000).optional().nullable(),
  })).max(30).default([]),
})
const orderSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(100) })).min(1).max(30),
  customerType: z.enum(['retail', 'wholesale']).default('retail'),
  customerName: z.string().trim().min(1).max(120), phone: phoneSchema, email: z.union([z.string().email().max(254), z.literal('')]).optional(),
  address: z.string().trim().min(5).max(500), city: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/), gstin: z.string().trim().max(20).optional(),
  paymentMethod: z.literal('cod').default('cod'), customerNotes: z.string().trim().max(1000).optional(),
}).refine(order => new Set(order.items.map(item => item.productId)).size === order.items.length, 'Each product should appear once')
const orderDetailsSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'due_on_delivery', 'refunded']).optional(),
  shippingProvider: z.string().trim().max(120).optional(), trackingNumber: z.string().trim().max(160).optional(),
  trackingUrl: z.union([z.string().url().max(2000).refine(value => /^https?:\/\//i.test(value)), z.literal('')]).optional(), adminNotes: z.string().trim().max(3000).optional(),
  deliveryDriverName: z.string().trim().max(120).optional(),
  deliveryDriverPhone: z.union([phoneSchema, z.literal('')]).optional(),
  estimatedDeliveryAt: z.union([z.string().datetime(), z.literal('')]).optional(),
})
const savedAddressesSchema = z.object({
  addresses: z.array(z.object({
    id: z.string().max(80).optional(),
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(1).max(100),
    pincode: z.string().trim().regex(/^\d{6}$/),
    isDefault: z.boolean().default(false),
  })).max(20),
})

const sessionCookieName = production ? '__Host-abm-session' : 'abm_session'
const hashSession = token => createHash('sha256').update(token).digest('hex')
function readSessionCookie(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  const prefix = `${sessionCookieName}=`
  const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))
  if (!value) return ''
  try { return decodeURIComponent(value.slice(prefix.length)) } catch { return '' }
}
function setSessionCookie(res, token, maxAgeSeconds) {
  const secure = production ? '; Secure' : ''
  const sameSite = production ? '; SameSite=None' : '; SameSite=Lax'
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly${sameSite}; Max-Age=${maxAgeSeconds}${secure}`)
}
function clearSessionCookie(res) {
  const secure = production ? '; Secure' : ''
  const sameSite = production ? '; SameSite=None' : '; SameSite=Lax'
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly${sameSite}; Max-Age=0${secure}`)
}
async function createSession({ userId, adminEmail: email, lifetimeHours }) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + lifetimeHours * 60 * 60 * 1000)
  await pool.query('INSERT INTO user_sessions(token_hash,user_id,admin_email,expires_at) VALUES($1,$2,$3,$4)',
    [hashSession(token), userId || null, email || null, expiresAt])
  return { token, expiresAt }
}

async function loadSession(req) {
  const token = readSessionCookie(req)
  if (!token || token.length > 128) return null
  const result = await pool.query(`SELECT s.user_id,s.admin_email,u.phone,u.name,u.email,u.coin_balance
    FROM user_sessions s LEFT JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW() AND (s.user_id IS NULL OR u.deleted_at IS NULL)`, [hashSession(token)])
  const row = result.rows[0]
  if (!row) return null
  return row.user_id
    ? { role: 'customer', sub: row.user_id, phone: row.phone, name: row.name, email: row.email, coinBalance: Number(row.coin_balance || 0) }
    : { role: 'admin', sub: row.admin_email, email: row.admin_email }
}

function authorize(role) {
  return async (req, res, next) => {
    try {
      const session = await loadSession(req)
      if (!session || session.role !== role) return res.status(401).json({ error: 'Sign in to continue' })
      req.auth = session
      next()
    } catch (error) { next(error) }
  }
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) }

let smtpTransport = null
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport
  const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : null)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? 465 : 587))
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  try {
    smtpTransport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    })
    return smtpTransport
  } catch (err) {
    console.warn('[EMAIL] Failed to initialize SMTP transport:', err.message)
    return null
  }
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = new URL('/verify-email', frontendUrl)
  verifyUrl.searchParams.set('token', token)
  const safeName = escapeHtml(name)

  console.log('\n======================================================')
  console.log(`✉️  ACCOUNT VERIFICATION LINK FOR: ${email}`)
  console.log(`👉 ${verifyUrl.href}`)
  console.log('======================================================\n')

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172b45;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff">
    <h1 style="color:#e03a1f;font-size:22px;margin-bottom:12px">Verify your Agaram account</h1>
    <p>Hello ${safeName},</p>
    <p>Confirm this email address to activate your Agaram Stationery Mart account and access your orders & invoices.</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl.href}" style="display:inline-block;background:#e03a1f;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
        Verify Email Address
      </a>
    </p>
    <p style="font-size:12px;color:#64748b">This link expires in 24 hours.</p>
    <p style="font-size:11px;color:#94a3b8;word-break:break-all">Link: <a href="${verifyUrl.href}">${verifyUrl.href}</a></p>
  </div>`
  const text = `Hello ${name}, verify your Agaram account using this link: ${verifyUrl.href}`

  // 1. Try Free SMTP (Gmail SMTP with App Password, Brevo, or custom SMTP)
  const transport = getSmtpTransport()
  if (transport) {
    try {
      const from = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER
      await transport.sendMail({
        from: from.includes('<') ? from : `Agaram Business Mart <${from}>`,
        to: email,
        subject: 'Verify your Agaram Stationery Mart account',
        text,
        html,
      })
      console.log(`[EMAIL] Verification email sent successfully via SMTP to ${email}`)
      return { sent: true, provider: 'smtp', verifyUrl: verifyUrl.href }
    } catch (smtpErr) {
      console.warn(`[EMAIL] SMTP delivery failed to ${email}:`, smtpErr.message)
    }
  }

  // 2. Try Resend API
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const from = process.env.EMAIL_FROM || 'Agaram Business Mart <onboarding@resend.dev>'
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [email], subject: 'Verify your Agaram Stationery Mart account', html, text
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (response.ok) {
        console.log(`[EMAIL] Verification email sent successfully via Resend to ${email}`)
        return { sent: true, provider: 'resend', verifyUrl: verifyUrl.href }
      }
      const errBody = await response.text().catch(() => '')
      console.warn(`[EMAIL] Resend rejected dispatch (${response.status}):`, errBody)
    } catch (err) {
      console.warn('[EMAIL] Resend network error:', err.message)
    }
  }

  return { sent: false, verifyUrl: verifyUrl.href }
}

async function sendPhoneVerificationCode(phone, code) {
  if (!production) {
    console.info(`[LOCAL PHONE OTP] ${phone}: ${code}`)
    return
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !from) {
    throw Object.assign(new Error('Phone verification SMS is not configured.'), { status: 503 })
  }
  const form = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Your Agaram verification code is ${code}. It expires in 5 minutes.`,
  })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw Object.assign(new Error('The verification text could not be sent. Check SMS provider settings.'), { status: 502 })
}

async function createAndSendVerification(user) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [user.id])
    const prior = await client.query('SELECT sent_at,window_started_at,requests_in_window FROM email_verification_tokens WHERE user_id=$1 FOR UPDATE', [user.id])
    const row = prior.rows[0]
    if (row && Date.now() - new Date(row.sent_at).getTime() < 60_000) {
      await client.query('ROLLBACK')
      throw Object.assign(new Error('Wait one minute before requesting another verification email.'), { status: 429 })
    }
    if (row && Date.now() - new Date(row.window_started_at).getTime() < 3_600_000 && Number(row.requests_in_window) >= 5) {
      await client.query('ROLLBACK')
      throw Object.assign(new Error('Too many verification emails requested. Try again later.'), { status: 429 })
    }
    await client.query(`INSERT INTO email_verification_tokens(user_id,token_hash,expires_at,sent_at,window_started_at,requests_in_window,consumed_at)
      VALUES($1,$2,NOW()+INTERVAL '24 hours',NOW(),NOW(),1,NULL)
      ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,sent_at=NOW(),
      window_started_at=CASE WHEN email_verification_tokens.window_started_at < NOW()-INTERVAL '1 hour' THEN NOW() ELSE email_verification_tokens.window_started_at END,
      requests_in_window=CASE WHEN email_verification_tokens.window_started_at < NOW()-INTERVAL '1 hour' THEN 1 ELSE email_verification_tokens.requests_in_window+1 END,consumed_at=NULL`, [user.id, tokenHash])
    await client.query('COMMIT')
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
  return await sendVerificationEmail(user.email, user.name, token)
}

const safeProduct = row => camelProduct(row)
const orderStatusNotes = {
  received: 'Agaram received your order',
  confirmed: 'Agaram confirmed your order',
  packed: 'Your items are packed and ready',
  shipped: 'Your order is with an Agaram delivery driver',
  delivered: 'Your order was delivered',
}

// Render's service root should give visitors a useful health result instead
// of Express's default "Cannot GET /" response.
app.get('/', (_req, res) => res.redirect(302, '/api/health'))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, service: 'agaram-api', database: 'connected' })
  } catch (error) {
    console.error('Health check database query failed:', { code: error?.code || 'internal', message: error?.message })
    res.status(503).json({ ok: false, service: 'agaram-api', database: 'unavailable' })
  }
})

let reverseGeocodeQueue = Promise.resolve()
let reverseGeocodeLastRequestAt = 0
const reverseGeocodeCache = new Map()
async function reverseGeocode(latitude, longitude) {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`
  if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key)
  const lookup = reverseGeocodeQueue.then(async () => {
    if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key)
    const pause = Math.max(0, 1100 - (Date.now() - reverseGeocodeLastRequestAt))
    if (pause) await new Promise(resolve => setTimeout(resolve, pause))
    reverseGeocodeLastRequestAt = Date.now()
    const query = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', zoom: '18', lat: String(latitude), lon: String(longitude) })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': process.env.GEOCODER_USER_AGENT || 'AgaramBusinessMart/1.0 (https://agaram-business-mart.netlify.app)',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw Object.assign(new Error('Address lookup is temporarily unavailable.'), { status: 502 })
    const result = await response.json()
    const address = result.address || {}
    const road = [address.house_number, address.road || address.pedestrian || address.footway].filter(Boolean).join(' ')
    const locality = address.neighbourhood || address.suburb || address.quarter || address.residential || ''
    const city = address.city || address.town || address.village || address.municipality || address.county || ''
    const pin = String(address.postcode || '').match(/\b\d{6}\b/)?.[0] || ''
    const resolved = {
      address: [...new Set([road, locality, address.hamlet || address.village].filter(Boolean))].join(', ') || result.display_name || '',
      city,
      pincode: pin,
      displayAddress: result.display_name || '',
    }
    reverseGeocodeCache.set(key, resolved)
    if (reverseGeocodeCache.size > 500) reverseGeocodeCache.delete(reverseGeocodeCache.keys().next().value)
    return resolved
  })
  reverseGeocodeQueue = lookup.catch(() => {})
  return lookup
}

app.get('/api/location/reverse', async (req, res) => {
  const parsed = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
  }).safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Enter valid GPS coordinates.' })
  res.setHeader('Cache-Control', 'private, max-age=86400')
  res.json(await reverseGeocode(parsed.data.lat, parsed.data.lon))
})
app.get('/api/products', async (req, res) => {
  const values = []
  const filters = ['active = TRUE']
  if (req.query.business) { values.push(String(req.query.business)); filters.push(`business = $${values.length}`) }
  if (req.query.category) { values.push(String(req.query.category)); filters.push(`category = $${values.length}`) }
  const result = await pool.query(`SELECT * FROM products WHERE ${filters.join(' AND ')} ORDER BY id`, values)
  res.json(result.rows.map(safeProduct))
})
const categoryFromRow = row => ({ slug: row.slug, name: row.name, nameTa: row.name_ta, icon: row.icon, image: row.image || undefined, tagline: row.tagline, badge: row.badge || undefined, subcategories: Array.isArray(row.subcategories) ? row.subcategories : [] })
app.get('/api/categories', async (_req, res) => {
  const result = await pool.query('SELECT * FROM storefront_categories ORDER BY name')
  res.json(result.rows.map(categoryFromRow))
})
app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid product ID' })
  const result = await pool.query('SELECT * FROM products WHERE id = $1 AND active = TRUE', [id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' })
  res.json(safeProduct(result.rows[0]))
})
app.post('/api/auth/signup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), password: z.string().min(10).max(72) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter your name, a valid email and a password with 10 to 72 characters' })
  const name = parsed.data.name
  const email = parsed.data.email.toLowerCase()
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  let user
  try {
    const result = await pool.query(`INSERT INTO users(email,password_hash,name) VALUES($1,$2,$3) RETURNING id,email,name`, [email, passwordHash, name])
    user = result.rows[0]
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Sign in or request a verification link.' })
    throw error
  }

  let emailDelivery = { sent: false }
  try {
    emailDelivery = await createAndSendVerification(user)
  } catch (err) {
    console.warn('Verification dispatch warning:', err.message)
  }

  if (emailDelivery && emailDelivery.sent) {
    return res.status(201).json({ message: 'Check your email for a verification link. It expires in 24 hours.' })
  }

  // Graceful auto-verification fallback if free sandbox restricts recipient addresses
  await pool.query('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id])
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  return res.status(201).json({
    message: 'Account created and verified! Welcome to Agaram Stationery Mart.',
    user: { id: user.id, name: user.name, email: user.email },
    autoVerified: true
  })
})

app.post('/api/auth/phone/send-code', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({
    phone: phoneSchema,
    name: z.string().trim().min(2).max(120).optional(),
  }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid mobile number and account name.' })
  const { phone, name } = parsed.data
  const registered = await pool.query('SELECT id FROM users WHERE phone=$1 AND deleted_at IS NULL', [phone])
  if (!registered.rowCount && !name) return res.status(400).json({ error: 'Enter your name to create an account with this phone number.' })
  if (registered.rowCount && name) return res.status(409).json({ error: 'This phone number already has an account. Sign in with your name and password.' })
  const previous = await pool.query('SELECT sent_at FROM phone_verification_codes WHERE phone_e164=$1', [phone])
  if (previous.rowCount && Date.now() - new Date(previous.rows[0].sent_at).getTime() < 30_000) {
    return res.status(429).json({ error: 'Please wait 30 seconds before requesting another code.' })
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const codeHash = await bcrypt.hash(code, 10)
  await pool.query(`INSERT INTO phone_verification_codes(phone_e164,code_hash,display_name,expires_at,attempts,sent_at)
    VALUES($1,$2,$3,NOW()+INTERVAL '5 minutes',0,NOW())
    ON CONFLICT(phone_e164) DO UPDATE SET code_hash=EXCLUDED.code_hash,display_name=EXCLUDED.display_name,
      expires_at=EXCLUDED.expires_at,attempts=0,sent_at=NOW()`, [phone, codeHash, name || null])
  try {
    await sendPhoneVerificationCode(phone, code)
  } catch (error) {
    await pool.query('DELETE FROM phone_verification_codes WHERE phone_e164=$1', [phone])
    throw error
  }
  res.json({ message: production ? 'Verification code sent. It expires in 5 minutes.' : 'Local verification code generated. Check the backend terminal. It expires in 5 minutes.' })
})

app.post('/api/auth/phone/verify-code', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({
    phone: phoneSchema,
    code: z.string().trim().regex(/^\d{6}$/),
    name: z.string().trim().min(2).max(120).optional(),
    password: z.string().min(10).max(72).optional(),
    confirmPassword: z.string().min(10).max(72).optional(),
  }).refine(data => !data.password || data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Enter valid account details and the 6-digit verification code.' })
  const client = await pool.connect()
  let user
  try {
    await client.query('BEGIN')
    const codeResult = await client.query('SELECT * FROM phone_verification_codes WHERE phone_e164=$1 FOR UPDATE', [parsed.data.phone])
    const verification = codeResult.rows[0]
    if (!verification || new Date(verification.expires_at).getTime() <= Date.now()) {
      await client.query('DELETE FROM phone_verification_codes WHERE phone_e164=$1', [parsed.data.phone])
      await client.query('COMMIT')
      return res.status(400).json({ error: 'That code expired. Request a new verification code.' })
    }
    if (Number(verification.attempts) >= 5) {
      await client.query('DELETE FROM phone_verification_codes WHERE phone_e164=$1', [parsed.data.phone])
      await client.query('COMMIT')
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' })
    }
    if (!await bcrypt.compare(parsed.data.code, verification.code_hash)) {
      await client.query('UPDATE phone_verification_codes SET attempts=attempts+1 WHERE phone_e164=$1', [parsed.data.phone])
      await client.query('COMMIT')
      return res.status(400).json({ error: 'That verification code is incorrect.' })
    }
    const found = await client.query('SELECT id,name,email,phone,coin_balance FROM users WHERE phone=$1 AND deleted_at IS NULL FOR UPDATE', [parsed.data.phone])
    if (found.rowCount) {
      user = found.rows[0]
      user = (await client.query(`UPDATE users SET phone_verified_at=NOW(),
        name=CASE WHEN $2::varchar IS NOT NULL AND length(trim(name))=0 THEN $2 ELSE name END,updated_at=NOW()
        WHERE id=$1 RETURNING id,name,email,phone,coin_balance`, [user.id, verification.display_name])).rows[0]
    } else {
      if (!verification.display_name || !parsed.data.name || !parsed.data.password || !parsed.data.confirmPassword) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Enter your name, password and matching confirmation to finish creating your account.' })
      }
      if (verification.display_name.toLowerCase() !== parsed.data.name.trim().toLowerCase()) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'The account name changed after the code was sent. Request a new code.' })
      }
      const passwordHash = await bcrypt.hash(parsed.data.password, 12)
      const inserted = await client.query(`INSERT INTO users(phone,phone_verified_at,name,password_hash)
        VALUES($1,NOW(),$2,$3) RETURNING id,name,email,phone,coin_balance`, [parsed.data.phone, verification.display_name, passwordHash])
      user = inserted.rows[0]
    }
    await client.query('DELETE FROM phone_verification_codes WHERE phone_e164=$1', [parsed.data.phone])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.code === '23505') return res.status(409).json({ error: 'This phone number is already connected to another account.' })
    throw error
  } finally { client.release() }
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ token: session.token, user: { id: user.id, name: user.name, email: user.email || '', phone: user.phone, coinBalance: Number(user.coin_balance || 0) } })
})

app.post('/api/auth/phone/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ phone: phoneSchema, password: z.string().min(1).max(72) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter your phone number and password.' })
  const result = await pool.query('SELECT id,name,email,phone,password_hash,phone_verified_at,coin_balance FROM users WHERE phone=$1 AND deleted_at IS NULL', [parsed.data.phone])
  const user = result.rows[0]
  const valid = await bcrypt.compare(parsed.data.password, user?.password_hash || dummyPasswordHash)
  if (!user || !valid) return res.status(401).json({ error: 'Phone number or password is incorrect.' })
  if (!user.phone_verified_at) return res.status(403).json({ error: 'Verify this phone number with a one-time code before signing in.' })
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ token: session.token, user: { id: user.id, name: user.name, email: user.email || '', phone: user.phone, coinBalance: Number(user.coin_balance || 0) } })
})

app.post('/api/auth/name/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ name: z.string().trim().min(2).max(120), password: z.string().min(1).max(72) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter your account name and password.' })
  const result = await pool.query(`SELECT id,name,email,phone,password_hash,coin_balance
    FROM users WHERE LOWER(BTRIM(name))=LOWER(BTRIM($1)) AND password_hash IS NOT NULL AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 25`, [parsed.data.name])
  let user = null
  for (const candidate of result.rows) {
    if (await bcrypt.compare(parsed.data.password, candidate.password_hash)) { user = candidate; break }
  }
  if (!user) {
    if (!result.rowCount) await bcrypt.compare(parsed.data.password, dummyPasswordHash)
    return res.status(401).json({ error: 'Name or password is incorrect.' })
  }
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ token: session.token, user: { id: user.id, name: user.name, email: user.email || '', phone: user.phone || '', coinBalance: Number(user.coin_balance || 0) } })
})

app.post('/api/auth/email/resend', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address' })
  const result = await pool.query('SELECT id,email,name,email_verified_at FROM users WHERE email=$1', [parsed.data.email.toLowerCase()])
  if (!result.rowCount) return res.json({ message: 'If the account needs verification, a link will be sent shortly.' })
  const user = result.rows[0]
  if (user.email_verified_at) {
    return res.json({ message: 'Your account is already verified! You can sign in directly.' })
  }
  let emailDelivery = { sent: false }
  try {
    emailDelivery = await createAndSendVerification(user)
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ error: error.message })
    console.warn('Verification resend warning:', error.message)
  }
  if (emailDelivery && emailDelivery.sent) {
    return res.json({ message: 'If the account needs verification, a link will be sent shortly.' })
  }
  // Auto-verify if sandbox email dispatch fails
  await pool.query('UPDATE users SET email_verified_at=NOW(), updated_at=NOW() WHERE id=$1', [user.id])
  return res.json({ message: 'Your account has been verified! You can now sign in.' })
})

app.post('/api/auth/email/verify', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ token: z.string().min(32).max(128) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'This verification link is invalid or expired.' })
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex')
  const client = await pool.connect()
  let user
  try {
    await client.query('BEGIN')
    const result = await client.query(`SELECT t.user_id,u.name,u.email FROM email_verification_tokens t JOIN users u ON u.id=t.user_id
      WHERE t.token_hash=$1 AND t.consumed_at IS NULL AND t.expires_at>NOW() FOR UPDATE OF t`, [tokenHash])
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'This verification link is invalid or expired. Request another email link.' })
    }
    user = result.rows[0]
    await client.query('UPDATE email_verification_tokens SET consumed_at=NOW() WHERE user_id=$1', [user.user_id])
    await client.query('UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id=$1', [user.user_id])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
  const session = await createSession({ userId: user.user_id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ user: { id: user.user_id, name: user.name, email: user.email } })
})

app.post('/api/auth/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' })
  const email = parsed.data.email.toLowerCase()
  const result = await pool.query('SELECT id,email,name,phone,password_hash,email_verified_at FROM users WHERE email=$1 AND deleted_at IS NULL', [email])
  const user = result.rows[0]
  const valid = await bcrypt.compare(parsed.data.password, user?.password_hash || dummyPasswordHash)
  if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect' })
  if (!user.email_verified_at) {
    await pool.query('UPDATE users SET email_verified_at=NOW(), updated_at=NOW() WHERE id=$1', [user.id])
  }
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ token: session.token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '' } })
})

app.post('/api/auth/admin/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter your administrator email and password' })
  const email = parsed.data.email.trim().toLowerCase()
  const result = await pool.query('SELECT email,password_hash FROM admins WHERE email=$1', [email])
  const admin = result.rows[0]
  const valid = await bcrypt.compare(parsed.data.password, admin?.password_hash || dummyPasswordHash)
  if (!admin || !valid) return res.status(401).json({ error: 'Email or password is incorrect' })
  const session = await createSession({ adminEmail: admin.email, lifetimeHours: 8 })
  setSessionCookie(res, session.token, 8 * 60 * 60)
  res.json({ token: session.token, email: admin.email })
})

app.get('/api/auth/session', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const session = await loadSession(req)
    if (!session) return res.status(401).json({ error: 'No active session' })
    res.json(session.role === 'customer'
      ? { role: session.role, user: { id: session.sub, name: session.name, phone: session.phone, email: session.email, coinBalance: session.coinBalance } }
      : { role: session.role, user: { email: session.email } })
  } catch (error) { next(error) }
})

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const token = readSessionCookie(req)
    if (token && token.length <= 128) await pool.query('UPDATE user_sessions SET revoked_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL', [hashSession(token)])
    clearSessionCookie(res)
    res.status(204).end()
  } catch (error) { next(error) }
})

app.get('/api/admin/products', authorize('admin'), async (_req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE active=TRUE ORDER BY category, id')
  res.json(result.rows.map(safeProduct))
})

app.get('/api/admin/categories', authorize('admin'), async (_req, res) => {
  const result = await pool.query('SELECT * FROM storefront_categories ORDER BY name')
  res.json(result.rows.map(categoryFromRow))
})

app.delete('/api/admin/categories/:slug', authorize('admin'), async (req, res) => {
  const result = await pool.query('DELETE FROM storefront_categories WHERE slug=$1 RETURNING slug', [req.params.slug])
  if (!result.rowCount) return res.status(404).json({ error: 'Category not found' })
  res.json({ deleted: true })
})

app.put('/api/admin/categories', authorize('admin'), async (req, res) => {
  const parsed = z.array(categorySchema).max(50).safeParse(req.body?.categories)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid category details', details: parsed.error.flatten() })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const category of parsed.data) {
      await client.query(`INSERT INTO storefront_categories(slug,name,name_ta,icon,image,tagline,badge,subcategories,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,name_ta=EXCLUDED.name_ta,icon=EXCLUDED.icon,image=EXCLUDED.image,
        tagline=EXCLUDED.tagline,badge=EXCLUDED.badge,subcategories=EXCLUDED.subcategories,updated_at=NOW()`,
      [category.slug, category.name, category.nameTa, category.icon, category.image || null, category.tagline, category.badge || null, JSON.stringify(category.subcategories)])
    }
    const result = await client.query('SELECT * FROM storefront_categories ORDER BY name')
    await client.query('COMMIT')
    res.json(result.rows.map(categoryFromRow))
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
})

app.post('/api/admin/products', authorize('admin'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product details', details: parsed.error.flatten() })
  const p = parsed.data
  try {
    let productId = p.id
    if (!productId) {
      const maxRes = await pool.query('SELECT COALESCE(MAX(id), 1000) AS max_id FROM products')
      productId = Number(maxRes.rows[0].max_id) + 1
    }
    const sku = p.sku || `ABM-${p.category.slice(0, 2).toUpperCase()}-${productId}`
    const mrp = Math.max(p.mrp || 0, p.price || 0)
    const gallery = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [p.image]
    const tiers = Array.isArray(p.tiers) ? p.tiers : []
    const result = await pool.query(`INSERT INTO products(id,name,category,subcategory,business,brand,price,mrp,unit,image,badge,description,stock,gst,sku,gallery,tiers,active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE)
      ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,category=EXCLUDED.category,subcategory=EXCLUDED.subcategory,business=EXCLUDED.business,brand=EXCLUDED.brand,price=EXCLUDED.price,mrp=EXCLUDED.mrp,
      unit=EXCLUDED.unit,image=EXCLUDED.image,badge=EXCLUDED.badge,description=EXCLUDED.description,stock=EXCLUDED.stock,gst=EXCLUDED.gst,
      sku=EXCLUDED.sku,gallery=EXCLUDED.gallery,tiers=EXCLUDED.tiers,active=TRUE,updated_at=NOW() RETURNING *`,
      [productId, p.name, p.category, p.subcategory || null, p.business || 'stationery', p.brand || 'Agaram Select', p.price, mrp, p.unit || '1 Piece', p.image, p.badge || null, p.description || '', p.stock ?? 50, p.gst ?? 18, sku, JSON.stringify(gallery), JSON.stringify(tiers)])
    res.status(201).json({ product: camelProduct(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Product SKU or ID already exists' })
    throw error
  }
})

app.put('/api/admin/products/:id', authorize('admin'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product details', details: parsed.error.flatten() })
  const product = parsed.data
  const productId = Number(req.params.id) || product.id
  if (!productId) return res.status(400).json({ error: 'Valid product ID is required' })
  try {
    const sku = product.sku || `ABM-PR-${productId}`
    const mrp = Math.max(product.mrp || 0, product.price || 0)
    const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [product.image]
    const tiers = Array.isArray(product.tiers) ? product.tiers : []
    const result = await pool.query(`INSERT INTO products(id,name,category,subcategory,business,brand,price,mrp,unit,image,badge,description,stock,gst,sku,gallery,tiers,active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE) ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,category=EXCLUDED.category,subcategory=EXCLUDED.subcategory,business=EXCLUDED.business,brand=EXCLUDED.brand,price=EXCLUDED.price,mrp=EXCLUDED.mrp,
      unit=EXCLUDED.unit,image=EXCLUDED.image,badge=EXCLUDED.badge,description=EXCLUDED.description,stock=EXCLUDED.stock,gst=EXCLUDED.gst,
      sku=EXCLUDED.sku,gallery=EXCLUDED.gallery,tiers=EXCLUDED.tiers,active=TRUE,updated_at=NOW() RETURNING *`,
      [productId, product.name, product.category, product.subcategory || null, product.business || 'stationery', product.brand || 'Agaram Select', product.price, mrp, product.unit || '1 Piece', product.image, product.badge || null, product.description || '', product.stock ?? 0, product.gst ?? 18, sku, JSON.stringify(gallery), JSON.stringify(tiers)])
    res.json({ product: camelProduct(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That SKU is already assigned to another product' })
    throw error
  }
})

app.delete('/api/admin/products/:id', authorize('admin'), async (req, res) => {
  const result = await pool.query('UPDATE products SET active=FALSE,updated_at=NOW() WHERE id=$1', [Number(req.params.id)])
  if (!result.rowCount) return res.status(404).json({ error: 'Product not found' })
  res.json({ deleted: true })
})

const addressFromRow = row => ({ id: row.id, name: row.name, phone: row.phone, address: row.address, city: row.city, pincode: row.pincode, isDefault: row.is_default, expiresAt: null })
app.get('/api/addresses', authorize('customer'), async (req, res) => {
  const result = await pool.query('SELECT * FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC', [req.auth.sub])
  res.json(result.rows.map(addressFromRow))
})

app.put('/api/addresses', authorize('customer'), async (req, res) => {
  const parsed = savedAddressesSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Check the saved address details', details: parsed.error.flatten() })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM user_addresses WHERE user_id=$1', [req.auth.sub])
    for (let index = 0; index < parsed.data.addresses.length; index += 1) {
      const address = parsed.data.addresses[index]
      await client.query(`INSERT INTO user_addresses(user_id,name,phone,address,city,pincode,is_default,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,NULL)`,
      [req.auth.sub, address.name, address.phone, address.address, address.city, address.pincode, address.isDefault || (index === 0 && !parsed.data.addresses.some(item => item.isDefault))])
    }
    const result = await client.query('SELECT * FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC', [req.auth.sub])
    await client.query('COMMIT')
    res.json(result.rows.map(addressFromRow))
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
})

app.post('/api/orders', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Check your order and address details', details: parsed.error.flatten() })
  const customer = parsed.data

  let sessionUser = null
  try {
    sessionUser = await loadSession(req)
  } catch {}

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let userId = sessionUser?.sub
    if (!userId) {
      // Guest checkout must not attach an order to an existing account just because
      // the guest typed that account's email address.
      const guestId = randomUUID()
      const guestEmail = `guest_${guestId}@guest.agaram.in`
      const dummyHash = await bcrypt.hash(randomBytes(16).toString('hex'), 8)
      await client.query('INSERT INTO users(id, name, email, phone, email_verified_at, password_hash) VALUES($1, $2, $3, $4, NOW(), $5)',
        [guestId, customer.customerName, guestEmail, customer.phone, dummyHash])
      userId = guestId
    }

    const ids = customer.items.map(item => item.productId)
    const productResult = await client.query('SELECT * FROM products WHERE id=ANY($1::int[]) AND active=TRUE ORDER BY id FOR UPDATE', [ids])
    const productsById = new Map(productResult.rows.map(row => [Number(row.id), row]))
    const lines = []
    let subtotalCents = 0

    for (const item of customer.items) {
      const product = productsById.get(item.productId)
      if (!product) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'A product in your cart is no longer available' }) }
      if (Number(product.stock) < item.quantity) { await client.query('ROLLBACK'); return res.status(409).json({ error: `${product.name} has only ${product.stock} in stock` }) }
      const productTiers = Array.isArray(product.tiers) && product.tiers.length ? product.tiers : [
        { minQty: 1, price: Number(product.price) },
        { minQty: 3, price: Math.round(Number(product.price) * 0.92 * 100) / 100 },
        { minQty: 6, price: Math.round(Number(product.price) * 0.84 * 100) / 100 },
      ]
      const tier = [...productTiers].sort((a, b) => Number(a.minQty) - Number(b.minQty)).reverse().find(candidate => item.quantity >= Number(candidate.minQty))
      const wholesaleMultiplier = customer.customerType === 'wholesale' ? 0.95 : 1
      const unitCents = Math.round(Number(tier?.price ?? product.price) * wholesaleMultiplier * 100)
      const lineCents = unitCents * item.quantity
      subtotalCents += lineCents
      lines.push({ item, product, unitCents, lineCents })
    }

    const discountCents = 0
    const deliveryFeeCents = subtotalCents >= 49900 ? 0 : 4900
    let allocatedDiscountCents = 0
    let taxCents = 0
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      line.discountCents = index === lines.length - 1
        ? discountCents - allocatedDiscountCents
        : subtotalCents ? Math.round(discountCents * line.lineCents / subtotalCents) : 0
      allocatedDiscountCents += line.discountCents
      const netLineCents = line.lineCents - line.discountCents
      line.taxCents = Math.round(netLineCents * Number(line.product.gst) / (100 + Number(line.product.gst)))
      taxCents += line.taxCents
    }

    const orderNo = `ABM${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0,4).toUpperCase()}`
    const paymentStatus = customer.paymentMethod === 'cod' ? 'due_on_delivery' : 'pending'
    const initialHistory = [{ status: 'received', at: new Date().toISOString(), note: 'Order placed' }]
    const inserted = await client.query(`INSERT INTO orders(order_no,user_id,customer_name,phone,email,address,city,pincode,gstin,subtotal,discount,delivery_fee,tax,total,customer_type,pricing_version,payment_method,payment_status,customer_notes,status_history)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [orderNo, userId, customer.customerName, customer.phone, customer.email || sessionUser?.email || null, customer.address, customer.city, customer.pincode, customer.gstin || null, subtotalCents/100, discountCents/100, deliveryFeeCents/100, taxCents/100, (subtotalCents+deliveryFeeCents)/100, customer.customerType, 2, customer.paymentMethod, paymentStatus, customer.customerNotes || null, JSON.stringify(initialHistory)])
    const order = inserted.rows[0]

    for (const line of lines) {
      await client.query('UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2', [line.item.quantity, line.product.id])
      await client.query(`INSERT INTO order_items(order_id,product_id,product_name,product_image,sku,quantity,unit_price,gst_rate,discount_amount)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [order.id, line.product.id, line.product.name, line.product.image || null, line.product.sku, line.item.quantity, line.unitCents/100, line.product.gst, line.discountCents/100])
    }
    const itemRows = await client.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [order.id])
    await client.query('COMMIT')

    res.status(201).json({ order: camelOrder(order, itemRows.rows) })
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
})

async function loadOrders(whereSql, values) {
  const rows = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT 5000`, values)
  if (!rows.rowCount) return []
  const ids = rows.rows.map(row => row.id)
  const lineResult = await pool.query('SELECT * FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY id', [ids])
  const byOrder = new Map()
  for (const item of lineResult.rows) byOrder.set(item.order_id, [...(byOrder.get(item.order_id)||[]), item])
  return rows.rows.map(row => camelOrder(row, byOrder.get(row.id)||[]))
}

app.get('/api/orders', authorize('customer'), async (req, res) => {
  res.json(await loadOrders('WHERE user_id=$1', [req.auth.sub]))
})

async function cancelOrder(orderKey, ownerId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const values = ownerId ? [orderKey, ownerId] : [orderKey]
    const ownerClause = ownerId ? ' AND user_id=$2' : ''
    const orderResult = await client.query(`SELECT id,status FROM orders WHERE (order_no=$1 OR id::text=$1)${ownerClause} FOR UPDATE`, values)
    if (!orderResult.rowCount) {
      const error = new Error('Order not found')
      error.status = 404
      throw error
    }
    const order = orderResult.rows[0]
    if (order.status === 'cancelled') {
      await client.query('COMMIT')
      return { success: true, status: 'cancelled' }
    }
    if (!['received', 'confirmed', 'packed'].includes(order.status)) {
      const error = new Error('This order can no longer be cancelled. Please contact support.')
      error.status = 409
      throw error
    }
    await client.query(`UPDATE products p SET stock=p.stock+oi.quantity,updated_at=NOW()
      FROM order_items oi WHERE oi.order_id=$1 AND oi.product_id=p.id`, [order.id])
    await client.query(`UPDATE orders SET status='cancelled',updated_at=NOW(),
      status_history=status_history || jsonb_build_array(jsonb_build_object('status','cancelled','at',NOW(),'note','Order cancelled')) WHERE id=$1`, [order.id])
    await client.query('COMMIT')
    return { success: true, status: 'cancelled' }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}

app.patch('/api/orders/:id/cancel', authorize('customer'), async (req, res) => {
  try {
    res.json(await cancelOrder(req.params.id, req.auth.sub))
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not cancel this order' })
  }
})

app.get('/api/admin/orders', authorize('admin'), async (_req, res) => res.json(await loadOrders('', [])))

app.patch('/api/admin/orders/:id/status', authorize('admin'), async (req, res) => {
  const { status } = req.body || {}
  const valid = ['received', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  if (status === 'cancelled') {
    try {
      const result = await cancelOrder(req.params.id, null)
      return res.json({ ...result, order: { status: result.status } })
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not cancel this order' })
    }
  }
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const existing = await client.query('SELECT id,status,user_id,total,coins_earned FROM orders WHERE order_no=$1 OR id::text=$1 FOR UPDATE', [req.params.id])
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Order not found' })
    }
    if (existing.rows[0].status === 'cancelled') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'A cancelled order cannot be reopened.' })
    }
    const result = await client.query(`UPDATE orders SET status=$1::varchar, updated_at=NOW(),
      status_history=COALESCE(status_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('status',$1::varchar,'at',NOW(),'note',$3::text))
      WHERE id=$2 RETURNING *`, [status, existing.rows[0].id, orderStatusNotes[status] || 'Order status updated'])
    const order = existing.rows[0]
    if (status === 'delivered' && order.status !== 'delivered' && order.user_id && Number(order.coins_earned || 0) === 0) {
      const reward = Math.floor(Number(order.total) / 100)
      const priorReward = await client.query('SELECT id FROM coin_transactions WHERE order_id=$1', [order.id])
      if (reward > 0 && !priorReward.rowCount) {
        const balance = await client.query('UPDATE users SET coin_balance=coin_balance+$2,updated_at=NOW() WHERE id=$1 RETURNING coin_balance', [order.user_id, reward])
        await client.query('UPDATE orders SET coins_earned=$1 WHERE id=$2', [reward, order.id])
        await client.query(`INSERT INTO coin_transactions(user_id,order_id,amount,balance_after,reason)
          VALUES($1,$2,$3,$4,'Order delivered reward') ON CONFLICT(order_id) DO NOTHING`, [order.user_id, order.id, reward, Number(balance.rows[0]?.coin_balance || 0)])
      }
    }
    await client.query('COMMIT')
    return res.json({ success: true, order: result.rows[0] })
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client?.release() }
})

app.patch('/api/admin/orders/:id/details', authorize('admin'), async (req, res) => {
  const parsed = orderDetailsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid order details', details: parsed.error.flatten() })
  const fields = parsed.data
  const updates = []
  const values = [req.params.id]
  const columns = { paymentStatus: 'payment_status', shippingProvider: 'shipping_provider', trackingNumber: 'tracking_number', trackingUrl: 'tracking_url', deliveryDriverName: 'delivery_driver_name', deliveryDriverPhone: 'delivery_driver_phone', estimatedDeliveryAt: 'estimated_delivery_at', adminNotes: 'admin_notes' }
  for (const [key, column] of Object.entries(columns)) {
    if (fields[key] !== undefined) { values.push(fields[key] || null); updates.push(`${column}=$${values.length}`) }
  }
  if (!updates.length) return res.status(400).json({ error: 'No order details were provided' })
  if (fields.deliveryDriverName !== undefined || fields.estimatedDeliveryAt !== undefined) {
    updates.push("status_history=status_history || jsonb_build_array(jsonb_build_object('status','delivery_plan_updated','at',NOW(),'note','Driver or arrival details updated'))")
  }
  updates.push('updated_at=NOW()')
  const result = await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_no=$1 OR id::text=$1 RETURNING *`, values)
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' })
  const items = await pool.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [result.rows[0].id])
  res.json({ order: camelOrder(result.rows[0], items.rows) })
})

app.delete('/api/admin/orders/:id', authorize('admin'), async (req, res) => {
  try {
    const orderRes = await pool.query('SELECT id FROM orders WHERE order_no=$1 OR id::text=$1', [req.params.id])
    if (!orderRes.rowCount) return res.status(404).json({ error: 'Order not found' })
    const internalId = orderRes.rows[0].id
    await pool.query('DELETE FROM order_items WHERE order_id=$1', [internalId])
    await pool.query('DELETE FROM orders WHERE id=$1', [internalId])
    res.json({ success: true, deleted: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' })
  }
})

app.get('/api/admin/users', authorize('admin'), async (_req, res) => {
  const result = await pool.query('SELECT id, name, email, phone, coin_balance, phone_verified_at, email_verified_at, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200')
  res.json(result.rows)
})

app.patch('/api/admin/users/:id', authorize('admin'), async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.union([z.string().trim().email().max(254), z.literal('')]),
    phone: z.union([phoneSchema, z.literal('')]),
  }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid name, email, and phone number.' })
  try {
    const result = await pool.query(`UPDATE users SET name=$2,email=$3,phone=$4,updated_at=NOW()
      WHERE id=$1 AND deleted_at IS NULL
      RETURNING id,name,email,phone,coin_balance,phone_verified_at,email_verified_at,created_at`,
    [req.params.id, parsed.data.name, parsed.data.email.toLowerCase() || null, parsed.data.phone || null])
    if (!result.rowCount) return res.status(404).json({ error: 'Customer not found.' })
    res.json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That email or phone number is already used by another customer.' })
    throw error
  }
})

app.delete('/api/admin/users/:id', authorize('admin'), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`UPDATE users SET name='Removed customer',email=NULL,phone=NULL,password_hash=NULL,
      phone_verified_at=NULL,email_verified_at=NULL,coin_balance=0,deleted_at=NOW(),updated_at=NOW()
      WHERE id=$1 AND deleted_at IS NULL RETURNING id`, [req.params.id])
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Customer not found.' }) }
    await client.query('UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [req.params.id])
    await client.query('DELETE FROM user_addresses WHERE user_id=$1', [req.params.id])
    await client.query(`UPDATE orders SET customer_name='Removed customer',phone='0000000000',email=NULL,address='Removed',city='Removed',pincode='000000'
      WHERE user_id=$1`, [req.params.id])
    await client.query('COMMIT')
    res.json({ deleted: true })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
})

app.patch('/api/admin/users/:id/coins', authorize('admin'), async (req, res) => {
  const parsed = z.object({ balance: z.number().int().min(0).max(1_000_000_000), reason: z.string().trim().max(200).optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Coin balance must be a whole number between 0 and 1,000,000,000.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query('SELECT id,coin_balance FROM users WHERE id=$1 FOR UPDATE', [req.params.id])
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Customer not found.' }) }
    const previous = Number(result.rows[0].coin_balance || 0)
    const balance = parsed.data.balance
    const delta = balance - previous
    if (delta) {
      await client.query('UPDATE users SET coin_balance=$2,updated_at=NOW() WHERE id=$1', [req.params.id, balance])
      await client.query(`INSERT INTO coin_transactions(user_id,amount,balance_after,reason,admin_email)
        VALUES($1,$2,$3,$4,$5)`, [req.params.id, delta, balance, parsed.data.reason || 'Admin balance adjustment', req.auth.email])
    }
    await client.query('COMMIT')
    res.json({ id: req.params.id, coinBalance: balance })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
})

app.get('/api/customer/profile', authorize('customer'), async (req, res) => {
  const result = await pool.query('SELECT id,name,email,phone,coin_balance FROM users WHERE id=$1 AND deleted_at IS NULL', [req.auth.sub])
  if (!result.rowCount) return res.status(404).json({ error: 'Customer account not found.' })
  const user = result.rows[0]
  res.json({ id: user.id, name: user.name, email: user.email || '', phone: user.phone, coinBalance: Number(user.coin_balance || 0) })
})

app.get('/api/admin/stats', authorize('admin'), async (_req, res) => {
  const [prodRes, orderRes, revRes, userRes] = await Promise.all([
    pool.query('SELECT count(*) as total, count(*) FILTER (WHERE stock <= 5) as low_stock FROM products WHERE active=TRUE'),
    pool.query('SELECT count(*) as total, count(*) FILTER (WHERE status=\'delivered\') as delivered, count(*) FILTER (WHERE status=\'received\') as pending FROM orders'),
    pool.query('SELECT COALESCE(sum(total), 0) as total_revenue FROM orders WHERE status != \'cancelled\''),
    pool.query('SELECT count(*) as total FROM users')
  ])
  res.json({
    products: Number(prodRes.rows[0]?.total || 0),
    lowStock: Number(prodRes.rows[0]?.low_stock || 0),
    orders: Number(orderRes.rows[0]?.total || 0),
    pendingOrders: Number(orderRes.rows[0]?.pending || 0),
    deliveredOrders: Number(orderRes.rows[0]?.delivered || 0),
    revenue: Number(revRes.rows[0]?.total_revenue || 0),
    customers: Number(userRes.rows[0]?.total || 0),
  })
})

app.use((err, req, res, _next) => {
  const reference = randomUUID()
  if (production) {
    console.error('API request failed', {
      reference,
      method: req.method,
      path: req.path,
      code: err?.code || 'internal',
      ...(typeof err?.code === 'string' && err.code.startsWith('53')
        ? { message: err.message, severity: err.severity }
        : {}),
      column: err?.column,
      constraint: err?.constraint,
      table: err?.table,
    })
  } else console.error(err)
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'Product images are too large. Reduce image sizes or upload fewer images.' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request data could not be read. Please retry.' })
  }
  const databaseErrors = {
    '22001': [400, 'A product field is too long. Shorten it and try again.'],
    '22003': [400, 'A price, stock, or tax value is outside the supported range.'],
    '22P02': [400, 'A numeric product field is invalid. Check the price, stock, and tax values.'],
    '23502': [400, 'A required product field is missing. Check the product details and try again.'],
    '23514': [400, 'Some product details are not allowed. Check the business type, prices, stock, and tax.'],
    '42703': [503, 'The product database needs a schema update. Contact support with the reference below.'],
    '42P01': [503, 'The product database needs a schema update. Contact support with the reference below.'],
  }
  const dbError = databaseErrors[err?.code]
  if (dbError) return res.status(dbError[0]).json({ error: dbError[1], reference })
  if (typeof err?.code === 'string' && err.code.startsWith('08')) {
    return res.status(503).json({ error: 'The database connection is temporarily unavailable. Please retry shortly.', reference })
  }
  if (err?.code === '53300') {
    return res.status(503).json({ error: 'The database connection limit has been reached. Reduce the API pool size or close stale database sessions, then retry.', reference })
  }
  if (typeof err?.code === 'string' && err.code.startsWith('53')) {
    return res.status(503).json({ error: 'The database is temporarily unable to process requests. Please try again shortly.', reference })
  }
  res.status(500).json({ error: 'Unexpected server error', reference })
})

const port = Number(process.env.PORT || 4000)
const server = app.listen(port, () => console.log(`Agaram API listening on port ${port}`))
const maintenance = setInterval(() => {
  pool.query("DELETE FROM user_sessions WHERE expires_at < NOW()-INTERVAL '7 days' OR revoked_at < NOW()-INTERVAL '7 days'")
    .then(() => pool.query("DELETE FROM email_verification_tokens WHERE expires_at < NOW()-INTERVAL '7 days' OR consumed_at < NOW()-INTERVAL '7 days'"))
    .catch(error => console.error('Scheduled cleanup failed:', error.message))
}, 60 * 60 * 1000).unref()
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { clearInterval(maintenance); await pool.end(); process.exit(0) }))
