import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Zap, Filter, ArrowRight, ShieldCheck, Tag } from 'lucide-react'
import { Wholesale3DBanner } from '../components/Wholesale3DBanner'
import { ClickableDealsBanner } from '../components/ClickableDealsBanner'
import { MiniRoundCategories } from '../components/MiniRoundCategories'
import { ProductCard } from '../components/ProductCard'
import { ProductPreviewModal } from '../components/ProductPreviewModal'
import { categories as defaultCategories, money, unitPrice, type Product, type StationeryCategory } from '../data/products'

interface HomePageProps {
  products: Product[]
  categories?: StationeryCategory[]
  cart: { productId: number; quantity: number }[]
  wishlist: number[]
  onAddToCart: (id: number, qty?: number) => void
  onUpdateCartQty: (id: number, qty: number) => void
  onToggleWishlist: (id: number) => void
  onOpenTracking: () => void
  customerType: 'retail' | 'wholesale'
  setCustomerType: (type: 'retail' | 'wholesale') => void
  lang?: 'en' | 'ta'
}

export function HomePage({
  products,
  categories = defaultCategories,
  cart,
  wishlist,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
  onOpenTracking,
  customerType,
  setCustomerType,
  lang = 'en'
}: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [comboMode, setComboMode] = useState(false)
  const [comboItems, setComboItems] = useState<Record<number, number>>({})
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'discount'>('popular')
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const catalogRef = useRef<HTMLDivElement>(null)

  // Map of cart quantities
  const cartQtyMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of cart) map.set(item.productId, item.quantity)
    return map
  }, [cart])

  // Scroll to catalog section when 3D Wholesale banner is clicked
  const handleScrollToCatalog = () => {
    setCustomerType('wholesale')
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory
      const matchesSubcategory = selectedSubcategory === 'all' || (p as any).subcategory === selectedSubcategory
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand
      return matchesCat && matchesSubcategory && matchesBrand
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'discount') {
        const discA = a.mrp ? (a.mrp - a.price) / a.mrp : 0
        const discB = b.mrp ? (b.mrp - b.price) / b.mrp : 0
        return discB - discA
      }
      return (b.reviewCount || 0) - (a.reviewCount || 0)
    })
  }, [products, selectedCategory, selectedSubcategory, selectedBrand, sortBy])

  const brands = useMemo(() => [...new Set(products.map(product => product.brand).filter(Boolean))].sort(), [products])
  const selectedCombo = useMemo(() => Object.entries(comboItems)
    .map(([id, quantity]) => ({ product: products.find(product => product.id === Number(id)), quantity }))
    .filter((item): item is { product: Product; quantity: number } => Boolean(item.product)), [comboItems, products])
  const comboTotal = selectedCombo.reduce((sum, item) => sum + unitPrice(item.product, item.quantity, customerType) * item.quantity, 0)
  const setComboQuantity = (productId: number, quantity: number) => setComboItems(current => {
    const next = { ...current }
    if (quantity <= 0) delete next[productId]
    else next[productId] = quantity
    return next
  })

  return (
    <div className="home-page-container container" style={{ paddingBottom: '30px' }}>
      {/* The wholesale catalogue is the first thing customers see. */}
      <Wholesale3DBanner
        onExploreCatalog={handleScrollToCatalog}
        totalProducts={products.length}
        lang={lang}
      />

      {/* 1. INSTAMART LIVE DELIVERY TRACKING PILL BANNER */}
      <div
        className="instamart-live-tracking-pill"
        onClick={onOpenTracking}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '10px 16px',
          margin: '12px 0 16px',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(22, 101, 52, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontSize: '18px' }}>
            🛵
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900 }}>
              {lang === 'ta' ? 'உங்கள் டெலிவரியைக் கண்காணிக்கவும்' : 'Track your delivery'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
              {lang === 'ta' ? 'உங்கள் ஆர்டரில் நேரலை GPS-ஐ திறக்கவும்' : 'Open your shipped order to see the driver’s shared GPS location'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 900, background: '#ffffff', color: '#15803d', padding: '4px 12px', borderRadius: '20px' }}>
          {lang === 'ta' ? 'ஆர்டர்கள்' : 'My orders'} ➔
        </span>
      </div>

      {/* 3. WORKING CLICKABLE DEALS BANNER (Image 3) */}
      <ClickableDealsBanner lang={lang} />

      {/* 4. CIRCULAR MINI ROUND CATEGORIES CAROUSEL (Image 5) */}
      <MiniRoundCategories
        categories={categories}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={(cat, sub) => {
          setSelectedCategory(cat)
          setSelectedSubcategory(sub || 'all')
        }}
        lang={lang}
      />

      {/* 5. COMPLETE STATIONERY & BUSINESS CATALOG (40) */}
      <div ref={catalogRef} id="complete-catalog" style={{ marginTop: '20px' }}>
        {/* Catalog Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Complete Stationery & Business Catalog ({filteredProducts.length})</span>
              {customerType === 'wholesale' && (
                <span style={{ fontSize: '11px', fontWeight: 900, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>
                  WHOLESALE SLABS ACTIVE
                </span>
              )}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '2px' }}>
              Browse all supplies with instant stock availability and tiered discount slabs
            </div>
          </div>

          {/* Wholesale catalog filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setComboMode(value => !value)} style={{ minHeight: 40, fontWeight: 800 }}>
              {comboMode ? 'Close combo builder' : 'Build a shop combo'}
            </button>
            <select aria-label="Filter by sector and category" value={selectedCategory} onChange={event => { setSelectedCategory(event.target.value); setSelectedSubcategory('all') }} style={{ fontSize: '12px', fontWeight: 800, padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', minWidth: 200 }}>
              <option value="all">All Sectors &amp; Categories</option>
              {categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
            </select>
            <select aria-label="Filter by brand" value={selectedBrand} onChange={event => setSelectedBrand(event.target.value)} style={{ fontSize: '12px', fontWeight: 800, padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', minWidth: 150 }}>
              <option value="all">All Brands</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="popular">Popularity / Ratings</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Biggest Discount %</option>
            </select>
          </div>
        </div>

        {comboMode && <section aria-label="Custom shop combo" style={{ margin: '14px 0', padding: '16px', border: '1px solid #bfdbfe', borderRadius: 16, background: 'linear-gradient(135deg, #eff6ff, #fff)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div><h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Build your own shop combo</h3><p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12 }}>Pick products from the catalog, set quantities, and add the full list to your cart. Quantity slab prices apply per product.</p></div>
            <b style={{ color: '#0f172a' }}>{selectedCombo.reduce((sum, item) => sum + item.quantity, 0)} units · Est. items subtotal {money(comboTotal)}</b>
          </div>
          {selectedCombo.length === 0 ? <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: 12 }}>Select “Add to combo” on any product below to start your list.</p> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {selectedCombo.map(({ product, quantity }) => <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 10, background: '#fff', border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 12, fontWeight: 800, flex: 1 }}>{product.name}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{money(unitPrice(product, quantity, customerType))} / unit</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => setComboQuantity(product.id, quantity - 1)} style={{ width: 44, height: 44, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>−</button>
                <b style={{ minWidth: 22, textAlign: 'center' }}>{quantity}</b>
                <button type="button" aria-label={`Add one ${product.name}`} onClick={() => setComboQuantity(product.id, quantity + 1)} style={{ width: 44, height: 44, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>+</button>
                <button type="button" onClick={() => setComboQuantity(product.id, 0)} style={{ minHeight: 44, padding: '0 10px', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, background: '#fff' }}>Remove</button>
              </div>
            </div>)}
            <button type="button" className="btn btn-primary" style={{ minHeight: 46, justifySelf: 'start' }} onClick={() => { selectedCombo.forEach(({ product, quantity }) => onAddToCart(product.id, quantity)); setComboItems({}); setComboMode(false) }}>Add combo to cart</button>
          </div>}
        </section>}

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
            <h3 style={{ fontSize: '17px', fontWeight: 800 }}>No products found</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>Try switching category or clearing filters</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedSubcategory('all'); }}
              style={{ background: '#e03a1f', color: '#fff', padding: '8px 18px', borderRadius: '10px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div
            className="product-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '14px',
            }}
          >
            {filteredProducts.map(product => (
              <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ProductCard
                  product={product}
                  cartQty={cartQtyMap.get(product.id) || 0}
                  isWishlisted={wishlist.includes(product.id)}
                  onAddToCart={onAddToCart}
                  onUpdateCartQty={onUpdateCartQty}
                  onToggleWishlist={onToggleWishlist}
                  onQuickPreview={prod => setPreviewProduct(prod)}
                  customerType={customerType}
                  lang={lang}
                />
                {comboMode && <button type="button" className="btn btn-secondary" style={{ minHeight: 44, fontWeight: 800, borderColor: comboItems[product.id] ? '#93c5fd' : undefined }} onClick={() => setComboQuantity(product.id, (comboItems[product.id] || 0) + 1)}>{comboItems[product.id] ? `Add another (${comboItems[product.id]})` : 'Add to combo'}</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK PRODUCT PREVIEW MODAL (Requirement 2 & 4) */}
      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onAddToCart={id => onAddToCart(id, 1)}
        customerType={customerType}
        lang={lang}
      />
    </div>
  )
}
