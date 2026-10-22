import { useState } from 'react'
import { X, Star, ShoppingBag, ShieldCheck, Zap, Edit3, Check } from 'lucide-react'
import { money, type Product } from '../data/products'
import { getProductGallery } from '../data/products'

interface ProductPreviewModalProps {
  product: Product | null
  onClose: () => void
  onAddToCart?: (productId: number) => void
  onEdit?: (product: Product) => void
  isAdminView?: boolean
  lang?: 'en' | 'ta'
}

export function ProductPreviewModal({
  product,
  onClose,
  onAddToCart,
  onEdit,
  isAdminView = false,
  lang = 'en'
}: ProductPreviewModalProps) {
  if (!product) return null

  // Ensure 3 to 5 images for previewing
  const gallery = getProductGallery(product)
  const [selectedImg, setSelectedImg] = useState<string>(product.image || gallery[0])
  const [added, setAdded] = useState(false)

  const discountPct = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product.id)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    }
  }

  return (
    <div
      className="product-preview-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="product-preview-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          padding: '24px',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <X size={18} color="#475569" />
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Left: 3-5 Images Multi-Angle Gallery */}
          <div>
            <div
              style={{
                width: '100%',
                height: '280px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <img
                src={selectedImg}
                alt={product.name}
                style={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  transition: 'transform 0.3s ease',
                }}
              />
            </div>

            {/* 3 to 5 Clickable Thumbnails */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {gallery.map((imgUrl: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImg(imgUrl)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    border: selectedImg === imgUrl ? '2px solid #e03a1f' : '1px solid #cbd5e1',
                    background: '#fff',
                    padding: '2px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: selectedImg === imgUrl ? '0 2px 8px rgba(224, 58, 31, 0.25)' : 'none',
                  }}
                >
                  <img src={imgUrl} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
              📸 Click thumbnails to inspect all 3-5 product angles
            </div>
          </div>

          {/* Right: Product Details, Wholesale Slabs & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                  {product.brand}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  SKU: {product.sku || `ABM-${product.id}`}
                </span>
                {product.badge && (
                  <span style={{ fontSize: '10px', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '6px' }}>
                    {product.badge}
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3 }}>
                {product.name}
              </h2>
              {product.nameTa && (
                <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px' }}>
                  {product.nameTa}
                </div>
              )}

              {/* Price Row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '12px 0 6px' }}>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#15803d' }}>
                  {money(product.price)}
                </span>
                {product.mrp > product.price && (
                  <>
                    <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through' }}>
                      {money(product.mrp)}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                      {discountPct}% OFF
                    </span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Unit: <b>{product.unit}</b> · Incl. of all taxes ({product.gst || 18}% GST)
              </div>

              {/* Stock Status Badge */}
              <div style={{ margin: '12px 0' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: product.stock > 10 ? '#ecfdf5' : product.stock > 0 ? '#fef3c7' : '#fee2e2',
                    color: product.stock > 10 ? '#047857' : product.stock > 0 ? '#b45309' : '#dc2626',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
                  {product.stock > 10
                    ? `In Stock (${product.stock} units available)`
                    : product.stock > 0
                    ? `Low Stock (${product.stock} left)`
                    : 'Out of Stock'}
                </span>
              </div>

              {/* Tiered Wholesale Slabs Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📦 Wholesale Slabs (Instant Bulk Discount)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b' }}>1-4 units</div>
                    <div style={{ fontWeight: 800 }}>{money(product.price)}</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <div style={{ color: '#047857', fontWeight: 700 }}>5-9 units</div>
                    <div style={{ fontWeight: 900, color: '#047857' }}>Save 10%</div>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ color: '#b45309', fontWeight: 700 }}>10+ units</div>
                    <div style={{ fontWeight: 900, color: '#b45309' }}>Save 18%</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: '8px 0 16px' }}>
                {product.description || 'High-quality tested office & school supplies with guaranteed performance.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              {isAdminView ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onEdit) onEdit(product)
                    }}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#e03a1f',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={16} /> Edit Product #{product.id}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={product.stock <= 0}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 20px',
                    borderRadius: '14px',
                    background: added ? '#10b981' : product.stock <= 0 ? '#94a3b8' : '#e03a1f',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '14px',
                    border: 'none',
                    cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 16px rgba(224, 58, 31, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {added ? (
                    <>
                      <Check size={18} /> Added to Cart!
                    </>
                  ) : product.stock <= 0 ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <ShoppingBag size={18} /> Add to Cart · {money(product.price)}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
