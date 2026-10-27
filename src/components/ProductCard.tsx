import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Plus, Minus, Eye, Zap } from 'lucide-react'
import { money, type Product } from '../data/products'

interface ProductCardProps {
  product: Product
  cartQty: number
  isWishlisted: boolean
  onAddToCart: (id: number, qty?: number) => void
  onUpdateCartQty: (id: number, qty: number) => void
  onToggleWishlist: (id: number) => void
  onQuickPreview?: (product: Product) => void
  customerType?: 'retail' | 'wholesale'
  lang?: 'en' | 'ta'
}

export function ProductCard({
  product,
  cartQty,
  isWishlisted,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
  onQuickPreview,
  customerType = 'retail',
  lang = 'en'
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)

  const effectivePrice = customerType === 'wholesale'
    ? Math.round(product.price * 0.9)
    : product.price

  const discountPct = product.mrp > effectivePrice
    ? Math.round(((product.mrp - effectivePrice) / product.mrp) * 100)
    : 0

  const wholesale5Price = Math.round(product.price * 0.9)

  return (
    <div
      className="instamart-product-card"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Image & Floating Badges */}
      <div className="instamart-card-media" style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            onToggleWishlist(product.id)
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            zIndex: 3,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            size={14}
            fill={isWishlisted ? '#ef4444' : 'none'}
            color={isWishlisted ? '#ef4444' : '#64748b'}
          />
        </button>

        {/* Discount Badge */}
        {discountPct > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '9.5px',
              fontWeight: 900,
              padding: '2px 5px',
              borderRadius: '6px',
              zIndex: 3,
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
            }}
          >
            {discountPct}% OFF
          </span>
        )}

        {/* Quick Preview Eye Trigger */}
        {onQuickPreview && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onQuickPreview(product)
            }}
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 3,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
            title="Quick 3-5 Image Preview"
          >
            <Eye size={12} color="#0284c7" />
          </button>
        )}

        {/* Product Image Clickable Link */}
        <Link
          to={`/product/${product.id}`}
          className="instamart-card-image-link"
          style={{
            display: 'block',
            width: '100%',
            height: '110px',
            background: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '6px',
              boxSizing: 'border-box',
              opacity: imgLoaded ? 1 : 0.4,
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          />
        </Link>
      </div>

      {/* Info Body */}
      <div className="instamart-card-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Brand & Unit */}
          <div className="instamart-card-brand" style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
            {product.brand} · {product.unit}
          </div>

          {/* Title */}
          <Link
            to={`/product/${product.id}`}
            className="instamart-card-title"
            style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.3,
              textDecoration: 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '32px',
            }}
          >
            {product.name}
          </Link>

          {/* Wholesale Discount Hint Pill */}
          <div
            style={{
              fontSize: '10px',
              color: '#047857',
              background: '#ecfdf5',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              margin: '4px 0 6px',
            }}
          >
            <span>{money(wholesale5Price)} for 5+ pcs</span>
          </div>
        </div>

        {/* Price & Add Stepper Row */}
        <div className="instamart-card-price-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
          <div className="instamart-card-price-wrap">
            <div className="instamart-card-price" style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a' }}>
              {money(effectivePrice)}
            </div>
            {product.mrp > effectivePrice && (
              <div style={{ fontSize: '10.5px', color: '#94a3b8', textDecoration: 'line-through' }}>
                {money(product.mrp)}
              </div>
            )}
          </div>

          {/* Instamart Morphing "+ ADD" / "- Qty +" Button */}
          <div className="instamart-card-action">
            {cartQty > 0 ? (
              <div
                className="instamart-card-stepper"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#15803d',
                  borderRadius: '8px',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => onUpdateCartQty(product.id, cartQty - 1)}
                  style={{
                    width: '26px',
                    height: '28px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Minus size={12} style={{ strokeWidth: 3 }} />
                </button>
                <span style={{ fontSize: '12px', fontWeight: 900, minWidth: '18px', textAlign: 'center' }}>
                  {cartQty}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateCartQty(product.id, cartQty + 1)}
                  style={{
                    width: '26px',
                    height: '28px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} style={{ strokeWidth: 3 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="instamart-card-add-button"
                onClick={() => onAddToCart(product.id, 1)}
                disabled={product.stock <= 0}
                style={{
                  background: product.stock <= 0 ? '#f1f5f9' : '#ffffff',
                  color: product.stock <= 0 ? '#94a3b8' : '#15803d',
                  border: product.stock <= 0 ? '1px solid #e2e8f0' : '1.5px solid #15803d',
                  padding: '4px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: product.stock > 0 ? '0 2px 6px rgba(21, 128, 61, 0.12)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (product.stock > 0) {
                    e.currentTarget.style.background = '#15803d'
                    e.currentTarget.style.color = '#fff'
                  }
                }}
                onMouseLeave={e => {
                  if (product.stock > 0) {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = '#15803d'
                  }
                }}
              >
                {product.stock <= 0 ? 'SOLD' : '+ ADD'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
