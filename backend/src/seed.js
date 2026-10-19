import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate, pool } from './db.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const products = JSON.parse(await fs.readFile(path.join(here, '..', 'data', 'products.json'), 'utf8'))
try {
  await migrate()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('TRUNCATE TABLE products CASCADE')
    const insert = `INSERT INTO products (id,name,category,business,brand,price,mrp,unit,image,badge,description,stock,gst,sku,active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE)`
    for (const p of products) await client.query(insert, [p.id,p.name,p.category,p.business,p.brand,p.price,p.mrp,p.unit,p.image,p.badge||null,p.description,p.stock,p.gst,p.sku])
    await client.query('COMMIT')
    console.log(`Seeded ${products.length} products.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
} finally { await pool.end() }
