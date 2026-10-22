import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Zap, Filter, ArrowRight, ShieldCheck, Tag } from 'lucide-react'
import { Wholesale3DBanner } from '../components/Wholesale3DBanner'
import { ClickableDealsBanner } from '../components/ClickableDealsBanner'
import { MiniRoundCategories } from '../components/MiniRoundCategories'
import { ProductCard } from '../components/ProductCard'
import { ProductPreviewModal } from '../components/ProductPreviewModal'
import { categories, money, type Product } from '../data/products'

interface HomePageProps {
  products: Product[]
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
      if (selectedCategory === 'all') return true
      const matchesCat = p.category === selectedCategory
      if (selectedSubcategory !== 'all' && (p as any).subcategory) {
        return matchesCat && (p as any).subcategory === selectedSubcategory
      }
      return matchesCat
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
  }, [products, selectedCategory, selectedSubcategory, sortBy])

  return (
    <div className="home-page-container container" style={{ paddingBottom: '30px' }}>
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
              {lang === 'ta' ? 'உடனடி விநியோகம் · 10 நிமிடத்தில் டெலிவரி' : 'Express Delivery · 10 Mins Dispatch to Doorstep'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
              {lang === 'ta' ? 'நேரலை வரைபடத்தில் ரைடரைக் கண்காணிக்க கிளிக் செய்க' : 'Tap to track live delivery partner on GPS Map'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 900, background: '#ffffff', color: '#15803d', padding: '4px 12px', borderRadius: '20px' }}>
          Track Map ➔
        </span>
      </div>

      {/* 2. BRIGHT 3D MOVABLE WHOLESALE HERO BANNER (Requirement 10) */}
      <Wholesale3DBanner
        onExploreCatalog={handleScrollToCatalog}
        totalProducts={products.length}
        lang={lang}
      />

      {/* 3. WORKING CLICKABLE DEALS BANNER (Image 3) */}
      <ClickableDealsBanner lang={lang} />

      {/* 4. CIRCULAR MINI ROUND CATEGORIES CAROUSEL (Image 5) */}
      <MiniRoundCategories
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

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-soft)', fontWeight: 700 }}>Sort by:</span>
            <select
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
              <ProductCard
                key={product.id}
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
            ))}
          </div>
        )}
      </div>

      {/* QUICK PRODUCT PREVIEW MODAL (Requirement 2 & 4) */}
      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onAddToCart={id => onAddToCart(id, 1)}
        lang={lang}
      />
    </div>
  )
}
