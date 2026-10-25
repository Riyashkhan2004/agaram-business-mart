import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { migrate, pool } from './db.js'

try {
  await migrate()
  console.log('Database schema is ready.')
  const defaultAdmins = [
    { email: (process.env.ADMIN_EMAIL || 'admin@agaram.in').trim().toLowerCase(), pass: process.env.ADMIN_PASSWORD || 'abm-123-786-abm-secure' },
    { email: 'admin@abm.in', pass: 'AdminABM123' },
  ]
  for (const adm of defaultAdmins) {
    if (!adm.email || !adm.pass) continue
    const current = await pool.query('SELECT password_hash FROM admins WHERE email=$1', [adm.email])
    if (!current.rowCount) {
      await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2)', [adm.email, await bcrypt.hash(adm.pass, 12)])
      console.log(`Initialized administrator ${adm.email}.`)
    } else if (!(await bcrypt.compare(adm.pass, current.rows[0].password_hash))) {
      await pool.query('UPDATE admins SET password_hash=$2 WHERE email=$1', [adm.email, await bcrypt.hash(adm.pass, 12)])
      console.log(`Updated administrator password for ${adm.email}.`)
    }
  }
} catch (err) {
  console.error('Migration note:', err.message)
} finally {
  await pool.end().catch(() => {})
}
