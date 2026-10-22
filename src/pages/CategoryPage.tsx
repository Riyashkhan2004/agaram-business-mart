import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { ProductPreviewModal } from '../components/ProductPreviewModal'
import { categories, type CategorySlug, type Product } from '../data/products'

interface CategoryPageProps {
  products: Product[]
  cart: { productId: number; quantity: number }[]
  wishlist: number[]
  onAddToCart: (id: number, qty?: number) => void
  onUpdateCartQty: (id: number, qty: number) => void
  onToggleWishlist: (id: number) => void
  customerType: 'retail' | 'wholesale'
  lang?: 'en' | 'ta'
}

export function CategoryPage({
  products,
  cart,
  wishlist,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
  customerType,
  lang = 'en'
}: CategoryPageProps) {
  const { slug } = useParams<{ slug: string }>()
  const [selectedSub, setSelectedSub] = useState<string>('all')
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)

  const currentCategory = categories.find(c => c.slug === slug) || categories[0]

  const cartQtyMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of cart) map.set(item.productId, item.quantity)
    return map
  }, [cart])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.category !== currentCategory.slug) return false
      if (selectedSub !== 'all' && (p as any).subcategory) {
        return (p as any).subcategory === selectedSub
      }
      return true
    })
  }, [products, currentCategory.slug, selectedSub])

  return (
    <div className="category-page-container container" style={{ padding: '16px 0 40px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
        <Link to="/" style={{ color: '#0284c7', textDecoration: 'none' }}>Home</Link> / <span>Categories</span> / <b>{currentCategory.name}</b>
      </div>

      {/* Category Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '20px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>{currentCategory.icon}</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            {lang === 'ta' && currentCategory.nameTa ? currentCategory.nameTa : currentCategory.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, maxWidth: '600px' }}>
            {currentCategory.tagline}
          </p>
        </div>
        <div style={{ background: '#ffffff', padding: '10px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#e03a1f' }}>{filteredProducts.length}</div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Items Available</div>
        </div>
      </div>

      {/* SUB-CATEGORY MINI ROUNDS (Image 5) */}
      {currentCategory.subcategories && currentCategory.subcategories.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
            Filter by Sub-Category:
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
            }}
          >
            {currentCategory.subcategories.map(sub => {
              const isActive = selectedSub === sub.id
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSub(sub.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    width: '76px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: isActive ? '#f0fdf4' : '#ffffff',
                      border: isActive ? '2.5px solid #15803d' : '1.5px solid #e2e8f0',
                      boxShadow: isActive ? '0 4px 14px rgba(21, 128, 61, 0.25)' : '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '26px',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {sub.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isActive ? 900 : 700,
                      color: isActive ? '#15803d' : '#475569',
                      lineHeight: 1.2,
                    }}
                  >
                    {sub.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
          <h3>No products in this subcategory</h3>
          <button
            onClick={() => setSelectedSub('all')}
            style={{ marginTop: '12px', background: '#e03a1f', color: '#fff', padding: '8px 16px', borderRadius: '10px', border: 'none', fontWeight: 800, cursor: 'pointer' }}
          >
            Show All in {currentCategory.name}
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

      {/* Quick Preview Modal */}
      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onAddToCart={id => onAddToCart(id, 1)}
        lang={lang}
      />
    </div>
  )
}
