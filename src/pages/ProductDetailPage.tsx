import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, ShieldCheck, Heart, ShoppingBag, Truck, RotateCcw, Award, Check } from 'lucide-react'
import { money, type Product, getProductGallery } from '../data/products'

interface ProductDetailPageProps {
  products: Product[]
  cart: { productId: number; quantity: number }[]
  wishlist: number[]
  onAddToCart: (id: number, qty?: number) => void
  onToggleWishlist: (id: number) => void
  customerType: 'retail' | 'wholesale'
  lang?: 'en' | 'ta'
}

export function ProductDetailPage({
  products,
  cart,
  wishlist,
  onAddToCart,
  onToggleWishlist,
  customerType,
  lang = 'en'
}: ProductDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const product = products.find(p => p.id === Number(id))

  const gallery = product ? getProductGallery(product) : []
  const [selectedImg, setSelectedImg] = useState<string>('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (product) {
      setSelectedImg(product.image || gallery[0])
    }
  }, [product])

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>The product you are looking for is no longer available or was removed.</p>
        <Link to="/" style={{ background: '#e03a1f', color: '#fff', padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 800 }}>
          Back to Store
        </Link>
      </div>
    )
  }

  const isWishlisted = wishlist.includes(product.id)
  const price = customerType === 'wholesale' ? Math.round(product.price * 0.9) : product.price
  const discountPct = product.mrp > price ? Math.round(((product.mrp - price) / product.mrp) * 100) : 0

  const handleAddToCart = () => {
    onAddToCart(product.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="container" style={{ padding: '20px 0 60px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#0284c7', textDecoration: 'none' }}>Home</Link> /{' '}
        <Link to={`/category/${product.category}`} style={{ color: '#0284c7', textDecoration: 'none' }}>{product.category}</Link> /{' '}
        <span style={{ fontWeight: 800, color: '#0f172a' }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px' }}>
        {/* LEFT: 3-5 IMAGES MULTI-ANGLE GALLERY (Requirement 4) */}
        <div>
          {/* Main Large Image */}
          <div
            style={{
              width: '100%',
              height: '380px',
              borderRadius: '20px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              marginBottom: '14px',
              position: 'relative',
            }}
          >
            <img
              src={selectedImg || product.image}
              alt={product.name}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                padding: '16px',
                boxSizing: 'border-box',
                transition: 'transform 0.3s ease',
              }}
            />

            {/* Wishlist Button on Image */}
            <button
              onClick={() => onToggleWishlist(product.id)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                border: 'none',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
            >
              <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
            </button>
          </div>

          {/* 3 to 5 Clickable Thumbnails Row */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
            {gallery.map((imgUrl: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImg(imgUrl)}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  border: selectedImg === imgUrl ? '2.5px solid #e03a1f' : '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: selectedImg === imgUrl ? '0 4px 12px rgba(224, 58, 31, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <img src={imgUrl} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
            📸 Tap thumbnails to view different angles, packaging & detail shots
          </div>
        </div>

        {/* RIGHT: Product Info, Wholesale Tiers & Buy Box */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '8px' }}>
              {product.brand}
            </span>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
              SKU: {product.sku || `ABM-${product.id}`}
            </span>
            {product.badge && (
              <span style={{ fontSize: '11px', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '8px' }}>
                {product.badge}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.25 }}>
            {product.name}
          </h1>
          {product.nameTa && (
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '14px' }}>
              {product.nameTa}
            </div>
          )}

          {/* Rating Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#15803d', color: '#fff', fontSize: '11.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
              {product.rating || 4.8} <Star size={11} fill="#fff" />
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {product.reviewCount || 48} verified ratings · 100% Genuine
            </span>
          </div>

          {/* Price Box */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#15803d' }}>
                {money(price)}
              </span>
              {product.mrp > price && (
                <>
                  <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through' }}>
                    {money(product.mrp)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
                    {discountPct}% OFF
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Unit: <b>{product.unit}</b> · Inclusive of all taxes ({product.gst || 18}% GST)
            </div>

            {/* Wholesale Slabs Matrix */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', marginBottom: '6px' }}>
                📦 Quantity Wholesale Pricing Slabs:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11.5px', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b' }}>1-4 units</div>
                  <div style={{ fontWeight: 800 }}>{money(product.price)}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ color: '#047857', fontWeight: 700 }}>5-9 units</div>
                  <div style={{ fontWeight: 900, color: '#047857' }}>Save 10%</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ color: '#b45309', fontWeight: 700 }}>10+ units</div>
                  <div style={{ fontWeight: 900, color: '#b45309' }}>Save 18%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector & Add Button */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
              <button
                type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: '40px', height: '44px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 800 }}
              >
                -
              </button>
              <span style={{ width: '40px', textAlign: 'center', fontWeight: 900, fontSize: '15px' }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(q => q + 1)}
                style={{ width: '40px', height: '44px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 800 }}
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              style={{
                flex: 1,
                height: '46px',
                borderRadius: '14px',
                background: added ? '#10b981' : product.stock <= 0 ? '#94a3b8' : '#e03a1f',
                color: '#fff',
                fontWeight: 900,
                fontSize: '15px',
                border: 'none',
                cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(224, 58, 31, 0.3)',
              }}
            >
              {added ? (
                <>
                  <Check size={18} /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag size={18} /> Add to Cart · {money(price * qty)}
                </>
              )}
            </button>
          </div>

          {/* Description & Guarantee Highlights */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>Product Overview</h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              {product.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                <Truck size={20} color="#0284c7" style={{ margin: 'auto', marginBottom: '4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 800 }}>10-Min Dispatch</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                <ShieldCheck size={20} color="#15803d" style={{ margin: 'auto', marginBottom: '4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 800 }}>100% Genuine</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                <RotateCcw size={20} color="#7c3aed" style={{ margin: 'auto', marginBottom: '4px' }} />
                <div style={{ fontSize: '11px', fontWeight: 800 }}>Easy Returns</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
