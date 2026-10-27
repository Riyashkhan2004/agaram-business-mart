import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { migrate, pool } from './db.js'

try {
  await migrate()
  console.log('Database schema is ready.')
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (Boolean(adminEmail) !== Boolean(adminPassword)) throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to initialize the admin account.')
  if (adminEmail && adminPassword) {
    const current = await pool.query('SELECT password_hash FROM admins WHERE email=$1', [adminEmail])
    if (!current.rowCount) {
      await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2)', [adminEmail, await bcrypt.hash(adminPassword, 12)])
      console.log(`Initialized administrator ${adminEmail}.`)
    } else if (!(await bcrypt.compare(adminPassword, current.rows[0].password_hash))) {
      await pool.query('UPDATE admins SET password_hash=$2 WHERE email=$1', [adminEmail, await bcrypt.hash(adminPassword, 12)])
      console.log(`Updated administrator password for ${adminEmail}.`)
    }
  }
  const adminCount = await pool.query('SELECT count(*)::int AS total FROM admins')
  if (!Number(adminCount.rows[0]?.total)) throw new Error('No admin account exists. Configure ADMIN_EMAIL and ADMIN_PASSWORD.')
} catch (err) {
  console.error('Database migration failed:', { code: err.code || 'internal', message: err.message })
  process.exitCode = 1
} finally {
  await pool.end().catch(() => {})
}
