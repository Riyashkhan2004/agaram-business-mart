import React, { useState, useEffect, FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Package,
  User,
  MapPin,
  Heart,
  Tag,
  Coins,
  ShieldCheck,
  CreditCard,
  Gift,
  Bell,
  LogOut,
  Printer,
  ChevronRight,
  Eye,
  EyeOff,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { fetchUserOrders, fetchUserAddresses, saveUserAddressesRemote, customerLogin, signUp, logout, ApiOrder } from '../api'
import { Product, Language, t, money, unitPrice, CustomerType } from '../data/products'
import { loadSavedAddresses, saveUserAddresses, type SavedAddress } from '../utils/savedAddresses'

interface AccountPageProps {
  currentUser: { id?: string; name?: string; email?: string; phone?: string } | null
  setCurrentUser: (u: { id?: string; name?: string; email?: string; phone?: string } | null) => void
  coinBalance?: number
  lang?: Language
  onOpenTracking?: (orderId: string, address: string) => void
  products: Product[]
  cart: { productId: number; quantity: number }[]
  onAddToCart: (productId: number, qty?: number) => void
  wishlist: number[]
  toggleWishlist: (productId: number) => void
  customerType: CustomerType
}

type TabKey =
  | 'profile'
  | 'orders'
  | 'coupons'
  | 'supercoin'
  | 'plus'
  | 'wallet'
  | 'addresses'
  | 'wishlist'
  | 'giftcards'
  | 'notifications'

export const AccountPage: React.FC<AccountPageProps> = ({
  currentUser,
  setCurrentUser,
  coinBalance = 50,
  lang = 'en',
  onOpenTracking,
  products,
  cart,
  onAddToCart,
  wishlist,
  toggleWishlist,
  customerType
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabKey) || 'orders'

  // Auth form states
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Orders state - strictly isolated per user!
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => loadSavedAddresses(currentUser?.id).addresses)
  const [savedAddressExpiry, setSavedAddressExpiry] = useState<number>(() => loadSavedAddresses(currentUser?.id).expiresAt)
  const [savedAddressOwnerId, setSavedAddressOwnerId] = useState<string | undefined>(currentUser?.id)
  const accountAddresses = savedAddressOwnerId === currentUser?.id ? savedAddresses : []

  // New address form
  const [showNewAddressModal, setShowNewAddressModal] = useState(false)
  const [newAddrName, setNewAddrName] = useState('')
  const [newAddrPhone, setNewAddrPhone] = useState('')
  const [newAddrStreet, setNewAddrStreet] = useState('')
  const [newAddrCity, setNewAddrCity] = useState('Cuddalore')
  const [newAddrPincode, setNewAddrPincode] = useState('607001')

  // Copied coupon toast
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Load strictly user-isolated orders
  useEffect(() => {
    let cancelled = false
    setOrders([])
    if (!currentUser) {
      setOrdersLoading(false)
      return () => { cancelled = true }
    }

    setOrdersLoading(true)
    fetchUserOrders(currentUser.email, currentUser.id)
      .then(userOrders => { if (!cancelled) setOrders(userOrders) })
      .catch(err => console.error('Failed to fetch user orders:', err))
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })
    return () => { cancelled = true }
  }, [currentUser])

  useEffect(() => {
    let cancelled = false
    const applyAddresses = (addresses: SavedAddress[], expiresAt: number) => {
      if (cancelled) return
      setSavedAddresses(addresses)
      setSavedAddressExpiry(expiresAt)
      setSavedAddressOwnerId(currentUser?.id)
    }
    if (!currentUser?.id) {
      applyAddresses([], 0)
    } else {
      fetchUserAddresses().then(remote => {
        const valid = remote.filter(item => Date.parse(item.expiresAt) > Date.now())
        applyAddresses(valid, valid.length ? Math.min(...valid.map(item => Date.parse(item.expiresAt))) : 0)
      }).catch(() => {
        const local = loadSavedAddresses(currentUser.id)
        applyAddresses(local.addresses, local.expiresAt)
      })
    }
    return () => { cancelled = true }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id || !savedAddressExpiry) return
    const delay = Math.max(0, savedAddressExpiry - Date.now())
    const timer = window.setTimeout(() => {
      setSavedAddresses([])
      setSavedAddressExpiry(0)
      localStorage.removeItem(`abm_saved_addresses_${encodeURIComponent(currentUser.id!)}`)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [currentUser?.id, savedAddressExpiry])

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab })
  }

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      if (isSignUp) {
        const res = await signUp(name, email, password)
        setMessage(res.message || 'Account created successfully! Check your email if verification is enabled.')
        if (res.user) {
          setCurrentUser({ ...res.user, phone })
        }
      } else {
        const res = await customerLogin(email, password)
        setCurrentUser(res.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {}
    setCurrentUser(null)
    setOrders([])
  }

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleAddAddress = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id || !newAddrName.trim() || !newAddrStreet.trim() || !newAddrPincode.trim()) return
    const newAddr = {
      id: `addr-${Date.now()}`,
      name: newAddrName,
      phone: newAddrPhone || '9876543210',
      address: newAddrStreet,
      city: newAddrCity || 'Cuddalore',
      pincode: newAddrPincode,
      isDefault: true
    }
    const updated = [newAddr, ...accountAddresses.map(address => ({ ...address, isDefault: false }))]
    setSavedAddresses(updated)
    setSavedAddressExpiry(saveUserAddresses(currentUser.id, updated))
    try {
      const remote = await saveUserAddressesRemote(updated)
      setSavedAddresses(remote)
      setSavedAddressExpiry(remote.length ? Math.min(...remote.map(item => Date.parse(item.expiresAt))) : 0)
    } catch {}
    setShowNewAddressModal(false)
    setNewAddrName('')
    setNewAddrPhone('')
    setNewAddrStreet('')
  }

  const handleDeleteAddress = async (id: string) => {
    const updated = accountAddresses.filter(a => a.id !== id)
    setSavedAddresses(updated)
    setSavedAddressExpiry(updated.length ? saveUserAddresses(currentUser?.id, updated) : 0)
    if (!updated.length && currentUser?.id) localStorage.removeItem(`abm_saved_addresses_${encodeURIComponent(currentUser.id)}`)
    try {
      const remote = await saveUserAddressesRemote(updated)
      setSavedAddresses(remote)
      setSavedAddressExpiry(remote.length ? Math.min(...remote.map(item => Date.parse(item.expiresAt))) : 0)
    } catch {}
  }

  // Wishlist items
  const wishlistProducts = products.filter(p => wishlist.includes(p.id))

  // Move product to cart
  const moveToCart = (product: Product) => {
    onAddToCart(product.id, 1)
    toggleWishlist(product.id)
  }

  // If user is not logged in, show Auth Gate
  if (!currentUser) {
    return (
      <div className="container" style={{ padding: '40px 16px 80px', maxWidth: '480px', margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '24px',
            padding: '32px 28px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <img
              src="/abm-logo.png"
              alt="Agaram Business Mart"
              style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
              onError={e => {
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
          </div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            {isSignUp ? 'Create Customer Account' : 'Welcome to Agaram'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
            {isSignUp
              ? 'Register to unlock verified wholesale discounts, track orders live on map, and save multiple delivery addresses.'
              : 'Sign in to access your isolated order history, GST tax invoices, and SuperCoin rewards.'}
          </p>

          {/* Toggle buttons between Sign In and Sign Up */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '22px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError('')
                setMessage('')
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: !isSignUp ? '#fff' : 'transparent',
                color: !isSignUp ? 'var(--primary)' : '#64748b',
                boxShadow: !isSignUp ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError('')
                setMessage('')
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: isSignUp ? '#fff' : 'transparent',
                color: isSignUp ? 'var(--primary)' : '#64748b',
                boxShadow: isSignUp ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              New Account
            </button>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#e11d48',
                fontSize: '12.5px',
                background: '#ffe4e6',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                textAlign: 'left'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#047857',
                fontSize: '12.5px',
                background: '#dcfce7',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                textAlign: 'left'
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            {isSignUp && (
              <label style={{ display: 'grid', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Full Name / Business Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Praveen Kumar / Agaram Books"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pdp-pincode-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '13px' }}
                />
              </label>
            )}

            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Email Address *
              <input
                type="email"
                required
                placeholder="e.g. praveen@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pdp-pincode-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '13px' }}
              />
            </label>

            {isSignUp && (
              <label style={{ display: 'grid', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Mobile Number (for delivery SMS)
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="pdp-pincode-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '13px' }}
                />
              </label>
            )}

            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Password *
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pdp-pincode-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px', fontSize: '13px', paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '14px',
                fontWeight: 800,
                borderRadius: '12px',
                marginTop: '10px',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)'
              }}
            >
              {isSubmitting ? 'Please wait...' : isSignUp ? 'Create My Account' : 'Sign In to My Account'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', fontSize: '12.5px', color: '#64748b' }}>
            Looking to browse products first?{' '}
            <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Explore Wholesale Catalog &rarr;
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Navigation Items matching Flipkart Profile Dropdown
  const navItems: Array<{ key: TabKey; label: string; icon: React.ReactNode; badge?: string }> = [
    { key: 'orders', label: 'Orders', icon: <Package size={17} />, badge: orders.length > 0 ? `${orders.length}` : undefined },
    { key: 'profile', label: 'My Profile', icon: <User size={17} /> },
    { key: 'coupons', label: 'Coupons', icon: <Tag size={17} />, badge: '4 New' },
    { key: 'supercoin', label: 'SuperCoin Zone', icon: <Coins size={17} />, badge: `${coinBalance}` },
    { key: 'plus', label: 'Agaram Plus Zone', icon: <ShieldCheck size={17} />, badge: 'VIP' },
    { key: 'wallet', label: 'Saved Cards & Wallet', icon: <CreditCard size={17} /> },
    { key: 'addresses', label: 'Saved Addresses', icon: <MapPin size={17} /> },
    { key: 'wishlist', label: 'Wishlist', icon: <Heart size={17} />, badge: wishlist.length > 0 ? `${wishlist.length}` : undefined },
    { key: 'giftcards', label: 'Gift Cards', icon: <Gift size={17} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={17} /> }
  ]

  return (
    <div className="container" style={{ padding: '24px 16px 80px', maxWidth: '1160px', margin: '0 auto' }}>
      {/* Top Profile Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '20px',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
            }}
          >
            {currentUser.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {currentUser.name || 'Stationery Buyer'}
              </h1>
              <span
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ★ Agaram Plus Member
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              {currentUser.email} {currentUser.phone ? `• +91 ${currentUser.phone}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              Account ID: {currentUser.id || 'AGM-USR-8821'} • Isolated Profile Active
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', padding: '8px 16px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ShoppingBag size={15} /> Wholesale Catalog
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{
              fontSize: '12.5px',
              padding: '8px 16px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#e11d48',
              borderColor: '#fecdd3'
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Tabs + Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {/* Desktop / Mobile Navigation Sidebar */}
        <div style={{ maxWidth: '300px', width: '100%' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ padding: '8px 12px 12px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
              ACCOUNT MENU
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map(item => {
                const isActive = currentTab === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? '#fff1f2' : 'transparent',
                      color: isActive ? '#e11d48' : '#334155',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: isActive ? '#e11d48' : '#64748b' }}>{item.icon}</span>
                      {item.label}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: isActive ? '#e11d48' : '#f1f5f9',
                            color: isActive ? '#fff' : '#475569'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={14} style={{ color: isActive ? '#e11d48' : '#cbd5e1' }} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* TAB: ORDERS */}
          {currentTab === 'orders' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Your Order History ({orders.length})
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    Showing verified orders belonging strictly to {currentUser.name || currentUser.email}
                  </p>
                </div>
                <Link to="/" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  Continue Shopping
                </Link>
              </div>

              {ordersLoading ? (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px 20px', textAlign: 'center' }}>
                  <div className="cart-item-loader" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Loading your verified orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}
                >
                  <Package size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                    No Orders Placed Yet
                  </h3>
                  <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    You haven't placed any stationery orders under this account. Browse our wholesale catalog to get factory-direct prices!
                  </p>
                  <Link to="/" className="btn btn-primary" style={{ fontSize: '13px', padding: '10px 24px' }}>
                    Browse Wholesale Products
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {orders.map(order => (
                    <div
                      key={order.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '12px',
                          marginBottom: '14px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              Order #{order.id}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                background: '#ecfdf5',
                                color: '#059669',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              ✓ Confirmed
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            Placed on {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Total Amount</div>
                          <b style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: 800 }}>
                            {money(order.total)}
                          </b>
                        </div>
                      </div>

                      {/* Order Items List */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                          Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)} units):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {order.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productId)
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: '#f8fafc',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12.5px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {p?.image && (
                                    <img
                                      src={p.image}
                                      alt=""
                                      style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }}
                                    />
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                      {p?.name || `Product #${item.productId}`}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      Qty: <b>{item.quantity}</b> pcs • Tiered wholesale applied
                                    </div>
                                  </div>
                                </div>
                                <b style={{ color: '#0f172a' }}>
                                  {money((p ? unitPrice(p, item.quantity, order.customerType) : 100) * item.quantity)}
                                </b>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          paddingTop: '12px',
                          borderTop: '1px solid #f1f5f9'
                        }}
                      >
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          Deliver to: <b>{order.customerName || currentUser.name}</b>, {order.city || 'Cuddalore'} ({order.pincode || '607001'})
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {onOpenTracking && (
                            <button
                              onClick={() => onOpenTracking(order.id, `${order.address || 'Cuddalore'} - ${order.pincode || '607001'}`)}
                              className="btn btn-secondary"
                              style={{
                                fontSize: '11.5px',
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ecfdf5',
                                color: '#047857',
                                borderColor: '#a7f3d0',
                                fontWeight: 800
                              }}
                            >
                              <span>🚚</span> Track Partner on Map
                            </button>
                          )}
                          <Link
                            to={`/invoice/${order.id}`}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '11.5px',
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Printer size={13} /> GST Tax Invoice
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PROFILE */}
          {currentTab === 'profile' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Personal Information
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
                Manage your profile details and business contact credentials
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={currentUser.name}
                    className="pdp-pincode-input"
                    style={{ width: '100%', height: '42px', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="pdp-pincode-input"
                    style={{ width: '100%', height: '42px', borderRadius: '8px', background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    defaultValue={currentUser.phone || '9876543210'}
                    className="pdp-pincode-input"
                    style={{ width: '100%', height: '42px', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    GSTIN / Business Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    className="pdp-pincode-input"
                    style={{ width: '100%', height: '42px', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('Profile updated successfully!')}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '10px 22px' }}
              >
                Save Changes
              </button>
            </div>
          )}

          {/* TAB: COUPONS */}
          {currentTab === 'coupons' && (
            <div>
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Available Coupons & Promo Codes
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                  Click to copy promo code and apply directly at checkout
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {[
                  {
                    code: 'WHOLESALE10',
                    title: 'Flat 10% Off on Bulk Stationery',
                    desc: 'Applicable on orders above ₹1,000 across all cartons and pens.',
                    expiry: 'Expires in 6 days'
                  },
                  {
                    code: 'BULK500',
                    title: '₹500 Instant Cashback',
                    desc: 'Valid on school & office combo kits above ₹3,000.',
                    expiry: 'Valid this month'
                  },
                  {
                    code: 'AGARAMPLUS',
                    title: 'Free Express Delivery',
                    desc: 'Get zero shipping fee on all orders above ₹499.',
                    expiry: 'Exclusive for Members'
                  },
                  {
                    code: 'SUPERCOIN50',
                    title: 'Redeem 50 SuperCoins',
                    desc: 'Get flat ₹50 off using your available SuperCoin balance.',
                    expiry: 'Available now'
                  }
                ].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: '1px dashed #f43f5e',
                      borderRadius: '14px',
                      padding: '16px 18px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontWeight: 800,
                          fontSize: '13px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {c.code}
                      </span>
                      <button
                        onClick={() => copyCoupon(c.code)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e11d48',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {copiedCode === c.code ? <Check size={14} /> : <Copy size={14} />}
                        {copiedCode === c.code ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{c.title}</div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px', lineHeight: 1.4 }}>{c.desc}</p>
                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {c.expiry}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SUPERCOIN */}
          {currentTab === 'supercoin' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '14px',
                  padding: '24px',
                  color: '#fff',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>Available SuperCoin Balance</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🪙 {coinBalance} <span style={{ fontSize: '16px', fontWeight: 600 }}>(Worth ₹{coinBalance})</span>
                  </div>
                </div>
                <button
                  onClick={() => alert('SuperCoins will be applied automatically at checkout!')}
                  style={{
                    background: '#fff',
                    color: '#d97706',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Redeem at Checkout
                </button>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                How SuperCoins Work
              </h3>
              <ul style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Earn 4 SuperCoins for every ₹100 spent on stationery products.</li>
                <li>1 SuperCoin = ₹1 direct discount on your next wholesale order.</li>
                <li>Redeem coins for free delivery passes and free gift cartons.</li>
              </ul>
            </div>
          )}

          {/* TAB: PLUS ZONE */}
          {currentTab === 'plus' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  borderRadius: '14px',
                  padding: '24px',
                  color: '#fff',
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'inline-block', background: '#e11d48', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, marginBottom: '10px' }}>
                  VIP WHOLESALE STATUS
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>Agaram Plus Wholesale Club</h2>
                <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>
                  Enjoy direct distributor pricing, zero packing fee, and 2-hour priority dispatch.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚡</div>
                  <b style={{ fontSize: '13.5px', color: '#0f172a' }}>2-Hour Priority Dispatch</b>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Your orders are packed first in our Cuddalore warehouse.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>📦</div>
                  <b style={{ fontSize: '13.5px', color: '#0f172a' }}>Zero Packing Charges</b>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Heavy cartons and corrugated boxes are packed completely free.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🧾</div>
                  <b style={{ fontSize: '13.5px', color: '#0f172a' }}>Dedicated GST Manager</b>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Instant B2B invoice generation with input tax credit claims.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WALLET */}
          {currentTab === 'wallet' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Saved Cards & Agaram Wallet
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
                Fast 1-click checkout with stored cards and UPI handles
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Agaram Wallet Balance</div>
                  <b style={{ fontSize: '22px', color: '#0f172a' }}>₹ 450.00</b>
                </div>
                <button
                  onClick={() => alert('Top-up service is active during checkout!')}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  + Add Funds
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>Saved Payment Methods</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <CreditCard size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>HDFC Bank Business Debit Card</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Ending in •••• 4289 (Expires 08/29)</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <span style={{ fontSize: '16px' }}>📱</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Google Pay / PhonePe UPI</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>praveen@okaxis (Verified)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADDRESSES */}
          {currentTab === 'addresses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Saved Delivery Addresses</h2>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                    Saved only for this account and removed after one hour{savedAddressExpiry > Date.now() ? ` · expires ${new Date(savedAddressExpiry).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewAddressModal(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '12.5px', padding: '8px 16px' }}
                >
                  + Add New Address
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {accountAddresses.length === 0 && (
                  <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No saved addresses yet. Add one and it will stay linked to this account for one hour.
                  </div>
                )}
                {accountAddresses.map(addr => (
                  <div
                    key={addr.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <b style={{ fontSize: '14px', color: '#0f172a' }}>{addr.name}</b>
                        {addr.isDefault && (
                          <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                        {addr.address}, {addr.city} - {addr.pincode}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Phone: {addr.phone}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e11d48',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Address Modal */}
              {showNewAddressModal && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'grid',
                    placeItems: 'center',
                    zIndex: 9999,
                    padding: '16px'
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '20px',
                      padding: '24px',
                      maxWidth: '460px',
                      width: '100%',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}
                  >
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Add Delivery Address
                    </h3>
                    <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>
                        Contact Name *
                        <input
                          required
                          value={newAddrName}
                          onChange={e => setNewAddrName(e.target.value)}
                          placeholder="Recipient Name"
                          className="pdp-pincode-input"
                          style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>
                        Mobile Phone *
                        <input
                          required
                          value={newAddrPhone}
                          onChange={e => setNewAddrPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="pdp-pincode-input"
                          style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>
                        Street / Shop / House Address *
                        <input
                          required
                          value={newAddrStreet}
                          onChange={e => setNewAddrStreet(e.target.value)}
                          placeholder="Door No, Street Name, Landmark"
                          className="pdp-pincode-input"
                          style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                        />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>
                          City
                          <input
                            value={newAddrCity}
                            onChange={e => setNewAddrCity(e.target.value)}
                            className="pdp-pincode-input"
                            style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px', fontWeight: 700 }}>
                          Pincode *
                          <input
                            required
                            value={newAddrPincode}
                            onChange={e => setNewAddrPincode(e.target.value)}
                            className="pdp-pincode-input"
                            style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowNewAddressModal(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Save Address
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: WISHLIST */}
          {currentTab === 'wishlist' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  My Wishlist ({wishlistProducts.length})
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                  Items you have saved to purchase later
                </p>
              </div>

              {wishlistProducts.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                  <Heart size={44} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                  <b style={{ fontSize: '15px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                    Your wishlist is empty
                  </b>
                  <p style={{ fontSize: '13px', margin: '0 0 16px' }}>Explore products and click the heart icon to save them here.</p>
                  <Link to="/" className="btn btn-primary" style={{ fontSize: '12.5px' }}>
                    Explore Products
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                  {wishlistProducts.map(p => (
                    <div
                      key={p.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '8px', marginBottom: '10px' }}
                        />
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '4px' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>
                          {money(unitPrice(p, 1, customerType))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => moveToCart(p)}
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '11.5px', padding: '7px 10px' }}
                        >
                          Move to Cart
                        </button>
                        <button
                          onClick={() => toggleWishlist(p.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '11.5px', padding: '7px 10px', color: '#e11d48' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GIFTCARDS */}
          {currentTab === 'giftcards' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Agaram Gift Cards & Vouchers
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
                Redeem stationery gift vouchers or send gift cards to schools and students
              </p>

              <div style={{ display: 'flex', gap: '10px', maxWidth: '420px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Enter 16-digit voucher code"
                  className="pdp-pincode-input"
                  style={{ flex: 1, height: '42px', borderRadius: '8px', textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  onClick={() => alert('Voucher code verified and added to wallet balance!')}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', padding: '0 18px' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {currentTab === 'notifications' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Notifications & Updates
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '18px' }}>
                Important announcements regarding orders and wholesale stock
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ fontSize: '18px' }}>📦</div>
                  <div>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>Warehouse Dispatches Running on Time</b>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>All Cuddalore & Tamil Nadu wholesale deliveries dispatched within 2 hours.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                  <div style={{ fontSize: '18px' }}>🏷️</div>
                  <div>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>New Wholesale Cartons Added</b>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Fresh stock of Doms Pencil Tubs & Classmate Note Cartons now ready in inventory.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountPage
