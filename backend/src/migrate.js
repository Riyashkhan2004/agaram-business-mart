import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { migrate, pool } from './db.js'

try {
  await migrate()
  console.log('Database schema is ready.')
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  if (process.env.NODE_ENV === 'production' && (!adminEmail || adminPassword.length < 14)) {
    throw new Error('Database setup requires ADMIN_EMAIL and a 14+ character ADMIN_PASSWORD in production')
  }
  if (adminEmail && adminPassword) {
    const current = await pool.query('SELECT password_hash FROM admins WHERE email=$1', [adminEmail])
    if (!current.rowCount) {
      await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2)', [adminEmail, await bcrypt.hash(adminPassword, 12)])
      console.log(`Initialized administrator ${adminEmail}.`)
    } else if (!(await bcrypt.compare(adminPassword, current.rows[0].password_hash))) {
      await pool.query('UPDATE admins SET password_hash=$2 WHERE email=$1', [adminEmail, await bcrypt.hash(adminPassword, 12)])
      await pool.query('UPDATE user_sessions SET revoked_at=NOW() WHERE admin_email=$1 AND revoked_at IS NULL', [adminEmail])
      console.log(`Updated administrator password for ${adminEmail}; existing admin sessions were revoked.`)
    }
  }
} finally {
  await pool.end()
}
