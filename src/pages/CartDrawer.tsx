import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from 'lucide-react'
import { money, type Product } from '../data/products'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  cart: { productId: number; quantity: number }[]
  products: Product[]
  onUpdateCartQty: (id: number, qty: number) => void
  onClearCart: () => void
  customerType: 'retail' | 'wholesale'
  lang?: 'en' | 'ta'
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateCartQty,
  onClearCart,
  customerType,
  lang = 'en'
}: CartDrawerProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const cartItemsWithDetails = cart.map(item => {
    const product = products.find(p => p.id === item.productId)
    const unitPrice = product ? (customerType === 'wholesale' ? Math.round(product.price * 0.9) : product.price) : 0
    return { ...item, product, unitPrice }
  }).filter(item => Boolean(item.product))

  const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const gst = Math.round(subtotal * 0.18)
  const grandTotal = Math.max(0, subtotal + gst)

  const handleProceed = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <div
      className="cart-drawer-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="cart-drawer-panel"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {lang === 'ta' ? 'ஷாப்பிங் கூடை' : 'Shopping Cart'} ({cart.length})
            </h3>
            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 800 }}>
              ⚡ 10 Mins Express Delivery
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {cartItemsWithDetails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px' }}>Your cart is empty</h4>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '18px' }}>Add stationery products, copier papers or pens to order.</p>
              <button
                onClick={onClose}
                style={{
                  background: '#e03a1f',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cartItemsWithDetails.map(({ product, quantity, unitPrice }) => {
                if (!product) return null
                return (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: '48px', height: '48px', objectFit: 'contain', background: '#fff', borderRadius: '8px', padding: '2px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {money(unitPrice)} · {product.unit}
                      </div>
                    </div>

                    {/* Stepper */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty(product.id, quantity - 1)}
                        style={{ width: '26px', height: '28px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 900, minWidth: '18px', textAlign: 'center' }}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty(product.id, quantity + 1)}
                        style={{ width: '26px', height: '28px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer & Total */}
        {cartItemsWithDetails.length > 0 && (
          <div
            style={{
              padding: '18px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            {/* Bill Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>{money(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>GST (18%):</span>
                <span>{money(gst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 800 }}>
                <span>Express Delivery:</span>
                <span>FREE (⚡ 10 Mins)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                <span>Grand Total:</span>
                <span style={{ color: '#15803d' }}>{money(grandTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              style={{
                width: '100%',
                background: '#15803d',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(21, 128, 61, 0.3)',
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
