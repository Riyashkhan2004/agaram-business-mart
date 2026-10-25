import { useEffect, useMemo, useState, memo, type FormEvent, type ChangeEvent } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Search, ShoppingCart, UserRound, Heart, ChevronDown, CheckCircle2,
  MapPin, LogOut, Package, ChevronRight, Star, Clock, Sparkles,
  SlidersHorizontal, Trash2, ArrowRight, Printer, Share2, Tag, ShieldCheck,
  Truck, ArrowLeft, Plus, Minus, X, Check, Eye, Palette, AlertCircle, RefreshCw,
  Zap, UploadCloud, LayoutGrid, CheckCircle, Flame
} from 'lucide-react'
import {
  products as defaultProducts, categories, mergeStoreCategories, brands, sampleReviews, activeCoupons, money, unitPrice, getProductTiers,
  type Product, type StationeryCategory, type CategorySlug, type ProductReview, type WholesaleTier, type SubCategory
} from './data/products'
import {
  API_URL, fetchProducts, fetchStoreCategories, validateCoupon, createOrder, fetchUserOrders, fetchUserAddresses, saveUserAddressesRemote,
  fetchAdminOrders, adminLogin, customerLogin, signUp, verifyEmail, logout, getSession,
  saveProduct, deleteProduct, pingBackend, type ApiOrder
} from './api'
import { MapLocationPickerModal } from './components/MapLocationPickerModal'
import { loadSavedAddresses, saveUserAddresses, type SavedAddress } from './utils/savedAddresses'
import { DeliveryPartnerLiveMapModal } from './components/DeliveryPartnerLiveMapModal'
import { AccountPage as AccountProfilePage } from './pages/AccountPage'
import { HomePage as WholesaleHomePage } from './pages/HomePage'
import { CategoryPage as CatalogCategoryPage } from './pages/CategoryPage'
import { ProductDetailPage as CatalogProductDetailPage } from './pages/ProductDetailPage'

export type Language = 'en' | 'ta'
export type CustomerType = 'retail' | 'wholesale'
export type ColorTheme = 'scooboo' | 'pastel' | 'flipkart' | 'matcha'

type CartItem = {
  productId: number
  quantity: number
}

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) as T : fallback
  } catch {
    return fallback
  }
}

export function numberToWords(num: number): string {
  if (num === 0) return 'zero rupees'
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '')
  }
  return convert(Math.round(num)) + ' rupees'
}

export const t = {
  en: {
    announcement: '✨ Get 10% OFF with code AESTHETIC10 | 🚀 Free Express Delivery on ₹1499+ | 📦 School & Office Bulk Pricing',
    offer: 'Offer',
    aboutUs: 'About Us',
    helpSupport: 'Help & Support',
    admin: 'Admin',
    wishlist: 'Wishlist',
    cart: 'Cart',
    signIn: 'Sign In',
    allStationery: 'All Stationery',
    searchPlaceholder: 'Search aesthetic pens, mildliners, xerox papers, school combos...',
    search: 'Search',
    expressDelivery: '30 MIN EXPRESS DELIVERY',
    items: 'items',
    inCategory: 'in',
    add: 'ADD',
    mrp: 'MRP',
    off: 'OFF',
    subtotal: 'Subtotal',
    shoppingBag: 'Shopping Bag',
    viewCart: 'View Cart',
    checkout: 'Checkout',
    freeDeliveryUnlocked: '🎉 Congratulations! You unlocked FREE Express Delivery',
    addMoreForFreeDelivery: 'Add {amount} more for FREE Delivery',
    emptyCart: 'Your cart is empty',
    department: 'Department',
    categories: 'Categories',
    otherSectors: 'Other Sectors',
    allProducts: 'All Products',
    myOrders: 'My Orders',
    taxInvoice: 'TAX INVOICE',
    printInvoice: 'Print Tax Invoice',
    orderHistory: 'Order History',
    noOrders: 'No orders placed yet',
    home: 'Home',
    signOut: 'Sign Out',
  },
  ta: {
    announcement: '✨ AESTHETIC10 கூப்பன் மூலம் 10% தள்ளுபடி பெறுங்கள் | 🚀 ₹1499+க்கு மேல் இலவச விரைவு விநியோகம் | 📦 பள்ளி & அலுவலக மொத்த விலை',
    offer: 'சலுகை',
    aboutUs: 'எங்களை பற்றி',
    helpSupport: 'உதவி & ஆதரவு',
    admin: 'நிர்வாகம்',
    wishlist: 'விருப்பம்',
    cart: 'கூடை',
    signIn: 'உள்நுழை',
    allStationery: 'அனைத்து பொருட்கள்',
    searchPlaceholder: 'எழுதுபொருட்கள், ஜெராக்ஸ் தாள்கள், மைகள், குறிப்பேடுகள் தேடுக...',
    search: 'தேடு',
    expressDelivery: '30 நிமிட விரைவு விநியோகம்',
    items: 'பொருட்கள்',
    inCategory: 'பிரிவில்',
    add: 'சேர்',
    mrp: 'அ.வி',
    off: 'தள்ளுபடி',
    subtotal: 'கூட்டுத்தொகை',
    shoppingBag: 'ஷாப்பிங் கூடை',
    viewCart: 'கூடையைப் பார்',
    checkout: 'பணம் செலுத்த',
    freeDeliveryUnlocked: '🎉 வாழ்த்துக்கள்! இலவச விரைவு விநியோகம் கிடைத்துள்ளது',
    addMoreForFreeDelivery: 'இலவச விநியோகத்திற்கு மேலும் {amount} சேர்க்கவும்',
    emptyCart: 'உங்கள் கூடை காலியாக உள்ளது',
    department: 'வணிகப் பிரிவு',
    categories: 'பிரிவுகள்',
    otherSectors: 'பிற துறைகள்',
    allProducts: 'அனைத்து பொருட்கள்',
    myOrders: 'என் ஆர்டர்கள்',
    taxInvoice: 'வரி விலைப்பட்டியல்',
    printInvoice: 'விலைப்பட்டியலை அச்சிடுக',
    orderHistory: 'ஆர்டர் வரலாறு',
    noOrders: 'இதுவரை ஆர்டர்கள் இல்லை',
    home: 'முகப்பு',
    signOut: 'வெளியேறு',
  }
}

export function SkeletonProductCard() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton skeleton-img" />
      <div className="product-content">
        <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px', marginBottom: '8px' }} />
        <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px', marginBottom: '6px' }} />
        <div className="skeleton skeleton-text" style={{ width: '65%', height: '14px', marginBottom: '12px' }} />
        <div className="skeleton skeleton-tier" style={{ height: '36px', marginBottom: '10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div className="skeleton skeleton-text" style={{ width: '55px', height: '18px' }} />
          <div className="skeleton skeleton-btn" style={{ width: '60px', height: '28px', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  )
}

function notifyCoinBalanceChanged() {
  localStorage.setItem('abm_coins_refresh', String(Date.now()))
  window.dispatchEvent(new Event('abm_coins_updated'))
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // State
  const [lang, setLang] = useState<Language>(() => readStorage<Language>('abm_lang', 'en'))
  const [theme, setTheme] = useState<ColorTheme>(() => readStorage<ColorTheme>('abm_theme', 'scooboo'))
  const [customerType, setCustomerType] = useState<CustomerType>(() => readStorage<CustomerType>('abm_customer_type', 'retail'))
  const [cart, setCart] = useState<CartItem[]>(() => {
    const stored = readStorage<CartItem[]>('abm_cart', [])
    const isMock = stored.length === 2 && stored.some(i => i.productId === 101) && stored.some(i => i.productId === 201)
    if (isMock) {
      localStorage.setItem('abm_cart', JSON.stringify([]))
      return []
    }
    return stored
  })
  const [wishlist, setWishlist] = useState<number[]>(() => {
    const stored = readStorage<number[]>('abm_wishlist', [])
    const isMock = stored.length === 2 && stored.includes(101) && stored.includes(201)
    if (isMock) {
      localStorage.setItem('abm_wishlist', JSON.stringify([]))
      return []
    }
    return stored
  })
  const [products, setProducts] = useState<Product[]>(defaultProducts)
  const [storeCategories, setStoreCategories] = useState<StationeryCategory[]>(categories)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [userPincode, setUserPincode] = useState(() => readStorage('abm_pincode', '600001'))
  const [pincodeModalOpen, setPincodeModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string; phone?: string } | null>(null)
  const [coinBalance, setCoinBalance] = useState(50)
  const [locationOwnerId, setLocationOwnerId] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [trackingModalOpen, setTrackingModalOpen] = useState(false)
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<{ id: string; address: string }>({
    id: 'ABM-928174',
    address: 'Main Road, Cuddalore - 607001'
  })
  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState<{
    address: string
    city: string
    pincode: string
    label: string
  }>(() => ({
    address: 'Main Road, Cuddalore',
    city: 'Cuddalore',
    pincode: '607001',
    label: 'Home'
  }))

  useEffect(() => {
    let active = true
    const refreshCoinBalance = async () => {
      if (!currentUser?.id) {
        if (active) setCoinBalance(50)
        return
      }

      const localOrders = readStorage<ApiOrder[]>('abm_orders', [])
        .filter(order => order.userId === currentUser.id)
      try {
        const serverOrders = await fetchUserOrders(currentUser.email, currentUser.id)
        const ordersById = new Map<string, ApiOrder>()
        for (const order of localOrders) ordersById.set(order.id, order)
        for (const order of serverOrders) ordersById.set(order.id, order)
        const earned = [...ordersById.values()].reduce((sum, order) => sum + Math.max(0, Number(order.coinsEarned) || 0), 0)
        if (active) setCoinBalance(50 + earned)
      } catch {
        const earned = localOrders.reduce((sum, order) => sum + Math.max(0, Number(order.coinsEarned) || 0), 0)
        if (active) setCoinBalance(50 + earned)
      }
    }

    void refreshCoinBalance()
    const refresh = () => void refreshCoinBalance()
    const poll = window.setInterval(refresh, 15_000)
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'abm_coins_refresh') refresh()
    }
    window.addEventListener('abm_coins_updated', refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.clearInterval(poll)
      window.removeEventListener('abm_coins_updated', refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [currentUser?.id, currentUser?.email])

  useEffect(() => {
    if (currentUser?.id) {
      const key = `abm_delivery_loc_${encodeURIComponent(currentUser.id)}`
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null') as { location?: typeof selectedDeliveryLocation } | null
        if (saved?.location) setSelectedDeliveryLocation(saved.location)
        else localStorage.removeItem(key)
      } catch { localStorage.removeItem(key) }
      setLocationOwnerId(currentUser.id)
    } else {
      setLocationOwnerId(null)
      setSelectedDeliveryLocation({ address: 'Main Road, Cuddalore', city: 'Cuddalore', pincode: '607001', label: 'Home' })
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (currentUser?.id && locationOwnerId === currentUser.id) {
      localStorage.setItem(`abm_delivery_loc_${encodeURIComponent(currentUser.id)}`, JSON.stringify({ location: selectedDeliveryLocation }))
    }
    if (selectedDeliveryLocation.pincode) {
      setUserPincode(selectedDeliveryLocation.pincode)
    }
  }, [currentUser?.id, locationOwnerId, selectedDeliveryLocation])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('abm_theme', JSON.stringify(theme))
  }, [theme])

  // Sync state to storage
  useEffect(() => { localStorage.setItem('abm_lang', JSON.stringify(lang)) }, [lang])
  useEffect(() => { localStorage.setItem('abm_customer_type', JSON.stringify(customerType)) }, [customerType])
  useEffect(() => { localStorage.setItem('abm_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('abm_wishlist', JSON.stringify(wishlist)) }, [wishlist])
  useEffect(() => { localStorage.setItem('abm_pincode', JSON.stringify(userPincode)) }, [userPincode])

  // Load backend session and products
  useEffect(() => {
    pingBackend()
    const refreshStorefrontProducts = () => fetchProducts().then(setProducts).catch(() => {})
    const refreshStorefrontCategories = () => fetchStoreCategories().then(remote => {
      if (remote.length) setStoreCategories(mergeStoreCategories(remote))
    }).catch(() => {})
    refreshStorefrontProducts()
    refreshStorefrontCategories()
    const interval = window.setInterval(refreshStorefrontProducts, 30_000)
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'abm_products_refresh') refreshStorefrontProducts()
      if (event.key === 'abm_categories_refresh') refreshStorefrontCategories()
    }
    const onProductsUpdated = () => refreshStorefrontProducts()
    const onCategoriesUpdated = () => refreshStorefrontCategories()
    window.addEventListener('storage', onStorage)
    window.addEventListener('abm_products_updated', onProductsUpdated)
    window.addEventListener('abm_categories_updated', onCategoriesUpdated)
    getSession().then(res => {
      if (res && res.user) setCurrentUser(res.user)
    }).catch(() => {})
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('abm_products_updated', onProductsUpdated)
      window.removeEventListener('abm_categories_updated', onCategoriesUpdated)
    }
  }, [])

  // Cart helper functions
  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId)
      if (!prod) return sum
      return sum + unitPrice(prod, item.quantity, customerType) * item.quantity
    }, 0)
  }, [cart, products, customerType])

  const addToCart = (productId: number, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId)
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, { productId, quantity: qty }]
    })
    setCartDrawerOpen(true)
  }

  const updateCartQty = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.productId === productId) {
          const newQty = i.quantity + delta
          return newQty > 0 ? { ...i, quantity: newQty } : null
        }
        return i
      }).filter(Boolean) as CartItem[]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const toggleWishlist = (productId: number) => {
    setWishlist(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  return (
    <div className="store-shell">
      {/* 1. TOP ANNOUNCEMENT STRIP */}
      <div className="top-bar">
        <div className="container top-bar-inner">
          <div className="top-announcement">
            <span className="top-badge">{t[lang].offer}</span>
            <span>{t[lang].announcement}</span>
          </div>
          <div className="top-bar-links">
            <button
              onClick={() => setLang(l => l === 'en' ? 'ta' : 'en')}
              className="lang-switch-btn"
              style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}
            >
              🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
            <Link to="/about">{t[lang].aboutUs}</Link>
            <Link to="/contact">{t[lang].helpSupport}</Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Glassmorphic + Instamart Mobile Bar + Single Responsive Search Bar) */}
      <header className="main-header">
        <div className="container">
          {/* Instamart Mobile Header Top Bar (as requested in user's hand-drawn sketch) */}
          <div className="instamart-mobile-top">
            <button
              type="button"
              className="instamart-loc-btn"
              onClick={() => setMapPickerOpen(true)}
              title="Change Delivery Location on Interactive Map"
            >
              <span className="instamart-loc-eta">
                <Zap size={11} fill="#15803d" color="#15803d" />
                {lang === 'ta' ? '10 நிமிடங்களில் விநியோகம்' : 'Delivery in 10 Mins'}
              </span>
              <span className="instamart-loc-text">
                <span style={{ fontWeight: 800, color: 'var(--text-main)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedDeliveryLocation.label} - {selectedDeliveryLocation.address}
                </span>
                <ChevronDown size={14} color="#15803d" />
              </span>
            </button>

            <div className="instamart-top-right">
              <button
                type="button"
                className="instamart-coins-pill"
                title="Agaram Reward Coins"
                aria-label={`${coinBalance} Agaram reward coins. Open your coin balance.`}
                onClick={() => navigate('/account?tab=supercoin')}
                style={{ cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: '13px' }}>🪙</span>
                <span>{coinBalance}</span>
              </button>
              <button
                type="button"
                onClick={() => setLang(l => l === 'en' ? 'ta' : 'en')}
                style={{ fontSize: '10px', padding: '4px 7px', borderRadius: '12px', background: 'rgba(0,0,0,0.06)', border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                {lang === 'en' ? 'தமிழ்' : 'EN'}
              </button>
              <Link to="/account" className="instamart-profile-btn" title="My Profile / Account">
                <UserRound size={17} color="var(--primary)" />
              </Link>
            </div>
          </div>

          <div className="header-inner">
            {/* Same Original Logo */}
            <Link to="/" className="brand">
              <img src="/abm-logo.png" alt="Agaram Stationery Mart" className="brand-logo-img" />
              <div className="brand-text">
                <span className="brand-title">Agaram</span>
                <span className="brand-tagline">{lang === 'ta' ? 'ஸ்டேஷனரி மார்ட்' : 'Stationery Mart'}</span>
              </div>
            </Link>

            {/* Unified Single Search Box with Autocomplete (No duplicate search bar & No pincode check button) */}
            <div className="header-search-bar">
              <HeaderSearch products={products} onSelect={(id) => navigate(`/product/${id}`)} lang={lang} />
            </div>

            {/* Actions */}
            <div className="header-actions">
              {/* Color Theme Switcher Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  className="theme-picker-btn"
                  onClick={() => setThemePickerOpen(o => !o)}
                  title="Change Color Theme"
                >
                  <div className="theme-color-dot" />
                  <span className="header-action-label" style={{ textTransform: 'capitalize' }}>{theme}</span>
                  <ChevronDown size={14} />
                </button>

                {themePickerOpen && (
                  <div className="theme-dropdown" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '14px',
                    boxShadow: 'var(--shadow-lg)', padding: '10px', zIndex: 100, minWidth: '190px',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-soft)', padding: '4px 8px', textTransform: 'uppercase' }}>
                      Glassmorphic Theme
                    </div>
                    {[
                      { id: 'scooboo', name: 'Scooboo Coral', color: '#e03a1f' },
                      { id: 'pastel', name: 'Pastel Kawaii', color: '#f43f5e' },
                      { id: 'flipkart', name: 'Flipkart Blue', color: '#2874f0' },
                      { id: 'matcha', name: 'Matcha Forest', color: '#1e6b4f' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id as ColorTheme); setThemePickerOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                          borderRadius: '8px', background: theme === t.id ? 'var(--primary-light)' : 'transparent',
                          color: theme === t.id ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: 700, fontSize: '12px', textAlign: 'left', cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: t.color, boxShadow: '0 0 0 2px #fff' }} />
                        {t.name}
                        {theme === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wishlist Button */}
              <Link to="/wishlist" className="header-action-btn" title="Saved Wishlist">
                <div className="header-action-icon">
                  <Heart size={20} />
                  {wishlist.length > 0 && <span className="header-badge">{wishlist.length}</span>}
                </div>
                <span className="header-action-label">{t[lang].wishlist}</span>
              </Link>

              {/* Cart Trigger Button */}
              <button className="header-action-btn" onClick={() => setCartDrawerOpen(true)} title="View Cart">
                <div className="header-action-icon">
                  <ShoppingCart size={20} />
                  {totalCartCount > 0 && <span className="header-badge">{totalCartCount}</span>}
                </div>
                <span className="header-action-label">{t[lang].cart}</span>
              </button>

              {/* Account Link */}
              <Link to="/account" className="header-action-btn header-account-link" title="My Account">
                <div className="header-action-icon">
                  <UserRound size={20} />
                </div>
                <span className="header-action-label">{currentUser ? currentUser.name?.split(' ')[0] : t[lang].signIn}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 3. CATEGORY NAVIGATION STRIP */}
      {!location.pathname.startsWith('/category/') && (
        <div className="category-rail">
          <div className="container category-rail-inner">
            <Link to="/" className="category-pill active">
              <span className="category-pill-icon">✨</span>
              <span>{t[lang].allStationery}</span>
            </Link>
            {storeCategories.map(cat => (
              <Link key={cat.slug} to={`/category/${cat.slug}`} className="category-pill">
                <span className="category-pill-icon">{cat.icon}</span>
                <span>{lang === 'ta' ? cat.nameTa : cat.name}</span>
                {cat.badge && <span className="category-pill-badge">{cat.badge}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN ROUTER CONTENT */}
      <main>
        <Routes>
          <Route path="/" element={
            <WholesaleHomePage
              products={products}
              categories={storeCategories}
              lang={lang}
              customerType={customerType}
              setCustomerType={setCustomerType}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
              cart={cart}
              onUpdateCartQty={(productId, quantity) => {
                const currentQty = cart.find(item => item.productId === productId)?.quantity || 0
                updateCartQty(productId, quantity - currentQty)
              }}
              onOpenTracking={() => {
                setActiveTrackingOrder({
                  id: 'ABM-928174',
                  address: `${selectedDeliveryLocation.address}, ${selectedDeliveryLocation.city} - ${selectedDeliveryLocation.pincode}`
                })
                setTrackingModalOpen(true)
              }}
            />
          } />
          <Route path="/category/:slug" element={
            <CatalogCategoryPage
              products={products}
              categories={storeCategories}
              cart={cart}
              customerType={customerType}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
              onUpdateCartQty={(productId, quantity) => {
                const currentQty = cart.find(item => item.productId === productId)?.quantity || 0
                updateCartQty(productId, quantity - currentQty)
              }}
              lang={lang}
            />
          } />
          <Route path="/categories" element={
            <CategoryPage
              products={products}
              categories={storeCategories}
              customerType={customerType}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              addToCart={addToCart}
              cart={cart}
              updateCartQty={updateCartQty}
              openCartDrawer={() => setCartDrawerOpen(true)}
              lang={lang}
            />
          } />
          <Route path="/product/:id" element={
            <CatalogProductDetailPage
              products={products}
              cart={cart}
              customerType={customerType}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
              lang={lang}
            />
          } />
          <Route path="/cart" element={
            <CartPage
              cart={cart}
              products={products}
              customerType={customerType}
              updateCartQty={updateCartQty}
              removeFromCart={removeFromCart}
            />
          } />
          <Route path="/checkout" element={
            <CheckoutPage
              cart={cart}
              products={products}
              customerType={customerType}
              userPincode={userPincode}
              clearCart={() => setCart([])}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              lang={lang}
            />
          } />
          <Route path="/wishlist" element={
            <WishlistPage
              wishlist={wishlist}
              products={products}
              customerType={customerType}
              toggleWishlist={toggleWishlist}
              addToCart={addToCart}
            />
          } />
          <Route path="/account" element={
            <AccountProfilePage
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              coinBalance={coinBalance}
              lang={lang}
              products={products}
              cart={cart}
              onAddToCart={addToCart}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              customerType={customerType}
              onOpenTracking={(id, addr) => {
                setActiveTrackingOrder({
                  id: id || 'ABM-928174',
                  address: addr || `${selectedDeliveryLocation.address}, ${selectedDeliveryLocation.city} - ${selectedDeliveryLocation.pincode}`
                })
                setTrackingModalOpen(true)
              }}
            />
          } />
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/verify-email" element={<VerifyEmailPage setCurrentUser={setCurrentUser} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/invoice/:orderId" element={
            <InvoicePage
              products={products}
              currentUser={currentUser}
              lang={lang}
              onOpenTracking={(id, addr) => {
                setActiveTrackingOrder({
                  id: id || 'ABM-928174',
                  address: addr || `${selectedDeliveryLocation.address}, ${selectedDeliveryLocation.city} - ${selectedDeliveryLocation.pincode}`
                })
                setTrackingModalOpen(true)
              }}
            />
          } />
        </Routes>
      </main>

      {/* 5. SLIDE-OVER CART DRAWER */}
      {cartDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setCartDrawerOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">{t[lang].shoppingBag} ({totalCartCount})</div>
              <button className="drawer-close" onClick={() => setCartDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Free Shipping Meter */}
            <div className="shipping-meter">
              <div className="shipping-meter-text">
                <Truck size={15} style={{ color: 'var(--primary)' }} />
                {cartSubtotal >= 499 ? (
                  <span style={{ color: '#15803d' }}><b>{t[lang].freeDeliveryUnlocked}</b></span>
                ) : (
                  <span>{t[lang].addMoreForFreeDelivery.replace('{amount}', money(499 - cartSubtotal))}</span>
                )}
              </div>
              <div className="shipping-meter-bar">
                <div
                  className="shipping-meter-fill"
                  style={{ width: `${Math.min(100, (cartSubtotal / 499) * 100)}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="drawer-items">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛍️</div>
                  <b style={{ fontSize: '16px', display: 'block', marginBottom: '6px' }}>{t[lang].emptyCart}</b>
                  <p style={{ fontSize: '13px' }}>Discover cute pens, notebooks & aesthetic stationery!</p>
                </div>
              ) : (
                cart.map(item => {
                  const prod = products.find(p => p.id === item.productId)
                  if (!prod) return null
                  const price = unitPrice(prod, item.quantity, customerType)
                  const itemTitle = lang === 'ta' && prod.nameTa ? prod.nameTa : prod.name
                  return (
                    <div key={item.productId} className="drawer-item">
                      <img src={prod.image} alt={itemTitle} className="drawer-item-thumb" />
                      <div>
                        <div className="drawer-item-title">{itemTitle}</div>
                        <div className="drawer-item-price">{money(price * item.quantity)}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-soft)' }}>
                          {money(price)} / {prod.unit}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <div className="qty-stepper">
                          <button className="qty-btn" onClick={() => updateCartQty(item.productId, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateCartQty(item.productId, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 700 }}
                        >
                          {lang === 'ta' ? 'நீக்கு' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* 1-Click Available Coupons Strip */}
            {cart.length > 0 && (
              <div className="drawer-coupons-section" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderTop: '1px dashed var(--line)', borderBottom: '1px dashed var(--line)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> {lang === 'ta' ? 'கூப்பன்கள் (தட்டிப் பயன்படுத்துங்கள்)' : 'Available Coupons (Tap to Apply)'}
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    { code: 'XEROX15', label: '15% OFF Xerox (₹999+)' },
                    { code: 'AGARAMFIRST', label: '12% OFF First Order' },
                    { code: 'OFFICE10', label: '10% OFF Office (₹499+)' },
                    { code: 'RETAIL20', label: '20% OFF Bulk (₹1499+)' },
                  ].map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('applied_coupon', c.code)
                        alert(`Coupon ${c.code} activated! Proceed to checkout to see your discounted total.`)
                      }}
                      className="drawer-coupon-chip"
                    >
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '11px' }}>{c.code}</span>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Summary */}
            {cart.length > 0 && (
              <div className="drawer-footer">
                <div className="drawer-total-row">
                  <span>{t[lang].subtotal}</span>
                  <span>{money(cartSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link
                    to="/cart"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setCartDrawerOpen(false)}
                  >
                    {t[lang].viewCart}
                  </Link>
                  <Link
                    to="/checkout"
                    className="btn btn-primary"
                    style={{ flex: 1.5 }}
                    onClick={() => setCartDrawerOpen(false)}
                  >
                    {t[lang].checkout} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. PINCODE MODAL (Amazon style) */}
      {pincodeModalOpen && (
        <div className="drawer-backdrop" onClick={() => setPincodeModalOpen(false)}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px',
            width: 'min(400px, 92%)', margin: 'auto', boxShadow: 'var(--shadow-lg)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '8px' }}>
              Choose your delivery location
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter your 6-digit Indian PIN code to view delivery options and accurate dates.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                maxLength={6}
                value={userPincode}
                onChange={e => setUserPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 600001"
                className="pdp-pincode-input"
              />
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setPincodeModalOpen(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INSTAMART STICKY FLOATING QUICK CART BAR (As in user's hand-drawn sketch) */}
      {totalCartCount > 0 && !['/cart', '/checkout'].includes(location.pathname) && !location.pathname.startsWith('/invoice') && (
        <div className="instamart-bottom-cart-bar" onClick={() => setCartDrawerOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '8px', padding: '4px 8px', fontSize: '13px', fontWeight: 900 }}>
              {totalCartCount} {totalCartCount === 1 ? 'ITEM' : 'ITEMS'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.1 }}>{money(cartSubtotal)}</div>
              <div style={{ fontSize: '10px', opacity: 0.9 }}>
                {lang === 'ta' ? '⚡ 10 நிமிட டெலிவரி' : '⚡ 10 Mins Delivery'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13.5px', fontWeight: 900 }}>
            {lang === 'ta' ? 'கூடை காண்க' : 'View Cart'} <ArrowRight size={16} />
          </div>
        </div>
      )}

      {/* 8. INTERACTIVE MAP LOCATION PICKER MODAL (Leaflet / OpenStreetMap) */}
      <MapLocationPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        currentPincode={userPincode}
        onSelectAddress={(addr) => {
          setSelectedDeliveryLocation(addr)
          setUserPincode(addr.pincode)
        }}
        lang={lang}
      />

      {/* 9. DELIVERY PARTNER LIVE GPS TRACKING MAP MODAL (Animated Scooter 🛵) */}
      <DeliveryPartnerLiveMapModal
        isOpen={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        orderId={activeTrackingOrder.id}
        customerAddress={activeTrackingOrder.address}
        lang={lang}
      />

      {/* 8. NATIVE ANDROID MOBILE BOTTOM NAVIGATION BAR (Flipkart / Shopsy Style) */}
      <nav className="mobile-bottom-bar">
        <Link to="/" className={`mobile-nav-btn ${location.pathname === '/' ? 'active' : ''}`}>
          <span style={{ fontSize: '18px' }}>🏠</span>
          <span>{lang === 'ta' ? 'முகப்பு' : 'Home'}</span>
        </Link>
        <Link to="/category/xerox-printing" className={`mobile-nav-btn ${location.pathname.startsWith('/categor') ? 'active' : ''}`}>
          <span style={{ fontSize: '18px' }}>🗂️</span>
          <span>{lang === 'ta' ? 'பிரிவுகள்' : 'Categories'}</span>
        </Link>
        <a href="#deals" onClick={(e) => {
          if (location.pathname !== '/') {
            navigate('/#deals')
          } else {
            const el = document.getElementById('deals')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }
        }} className="mobile-nav-btn">
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span>{lang === 'ta' ? 'சலுகை' : 'Deals'}</span>
        </a>
        <Link to="/wishlist" className={`mobile-nav-btn ${location.pathname === '/wishlist' ? 'active' : ''}`}>
          <span style={{ fontSize: '18px' }}>❤️</span>
          <span>{lang === 'ta' ? 'விருப்பம்' : 'Wishlist'}</span>
          {wishlist.length > 0 && <span className="mobile-nav-badge">{wishlist.length}</span>}
        </Link>
        <button className="mobile-nav-btn" onClick={() => setCartDrawerOpen(true)}>
          <span style={{ fontSize: '18px' }}>🛒</span>
          <span>{lang === 'ta' ? 'கூடை' : 'Cart'}</span>
          {totalCartCount > 0 && <span className="mobile-nav-badge">{totalCartCount}</span>}
        </button>
        <Link to="/account" className={`mobile-nav-btn ${location.pathname === '/account' ? 'active' : ''}`}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>{currentUser ? (lang === 'ta' ? 'கணக்கு' : 'Profile') : (lang === 'ta' ? 'உள்நுழை' : 'Account')}</span>
        </Link>
      </nav>

      {/* 8. FOOTER */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img src="/abm-logo.png" alt="Agaram Stationery Mart" style={{ height: '46px', width: 'auto', background: 'rgba(255,255,255,0.92)', borderRadius: '12px', padding: '4px' }} />
              <div>
                <div className="footer-brand-title" style={{ marginBottom: 0 }}>Agaram Stationery Mart</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.14em', fontWeight: 800 }}>EST. 2024 · CHENNAI</div>
              </div>
            </div>
            <p className="footer-desc">
              Your one-stop boutique marketplace for cute Japanese stationery, pastel highlighters, bullet journals, school supplies, and institutional bulk orders.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🌸</span>
              <span style={{ fontSize: '20px' }}>📓</span>
              <span style={{ fontSize: '20px' }}>🖊️</span>
              <span style={{ fontSize: '20px' }}>🎨</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Shop Categories</div>
            <ul className="footer-links">
              <li><Link to="/category/aesthetic-pens">Aesthetic Gel Pens</Link></li>
              <li><Link to="/category/highlighters-markers">Pastel Highlighters</Link></li>
              <li><Link to="/category/notebooks-journals">Notebooks & Planners</Link></li>
              <li><Link to="/category/sticky-notes-washi">Washi Tapes & Notes</Link></li>
              <li><Link to="/category/school-bulk-combos">School & Bulk Packs</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Customer Care</div>
            <ul className="footer-links">
              <li><Link to="/contact">Track Your Order</Link></li>
              <li><Link to="/contact">Shipping Policy</Link></li>
              <li><Link to="/contact">Institutional Bulk Quotes</Link></li>
              <li><Link to="/about">About Agaram</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Bulk School Enquiries</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '14px' }}>
              Schools, tuition centres, and offices: get direct factory prices, GST tax invoices, and bulk savings up to 35%.
            </p>
            <div style={{ background: '#334155', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
              <div>📞 <b>Helpline:</b> +91 98400 12345</div>
              <div>✉️ <b>Email:</b> orders@agaram.in</div>
            </div>
          </div>
        </div>

        <div className="container footer-bottom">
          <div>© {new Date().getFullYear()} Agaram Business Mart Pvt Ltd. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>100% Genuine Guarantee</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ==========================================================================
   HEADER SEARCH COMPONENT WITH AUTOCOMPLETE POPUP
   ========================================================================== */
function HeaderSearch({ products, onSelect, lang = 'en' }: { products: Product[]; onSelect: (id: number) => void; lang?: Language }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)

  const rotatingPlaceholders = useMemo(() => lang === 'ta' ? [
    "தேடுக 'JK Copier A4 பேப்பர்'...",
    "தேடுக 'பாஸ்டல் ஹைலைட்டர்கள்'...",
    "தேடுக 'எப்சன் 003 ரீஃபில் இங்க்'...",
    "தேடுக 'ஹௌசர் XO ஜெல் பேனா'...",
    "தேடுக 'பள்ளி நோட்டுகள் & காம்போ'...",
    "தேடுக 'பிறந்தநாள் பலூன்கள் & அலங்காரங்கள்'..."
  ] : [
    "Search 'JK Copier A4 Paper'...",
    "Search 'Pastel Highlighters'...",
    "Search 'Epson 003 Refill Inks'...",
    "Search 'Hauser XO Gel Pens'...",
    "Search 'School Combos & Notebooks'...",
    "Search 'Birthday Balloons & Decor'..."
  ], [lang])

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % rotatingPlaceholders.length)
    }, 2800)
    return () => clearInterval(t)
  }, [rotatingPlaceholders.length])

  const matches = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nameTa && p.nameTa.toLowerCase().includes(q)) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [query, products])

  return (
    <div className="search-container">
      <div className="search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={rotatingPlaceholders[placeholderIdx]}
          className="search-input"
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
        <button className="search-btn">
          <span>{t[lang]?.search || 'Search'}</span>
        </button>
      </div>

      {open && matches.length > 0 && (
        <div className="search-dropdown">
          <div className="search-dropdown-section-title">{lang === 'ta' ? 'பொருட்கள்' : 'Instant Matches'}</div>
          {matches.map(p => (
            <div
              key={p.id}
              className="search-result-item"
              onClick={() => { onSelect(p.id); setOpen(false); setQuery('') }}
            >
              <img src={p.image} alt={p.name} className="search-result-thumb" />
              <div className="search-result-info">
                <div className="search-result-name">{lang === 'ta' && p.nameTa ? p.nameTa : p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="search-result-price">{money(p.price)}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-soft)' }}>{p.brand}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   ISOLATED MEMOIZED FLASH DEALS COUNTDOWN (Lag-Free 60 FPS)
   ========================================================================== */
const FlashDealsTicker = memo(function FlashDealsTicker() {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 })
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return { hours: 5, minutes: 59, seconds: 59 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="deals-timer">
      <span>Ends in:</span>
      <span className="timer-box">{String(timeLeft.hours).padStart(2, '0')}h</span> :
      <span className="timer-box">{String(timeLeft.minutes).padStart(2, '0')}m</span> :
      <span className="timer-box">{String(timeLeft.seconds).padStart(2, '0')}s</span>
    </div>
  )
})

/* ==========================================================================
   HOMEPAGE VIEW (Categorized Product Sections & Business Sectors)
   ========================================================================== */
function HomePage({
  products, lang, customerType, setCustomerType, wishlist, toggleWishlist, addToCart, cart, updateCartQty, openCartDrawer,
  onOpenTracking, onOpenMapPicker, selectedLocation
}: {
  products: Product[]
  lang: Language
  customerType: CustomerType
  setCustomerType: (type: CustomerType) => void
  wishlist: number[]
  toggleWishlist: (id: number) => void
  addToCart: (id: number, qty?: number) => void
  cart: CartItem[]
  updateCartQty: (id: number, delta: number) => void
  openCartDrawer: () => void
  onOpenTracking?: () => void
  onOpenMapPicker?: () => void
  selectedLocation?: { address: string; city: string; pincode: string; label: string }
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('featured')
  const [maxPrice, setMaxPrice] = useState<number>(2000)
  const [activeSectorTab, setActiveSectorTab] = useState<string>('all')

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.price <= maxPrice)
    if (activeSectorTab !== 'all') {
      list = list.filter(p => p.category === activeSectorTab)
    } else if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (selectedBrand !== 'all') list = list.filter(p => p.brand === selectedBrand)
    
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating)
    return list
  }, [products, activeSectorTab, selectedCategory, selectedBrand, sortBy, maxPrice])

  // Sector-specific product groups for dedicated sections
  const xeroxProducts = useMemo(() => products.filter(p => p.category === 'xerox-printing').slice(0, 4), [products])
  const retailerProducts = useMemo(() => products.filter(p => p.category === 'retailer-bulk').slice(0, 4), [products])
  const officeProducts = useMemo(() => products.filter(p => p.category === 'office-products').slice(0, 4), [products])
  const schoolProducts = useMemo(() => products.filter(p => p.category === 'school-essentials').slice(0, 4), [products])
  const celebrationProducts = useMemo(() => products.filter(p => p.category === 'celebration-decor').slice(0, 4), [products])
  const aestheticProducts = useMemo(() => products.filter(p => ['aesthetic-pens', 'highlighters-markers', 'notebooks-journals'].includes(p.category)).slice(0, 4), [products])

  // Cart summary for floating pill (Image 2)
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    if (!prod) return sum
    return sum + unitPrice(prod, item.quantity, customerType) * item.quantity
  }, 0)
  const cartSavings = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    if (!prod) return sum
    const currentPrice = unitPrice(prod, item.quantity, customerType)
    return sum + (prod.mrp - currentPrice) * item.quantity
  }, 0)
  const cartItemsPreview = cart.map(i => products.find(p => p.id === i.productId)).filter(Boolean) as Product[]

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      {/* 1. INSTAMART LIVE DELIVERY TRACKING BANNER (Interactive Live Map trigger) */}
      <div
        className="instamart-live-tracking-pill"
        onClick={onOpenTracking}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🛵</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{lang === 'ta' ? 'டெலிவரி பார்ட்னர் கார்த்திக் ராஜா வழியில் உள்ளார்' : 'Delivery Partner Karthik Raja is on the way'}</span>
              <span className="instamart-pulse-dot" />
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              {lang === 'ta' ? 'வருகை நேரம்: 8 நிமிடம் · நேரலை வரைபடத்தில் கண்காணிக்கவும்' : 'Arriving in 8 mins to your location · Tap to track on Live Map'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#15803d', background: '#fff', padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {lang === 'ta' ? 'வரைபடம்' : 'Track Map'} ➔
        </span>
      </div>

      {/* 2. INSTAMART OFFERS HORIZONTAL SNAP CAROUSEL */}
      <div className="instamart-offers-carousel">
        <div className="instamart-offer-banner" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}>
          <div>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px' }}>
              ⚡ 10 MINS DELIVERY
            </span>
            <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '6px 0 2px' }}>
              {lang === 'ta' ? 'ஜெராக்ஸ் தாள்கள் & இங்க்' : 'Xerox Paper & Refill Inks'}
            </h4>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 600 }}>
              {lang === 'ta' ? 'கார்ட்டன் கட்டுகளுக்கு 25% தள்ளுபடி' : 'Flat 25% OFF on Bulk Cartons & OEM Inks'}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#fff', color: '#c2410c', padding: '3px 9px', borderRadius: '12px' }}>
              {lang === 'ta' ? 'வாங்க' : 'Order Now'} ➔
            </span>
            <span style={{ fontSize: '26px' }}>🖨️</span>
          </div>
        </div>

        <div className="instamart-offer-banner" style={{ background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)' }}>
          <div>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px' }}>
              🌸 KAWAII STATIONERY
            </span>
            <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '6px 0 2px' }}>
              {lang === 'ta' ? 'ஜப்பானிய ஜெல் பேனாக்கள்' : 'Pastel Aesthetic Gel Pens'}
            </h4>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 600 }}>
              {lang === 'ta' ? '₹199 முதல் தொடங்குகிறது' : 'Starting ₹199 | Buy 2 Get 1 Free'}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#fff', color: '#be185d', padding: '3px 9px', borderRadius: '12px' }}>
              {lang === 'ta' ? 'ஆராய்' : 'Explore'} ➔
            </span>
            <span style={{ fontSize: '26px' }}>✨</span>
          </div>
        </div>

        <div className="instamart-offer-banner" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
          <div>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px' }}>
              🎒 SCHOOL COMBO
            </span>
            <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '6px 0 2px' }}>
              {lang === 'ta' ? 'பள்ளி அத்தியாவசிய தொகுப்பு' : 'School Notebooks & Kits'}
            </h4>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 600 }}>
              {lang === 'ta' ? 'கூடுதல் 15% சேமிப்பு' : 'Save Up to 35% on Classroom Packs'}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#fff', color: '#0369a1', padding: '3px 9px', borderRadius: '12px' }}>
              {lang === 'ta' ? 'வாங்க' : 'Order Now'} ➔
            </span>
            <span style={{ fontSize: '26px' }}>📓</span>
          </div>
        </div>

        <div className="instamart-offer-banner" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
          <div>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px' }}>
              🎉 PARTY & CELEBRATION
            </span>
            <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '6px 0 2px' }}>
              {lang === 'ta' ? 'கொண்டாட்ட அலங்காரங்கள்' : 'Party Decor & Balloons'}
            </h4>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 600 }}>
              {lang === 'ta' ? 'பலூன்கள், ரிப்பன்கள் & விளக்குகள்' : 'Balloons, Ribbons, Candles & Props'}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#fff', color: '#6d28d9', padding: '3px 9px', borderRadius: '12px' }}>
              {lang === 'ta' ? 'பார்க்க' : 'Shop Party'} ➔
            </span>
            <span style={{ fontSize: '26px' }}>🎈</span>
          </div>
        </div>
      </div>

      {/* 3. INSTAMART 2-ROW CATEGORY TILES GRID (Matching User Hand-Drawn Sketch "categories") */}
      <div className="instamart-categories-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🗂️</span> {lang === 'ta' ? 'அனைத்து பிரிவுகள்' : 'Shop by Category'}
          </h3>
          <Link to="/category/xerox-printing" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)' }}>
            {lang === 'ta' ? 'அனைத்தும் ➔' : 'See All ➔'}
          </Link>
        </div>
        <div className="instamart-categories-grid">
          {[
            { name: 'Xerox & Print', nameTa: 'ஜெராக்ஸ்', icon: '🖨️', slug: 'xerox-printing', bg: '#fef3c7' },
            { name: 'School Needs', nameTa: 'பள்ளி தேவைகள்', icon: '🎒', slug: 'school-essentials', bg: '#e0f2fe' },
            { name: 'Retail Bulk', nameTa: 'மொத்த விற்பனை', icon: '🏪', slug: 'retailer-bulk', bg: '#fce7f3' },
            { name: 'Office Desk', nameTa: 'அலுவலகம்', icon: '🏢', slug: 'office-products', bg: '#dcfce7' },
            { name: 'Aesthetic Pens', nameTa: 'ஜெல் பேனாக்கள்', icon: '🖊️', slug: 'aesthetic-pens', bg: '#ede9fe' },
            { name: 'Highlighters', nameTa: 'ஹைலைட்டர்', icon: '🖍️', slug: 'highlighters-markers', bg: '#fef9c3' },
            { name: 'Notebooks', nameTa: 'நோட்டுகள்', icon: '📓', slug: 'notebooks-journals', bg: '#ffedd5' },
            { name: 'Celebration', nameTa: 'கொண்டாட்டம்', icon: '🎉', slug: 'celebration-decor', bg: '#fee2e2' },
          ].map(c => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="instamart-category-card"
            >
              <div className="instamart-cat-icon-wrap" style={{ background: c.bg }}>
                <span style={{ fontSize: '22px' }}>{c.icon}</span>
              </div>
              <span className="instamart-cat-title">
                {lang === 'ta' ? c.nameTa : c.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* BUSINESS SECTORS QUICK SELECTOR TABS */}
      <div className="sectors-nav-bar" style={{ marginTop: '16px' }}>
        <button
          className={`sector-pill ${activeSectorTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('all')}
        >
          <span>✨</span> All Categories
        </button>
        <button
          className={`sector-pill ${activeSectorTab === 'xerox-printing' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('xerox-printing')}
        >
          <span>🖨️</span> Xerox Shops Needs
        </button>
        <button
          className={`sector-pill ${activeSectorTab === 'retailer-bulk' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('retailer-bulk')}
        >
          <span>🏪</span> Retailers Wholesale
        </button>
        <button
          className={`sector-pill ${activeSectorTab === 'office-products' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('office-products')}
        >
          <span>🏢</span> Office Needs
        </button>
        <button
          className={`sector-pill ${activeSectorTab === 'school-essentials' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('school-essentials')}
        >
          <span>🎒</span> School Essentials
        </button>
        <button
          className={`sector-pill ${activeSectorTab === 'celebration-decor' ? 'active' : ''}`}
          onClick={() => setActiveSectorTab('celebration-decor')}
        >
          <span>🎉</span> Celebration Items
        </button>
      </div>

      {/* FLASH DEALS COUNTDOWN TICKER (Lag-Free Isolated Micro-Component) */}
      <div id="deals" className="deals-strip">
        <div className="deals-header">
          <span className="deals-badge">⚡ {lang === 'ta' ? 'மின்னல் சலுகை' : 'Lightning Deals'}</span>
          <span className="deals-title">{lang === 'ta' ? 'அதிகபட்ச மொத்த சேமிப்பு & உடனடி சலுகைகள்' : 'Tiered Wholesale Discounts & Flash Specials'}</span>
          <div className="deal-progress-wrap" style={{ minWidth: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 800 }}>
              <span style={{ color: '#dc2626' }}>🔥 {lang === 'ta' ? '82% விற்கப்பட்டது' : '82% Claimed'}</span>
              <span style={{ color: 'var(--text-soft)' }}>{lang === 'ta' ? 'விரைவாக முடிகிறது' : 'Fast selling'}</span>
            </div>
            <div className="deal-progress-bar">
              <div className="deal-progress-fill" style={{ width: '82%' }} />
            </div>
          </div>
        </div>
        <FlashDealsTicker />
      </div>

      {/* TRUST BADGES STRIP */}
      <div className="trust-strip">
        <div className="trust-item">
          <div className="trust-icon-box"><ShieldCheck size={20} /></div>
          <div>
            <b>100% Genuine Supplies</b>
            <span>JK Copier, Epson OEM, Hauser, Classmate</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon-box"><Truck size={20} /></div>
          <div>
            <b>Express Delivery over ₹500</b>
            <span>Rapid doorstep local dispatch</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon-box"><Tag size={20} /></div>
          <div>
            <b>Lots Wholesale Slabs</b>
            <span>Tiered quantity discounts on every product</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon-box"><Printer size={20} /></div>
          <div>
            <b>Printable GST Invoices</b>
            <span>Full input credit for Xerox shops & offices</span>
          </div>
        </div>
      </div>

      {/* 1. SEPARATE SECTION: XEROX SHOPS NEEDS */}
      <section style={{ marginTop: '28px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🖨️</span> Xerox Shops Needs (A4, Refill Inks, Lamination)
            </h2>
            <p className="section-subtitle">JK Copier 75 GSM cartons, original refill ink bottles, laminating pouches & spiral supplies</p>
          </div>
          <Link to="/category/xerox-printing" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View All Xerox <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {xeroxProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* 2. SEPARATE SECTION: RETAILERS PRODUCTS (Wholesale Slabs) */}
      <section style={{ marginTop: '36px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏪</span> Retailers & Resellers Wholesale Slabs (High Margin)
            </h2>
            <p className="section-subtitle">Hauser XO 10u boxes, Luxor Correction Pens, Cello Butterflow jars & Fevicol trays</p>
          </div>
          <Link to="/category/retailer-bulk" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View All Wholesale <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {retailerProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* 3. SEPARATE SECTION: OFFICE NEEDS */}
      <section style={{ marginTop: '36px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏢</span> Office Needs & Corporate Desk Supplies
            </h2>
            <p className="section-subtitle">Citizen commercial calculators, Kangaro staplers, lever arch files, ledger registers & desk trays</p>
          </div>
          <Link to="/category/office-products" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View All Office <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {officeProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* 4. SEPARATE SECTION: SCHOOL ESSENTIALS */}
      <section style={{ marginTop: '36px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎒</span> School Essentials & Student Hamper
            </h2>
            <p className="section-subtitle">Classmate longbooks, Camlin geometry boxes, bi-colour pencils & exam pouches</p>
          </div>
          <Link to="/category/school-essentials" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View All School <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {schoolProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* 5. SEPARATE SECTION: CELEBRATION ITEMS (DECORATIONS) */}
      <section style={{ marginTop: '36px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎉</span> Celebration Items & Party Decorations
            </h2>
            <p className="section-subtitle">Metallic balloons, golden birthday buntings, foil fringe curtains, curling ribbons & poppers</p>
          </div>
          <Link to="/category/celebration-decor" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View All Decor <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {celebrationProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* 6. SEPARATE SECTION: JAPANESE & AESTHETIC STATIONERY */}
      <section style={{ marginTop: '36px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌸</span> Japanese Imports & Aesthetic Scooboo Trends
            </h2>
            <p className="section-subtitle">Zebra Mildliners, Sarasa Vintage gel pens, 160 GSM journals & Boba transformer pouches</p>
          </div>
          <Link to="/category/aesthetic-pens" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
            View Aesthetic <ChevronRight size={14} />
          </Link>
        </div>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {aestheticProducts.map(p => {
            const cartItem = cart.find(i => i.productId === p.id)
            return (
              <ProductCard
                key={p.id}
                product={p}
                customerType={customerType}
                isWished={wishlist.includes(p.id)}
                onToggleWish={() => toggleWishlist(p.id)}
                onAddToCart={() => addToCart(p.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>

      {/* ALL PRODUCTS COMPLETE CATALOGUE */}
      <section id="catalogue" style={{ marginTop: '44px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Complete Stationery & Business Catalog ({filteredProducts.length})</h2>
            <p className="section-subtitle">Browse all supplies with instant stock availability and tiered discount slabs</p>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="catalog-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setActiveSectorTab('all') }}
              className="sort-select"
            >
              <option value="all">All Sectors & Categories</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="sort-select"
            >
              <option value="all">All Brands</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {filteredProducts.map(product => {
            const cartItem = cart.find(i => i.productId === product.id)
            return (
              <ProductCard
                key={product.id}
                product={product}
                customerType={customerType}
                isWished={wishlist.includes(product.id)}
                onToggleWish={() => toggleWishlist(product.id)}
                onAddToCart={() => addToCart(product.id, 1)}
                cartQty={cartItem?.quantity || 0}
                onUpdateCartQty={newQty => updateCartQty(product.id, newQty - (cartItem?.quantity || 0))}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   PRODUCT CARD COMPONENT (Lots Wholesale Tiered Pricing - Image 3)
   ========================================================================== */
function ProductCard({
  product, customerType, isWished, onToggleWish, onAddToCart, cartQty = 0, onUpdateCartQty, lang = 'en'
}: {
  product: Product
  customerType: CustomerType
  isWished: boolean
  onToggleWish: () => void
  onAddToCart: () => void
  cartQty?: number
  onUpdateCartQty?: (newQty: number) => void
  lang?: Language
}) {
  const [internalQty, setInternalQty] = useState(1)
  const currentQty = cartQty > 0 ? cartQty : internalQty
  const currentPrice = unitPrice(product, currentQty, customerType)
  const discountPct = Math.round(((product.mrp - currentPrice) / product.mrp) * 100)
  const tiers = getProductTiers(product)
  const displayName = (lang === 'ta' && product.nameTa) ? product.nameTa : product.name
  const bulkTier = tiers.find(t => t.minQty > 1)

  return (
    <div className="product-card">
      {/* Top Left Discount Badge */}
      {discountPct > 0 ? (
        <span className="card-badge" style={{ color: '#16a34a', borderColor: '#bbf7d0', background: 'rgba(240, 253, 244, 0.95)' }}>
          {discountPct}% {lang === 'ta' ? 'தள்ளுபடி' : 'OFF'}
        </span>
      ) : product.badge ? (
        <span className="card-badge">{product.badge}</span>
      ) : null}

      {/* Top Right Wishlist Heart */}
      <button
        className={`wish-button ${isWished ? 'active' : ''}`}
        onClick={onToggleWish}
        title={isWished ? (lang === 'ta' ? 'விருப்பத்திலிருந்து நீக்கு' : 'Remove from wishlist') : (lang === 'ta' ? 'விருப்பத்தில் சேர்' : 'Save to wishlist')}
      >
        <Heart size={14} fill={isWished ? 'currentColor' : 'none'} />
      </button>

      {/* Image with Delivery Speed Tag */}
      <Link to={`/product/${product.id}`} className="product-image-wrap">
        <img src={product.image} alt={displayName} loading="lazy" />
        {product.deliveryTime && (
          <span className="card-flash-pill" style={{ background: 'rgba(22, 101, 52, 0.92)' }}>
            <Zap size={9} /> {lang === 'ta' ? '30 நிமிடம்' : product.deliveryTime}
          </span>
        )}
      </Link>

      {/* Compact Content */}
      <div className="product-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="product-brand">{product.brand}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9.5px', fontWeight: 800, color: '#b45309', background: 'rgba(245, 158, 11, 0.12)', padding: '1px 4px', borderRadius: '4px' }}>
              ★ {product.rating || 4.8}
            </span>
          </div>
        </div>

        <Link to={`/product/${product.id}`} className="product-title" title={displayName}>
          {displayName}
        </Link>

        {/* Compact 1-Line Bulk Slab Pill (Smaller not longer) */}
        {bulkTier ? (
          <div className="compact-bulk-tag">
            <span className="compact-bulk-badge">BULK</span>
            <span className="compact-bulk-text">{bulkTier.minQty}+ units at {money(bulkTier.price)} ({bulkTier.discountPct}% OFF)</span>
          </div>
        ) : (
          <div style={{ minHeight: '18px' }} />
        )}

        {/* Horizontal Price Row */}
        <div className="compact-price-row">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span className="compact-price-main">{money(currentPrice)}</span>
            {product.mrp > currentPrice && (
              <span className="compact-price-mrp">{money(product.mrp)}</span>
            )}
          </div>
          <span className="compact-unit-pill">{product.unit}</span>
        </div>

        {/* Compact Add Button / Stepper */}
        <div className="card-actions" style={{ marginTop: 'auto' }}>
          {cartQty > 0 ? (
            <div className="qty-stepper" style={{ width: '100%', justifyContent: 'space-between', height: '30px' }}>
              <button className="qty-btn" onClick={() => onUpdateCartQty ? onUpdateCartQty(cartQty - 1) : null}>
                <Minus size={11} />
              </button>
              <span className="qty-value" style={{ fontWeight: 800, fontSize: '12px' }}>{cartQty}</span>
              <button className="qty-btn" onClick={() => onUpdateCartQty ? onUpdateCartQty(cartQty + 1) : null}>
                <Plus size={11} />
              </button>
            </div>
          ) : (
            <button
              className="lots-add-btn"
              style={{ width: '100%', height: '30px', fontSize: '11.5px', fontWeight: 800 }}
              onClick={onAddToCart}
            >
              {lang === 'ta' ? 'சேர்' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   IMAGE 1 & IMAGE 2: TWO-PANE CATEGORY BROWSER
   ========================================================================== */
function CategoryPage({
  products, categories: storeCategories, customerType, wishlist, toggleWishlist, addToCart, cart, updateCartQty, openCartDrawer, lang = 'en'
}: {
  products: Product[]
  categories: StationeryCategory[]
  customerType: CustomerType
  wishlist: number[]
  toggleWishlist: (id: number) => void
  addToCart: (id: number, qty?: number) => void
  cart: CartItem[]
  updateCartQty: (id: number, delta: number) => void
  openCartDrawer: () => void
  lang?: Language
}) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  
  // Find active category or default to first category (Xerox & Printing)
  const activeCategory = storeCategories.find(c => c.slug === slug) || storeCategories[0] || categories[0]
  const [activeSubcat, setActiveSubcat] = useState<string>('all')

  // Reset active subcategory when category changes
  useEffect(() => {
    setActiveSubcat('all')
  }, [slug])

  // Filter products by category and active subcategory
  const categoryProducts = useMemo(() => {
    let list = products.filter(p => p.category === activeCategory.slug)
    if (activeSubcat !== 'all') {
      list = list.filter(p => p.subcategory === activeSubcat)
    }
    return list
  }, [products, activeCategory.slug, activeSubcat])

  // Cart summary for floating bottom cart pill (Image 2)
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    if (!prod) return sum
    return sum + unitPrice(prod, item.quantity, customerType) * item.quantity
  }, 0)
  const cartSavings = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    if (!prod) return sum
    const currentPrice = unitPrice(prod, item.quantity, customerType)
    return sum + (prod.mrp - currentPrice) * item.quantity
  }, 0)
  const cartItemsPreview = cart.map(i => products.find(p => p.id === i.productId)).filter(Boolean) as Product[]

  const categoryTitle = lang === 'ta' ? activeCategory.nameTa : activeCategory.name

  return (
    <div className="container" style={{ padding: '16px 0 60px' }}>
      <div className="category-split-layout">
        {/* LEFT VERTICAL CATEGORY NAVIGATION RAIL (Image 1 & Image 3) */}
        <aside className="category-sidebar-rail">
          {/* Department Selector */}
          <div className="category-sidebar-header">
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '6px' }}>
              {t[lang].department}
            </div>
            <select
              className="category-sector-select"
              value={activeCategory.slug}
              onChange={e => {
                navigate(`/category/${e.target.value}`)
                setActiveSubcat('all')
              }}
            >
              {storeCategories.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.icon} {lang === 'ta' ? c.nameTa : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategories list for active department (e.g. Xerox Shows Xerox Subcategories: All Products, A4/A3 Paper, Printer Refill Inks, Lamination & Binding) */}
          <div style={{ padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', padding: '4px 8px' }}>
              {t[lang].categories}
            </div>
            {activeCategory.subcategories.map(sub => {
              const isSubActive = activeSubcat === sub.id
              const count = sub.id === 'all'
                ? products.filter(p => p.category === activeCategory.slug).length
                : products.filter(p => p.category === activeCategory.slug && p.subcategory === sub.id).length
              
              const subNameTa = sub.id === 'all' ? 'அனைத்து பொருட்கள்'
                : sub.id === 'copier-paper' ? 'A4 / A3 தாள்கள்'
                : sub.id === 'refill-inks' ? 'பிரிண்டர் மைகள்'
                : sub.id === 'laminating-binding' ? 'லேமினேஷன் & பைண்டிங்'
                : sub.name

              return (
                <button
                  key={sub.id}
                  type="button"
                  className={`category-sidebar-subcat-item ${isSubActive ? 'active' : ''}`}
                  onClick={() => setActiveSubcat(sub.id)}
                >
                  <span className="category-sidebar-subcat-icon">{sub.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.2 }}>{lang === 'ta' ? subNameTa : sub.name}</span>
                  <span className="category-sidebar-subcat-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Switch to Other Sectors */}
          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', padding: '10px 4px 4px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '6px', padding: '0 8px' }}>
              {t[lang].otherSectors}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {storeCategories.filter(c => c.slug !== activeCategory.slug).slice(0, 4).map(c => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    navigate(`/category/${c.slug}`)
                    setActiveSubcat('all')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px',
                    borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)',
                    textAlign: 'left', background: 'transparent', cursor: 'pointer', border: 'none'
                  }}
                >
                  <span>{c.icon}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lang === 'ta' ? c.nameTa : c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT PANE (Image 1 & Image 2) */}
        <main className="category-content-pane">
          {/* Top Header with Breadcrumb and Category Title */}
          <div className="category-pane-top-header">
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginBottom: '4px' }}>
                <Link to="/">{t[lang].home}</Link> / <span>{t[lang].categories}</span> / <b>{categoryTitle}</b>
              </div>
              <h1 className="category-pane-heading">
                <span>{activeCategory.icon}</span> {categoryTitle}
              </h1>
            </div>
            <span className="delivery-pill">
              <Zap size={11} /> {t[lang].expressDelivery}
            </span>
          </div>

          {/* Sub-Category Circular Bubbles Row (Image 1) */}
          <div className="subcategory-bubble-row">
            {activeCategory.subcategories.map(sub => {
              const isBubbleActive = activeSubcat === sub.id
              const subNameTa = sub.id === 'all' ? 'அனைத்து பொருட்கள்'
                : sub.id === 'copier-paper' ? 'A4 / A3 தாள்கள்'
                : sub.id === 'refill-inks' ? 'பிரிண்டர் மைகள்'
                : sub.id === 'laminating-binding' ? 'லேமினேஷன் & பைண்டிங்'
                : sub.name

              return (
                <div
                  key={sub.id}
                  className={`subcategory-bubble ${isBubbleActive ? 'active' : ''}`}
                  onClick={() => setActiveSubcat(sub.id)}
                >
                  <div className="subcategory-bubble-circle">
                    <span>{sub.icon}</span>
                  </div>
                  <span className="subcategory-bubble-name">{lang === 'ta' ? subNameTa : sub.name}</span>
                </div>
              )
            })}
          </div>

          {/* Item Count & Subheading (Image 2) */}
          <div className="item-count-header">
            <span>
              <b>{categoryProducts.length} {t[lang].items}</b> {t[lang].inCategory} {categoryTitle}
              {activeSubcat !== 'all' && ` · ${activeCategory.subcategories.find(s => s.id === activeSubcat)?.name || ''}`}
            </span>
          </div>

          {/* Product Grid (Mobile: 3 boxes across! PC: 4 columns) */}
          <div className="product-grid">
            {categoryProducts.map(p => {
              const cartItem = cart.find(i => i.productId === p.id)
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  customerType={customerType}
                  isWished={wishlist.includes(p.id)}
                  onToggleWish={() => toggleWishlist(p.id)}
                  onAddToCart={() => addToCart(p.id, 1)}
                  cartQty={cartItem?.quantity || 0}
                  onUpdateCartQty={newQty => updateCartQty(p.id, newQty - (cartItem?.quantity || 0))}
                  lang={lang}
                />
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ==========================================================================
   PRODUCT DETAIL VIEW (Amazon Specs Table, Reviews, Pincode Estimator)
   ========================================================================== */
function ProductDetailPage({
  products, customerType, wishlist, toggleWishlist, addToCart, userPincode
}: {
  products: Product[]
  customerType: CustomerType
  wishlist: number[]
  toggleWishlist: (id: number) => void
  addToCart: (id: number, qty?: number) => void
  userPincode: string
}) {
  const { id } = useParams<{ id: string }>()
  const product = products.find(p => p.id === Number(id))
  const [selectedImg, setSelectedImg] = useState<string>('')
  const [qty, setQty] = useState(1)
  const [pincodeCheck, setPincodeCheck] = useState(userPincode)
  const [estimatedDelivery, setEstimatedDelivery] = useState('Wednesday, 2-3 Days')

  useEffect(() => {
    if (product) setSelectedImg(product.image)
  }, [product])

  if (!product) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Product not found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Browse Products</Link>
      </div>
    )
  }

  const price = unitPrice(product, qty, customerType)
  const discountPct = Math.round(((product.mrp - price) / product.mrp) * 100)
  const reviews = sampleReviews[product.id] || []
  const freqItem = product.frequentlyBoughtWith ? products.find(p => p.id === product.frequentlyBoughtWith) : null

  return (
    <div className="container pdp-container">
      {/* Breadcrumb */}
      <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginBottom: '18px' }}>
        <Link to="/">Home</Link> / <Link to={`/category/${product.category}`}>{product.category}</Link> / <b>{product.name}</b>
      </div>

      <div className="pdp-grid">
        {/* Left: Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-image">
            <img src={selectedImg || product.image} alt={product.name} />
          </div>
          {product.gallery && product.gallery.length > 0 && (
            <div className="pdp-thumbs">
              {product.gallery.map((imgUrl, i) => (
                <div
                  key={i}
                  className={`pdp-thumb ${selectedImg === imgUrl ? 'active' : ''}`}
                  onClick={() => setSelectedImg(imgUrl)}
                >
                  <img src={imgUrl} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Purchase */}
        <div>
          <div className="pdp-brand">{product.brand} · SKU: {product.sku}</div>
          <h1 className="pdp-title">{product.name}</h1>

          <div className="pdp-rating-strip">
            <span className="rating-badge">
              {product.rating} <Star size={11} fill="#fff" />
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {product.reviewCount} verified customer ratings
            </span>
            <span style={{ color: 'var(--line)' }}>|</span>
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
              ✓ Agaram Assured
            </span>
          </div>

          {/* Price Box */}
          <div className="pdp-price-box">
            <div className="pdp-price-row">
              <span className="pdp-current-price">{money(price)}</span>
              <span className="pdp-mrp">{money(product.mrp)}</span>
              <span className="pdp-discount-badge">{discountPct}% OFF</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Inclusive of all taxes ({product.gst}% GST) · Unit: {product.unit}
            </div>

            {/* Wholesale slabs */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--line)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                📦 Quantity Wholesale Slabs (Schools & Offices):
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                <span style={{ background: '#fff', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: '4px' }}>
                  1-4 Units: <b>{money(product.price)}</b>
                </span>
                <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '4px', color: '#047857' }}>
                  5-9 Units: <b>Save 8%</b>
                </span>
                <span style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '4px', color: '#b45309' }}>
                  10+ Units: <b>Save 15%</b>
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: '24px' }}>
            {product.description}
          </p>

          {/* Pincode Estimator (Amazon Style) */}
          <div className="pdp-pincode-box">
            <div className="pdp-pincode-title">
              <Truck size={16} style={{ color: 'var(--primary)' }} />
              Check Delivery Options & Pincode
            </div>
            <div className="pdp-pincode-input-row">
              <input
                type="text"
                maxLength={6}
                value={pincodeCheck}
                onChange={e => setPincodeCheck(e.target.value)}
                placeholder="Enter 6-digit Pincode"
                className="pdp-pincode-input"
              />
              <button
                className="pdp-pincode-btn"
                onClick={() => setEstimatedDelivery('Free Delivery by Tomorrow, 5 PM')}
              >
                Check
              </button>
            </div>
            {estimatedDelivery && (
              <div className="pdp-delivery-estimate">
                <CheckCircle2 size={15} /> {estimatedDelivery} to pincode <b>{pincodeCheck}</b>
              </div>
            )}
          </div>

          {/* Add to Cart Actions */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px' }}>
            <div className="qty-stepper" style={{ height: '46px' }}>
              <button className="qty-btn" style={{ width: '36px' }} onClick={() => setQty(q => Math.max(1, q - 1))}>
                <Minus size={14} />
              </button>
              <span className="qty-value" style={{ width: '36px', fontSize: '14px' }}>{qty}</span>
              <button className="qty-btn" style={{ width: '36px' }} onClick={() => setQty(q => q + 1)}>
                <Plus size={14} />
              </button>
            </div>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: '46px', fontSize: '14px' }}
              onClick={() => addToCart(product.id, qty)}
            >
              <ShoppingCart size={18} /> Add to Cart · {money(price * qty)}
            </button>
            <button
              className={`wish-button ${wishlist.includes(product.id) ? 'active' : ''}`}
              style={{ position: 'static', width: '46px', height: '46px' }}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart size={20} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="wish-button"
              style={{ position: 'static', width: '46px', height: '46px' }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    text: `Buy ${product.name} at Agaram Stationery Mart!`,
                    url: window.location.href,
                  }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Product link copied to clipboard!')
                }
              }}
              title="Share Product"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Technical Specifications */}
          {product.specs && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>
                Technical Details & Specifications
              </h3>
              <table className="specs-table">
                <tbody>
                  {Object.entries(product.specs).map(([key, val]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Frequently Bought Together (Amazon Style Bundle) */}
          {freqItem && (
            <div className="bundle-box">
              <div className="bundle-title">
                <Sparkles size={18} style={{ color: '#ea580c' }} /> Frequently Bought Together
              </div>
              <div className="bundle-items">
                <img src={product.image} alt={product.name} className="bundle-item-thumb" />
                <span className="bundle-plus">+</span>
                <img src={freqItem.image} alt={freqItem.name} className="bundle-item-thumb" />
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800 }}>
                    Buy both for {money(product.price + freqItem.price)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                    Save ₹50 combo discount
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '12.5px' }}
                onClick={() => {
                  addToCart(product.id, 1)
                  addToCart(freqItem.id, 1)
                }}
              >
                Add Both Items to Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="reviews-section">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>
          Customer Reviews & Ratings
        </h2>
        <div className="reviews-grid">
          <div className="reviews-score-card">
            <div className="reviews-big-score">{product.rating}</div>
            <div className="rating-stars-gold">★★★★★</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Based on {product.reviewCount} customer reviews
            </div>
          </div>

          <div>
            {reviews.length > 0 ? (
              reviews.map(rev => (
                <div key={rev.id} className="review-card">
                  <div className="review-header">
                    <span className="review-author">
                      {rev.author}
                      {rev.verified && <span className="verified-buyer-badge">✓ Verified Buyer</span>}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{rev.date}</span>
                  </div>
                  <div style={{ color: '#f59e0b', fontSize: '13px', marginBottom: '4px' }}>
                    {'★'.repeat(rev.rating)}
                  </div>
                  <div className="review-title">{rev.title}</div>
                  <p className="review-text">{rev.comment}</p>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No written customer reviews yet. Be the first to share your thoughts on this item!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Sticky Glass Buy Bar */}
      <div className="mobile-sticky-buy-bar">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '95px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Total Price</span>
          <b style={{ fontSize: '17px', color: 'var(--primary)', lineHeight: 1.1 }}>{money(price * qty)}</b>
        </div>
        <button
          className="btn btn-primary"
          style={{ flex: 1, height: '42px', fontSize: '13px' }}
          onClick={() => addToCart(product.id, qty)}
        >
          <ShoppingCart size={16} /> Add to Cart
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   DEDICATED CART PAGE
   ========================================================================== */
function CartPage({
  cart, products, customerType, updateCartQty, removeFromCart
}: {
  cart: CartItem[]
  products: Product[]
  customerType: CustomerType
  updateCartQty: (id: number, delta: number) => void
  removeFromCart: (id: number) => void
}) {
  const subtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    return sum + (prod ? unitPrice(prod, item.quantity, customerType) * item.quantity : 0)
  }, 0)

  return (
    <div className="container" style={{ padding: '36px 0 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>
        Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
      </h1>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '50px', marginBottom: '14px' }}>🛍️</div>
          <h2>Your cart is currently empty</h2>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Shop Stationery</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div>
            {cart.map(item => {
              const prod = products.find(p => p.id === item.productId)
              if (!prod) return null
              const price = unitPrice(prod, item.quantity, customerType)
              return (
                <div key={item.productId} style={{
                  display: 'flex', gap: '16px', padding: '16px', background: '#fff',
                  border: '1px solid var(--line)', borderRadius: '12px', marginBottom: '12px'
                }}>
                  <img src={prod.image} alt={prod.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div style={{ flex: 1 }}>
                    <Link to={`/product/${prod.id}`} style={{ fontWeight: 700, fontSize: '14px' }}>
                      {prod.name}
                    </Link>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {prod.brand} · {prod.unit}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary)', marginTop: '6px' }}>
                      {money(price * item.quantity)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => updateCartQty(item.productId, -1)}><Minus size={12} /></button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateCartQty(item.productId, 1)}><Plus size={12} /></button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
              <span>Items Total</span>
              <b>{money(subtotal)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px' }}>
              <span>Delivery</span>
              <span style={{ color: subtotal >= 499 ? '#15803d' : 'inherit', fontWeight: 700 }}>
                {subtotal >= 499 ? 'FREE' : money(49)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, borderTop: '1px solid var(--line)', paddingTop: '14px', marginBottom: '20px' }}>
              <span>Grand Total</span>
              <span style={{ color: 'var(--primary)' }}>{money(subtotal + (subtotal >= 499 ? 0 : 49))}</span>
            </div>
            <Link to="/checkout" className="btn btn-primary" style={{ width: '100%' }}>
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   CHECKOUT PAGE (With GST Support for School / Institutional Orders)
   ========================================================================== */
function CheckoutPage({
  cart, products, customerType, userPincode, clearCart, currentUser, setCurrentUser, lang = 'en'
}: {
  cart: CartItem[]
  products: Product[]
  customerType: CustomerType
  userPincode: string
  clearCart: () => void
  currentUser: { id?: string; name?: string; email?: string; phone?: string } | null
  setCurrentUser: (u: { id?: string; name?: string; email?: string; phone?: string } | null) => void
  lang?: Language
}) {
  const navigate = useNavigate()
  const [name, setName] = useState(currentUser?.name || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Chennai')
  const [pincode, setPincode] = useState(userPincode)
  const [gstin, setGstin] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [paymentMode, setPaymentMode] = useState<'upi' | 'card' | 'cod'>('upi')
  const [placing, setPlacing] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [mapAddressPickerOpen, setMapAddressPickerOpen] = useState(false)

  // In-checkout auth state for guests
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSavedAddresses([])
    if (currentUser?.id) {
      if (!name && currentUser.name) setName(currentUser.name)
      if (!email && currentUser.email) setEmail(currentUser.email)
      setPhone(currentUser.phone || '')
      const localAddresses = loadSavedAddresses(currentUser.id).addresses
      const localOrders = readStorage<ApiOrder[]>('abm_orders', []).filter(order => order.userId === currentUser.id)
      Promise.allSettled([fetchUserAddresses(), fetchUserOrders(currentUser.email, currentUser.id)]).then(([addressesResult, ordersResult]) => {
        if (cancelled) return
        const remoteAddresses = addressesResult.status === 'fulfilled'
          ? addressesResult.value.filter(item => !item.expiresAt || Date.parse(item.expiresAt) > Date.now())
          : []
        // Prefer account records, but preserve a locally cached address if the API
        // returns an empty list or is temporarily unavailable.
        const merged = [...remoteAddresses, ...localAddresses]
        const unique = new Map<string, SavedAddress>()
        for (const item of merged) {
          const key = `${item.address.trim().toLowerCase()}|${item.city.trim().toLowerCase()}|${item.pincode}`
          const current = unique.get(key)
          unique.set(key, current ? { ...item, isDefault: current.isDefault || item.isDefault } : item)
        }
        const available = [...unique.values()].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        setSavedAddresses(available)
        const remoteOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : []
        const latestOrder = remoteOrders[0] || localOrders[0]
        const preferred = available[0]
        if (preferred) {
          setName(currentUser.name || preferred.name)
          setPhone(preferred.phone || currentUser.phone || latestOrder?.phone || '')
          setAddress(preferred.address)
          setCity(preferred.city)
          setPincode(preferred.pincode)
        } else if (latestOrder) {
          setName(currentUser.name || latestOrder.customerName)
          setPhone(currentUser.phone || latestOrder.phone || '')
          setAddress(latestOrder.address || '')
          setCity(latestOrder.city || '')
          setPincode(latestOrder.pincode || userPincode)
        }
      })
    } else {
      setName(currentUser?.name || '')
      setEmail(currentUser?.email || '')
      setPhone(currentUser?.phone || '')
      setAddress('')
      setCity('')
      setPincode(userPincode)
    }
    return () => { cancelled = true }
  }, [currentUser?.id, currentUser?.name, currentUser?.email, currentUser?.phone, userPincode])

  const subtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    return sum + (prod ? unitPrice(prod, item.quantity, customerType) * item.quantity : 0)
  }, 0)

  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPct) / 100) : 0
  const deliveryFee = subtotal >= 499 ? 0 : 49
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee)

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)
    try {
      if (authTab === 'signup') {
        const res = await signUp(authName, authEmail, authPassword)
        if (res.user) {
          setCurrentUser(res.user)
          setName(res.user.name || authName)
          setEmail(res.user.email || authEmail)
        } else {
          setAuthSuccess(res.message || 'Account created! Please sign in.')
          setAuthTab('signin')
        }
      } else {
        const res = await customerLogin(authEmail, authPassword)
        setCurrentUser(res.user)
        setName(res.user.name || '')
        setEmail(res.user.email || authEmail)
        setPhone(res.user.phone || '')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const applyCoupon = async () => {
    setCouponError('')
    try {
      const match = await validateCoupon(couponCode, subtotal)
      setAppliedCoupon(match)
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon')
    }
  }

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      alert(lang === 'ta' ? 'ஆர்டர் செய்ய தயவுசெய்து உள்நுழையவும் அல்லது கணக்கு தொடங்கவும்.' : 'Please sign in or create an account to place your order.')
      return
    }
    if (!name || !phone || !address || !pincode) {
      alert(lang === 'ta' ? 'அனைத்து முகவரி விவரங்களையும் நிரப்பவும்.' : 'Please fill all required address details.')
      return
    }
    setPlacing(true)
    const orderData = {
      items: cart,
      customerName: name,
      phone,
      email,
      address,
      city,
      pincode,
      customerType,
      gstin,
    }
    const matchingAddress = savedAddresses.find(item => item.address === address && item.city === city && item.pincode === pincode)
    const nextAddresses: SavedAddress[] = [
      { id: matchingAddress?.id || `address-${Date.now()}`, name, phone, address, city, pincode, isDefault: true },
      ...savedAddresses.filter(item => item.id !== matchingAddress?.id && !(item.address === address && item.city === city && item.pincode === pincode)).map(item => ({ ...item, isDefault: false })),
    ].slice(0, 20)
    setSavedAddresses(nextAddresses)
    saveUserAddresses(currentUser.id, nextAddresses)
    try {
      await saveUserAddressesRemote(nextAddresses).catch(() => {})
      const res = await createOrder({ ...orderData, userId: currentUser?.id })
      const existing = readStorage<ApiOrder[]>('abm_orders', []).filter(order => order.id !== res.order.id)
      localStorage.setItem('abm_orders', JSON.stringify([res.order, ...existing]))
      notifyCoinBalanceChanged()
      clearCart()
      navigate(`/invoice/${res.order.id}`)
    } catch {
      // Fallback local order
      const localId = `ABM-${Date.now().toString().slice(-6)}`
      const localOrder: ApiOrder = {
        id: localId,
        userId: currentUser?.id,
        date: new Date().toLocaleDateString('en-IN'),
        items: cart,
        total: grandTotal,
        subtotal,
        tax: Math.round(subtotal * 0.18),
        discount,
        customerType,
        coinsEarned: Math.floor(grandTotal / 100),
        customerName: name,
        email,
        phone,
        address,
        city,
        pincode,
        gstin,
      }
      const existing = readStorage<ApiOrder[]>('abm_orders', []).filter(order => order.id !== localId)
      localStorage.setItem('abm_orders', JSON.stringify([localOrder, ...existing]))
      notifyCoinBalanceChanged()
      clearCart()
      navigate(`/invoice/${localId}`)
    } finally {
      setPlacing(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '50px', marginBottom: '14px' }}>🛍️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
          {lang === 'ta' ? 'உங்கள் கூடை காலியாக உள்ளது' : 'Your cart is empty'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          {lang === 'ta' ? 'செக்அவுட் செய்வதற்கு முன் பொருட்களைக் கூடையில் சேர்க்கவும்.' : 'Please add stationery items or school supplies to your cart before checking out.'}
        </p>
        <Link to="/" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
          {lang === 'ta' ? 'ஷாப்பிங் தொடங்குக' : 'Shop Stationery'}
        </Link>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '36px 0 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>
        {lang === 'ta' ? 'செக்அவுட் & விநியோகம்' : 'Checkout & Shipping'}
      </h1>

      <div className="checkout-grid">
        {/* Left Column: Auth Gate OR Shipping & Payment Details */}
        {!currentUser ? (
          <div className="checkout-card" style={{ border: '2px solid var(--primary-border)', background: 'linear-gradient(180deg, #ffffff 0%, rgba(254, 242, 242, 0.5) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>
                🔒
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {lang === 'ta' ? 'செக்அவுட் செய்ய கணக்கு தேவை' : 'Sign In or Create Account to Place Order'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'ta' ? 'கூடை மற்றும் விருப்பப்பட்டியலை நீங்கள் பயன்படுத்தலாம். ஆர்டர் செய்ய உள்நுழையவும்.' : 'Guests can freely cart & wishlist products. To finalize your order and generate your GST invoice, please sign in or register.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setAuthTab('signin'); setAuthError('') }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                  background: authTab === 'signin' ? 'var(--primary)' : 'rgba(0,0,0,0.05)',
                  color: authTab === 'signin' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {lang === 'ta' ? 'உள்நுழைக (Sign In)' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setAuthError('') }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                  background: authTab === 'signup' ? 'var(--primary)' : 'rgba(0,0,0,0.05)',
                  color: authTab === 'signup' ? '#ffffff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {lang === 'ta' ? 'புதிய கணக்கு (Create Account)' : 'Create Account'}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '14px' }}>
              {authError && (
                <div style={{ padding: '10px 14px', background: '#ffe4e6', color: '#b91c1c', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div style={{ padding: '10px 14px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  {authSuccess}
                </div>
              )}

              {authTab === 'signup' && (
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  {lang === 'ta' ? 'முழு பெயர் *' : 'Full Name *'}
                  <input
                    required
                    type="text"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    placeholder="e.g. Riyash Khan"
                    className="pdp-pincode-input"
                  />
                </label>
              )}

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                {lang === 'ta' ? 'மின்னஞ்சல் முகவரி *' : 'Email Address *'}
                <input
                  required
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pdp-pincode-input"
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                {lang === 'ta' ? 'கடவுச்சொல் * (குறைந்தது 10 எழுத்துக்கள்)' : 'Password * (min 10 characters)'}
                <input
                  required
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="pdp-pincode-input"
                />
              </label>

              <button
                type="submit"
                disabled={authLoading}
                className="btn btn-primary"
                style={{ marginTop: '8px', height: '44px', fontSize: '14px', fontWeight: 800 }}
              >
                {authLoading
                  ? (lang === 'ta' ? 'சரிபார்க்கிறது...' : 'Processing...')
                  : authTab === 'signin'
                    ? (lang === 'ta' ? 'உள்நுழைந்து முகவரி நிரப்பவும்' : 'Sign In & Continue to Shipping')
                    : (lang === 'ta' ? 'கணக்கு தொடங்கி தொடரவும்' : 'Create Account & Continue')}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} id="checkout-order-form">
            {/* Logged in customer banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--primary-light)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--primary-border)', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>
                    {lang === 'ta' ? 'ஆர்டர் செய்பவர்' : 'Ordering as'}: {currentUser.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try { await logout() } catch {}
                  setCurrentUser(null)
                }}
                style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
              >
                {lang === 'ta' ? 'கணக்கு மாற்று' : 'Switch Account'}
              </button>
            </div>

            {/* Shipping details */}
            <div className="checkout-card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>1. Delivery Address</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {savedAddresses.length > 0 && <button type="button" className="btn btn-secondary" onClick={() => setAddressPickerOpen(value => !value)}>Saved addresses ({savedAddresses.length})</button>}
                  <button type="button" className="btn btn-secondary" onClick={() => setMapAddressPickerOpen(true)}><MapPin size={15} /> Choose on map</button>
                </div>
              </div>
              {addressPickerOpen && <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {savedAddresses.map(item => <button key={item.id} type="button" className="btn btn-secondary" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => { setName(item.name); setPhone(item.phone); setAddress(item.address); setCity(item.city); setPincode(item.pincode); setAddressPickerOpen(false) }}>
                  <span><b>{item.name}</b> · {item.address}, {item.city} {item.pincode}</span>{item.isDefault && <small>Default</small>}
                </button>)}
              </div>}
              <div className="checkout-fields-grid">
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Full Name *
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Riyash Khan" className="pdp-pincode-input" />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Mobile Phone *
                  <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9840012345" className="pdp-pincode-input" />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Email Address
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="pdp-pincode-input" />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  PIN Code *
                  <input required value={pincode} onChange={e => setPincode(e.target.value)} placeholder="600001" className="pdp-pincode-input" />
                </label>
                <label style={{ gridColumn: '1 / -1', display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Street Address & Landmark *
                  <textarea required rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Door no, Street name, Area" className="pdp-pincode-input" />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  City *
                  <input required value={city} onChange={e => setCity(e.target.value)} className="pdp-pincode-input" />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  GSTIN (For School/Tax Invoice)
                  <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="Optional 15-digit GSTIN" className="pdp-pincode-input" />
                </label>
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 800, marginTop: '28px', marginBottom: '14px' }}>2. Payment Method</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--line)', borderRadius: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="payment" checked={paymentMode === 'upi'} onChange={() => setPaymentMode('upi')} />
                  <div>
                    <b>UPI / QR Code (Google Pay, PhonePe, Paytm)</b>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Fastest 1-click payment</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--line)', borderRadius: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="payment" checked={paymentMode === 'card'} onChange={() => setPaymentMode('card')} />
                  <div>
                    <b>Credit / Debit Card / NetBanking</b>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Visa, MasterCard, RuPay</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--line)', borderRadius: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="payment" checked={paymentMode === 'cod'} onChange={() => setPaymentMode('cod')} />
                  <div>
                    <b>Cash on Delivery (COD)</b>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Pay cash or UPI at delivery doorstep</span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        )}

        {/* Order Summary & Coupon */}
        <div className="checkout-card">
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Order Total</h3>

          {/* Coupon Input */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Have a Promo Coupon?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                placeholder="e.g. AESTHETIC10"
                className="pdp-pincode-input"
                style={{ textTransform: 'uppercase' }}
              />
              <button type="button" onClick={applyCoupon} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ color: '#15803d', fontSize: '11.5px', fontWeight: 700, marginTop: '6px' }}>
                ✓ Coupon '{appliedCoupon.code}' applied! Saved {appliedCoupon.discountPct}%
              </div>
            )}
            {couponError && (
              <div style={{ color: '#e11d48', fontSize: '11.5px', marginTop: '6px' }}>{couponError}</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#15803d' }}>
              <span>Coupon Discount</span>
              <b>- {money(discount)}</b>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px' }}>
            <span>Express Delivery</span>
            <span style={{ color: deliveryFee === 0 ? '#15803d' : 'inherit', fontWeight: 700 }}>
              {deliveryFee === 0 ? 'FREE' : money(deliveryFee)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, borderTop: '1px solid var(--line)', paddingTop: '14px', marginBottom: '20px' }}>
            <span>To Pay</span>
            <span style={{ color: 'var(--primary)' }}>{money(grandTotal)}</span>
          </div>

          {currentUser ? (
            <button
              type="submit"
              form="checkout-order-form"
              disabled={placing}
              className="btn btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '14px', fontWeight: 800 }}
            >
              {placing ? (lang === 'ta' ? 'ஆர்டர் செய்யப்படுகிறது...' : 'Placing Order...') : (lang === 'ta' ? `ஆர்டர் செய்க · ${money(grandTotal)}` : `Place Order · ${money(grandTotal)}`)}
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--primary-light)', borderRadius: '12px', border: '1px dashed var(--primary-border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
                {lang === 'ta' ? 'உள்நுழைவு தேவை' : 'Account Required to Order'}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {lang === 'ta' ? 'செக்அவுட் செய்ய பக்கத்தில் உள்ள படிவத்தில் உள்நுழையவும்' : 'Please sign in or create an account on the left to complete your order.'}
              </div>
            </div>
          )}
        </div>
      </div>
      <MapLocationPickerModal isOpen={mapAddressPickerOpen} onClose={() => setMapAddressPickerOpen(false)} currentPincode={pincode} onSelectAddress={location => { setAddress(location.address); setCity(location.city); setPincode(location.pincode); setMapAddressPickerOpen(false) }} lang={lang} />
    </div>
  )
}

/* ==========================================================================
   TAX INVOICE PAGE (Printable & Downloadable GST Invoice)
   ========================================================================== */
function InvoicePage({ products, currentUser, lang = 'en', onOpenTracking }: { products: Product[]; currentUser: { id?: string; name?: string; email?: string } | null; lang?: Language; onOpenTracking?: (orderId: string, address: string) => void }) {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setOrder(null)
    if (!currentUser?.id || !orderId) {
      setLoading(false)
      return () => { cancelled = true }
    }
    setLoading(true)
    const localOrders = readStorage<ApiOrder[]>('abm_orders', [])
    const localOrder = localOrders.find(item => item.id === orderId && item.userId === currentUser.id)
    if (localOrder) setOrder(localOrder)
    fetchUserOrders(currentUser.email, currentUser.id)
      .then(orders => { if (!cancelled) setOrder(orders.find(item => item.id === orderId) || localOrder || null) })
      .catch(() => { if (!cancelled) setOrder(localOrder || null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentUser, orderId])

  if (loading) return <div className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>Loading your invoice…</div>
  if (!order) return (
    <div className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22 }}>Invoice not found</h1>
      <p style={{ color: 'var(--text-muted)' }}>{currentUser ? 'This invoice is not linked to your account.' : 'Sign in to view your invoices.'}</p>
      <Link to={currentUser ? '/account?tab=orders' : '/account'} className="btn btn-primary">{currentUser ? 'Back to my orders' : 'Sign in'}</Link>
    </div>
  )

  // Calculate items with GST & taxable breakdown matching Image 2
  const lineItems = order.items.map((item, idx) => {
    const prod = products.find(p => p.id === item.productId)
    const gstRate = prod?.gst || 18
    const basePrice = prod ? unitPrice(prod, item.quantity, order.customerType) : 160
    const taxableUnitRate = Math.round((basePrice / (1 + gstRate / 100)) * 100) / 100
    const taxableTotal = Math.round((taxableUnitRate * item.quantity) * 100) / 100
    const gstAmount = Math.round((taxableTotal * (gstRate / 100)) * 100) / 100
    const lineTotal = Math.round((taxableTotal + gstAmount) * 100) / 100

    return {
      index: idx + 1,
      name: prod?.name || 'Desk Stapler Set',
      nameTa: prod?.nameTa,
      sku: prod?.sku || 'ABM-ST-007',
      brand: prod?.brand || 'WorkDesk',
      hsn: 'Verify',
      quantity: item.quantity,
      unitRate: taxableUnitRate,
      taxableValue: taxableTotal,
      gstRate,
      gstAmount,
      lineTotal,
    }
  })

  const totalTaxable = lineItems.reduce((sum, item) => sum + item.taxableValue, 0)
  const totalGst = lineItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = totalTaxable + totalGst
  const cgst = totalGst / 2
  const sgst = totalGst / 2

  return (
    <div className="container" style={{ padding: '36px 0 60px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <Link to="/" className="btn btn-secondary"><ArrowLeft size={16} /> {lang === 'ta' ? 'கடைக்குத் திரும்பு' : 'Back to Store'}</Link>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onOpenTracking && (
            <button
              onClick={() => onOpenTracking(order.id, `${order.address || 'Cuddalore'} - ${order.pincode || '607001'}`)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 800 }}
            >
              <span>🛵</span> {lang === 'ta' ? 'நேரலை வரைபடம்' : 'Track Partner on Map'}
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={16} /> {lang === 'ta' ? 'விலைப்பட்டியலை அச்சிடுக' : 'Print Tax Invoice'}
          </button>
        </div>
      </div>

      {/* ORIGINAL INVOICE CARD (Image 2) */}
      <div className="original-invoice-card">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/abm-logo.png" alt="Agaram Business Mart" style={{ height: '46px', width: 'auto' }} />
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                Agaram Business Mart
              </h1>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Cuddalore, Tamil Nadu, India</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>7871096937 · deva123@gmail.com</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.06em' }}>
              TAX INVOICE PREVIEW
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: '2px 0' }}>
              {order.id}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {order.date}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Status: Demo order</div>
          </div>
        </div>

        {/* Pink Dividing Line */}
        <div style={{ borderBottom: '2px solid #e11d48', margin: '18px 0 20px' }} />

        {/* Two-Column Metadata (BILL TO / SHIP TO & ORDER DETAILS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.04em', marginBottom: '6px' }}>
              BILL TO / SHIP TO
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{order.customerName || 'ABM Demo Customer'}</div>
            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>{order.email || 'riyashkhan484@gmail.com'}</div>
            <div style={{ fontSize: '11.5px', color: '#475569' }}>{order.address || 'Cuddalore'} - {order.pincode || '607001'}</div>
            <div style={{ fontSize: '11.5px', color: '#475569' }}>Phone: {order.phone || '9876543210'}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>demo@abm.in</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.04em', marginBottom: '6px' }}>
              ORDER DETAILS
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>Customer order</div>
            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>Invoice number: {order.id}</div>
            <div style={{ fontSize: '11.5px', color: '#475569' }}>Payment: Demo selection only</div>
            <div style={{ fontSize: '11.5px', color: '#475569' }}>Place of supply: Cuddalore, Tamil Nadu</div>
          </div>
        </div>

        {/* Pink-Headed Items Table */}
        <div className="invoice-table-responsive">
          <table className="original-invoice-table">
            <thead>
              <tr>
                <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                <th style={{ textAlign: 'left' }}>Product / SKU</th>
                <th style={{ textAlign: 'center' }}>HSN</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit rate</th>
                <th style={{ textAlign: 'right' }}>Taxable value</th>
                <th style={{ textAlign: 'center' }}>GST %</th>
                <th style={{ textAlign: 'right' }}>GST amount</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.index}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{item.index}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {lang === 'ta' && item.nameTa ? item.nameTa : item.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {item.sku} · {item.brand}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{item.hsn}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.unitRate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.taxableValue.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{item.gstRate}%</td>
                  <td style={{ textAlign: 'right' }}>₹{item.gstAmount.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Callout Note & Tax Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', margin: '20px 0 28px', alignItems: 'start' }}>
          {/* Important Invoice Note Box */}
          <div className="original-invoice-note">
            <b style={{ fontSize: '11.5px', display: 'block', marginBottom: '6px', color: '#854d0e' }}>
              Important invoice note
            </b>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              This is a sample invoice preview for the ABM prototype, not a legally valid tax invoice. HSN codes, GST rates, GSTIN, legal entity details, invoice numbering and tax calculation must be verified and configured before live commercial use.
            </p>
            <p style={{ margin: 0 }}>
              CGST / SGST split shown in the summary is illustrative for an assumed intra-state sale in Tamil Nadu.
            </p>
          </div>

          {/* Tax Summary & Grand Total */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Taxable subtotal</span>
              <b>₹{totalTaxable.toFixed(2)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Estimated GST</span>
              <b>₹{totalGst.toFixed(2)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px', paddingLeft: '10px' }}>
              <span>CGST (illustrative)</span>
              <span>₹{cgst.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px', paddingLeft: '10px' }}>
              <span>SGST (illustrative)</span>
              <span>₹{sgst.toFixed(2)}</span>
            </div>

            <div style={{ borderTop: '2px solid #e11d48', margin: '6px 0 2px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Grand total</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'right', fontStyle: 'italic' }}>
              Amount in words: {numberToWords(Math.round(grandTotal))} only
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap', gap: '8px' }}>
          <span>Thank you for shopping with Agaram Business Mart.</span>
          <span>Generated by ABM demo storefront</span>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   WISHLIST PAGE
   ========================================================================== */
function WishlistPage({
  wishlist, products, customerType, toggleWishlist, addToCart
}: {
  wishlist: number[]
  products: Product[]
  customerType: CustomerType
  toggleWishlist: (id: number) => void
  addToCart: (id: number, qty?: number) => void
}) {
  const wishedProducts = products.filter(p => wishlist.includes(p.id))

  return (
    <div className="container" style={{ padding: '36px 0 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>
        My Wishlist ({wishedProducts.length})
      </h1>
      {wishedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
          <h2>Your wishlist is empty</h2>
          <p style={{ color: 'var(--text-muted)' }}>Save your favourite cute stationery items to purchase later!</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Explore Stationery</Link>
        </div>
      ) : (
        <div className="product-grid">
          {wishedProducts.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              customerType={customerType}
              isWished={true}
              onToggleWish={() => toggleWishlist(p.id)}
              onAddToCart={() => addToCart(p.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   ACCOUNT & SIGN-IN PAGE
   ========================================================================== */
function AccountPage({
  currentUser, setCurrentUser, lang = 'en', onOpenTracking
}: {
  currentUser: { id?: string; name?: string; email?: string } | null
  setCurrentUser: (u: { id?: string; name?: string; email?: string } | null) => void
  lang?: Language
  onOpenTracking?: (orderId: string, address: string) => void
}) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      setOrders([])
      return
    }
    setLoadingOrders(true)
    fetchUserOrders(currentUser.email, currentUser.id).then(setOrders).catch(() => setOrders([])).finally(() => {
      setLoadingOrders(false)
    })
  }, [currentUser])

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      if (isSignUp) {
        const res = await signUp(name, email, password)
        setMessage(res.message || 'Check your email for the verification link.')
        if (res.user) {
          setCurrentUser(res.user)
        }
      } else {
        const res = await customerLogin(email, password)
        setCurrentUser(res.user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  return (
    <div className="container" style={{ padding: '36px 0 60px', maxWidth: '820px' }}>
      {/* User Profile or Login Box */}
      {currentUser ? (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontSize: '22px', fontWeight: 800 }}>
              {currentUser.name?.[0] || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{currentUser.name}</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentUser.email}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              try { await logout() } catch {}
              setCurrentUser(null)
            }}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            {t[lang].signOut}
          </button>
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow-glass)', textAlign: 'center', maxWidth: '440px', margin: '0 auto 36px' }}>
          <img src="/abm-logo.png" alt="Agaram Stationery Mart" style={{ height: '48px', width: 'auto', margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
            {isSignUp ? (lang === 'ta' ? 'புதிய கணக்கு உருவாக்கு' : 'Create your Account') : (lang === 'ta' ? 'அகரம் ஸ்டேஷனரிக்கு வருக' : 'Welcome to Agaram')}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            {isSignUp ? (lang === 'ta' ? 'ஆர்டர்களைக் கண்காணிக்க கணக்கு உருவாக்கவும்' : 'Sign up to track stationery orders and save wishlist') : (lang === 'ta' ? 'உங்கள் ஆர்டர்களைக் காண உள்நுழைக' : 'Sign in to access your orders and invoices')}
          </p>

          {error && <div style={{ color: '#e11d48', fontSize: '12px', background: '#ffe4e6', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>{error}</div>}
          {message && <div style={{ color: '#047857', fontSize: '12px', background: '#dcfce7', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>{message}</div>}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isSignUp && (
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700, textAlign: 'left' }}>
                {lang === 'ta' ? 'உங்கள் பெயர்' : 'Your Name'}
                <input required value={name} onChange={e => setName(e.target.value)} className="pdp-pincode-input" />
              </label>
            )}
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700, textAlign: 'left' }}>
              {lang === 'ta' ? 'மின்னஞ்சல்' : 'Email Address'}
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pdp-pincode-input" />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700, textAlign: 'left' }}>
              {lang === 'ta' ? 'கடவுச்சொல்' : 'Password'}
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pdp-pincode-input" />
            </label>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
              {isSignUp ? (lang === 'ta' ? 'கணக்கு தொடங்கு' : 'Create Account') : (lang === 'ta' ? 'உள்நுழை' : 'Sign In')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px' }}>
            {isSignUp ? (lang === 'ta' ? 'ஏற்கனவே கணக்கு உள்ளதா?' : 'Already have an account?') : (lang === 'ta' ? 'கணக்கு இல்லையா?' : "Don't have an account?")}{' '}
            <button onClick={() => setIsSignUp(s => !s)} style={{ color: 'var(--primary)', fontWeight: 800 }}>
              {isSignUp ? (lang === 'ta' ? 'உள்நுழை' : 'Sign In') : (lang === 'ta' ? 'பதிவு செய்' : 'Sign Up')}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE RESPONSIVE ORDERS SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800, margin: 0 }}>
            {t[lang].orderHistory} ({orders.length})
          </h2>
          <Link to="/" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '5px 12px' }}>
            {lang === 'ta' ? 'தொடர்ந்து வாங்க' : 'Continue Shopping'}
          </Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={42} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <b style={{ fontSize: '15px', display: 'block', color: 'var(--text-main)', marginBottom: '4px' }}>
              {t[lang].noOrders}
            </b>
            <p style={{ fontSize: '12.5px', margin: 0, marginBottom: '16px' }}>
              {lang === 'ta' ? 'உங்கள் ஆர்டர்கள் இங்கு தோன்றும்' : 'When you place an order, its details and GST invoice will appear here.'}
            </p>
            <Link to="/" className="btn btn-primary" style={{ fontSize: '12.5px' }}>
              {lang === 'ta' ? 'பொருட்களைப் பார்' : 'Explore Products'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => (
              <div key={order.id} className="account-order-card">
                <div className="account-order-header">
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Order #{order.id}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                      {new Date(order.date).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px' }}>
                      ✓ {lang === 'ta' ? 'உறுதியானது' : 'Confirmed'}
                    </span>
                    <b style={{ fontSize: '15px', color: 'var(--primary)' }}>
                      {money(order.total)}
                    </b>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <b>{order.items.length}</b> {order.items.length === 1 ? 'item' : 'items'} ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
                    {order.customerName && <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Deliver to: {order.customerName}, {order.city}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {onOpenTracking && (
                      <button
                        onClick={() => onOpenTracking(order.id, `${order.address || 'Cuddalore'} - ${order.pincode || '607001'}`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 800 }}
                      >
                        <span>🛵</span> {lang === 'ta' ? 'வரைபடம்' : 'Track Map'}
                      </button>
                    )}
                    <Link
                      to={`/invoice/${order.id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Printer size={13} /> {lang === 'ta' ? 'வரி ரசீது' : 'Tax Invoice'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   REAL-TIME STORE ADMINISTRATOR & PRODUCT UPLOAD PORTAL
   ========================================================================== */
function AdminPage({
  products, setProducts, lang = 'en'
}: {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  lang?: Language
}) {
  const [auth, setAuth] = useState(false)
  const [email, setEmail] = useState('admin@abm.in')
  const [password, setPassword] = useState('AdminABM123')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [activeTab, setActiveTab] = useState<'upload' | 'inventory' | 'orders'>('upload')
  const [successToast, setSuccessToast] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleUpdateProduct = (updated: Product) => {
    setProducts(prev => {
      const list = prev.map(p => p.id === updated.id ? updated : p)
      const custom = readStorage<Product[]>('abm_custom_products', [])
      const exists = custom.some(p => p.id === updated.id)
      const newCustom = exists ? custom.map(p => p.id === updated.id ? updated : p) : [updated, ...custom]
      localStorage.setItem('abm_custom_products', JSON.stringify(newCustom))
      return list
    })
    saveProduct(updated).catch(() => {})
    setSuccessToast(`Product "${updated.name}" updated successfully in realtime!`)
    setTimeout(() => setSuccessToast(''), 4000)
    setEditingProduct(null)
  }

  // Product form state for real-time upload
  const [formData, setFormData] = useState({
    name: '',
    nameTa: '',
    category: 'xerox-printing' as CategorySlug,
    subcategory: 'copier-paper',
    brand: 'JK Copier',
    unit: '1 Ream (500 sheets)',
    mrp: 340,
    price: 275,
    stock: 150,
    sku: `ABM-PRD-${Math.floor(1000 + Math.random() * 9000)}`,
    gst: 12,
    badge: 'Xerox Best Seller',
    deliveryTime: '30 MINS',
    description: 'High brightness 75 GSM copier paper designed for fast jam-free photocopiers and laser printers.',
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=700&q=85',
    tier1Qty: 1,
    tier1Price: 275,
    tier2Qty: 3,
    tier2Price: 255,
    tier3Qty: 10,
    tier3Price: 235,
  })

  // Load orders when authenticated
  useEffect(() => {
    if (auth) {
      fetchAdminOrders().then(setOrders).catch(() => {
        setOrders(readStorage<ApiOrder[]>('abm_orders', []))
      })
    }
  }, [auth])

  // Handle local image file upload converting directly to base64 Data URL
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) {
      alert('Please choose an image under 2.5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, image: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  // Preset image selector for quick one-click filling
  const presetImages = [
    { label: '📄 A4 Copier Paper', url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=700&q=85', cat: 'xerox-printing', brand: 'JK Copier' },
    { label: '💧 Refill Ink Bottles', url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=700&q=85', cat: 'xerox-printing', brand: 'Epson' },
    { label: '🖊️ Ball Pen Box', url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=700&q=85', cat: 'retailer-bulk', brand: 'Hauser' },
    { label: '🧮 Desk Calculator', url: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=700&q=85', cat: 'office-products', brand: 'Citizen' },
    { label: '📓 School Longbooks', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=85', cat: 'school-essentials', brand: 'Classmate' },
    { label: '🎈 Party Balloons', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=700&q=85', cat: 'celebration-decor', brand: 'Agaram Select' },
  ]

  // Real-time product publishing
  const handlePublishProduct = (e: FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter a product title')
      return
    }

    const newId = Math.max(...products.map(p => p.id), 2000) + 1
    const p1 = Number(formData.tier1Price) || Number(formData.price)
    const p2 = Number(formData.tier2Price) || Math.round(p1 * 0.92)
    const p3 = Number(formData.tier3Price) || Math.round(p1 * 0.85)

    const compiledTiers: WholesaleTier[] = [
      {
        minQty: Number(formData.tier1Qty) || 1,
        maxQty: (Number(formData.tier2Qty) || 3) - 1,
        label: `${formData.tier1Qty}-${(Number(formData.tier2Qty) || 3) - 1} units`,
        price: p1,
        discountPct: Math.round(((formData.mrp - p1) / formData.mrp) * 100),
      },
      {
        minQty: Number(formData.tier2Qty) || 3,
        maxQty: (Number(formData.tier3Qty) || 6) - 1,
        label: `${formData.tier2Qty}-${(Number(formData.tier3Qty) || 6) - 1} units`,
        price: p2,
        discountPct: Math.round(((formData.mrp - p2) / formData.mrp) * 100),
      },
      {
        minQty: Number(formData.tier3Qty) || 6,
        label: `${formData.tier3Qty}+ units`,
        price: p3,
        discountPct: Math.round(((formData.mrp - p3) / formData.mrp) * 100),
      },
    ]

    const newProductItem: Product = {
      id: newId,
      name: formData.name.trim(),
      nameTa: formData.nameTa.trim() || undefined,
      category: formData.category,
      subcategory: formData.subcategory,
      brand: formData.brand.trim() || 'Agaram Select',
      price: Number(formData.price),
      mrp: Number(formData.mrp),
      unit: formData.unit.trim(),
      image: formData.image,
      badge: formData.badge.trim() || undefined,
      description: formData.description.trim() || 'Stationery essential supplied by Agaram Business Mart.',
      stock: Number(formData.stock) || 100,
      gst: Number(formData.gst) || 12,
      sku: formData.sku.trim(),
      rating: 4.9,
      reviewCount: 1,
      deliveryTime: formData.deliveryTime.trim() || '30 MINS',
      tiers: compiledTiers,
    }

    // 1. Instantly update live React state
    setProducts(prev => {
      const updated = [newProductItem, ...prev]
      // 2. Persist in local storage
      const custom = readStorage<Product[]>('abm_custom_products', [])
      localStorage.setItem('abm_custom_products', JSON.stringify([newProductItem, ...custom]))
      return updated
    })

    // 3. Sync with backend API asynchronously
    saveProduct(newProductItem).catch(() => {})

    // 4. Trigger UI notification
    setSuccessToast(`🎉 "${newProductItem.name}" published live to storefront in real-time!`)
    setTimeout(() => setSuccessToast(''), 6000)

    // Reset form with a fresh SKU
    setFormData(prev => ({
      ...prev,
      name: '',
      nameTa: '',
      sku: `ABM-PRD-${Math.floor(1000 + Math.random() * 9000)}`,
    }))
  }

  // Toggle stock availability in real time
  const toggleStock = (id: number) => {
    setProducts(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, stock: p.stock > 0 ? 0 : 50 } : p))
      const custom = readStorage<Product[]>('abm_custom_products', [])
      const updatedCustom = custom.map(p => (p.id === id ? { ...p, stock: p.stock > 0 ? 0 : 50 } : p))
      localStorage.setItem('abm_custom_products', JSON.stringify(updatedCustom))
      return updated
    })
  }

  // Delete product in real time
  const handleDeleteProduct = (id: number) => {
    if (!window.confirm('Are you sure you want to remove this product from the catalogue?')) return
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id)
      const custom = readStorage<Product[]>('abm_custom_products', [])
      localStorage.setItem('abm_custom_products', JSON.stringify(custom.filter(p => p.id !== id)))
      return updated
    })
    deleteProduct(id).catch(() => {})
  }

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchSector = sectorFilter === 'all' || p.category === sectorFilter
      return matchSearch && matchSector
    })
  }, [products, searchTerm, sectorFilter])

  if (!auth) {
    return (
      <div className="container" style={{ padding: '60px 0', maxWidth: '400px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: 'var(--shadow-glass)' }}>
          <img src="/abm-logo.png" alt="Agaram Admin" style={{ height: '52px', width: 'auto', margin: '0 auto 14px', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Store Administrator</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Sign in to manage listings, real-time uploads, and customer invoices.
          </p>
          <form onSubmit={e => { e.preventDefault(); setAuth(true) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700, textAlign: 'left' }}>
              Admin Email
              <input value={email} onChange={e => setEmail(e.target.value)} className="pdp-pincode-input" />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700, textAlign: 'left' }}>
              Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pdp-pincode-input" />
            </label>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Sign In to Admin
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '36px 0 60px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/abm-logo.png" alt="Agaram Admin" style={{ height: '46px', width: 'auto', background: '#fff', padding: '4px', borderRadius: '10px' }} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 800 }}>Real-Time Admin Console</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live product upload, tiered pricing slabs & orders management</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <Eye size={14} /> View Storefront
          </Link>
          <button onClick={() => setAuth(false)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Real-time Toast Banner */}
      {successToast && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, animation: 'fadeIn 0.2s ease' }}>
          <CheckCircle size={20} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Metric Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live Store Products</div>
          <b style={{ fontSize: '30px', color: 'var(--primary)' }}>{products.length}</b>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customer Orders</div>
          <b style={{ fontSize: '30px', color: '#2563eb' }}>{orders.length}</b>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-Time Engine</div>
          <b style={{ fontSize: '18px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            ● Active & Synchronized
          </b>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud size={16} /> 🚀 Upload New Product (Realtime)
        </button>
        <button
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inventory')}
        >
          <LayoutGrid size={16} /> 📦 Product Inventory ({products.length})
        </button>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={16} /> 📑 Orders Placed ({orders.length})
        </button>
      </div>

      {/* TAB 1: REAL-TIME PRODUCT UPLOAD */}
      {activeTab === 'upload' && (
        <div className="admin-card">
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            Publish Product Live to Store
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Fill the details below. As soon as you click "Publish Product", it appears in real time across the website without page refresh.
          </p>

          <div className="admin-form-grid">
            {/* Form Column */}
            <form onSubmit={handlePublishProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Product Title (English) *
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. JK Copier A4 Paper 75 GSM (Carton of 5 Reams)"
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Tamil Title (Optional)
                  <input
                    value={formData.nameTa}
                    onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                    placeholder="e.g. ஜேகே காப்பியர் ஏ4 தாள்"
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Sector / Category *
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as CategorySlug })}
                    className="sort-select"
                    style={{ width: '100%' }}
                  >
                    <option value="xerox-printing">🖨️ Xerox Shops Needs</option>
                    <option value="retailer-bulk">🏪 Retailers Wholesale Slabs</option>
                    <option value="office-products">🏢 Office Needs</option>
                    <option value="school-essentials">🎒 School Essentials</option>
                    <option value="celebration-decor">🎉 Celebration & Decor</option>
                    <option value="aesthetic-pens">🖊️ Aesthetic & Gel Pens</option>
                    <option value="highlighters-markers">🖍️ Pastel Highlighters</option>
                    <option value="notebooks-journals">📓 Notebooks & Journals</option>
                    <option value="sticky-notes-washi">📑 Sticky Notes & Washi</option>
                    <option value="desk-organizers">🗄️ Desk Organizers</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Brand Name
                  <input
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. JK Copier, Hauser, Epson"
                    className="pdp-pincode-input"
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Unit Specification
                  <input
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. 1 Ream (500 sheets), Pack of 10"
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              {/* Pricing & Slabs */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <b style={{ fontSize: '13px', display: 'block', marginBottom: '10px', color: '#0f172a' }}>
                  Lots Wholesale Tiered Pricing Slabs (Image 3 Style)
                </b>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                    Standard MRP (₹)
                    <input
                      type="number"
                      value={formData.mrp}
                      onChange={e => setFormData({ ...formData, mrp: Number(e.target.value) })}
                      className="pdp-pincode-input"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                    Selling Price (₹)
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value), tier1Price: Number(e.target.value) })}
                      className="pdp-pincode-input"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                    Tier 2 (3-5 units) Price
                    <input
                      type="number"
                      value={formData.tier2Price}
                      onChange={e => setFormData({ ...formData, tier2Price: Number(e.target.value) })}
                      className="pdp-pincode-input"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                    Tier 3 (6+ units) Price
                    <input
                      type="number"
                      value={formData.tier3Price}
                      onChange={e => setFormData({ ...formData, tier3Price: Number(e.target.value) })}
                      className="pdp-pincode-input"
                    />
                  </label>
                </div>
              </div>

              {/* Stock, SKU, Badge, Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Stock Qty
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  SKU Code
                  <input
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Badge Tag
                  <input
                    value={formData.badge}
                    onChange={e => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. 23% OFF, Top Pick"
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Delivery Tag
                  <input
                    value={formData.deliveryTime}
                    onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                    placeholder="e.g. 30 MINS"
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              {/* Image Uploader */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Product Image (Upload File or Enter URL)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="product-file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="product-file-input" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={16} /> Choose Image from Computer
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or paste URL:</span>
                  <input
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="pdp-pincode-input"
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>Quick Presets:</span>
                  {presetImages.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setFormData(prev => ({ ...prev, image: preset.url, category: preset.cat as CategorySlug, brand: preset.brand }))}
                      style={{ fontSize: '10.5px', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Description
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="pdp-pincode-input"
                  style={{ height: 'auto', padding: '8px' }}
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 800, marginTop: '10px' }}
              >
                🚀 Publish Product in Realtime
              </button>
            </form>

            {/* Live Preview Column */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} /> Real-Time Live Preview (Image 3 Style)
              </div>
              <div style={{ maxWidth: '260px', margin: '0 auto' }}>
                <ProductCard
                  product={{
                    id: 9999,
                    name: formData.name || 'Your Product Title Here',
                    category: formData.category,
                    brand: formData.brand || 'Agaram Select',
                    price: Number(formData.price) || 275,
                    mrp: Number(formData.mrp) || 340,
                    unit: formData.unit || '1 Unit',
                    image: formData.image,
                    badge: formData.badge || 'New',
                    description: formData.description,
                    stock: formData.stock,
                    gst: formData.gst,
                    sku: formData.sku,
                    rating: 4.9,
                    reviewCount: 1,
                    deliveryTime: formData.deliveryTime,
                    tiers: [
                      { minQty: 1, maxQty: 2, label: '1-2 units', price: Number(formData.tier1Price) || Number(formData.price), discountPct: Math.round(((formData.mrp - (formData.tier1Price || formData.price)) / formData.mrp) * 100) },
                      { minQty: 3, maxQty: 5, label: '3-5 units', price: Number(formData.tier2Price) || Math.round(formData.price * 0.92), discountPct: Math.round(((formData.mrp - (formData.tier2Price || formData.price * 0.92)) / formData.mrp) * 100) },
                    ],
                  }}
                  customerType="retail"
                  isWished={false}
                  onToggleWish={() => {}}
                  onAddToCart={() => alert('This is a live preview of the card.')}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & CATALOG LIST */}
      {activeTab === 'inventory' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Manage Catalog Listings ({filteredInventory.length})</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by title, SKU, brand..."
                className="pdp-pincode-input"
                style={{ width: '220px' }}
              />
              <select
                value={sectorFilter}
                onChange={e => setSectorFilter(e.target.value)}
                className="sort-select"
              >
                <option value="all">All Sectors</option>
                <option value="xerox-printing">🖨️ Xerox Needs</option>
                <option value="retailer-bulk">🏪 Retailer Bulk</option>
                <option value="office-products">🏢 Office Needs</option>
                <option value="school-essentials">🎒 School Essentials</option>
                <option value="celebration-decor">🎉 Celebration Decor</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredInventory.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  transition: 'background 0.15s ease',
                }}
              >
                <img src={p.image} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: '13.5px' }}>{p.name}</b>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {p.sku} · {p.brand} · {p.unit} · <span style={{ color: p.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock'}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginRight: '14px' }}>
                  <b style={{ fontSize: '15px' }}>{money(p.price)}</b>
                  <div style={{ fontSize: '10px', color: 'var(--text-soft)', textDecoration: 'line-through' }}>
                    MRP {money(p.mrp)}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => setEditingProduct(p)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Edit Product Details"
                >
                  ✏️ {lang === 'ta' ? 'திருத்து' : 'Edit'}
                </button>

                {/* Stock Toggle Switch */}
                <button
                  onClick={() => toggleStock(p.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px', color: p.stock > 0 ? '#16a34a' : '#dc2626' }}
                >
                  {p.stock > 0 ? (lang === 'ta' ? 'இருப்பில் இல்லை' : 'Mark Out of Stock') : (lang === 'ta' ? 'இருப்பில் உள்ளது' : 'Mark In Stock')}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteProduct(p.id)}
                  style={{ color: '#dc2626', background: 'none', padding: '6px', cursor: 'pointer', border: 'none' }}
                  title="Delete Product"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REAL-TIME CUSTOMER ORDERS */}
      {activeTab === 'orders' && (
        <div className="admin-card">
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
            Customer Orders Placed ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Package size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <b>No orders placed yet.</b>
              <p style={{ fontSize: '13px' }}>Customer orders placed via checkout will show up here instantly in real time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                    <div>
                      <b style={{ fontSize: '14px' }}>Order #{order.id}</b>
                      <span style={{ fontSize: '11px', color: 'var(--text-soft)', marginLeft: '10px' }}>{new Date(order.date).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <b style={{ fontSize: '16px', color: 'var(--primary)' }}>{money(order.total)}</b>
                      <Link to={`/invoice/${order.id}`} className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                        <Printer size={13} /> GST Invoice
                      </Link>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Customer:</span> <b>{order.customerName}</b> ({order.phone})
                      <div style={{ color: 'var(--text-soft)', fontSize: '11px' }}>{order.email}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Address:</span>
                      <div>{order.address}, {order.city} - {order.pincode}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Items:</span>
                      <div>{order.items.length} line items ({order.items.reduce((s, i) => s + i.quantity, 0)} total units)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="admin-modal-backdrop" onClick={() => setEditingProduct(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                ✏️ {lang === 'ta' ? 'தயாரிப்பைத் திருத்து' : 'Edit Product'}: {editingProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={e => {
              e.preventDefault()
              handleUpdateProduct(editingProduct)
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Product Title (English) *
                  <input
                    required
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Tamil Title (தமிழ் பெயர்)
                  <input
                    value={editingProduct.nameTa || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, nameTa: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Sector / Category
                  <select
                    value={editingProduct.category}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as CategorySlug })}
                    className="sort-select"
                    style={{ width: '100%' }}
                  >
                    <option value="xerox-printing">🖨️ Xerox Shops Needs</option>
                    <option value="retailer-bulk">🏪 Retailers Wholesale</option>
                    <option value="office-products">🏢 Office Needs</option>
                    <option value="school-essentials">🎒 School Essentials</option>
                    <option value="celebration-decor">🎉 Celebration & Decor</option>
                    <option value="aesthetic-pens">✍️ Aesthetic & Gel Pens</option>
                    <option value="highlighters-markers">🖍️ Pastel Highlighters</option>
                    <option value="notebooks-journals">📓 Notebooks & Journals</option>
                    <option value="sticky-notes-washi">📜 Sticky Notes & Washi</option>
                    <option value="desk-organizers">🗄️ Desk Organizers</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Brand Name
                  <input
                    value={editingProduct.brand}
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>

                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Unit Specification
                  <input
                    value={editingProduct.unit}
                    onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Selling Price (₹) *
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  MRP (₹) *
                  <input
                    type="number"
                    required
                    value={editingProduct.mrp}
                    onChange={e => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Stock Qty
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  SKU Code
                  <input
                    value={editingProduct.sku}
                    onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Badge Tag
                  <input
                    value={editingProduct.badge || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    placeholder="e.g. 23% OFF, Top Pick"
                    className="pdp-pincode-input"
                  />
                </label>
                <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Delivery Speed Tag
                  <input
                    value={editingProduct.deliveryTime || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, deliveryTime: e.target.value })}
                    placeholder="e.g. 30 MINS"
                    className="pdp-pincode-input"
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Product Image URL
                <input
                  value={editingProduct.image}
                  onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="pdp-pincode-input"
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Description
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="pdp-pincode-input"
                  style={{ height: 'auto', padding: '8px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="btn btn-secondary"
                >
                  {lang === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 24px', fontWeight: 800 }}
                >
                  ✓ {lang === 'ta' ? 'மாற்றங்களைச் சேமி' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   DEDICATED STANDALONE ADMIN SOFTWARE LAUNCHER & REDIRECT
   ========================================================================== */
function AdminRedirect() {
  useEffect(() => {
    window.location.replace('/admin.html')
  }, [])

  return (
    <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '36px', maxWidth: '440px', boxShadow: 'var(--shadow-glass)', border: '1px solid var(--line)' }}>
        <img src="/abm-logo.png" alt="Agaram" style={{ height: '46px', margin: '0 auto 14px', display: 'block' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Agaram Admin Software</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
          Redirecting to the dedicated, standalone Admin Software portal at <code>/admin.html</code>...
        </p>
        <a href="/admin.html" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
          Open Admin Software Portal ➔
        </a>
      </div>
    </div>
  )
}

function VerifyEmailPage({ setCurrentUser }: { setCurrentUser: (u: { id?: string; name?: string; email?: string } | null) => void }) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token found in URL.')
      return
    }
    verifyEmail(token)
      .then(res => {
        setStatus('success')
        setCurrentUser(res.user)
        setTimeout(() => navigate('/account'), 2000)
      })
      .catch(err => {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Verification link is invalid or has expired.')
      })
  }, [navigate, setCurrentUser])

  return (
    <div className="container" style={{ padding: '60px 0', maxWidth: '500px', textAlign: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '16px', padding: '36px', boxShadow: 'var(--shadow-md)' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>⏳</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Verifying your email...</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Please wait a moment while we confirm your account.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={42} style={{ color: '#15803d', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Email Verified Successfully!</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your account is now verified and active. Redirecting to your account dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={42} style={{ color: '#e11d48', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Verification Failed</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>{errorMsg}</p>
            <Link to="/account" className="btn btn-primary">Go to Sign In</Link>
          </>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   ABOUT & CONTACT STATIC PAGES
   ========================================================================== */
function AboutPage() {
  return (
    <div className="container" style={{ padding: '40px 0 60px', maxWidth: '800px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 800, marginBottom: '14px' }}>
        About Agaram Stationery Mart
      </h1>
      <p style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--text-muted)', marginBottom: '20px' }}>
        Agaram Business Mart was founded to bridge the gap between aesthetic Japanese/Korean stationery culture and everyday Indian school & college needs. Inspired by stores like Scooboo and e-commerce leaders like Amazon and Flipkart, we offer high-grade stationery tools, fast delivery, and bulk institutional pricing.
      </p>
    </div>
  )
}

function ContactPage() {
  return (
    <div className="container" style={{ padding: '40px 0 60px', maxWidth: '800px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 800, marginBottom: '14px' }}>
        Help & Support
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Need help with tracking, return requests, or school bulk orders? Get in touch with our team:
      </p>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>📍 <b>Address:</b> Agaram Business Mart, Anna Nagar, Chennai, Tamil Nadu - 600040</div>
        <div>📞 <b>Phone / WhatsApp:</b> +91 98400 12345</div>
        <div>✉️ <b>Email:</b> support@agaram.in / orders@agaram.in</div>
        <div>⏱️ <b>Working Hours:</b> Monday - Saturday, 9:00 AM - 7:00 PM IST</div>
      </div>
    </div>
  )
}
