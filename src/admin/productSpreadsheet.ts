import { readSheet } from 'read-excel-file/browser'
import type { Product, StationeryCategory } from '../data/products'

export type SpreadsheetProduct = Omit<Product, 'id'>

const columns = [
  'SKU', 'Name', 'Category', 'Subcategory', 'Business', 'Brand', 'Price', 'MRP',
  'Unit', 'Stock', 'GST', 'Image URL', 'Additional Image URLs (separate with |)', 'Description', 'Badge',
]

const aliases: Record<string, string[]> = {
  sku: ['sku', 'stockkeepingunit'],
  name: ['name', 'productname', 'title'],
  category: ['category', 'categoryslug'],
  subcategory: ['subcategory', 'subcategoryid'],
  business: ['business', 'businesstype'],
  brand: ['brand'],
  price: ['price', 'sellingprice'],
  mrp: ['mrp', 'listprice'],
  unit: ['unit', 'pack', 'unitpack'],
  stock: ['stock', 'quantity', 'qty'],
  gst: ['gst', 'gstpercent', 'tax'],
  image: ['image', 'imageurl', 'primaryimage'],
  images: ['images', 'gallery', 'additionalimageurls'],
  description: ['description', 'details'],
  badge: ['badge', 'tag'],
}

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseCsv(text: string): unknown[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  row.push(cell)
  if (row.some(value => value.trim())) rows.push(row)
  return rows
}

function asText(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function asNumber(value: unknown, field: string, rowNumber: number, required = false): number | undefined {
  if ((value == null || asText(value) === '') && !required) return undefined
  const number = typeof value === 'number' ? value : Number(asText(value).replace(/[,₹%\s]/g, ''))
  if (!Number.isFinite(number)) throw new Error(`Row ${rowNumber}: ${field} must be a number.`)
  return number
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function downloadProductSpreadsheetTemplate() {
  const content = `${columns.map(csvCell).join(',')}\r\n`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'agaram-products-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export async function parseProductSpreadsheet(file: File, categories: StationeryCategory[], fallbackCategory: string) {
  const rows = file.name.toLowerCase().endsWith('.csv')
    ? parseCsv(await file.text())
    : await readSheet(file, 1)
  if (rows.length < 2) throw new Error('The file needs a header row and at least one product row.')

  const headers = rows[0].map(normalizeHeader)
  const indexes = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [
    field,
    headers.findIndex(header => names.includes(header)),
  ])) as Record<keyof typeof aliases, number>
  if (indexes.name < 0 || indexes.sku < 0 || indexes.price < 0 || indexes.mrp < 0) {
    throw new Error('Required columns: SKU, Name, Price, and MRP. Download the template to see the full format.')
  }

  const categoryByKey = new Map<string, string>()
  for (const category of categories) {
    categoryByKey.set(category.slug.toLowerCase(), category.slug)
    categoryByKey.set(category.name.trim().toLowerCase(), category.slug)
  }

  const products: SpreadsheetProduct[] = []
  const errors: string[] = []
  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2
    if (!cells.some(value => asText(value))) return
    try {
      const get = (field: keyof typeof aliases) => indexes[field] < 0 ? '' : cells[indexes[field]]
      const sku = asText(get('sku'))
      const name = asText(get('name'))
      const rawCategory = asText(get('category')) || fallbackCategory
      const category = categoryByKey.get(rawCategory.toLowerCase())
      const price = asNumber(get('price'), 'Price', rowNumber, true)!
      const mrp = asNumber(get('mrp'), 'MRP', rowNumber, true)!
      const stock = asNumber(get('stock'), 'Stock', rowNumber) ?? 50
      const gst = asNumber(get('gst'), 'GST', rowNumber) ?? 18
      const image = asText(get('image'))
      const imageList = asText(get('images')).split(/[|;]/).map(value => value.trim()).filter(Boolean)
      const gallery = [...new Set([image, ...imageList].filter(Boolean))].slice(0, 5)
      const businessRaw = asText(get('business')).toLowerCase()
      const business = ['stationery', 'cctv', 'furniture'].includes(businessRaw) ? businessRaw as Product['business'] : 'stationery'

      if (!sku) throw new Error(`Row ${rowNumber}: SKU is required.`)
      if (!name) throw new Error(`Row ${rowNumber}: Name is required.`)
      if (!category) throw new Error(`Row ${rowNumber}: Category “${rawCategory}” was not found in the store categories.`)
      if (price < 0 || mrp < price) throw new Error(`Row ${rowNumber}: MRP must be at least the non-negative selling price.`)
      if (!Number.isInteger(stock) || stock < 0) throw new Error(`Row ${rowNumber}: Stock must be a whole number of zero or more.`)
      if (gst < 0 || gst > 100) throw new Error(`Row ${rowNumber}: GST must be between 0 and 100.`)
      if (gallery.length === 0 || gallery.some(value => value.length > 3_000_000)) throw new Error(`Row ${rowNumber}: Add a valid image URL (up to five image URLs may be separated with |).`)

      products.push({
        sku, name, category: category as Product['category'],
        ...(asText(get('subcategory')) ? { subcategory: asText(get('subcategory')) } : {}),
        business, brand: asText(get('brand')) || 'Agaram Select',
        price, mrp, unit: asText(get('unit')) || '1 Piece',
        image: gallery[0], gallery, description: asText(get('description')) || 'Agaram Verified Premium Stationery',
        ...(asText(get('badge')) ? { badge: asText(get('badge')) } : {}),
        stock, gst, rating: 0, reviewCount: 0, tiers: [],
      })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: Could not read this product.`)
    }
  })
  if (products.length > 100) throw new Error('Import up to 100 products at a time.')
  return { products, errors }
}
