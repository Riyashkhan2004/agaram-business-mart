import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Truck, Check, Lock, ArrowLeft, ArrowRight } from 'lucide-react'
import { money, type Product } from '../data/products'
import { createOrder, fetchUserAddresses, fetchUserOrders, saveUserAddressesRemote, customerLogin, signUp, type ApiOrder } from '../api'
import { loadSavedAddresses, saveUserAddresses } from '../utils/savedAddresses'

interface CheckoutPageProps {
  cart: { productId: number; quantity: number }[]
  products: Product[]
  currentUser: { id?: string; name?: string; email?: string; phone?: string } | null
  setCurrentUser: (u: { id?: string; name?: string; email?: string; phone?: string } | null) => void
  userPincode: string
  onClearCart: () => void
  customerType: 'retail' | 'wholesale'
  lang?: 'en' | 'ta'
}

export function CheckoutPage({
  cart,
  products,
  currentUser,
  setCurrentUser,
  userPincode,
  onClearCart,
  customerType,
  lang = 'en'
}: CheckoutPageProps) {
  const navigate = useNavigate()

  // Checkout Form State
  const [name, setName] = useState(currentUser?.name || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState(userPincode || '607001')
  const [gstin, setGstin] = useState('')
  const [paymentMode, setPaymentMode] = useState<'upi' | 'card' | 'cod'>('upi')
  const [placing, setPlacing] = useState(false)

  // Auth gate state for guests
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false
    const applySavedAddress = (saved: Array<{ name: string; phone: string; address: string; city: string; pincode: string; isDefault: boolean }>) => {
      if (cancelled) return
      const preferred = saved.find(item => item.isDefault) || saved[0]
      if (preferred) {
        setName(currentUser?.name || preferred.name)
        setPhone(preferred.phone)
        setAddress(preferred.address)
        setCity(preferred.city)
        setPincode(preferred.pincode)
      } else {
        setName(currentUser?.name || '')
        setEmail(currentUser?.email || '')
        setPhone('')
        setAddress('')
        setCity('')
        setPincode(userPincode || '')
      }
    }
    if (!currentUser?.id) {
      setName(currentUser?.name || '')
      setEmail(currentUser?.email || '')
      setPhone('')
      setAddress('')
      setCity('')
      setPincode(userPincode || '')
    } else {
      fetchUserAddresses().then(remote => {
        const merged = remote.length ? remote : loadSavedAddresses(currentUser.id).addresses
        if (merged.length) applySavedAddress(merged)
        else fetchUserOrders(currentUser.email, currentUser.id).then(orders => {
          const latest = orders[0]
          if (latest) { setName(currentUser.name || latest.customerName); setPhone(latest.phone); setAddress(latest.address); setCity(latest.city); setPincode(latest.pincode) }
        }).catch(() => {})
      }).catch(() => {
        const saved = loadSavedAddresses(currentUser.id).addresses
        if (saved.length) applySavedAddress(saved)
        else fetchUserOrders(currentUser.email, currentUser.id).then(orders => {
          const latest = orders[0]
          if (latest) { setName(currentUser.name || latest.customerName); setPhone(latest.phone); setAddress(latest.address); setCity(latest.city); setPincode(latest.pincode) }
        }).catch(() => {})
      })
    }
    return () => { cancelled = true }
  }, [currentUser?.id])

  const cartItemsWithDetails = cart.map(item => {
    const product = products.find(p => p.id === item.productId)
    const unitPrice = product ? (customerType === 'wholesale' ? Math.round(product.price * 0.9) : product.price) : 0
    return { ...item, product, unitPrice }
  }).filter(item => Boolean(item.product))

  const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const gst = Math.round(subtotal * 0.18)
  const grandTotal = subtotal + gst

  // Quick In-Checkout Auth handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    try {
      if (authTab === 'signin') {
        const res = await customerLogin(authEmail, authPassword)
        if (res.user) {
          setCurrentUser(res.user)
          setName(res.user.name || '')
          setEmail(res.user.email || '')
        }
      } else {
        const res = await signUp(authName, authEmail, authPassword)
        if (res.user) {
          setCurrentUser(res.user)
          setName(res.user.name || '')
          setEmail(res.user.email || '')
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check details.')
    }
  }

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (!currentUser) {
      alert('Please sign in or create an account to place your order.')
      return
    }
    if (!name || !phone || !address || !pincode) {
      alert('Please fill all required delivery address fields.')
      return
    }

    setPlacing(true)
    const orderData = {
      items: cart,
      customerName: name,
      phone,
      email: currentUser.email || email,
      address,
      city,
      pincode,
      customerType,
      gstin: gstin || undefined,
    }

    const previousAddresses = loadSavedAddresses(currentUser.id).addresses
    const matchingAddress = previousAddresses.find(item => item.address === address && item.city === city && item.pincode === pincode)
    const addressList = [
      {
        id: matchingAddress?.id || `checkout-${Date.now()}`,
        name,
        phone,
        address,
        city,
        pincode,
        isDefault: true,
      },
      ...previousAddresses.filter(item => item.id !== matchingAddress?.id && !(item.address === address && item.city === city && item.pincode === pincode)).map(item => ({ ...item, isDefault: false })),
    ]
    saveUserAddresses(currentUser.id, addressList)

    try {
      await saveUserAddressesRemote(addressList).catch(() => {})
      const res = await createOrder(orderData)
      // Save order in user-specific local storage cache
      const order = res.order
      const localId = order.id
      const userOrdersKey = `abm_orders_${currentUser.id || currentUser.email}`
      const existingUserOrders: ApiOrder[] = JSON.parse(localStorage.getItem(userOrdersKey) || '[]')
      localStorage.setItem(userOrdersKey, JSON.stringify([order, ...existingUserOrders]))

      onClearCart()
      navigate(`/invoice/${localId}`)
    } catch (err: any) {
      alert(`Error placing order: ${err.message}`)
    } finally {
      setPlacing(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
        <h2>Your cart is empty</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>Add products before checking out.</p>
        <Link to="/" style={{ background: '#e03a1f', color: '#fff', padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 800 }}>
          Back to Store
        </Link>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
        <Link to="/" style={{ color: '#0284c7', textDecoration: 'none' }}>Home</Link> / <b>Checkout</b>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        {/* LEFT COLUMN: Customer Gate & Address Form */}
        <div>
          {/* 1. Account / Sign-In Gate */}
          {!currentUser ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1.5px solid #fed7aa', marginBottom: '24px', boxShadow: '0 4px 16px rgba(249, 115, 22, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Lock size={20} color="#ea580c" />
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Sign In to Complete Your Order
                </h3>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px' }}>
                To track your live delivery and maintain your invoice history, please sign in or register:
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setAuthTab('signin')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    background: authTab === 'signin' ? '#e03a1f' : '#f1f5f9',
                    color: authTab === 'signin' ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('signup')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    background: authTab === 'signup' ? '#e03a1f' : '#f1f5f9',
                    color: authTab === 'signup' ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {authTab === 'signup' && (
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                  />
                )}
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#e03a1f',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  {authTab === 'signin' ? 'Sign In & Continue' : 'Create Account & Continue'}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ background: '#ecfdf5', borderRadius: '14px', padding: '14px 18px', border: '1px solid #a7f3d0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#047857', fontWeight: 800 }}>SIGNED IN AS:</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#065f46' }}>{currentUser.name} ({currentUser.email})</div>
              </div>
              <span style={{ fontSize: '11px', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 900 }}>
                ✓ Verified
              </span>
            </div>
          )}

          {/* 2. Delivery Address Form */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 16px' }}>
              Delivery Address & Contact
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Street Address / Landmark *</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <span style={{ display: 'block', marginTop: '5px', color: '#64748b', fontSize: '11px' }}>
                This delivery address stays saved to your account until you delete it.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Pincode *</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>GSTIN (Optional for B2B Input Tax Credit)</label>
              <input
                type="text"
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary & Place Order */}
        <div>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 16px' }}>
              Order Items ({cart.length})
            </h3>

            {/* Line items preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {cartItemsWithDetails.map(({ product, quantity, unitPrice }) => {
                if (!product) return null
                return (
                  <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={product.image} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontWeight: 800, maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Qty: {quantity} × {money(unitPrice)}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{money(unitPrice * quantity)}</div>
                  </div>
                )
              })}
            </div>

            {/* Bill Breakdown */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>{money(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>GST (18%):</span>
                <span>{money(gst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 800 }}>
                <span>Delivery:</span>
                <span>FREE (⚡ 10 Mins)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#15803d' }}>{money(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div style={{ margin: '18px 0' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px' }}>Payment Method:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['upi', 'card', 'cod'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '8px',
                      borderRadius: '10px',
                      border: paymentMode === mode ? '2px solid #15803d' : '1px solid #cbd5e1',
                      background: paymentMode === mode ? '#f0fdf4' : '#fff',
                      color: paymentMode === mode ? '#15803d' : '#475569',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {mode === 'upi' ? '⚡ UPI / GPay' : mode === 'card' ? '💳 Card' : '💵 Cash on Delivery'}
                  </button>
                ))}
              </div>
            </div>

            {/* Place Order CTA Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placing}
              style={{
                width: '100%',
                background: placing ? '#94a3b8' : '#15803d',
                color: '#ffffff',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                fontWeight: 900,
                fontSize: '16px',
                cursor: placing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(21, 128, 61, 0.35)',
              }}
            >
              {placing ? 'Placing Order in Neon DB...' : `Place Order · ${money(grandTotal)}`}
              {!placing && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
