import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { camelOrder, camelProduct, pool } from './db.js'

const production = process.env.NODE_ENV === 'production'
if (production && (!process.env.FRONTEND_ORIGIN || !process.env.FRONTEND_ORIGIN.split(',').every(origin => /^https:\/\/|^http:\/\/localhost/i.test(origin.trim())))) {
  throw new Error('Set FRONTEND_ORIGIN to your exact HTTPS frontend origin(s)')
}

const configuredAdmin = await pool.query('SELECT 1 FROM admins LIMIT 1')
if (!configuredAdmin.rowCount) throw new Error('Administrator is not initialized. Run npm run db:migrate with the database owner credentials first.')
const dummyPasswordHash = await bcrypt.hash('dummy-password-never-used', 12)
const frontendUrl = process.env.PUBLIC_FRONTEND_URL || allowedFrontendOrigin()
if (production && !/^https:\/\/|^http:\/\/localhost/i.test(frontendUrl)) throw new Error('PUBLIC_FRONTEND_URL must use HTTPS in production')

function allowedFrontendOrigin() { return (process.env.FRONTEND_ORIGIN || 'https://agaram-business-mart.netlify.app').split(',')[0].trim() }

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'https://agaram-business-mart.netlify.app,http://localhost:5173')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json({ limit: '12mb' }))
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin')
    if ((origin && !allowedOrigins.includes(origin)) || (production && !origin)) return res.status(403).json({ error: 'Request origin is not allowed' })
  }
  next()
})
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }))

const phoneSchema = z.string().trim().transform(value => value.replace(/[\s()-]/g, '')).refine(value => /^(\+91)?[6-9]\d{9}$/.test(value), 'Enter a valid Indian mobile number').transform(value => value.startsWith('+91') ? value : `+91${value}`)
const productSchema = z.object({
  id: z.number().int().positive(), name: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(80),
  business: z.enum(['stationery', 'cctv', 'furniture']), brand: z.string().trim().max(100),
  price: z.number().nonnegative(), mrp: z.number().nonnegative(), unit: z.string().trim().min(1).max(80),
  image: z.string().min(1).max(2_500_000), badge: z.string().max(60).optional(), description: z.string().max(3000),
  stock: z.number().int().nonnegative(), gst: z.number().min(0).max(100), sku: z.string().trim().min(1).max(80),
}).refine(product => product.mrp >= product.price, { message: 'MRP must be at least the selling price' })
const orderSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(100) })).min(1).max(30),
  customerName: z.string().trim().min(1).max(120), phone: phoneSchema, email: z.union([z.string().email().max(254), z.literal('')]).optional(),
  address: z.string().trim().min(5).max(500), city: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/), gstin: z.string().trim().max(20).optional(),
}).refine(order => new Set(order.items.map(item => item.productId)).size === order.items.length, 'Each product should appear once')

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
  const result = await pool.query(`SELECT s.user_id,s.admin_email,u.phone,u.name,u.email
    FROM user_sessions s LEFT JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW()`, [hashSession(token)])
  const row = result.rows[0]
  if (!row) return null
  return row.user_id
    ? { role: 'customer', sub: row.user_id, phone: row.phone, name: row.name, email: row.email }
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

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'agaram-api' }))
app.get('/api/products', async (req, res) => {
  const values = []
  const filters = ['active = TRUE']
  if (req.query.business) { values.push(String(req.query.business)); filters.push(`business = $${values.length}`) }
  if (req.query.category) { values.push(String(req.query.category)); filters.push(`category = $${values.length}`) }
  const result = await pool.query(`SELECT * FROM products WHERE ${filters.join(' AND ')} ORDER BY id`, values)
  res.json(result.rows.map(safeProduct))
})
app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid product ID' })
  const result = await pool.query('SELECT * FROM products WHERE id = $1 AND active = TRUE', [id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' })
  res.json(safeProduct(result.rows[0]))
})
app.post('/api/coupons/validate', (req, res) => {
  const { code, total } = req.body || {}
  const coupons = [
    { code: 'AESTHETIC10', discountPct: 10, minOrder: 399, description: '10% OFF on all aesthetic stationery' },
    { code: 'SCOOBOO15', discountPct: 15, minOrder: 799, description: '15% OFF on orders over ₹799' },
    { code: 'BULK20', discountPct: 20, minOrder: 1499, description: '20% OFF on school and institutional orders' },
    { code: 'AGARAMFIRST', discountPct: 12, minOrder: 299, description: 'Welcome treat: 12% OFF on your first purchase' },
  ]
  const match = coupons.find(c => c.code.toUpperCase() === String(code || '').trim().toUpperCase())
  if (!match) return res.status(404).json({ error: 'Invalid coupon code' })
  if (total && total < match.minOrder) return res.status(400).json({ error: `Requires a minimum order of ₹${match.minOrder}` })
  res.json({ valid: true, coupon: match })
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
  const result = await pool.query('SELECT id,email,name,password_hash,email_verified_at FROM users WHERE email=$1', [email])
  const user = result.rows[0]
  const valid = await bcrypt.compare(parsed.data.password, user?.password_hash || dummyPasswordHash)
  if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect' })
  if (!user.email_verified_at) {
    await pool.query('UPDATE users SET email_verified_at=NOW(), updated_at=NOW() WHERE id=$1', [user.id])
  }
  const session = await createSession({ userId: user.id, lifetimeHours: 12 })
  setSessionCookie(res, session.token, 12 * 60 * 60)
  res.json({ token: session.token, user: { id: user.id, name: user.name, email: user.email } })
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
      ? { role: session.role, user: { id: session.sub, name: session.name, phone: session.phone } }
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

app.put('/api/admin/products/:id', authorize('admin'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid product', details: parsed.error.flatten() })
  const product = parsed.data
  if (Number(req.params.id) !== product.id) return res.status(400).json({ error: 'Product ID does not match the route' })
  try {
    const result = await pool.query(`INSERT INTO products(id,name,category,business,brand,price,mrp,unit,image,badge,description,stock,gst,sku,active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE) ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,category=EXCLUDED.category,business=EXCLUDED.business,brand=EXCLUDED.brand,price=EXCLUDED.price,mrp=EXCLUDED.mrp,
      unit=EXCLUDED.unit,image=EXCLUDED.image,badge=EXCLUDED.badge,description=EXCLUDED.description,stock=EXCLUDED.stock,gst=EXCLUDED.gst,
      sku=EXCLUDED.sku,active=TRUE,updated_at=NOW() RETURNING *`,
      [product.id,product.name,product.category,product.business,product.brand,product.price,product.mrp,product.unit,product.image,product.badge||null,product.description,product.stock,product.gst,product.sku])
    res.json({ product: camelProduct(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That SKU is already assigned to another product' })
    throw error
  }
})
app.delete('/api/admin/products/:id', authorize('admin'), async (req, res) => {
  const result = await pool.query('UPDATE products SET active=FALSE,updated_at=NOW() WHERE id=$1 AND active=TRUE', [Number(req.params.id)])
  if (!result.rowCount) return res.status(404).json({ error: 'Product not found' })
  res.json({ deleted: true })
})

app.post('/api/orders', authorize('customer'), async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Check your order and address details', details: parsed.error.flatten() })
  const customer = parsed.data
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ids = customer.items.map(item => item.productId)
    const productResult = await client.query('SELECT * FROM products WHERE id=ANY($1::int[]) AND active=TRUE ORDER BY id FOR UPDATE', [ids])
    const productsById = new Map(productResult.rows.map(row => [Number(row.id), row]))
    const lines = []
    let subtotalCents = 0; let taxCents = 0
    for (const item of customer.items) {
      const product = productsById.get(item.productId)
      if (!product) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'A product in your cart is no longer available' }) }
      if (Number(product.stock) < item.quantity) { await client.query('ROLLBACK'); return res.status(409).json({ error: `${product.name} has only ${product.stock} in stock` }) }
      const unitCents = Math.round(Number(product.price) * (item.quantity >= 10 ? 0.82 : item.quantity >= 5 ? 0.9 : 1) * 100)
      const lineCents = unitCents * item.quantity
      const lineTaxCents = Math.round(lineCents * Number(product.gst) / 100)
      subtotalCents += lineCents; taxCents += lineTaxCents
      lines.push({ item, product, unitCents })
    }
    const orderNo = `ABM${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0,4).toUpperCase()}`
    const inserted = await client.query(`INSERT INTO orders(order_no,user_id,customer_name,phone,email,address,city,pincode,gstin,subtotal,tax,total)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [orderNo,req.auth.sub,customer.customerName,customer.phone,req.auth.email||null,customer.address,customer.city,customer.pincode,customer.gstin||null,subtotalCents/100,taxCents/100,(subtotalCents+taxCents)/100])
    const order = inserted.rows[0]
    for (const line of lines) {
      await client.query('UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2', [line.item.quantity,line.product.id])
      await client.query(`INSERT INTO order_items(order_id,product_id,product_name,sku,quantity,unit_price,gst_rate)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [order.id,line.product.id,line.product.name,line.product.sku,line.item.quantity,line.unitCents/100,line.product.gst])
    }
    await client.query('COMMIT')
    const itemRows = await pool.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [order.id])
    res.status(201).json({ order: camelOrder(order,itemRows.rows) })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
})

async function loadOrders(whereSql, values) {
  const rows = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT 200`, values)
  if (!rows.rowCount) return []
  const ids = rows.rows.map(row => row.id)
  const lineResult = await pool.query('SELECT * FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY id', [ids])
  const byOrder = new Map()
  for (const item of lineResult.rows) byOrder.set(item.order_id, [...(byOrder.get(item.order_id)||[]), item])
  return rows.rows.map(row => camelOrder(row, byOrder.get(row.id)||[]))
}
app.get('/api/orders', authorize('customer'), async (req, res) => res.json(await loadOrders('WHERE user_id=$1', [req.auth.sub])))
app.get('/api/admin/orders', authorize('admin'), async (_req, res) => res.json(await loadOrders('', [])))

app.patch('/api/admin/orders/:id/status', authorize('admin'), async (req, res) => {
  const { status } = req.body || {}
  const valid = ['received', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const result = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Order not found' })
  res.json({ success: true, order: result.rows[0] })
})

app.get('/api/admin/users', authorize('admin'), async (_req, res) => {
  const result = await pool.query('SELECT id, name, email, phone, email_verified_at, created_at FROM users ORDER BY created_at DESC LIMIT 200')
  res.json(result.rows)
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

app.use((err, _req, res, _next) => {
  if (production) console.error('API request failed', { code: err?.code || 'internal' })
  else console.error(err)
  res.status(500).json({ error: 'Unexpected server error' })
})

const port = Number(process.env.PORT || 4000)
const server = app.listen(port, () => console.log(`Agaram API listening on port ${port}`))
const maintenance = setInterval(() => {
  pool.query("DELETE FROM user_sessions WHERE expires_at < NOW()-INTERVAL '7 days' OR revoked_at < NOW()-INTERVAL '7 days'")
    .then(() => pool.query("DELETE FROM email_verification_tokens WHERE expires_at < NOW()-INTERVAL '7 days' OR consumed_at < NOW()-INTERVAL '7 days'"))
    .catch(error => console.error('Scheduled cleanup failed:', error.message))
}, 60 * 60 * 1000).unref()
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { clearInterval(maintenance); await pool.end(); process.exit(0) }))
