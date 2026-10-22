import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { Footer } from './components/Footer'
import { DeliveryPartnerLiveMapModal } from './components/DeliveryPartnerLiveMapModal'
import { MapLocationPickerModal } from './components/MapLocationPickerModal'

import { HomePage } from './pages/HomePage'
import { CategoryPage } from './pages/CategoryPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartDrawer } from './pages/CartDrawer'
import { CheckoutPage } from './pages/CheckoutPage'
import { AccountPage } from './pages/AccountPage'
import { InvoicePage } from './pages/InvoicePage'
import { AboutPage, ContactPage } from './pages/StaticPages'

import {
  products as defaultProducts,
  Product,
  Language,
  CustomerType
} from './data/products'
import { fetchProducts, getSession, pingBackend, logout } from './api'

export function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // App Configuration & Language
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('abm_lang') as Language) || 'en'
  })

  // Customer Pricing Type: Wholesale focused!
  const [customerType, setCustomerType] = useState<CustomerType>(() => {
    return (localStorage.getItem('abm_customer_type') as CustomerType) || 'wholesale'
  })

  // Authenticated User Profile
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string; phone?: string; role?: string } | null>(() => {
    try {
      const stored = localStorage.getItem('abm_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Selected Delivery Location
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; city: string; pincode: string; label: string }>(() => {
    try {
      const stored = localStorage.getItem('abm_delivery_location')
      if (stored) return JSON.parse(stored)
    } catch {}
    return {
      address: 'Anna Nagar, Cuddalore Main Town',
      city: 'Cuddalore',
      pincode: '607001',
      label: 'Store & Warehouse'
    }
  })
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)

  // Products state (Merged default + custom + Neon DB live)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const custom = JSON.parse(localStorage.getItem('abm_custom_products') || '[]')
      if (custom && custom.length > 0) {
        const customIds = new Set(custom.map((p: Product) => p.id))
        const nonDuplicateDefaults = defaultProducts.filter(p => !customIds.has(p.id))
        return [...custom, ...nonDuplicateDefaults]
      }
    } catch {}
    return defaultProducts
  })

  // Cart State (Persisted: { productId: number, quantity: number }[])
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number }>>(() => {
    try {
      const stored = localStorage.getItem('abm_cart')
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })

  // Wishlist State (Persisted)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('abm_wishlist')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // UI Interactive Overlays
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [trackingModal, setTrackingModal] = useState<{ isOpen: boolean; orderId: string; address: string }>({
    isOpen: false,
    orderId: 'ABM-98214',
    address: 'Anna Nagar, Cuddalore'
  })

  // Synchronize state with LocalStorage
  useEffect(() => {
    localStorage.setItem('abm_lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('abm_customer_type', customerType)
  }, [customerType])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('abm_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('abm_user')
    }
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem('abm_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('abm_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  // Load and sync live products from Backend & Neon DB
  const loadLiveProducts = useCallback(async () => {
    try {
      const live = await fetchProducts()
      if (live && live.length > 0) {
        setProducts(live)
      }
    } catch (err) {
      console.warn('Backend fetch failed, using cached products:', err)
    }
  }, [])

  useEffect(() => {
    loadLiveProducts()
    pingBackend()

    // Listen for custom broadcast event from Admin portal
    const handleProductsUpdated = () => {
      loadLiveProducts()
    }
    window.addEventListener('abm_products_updated', handleProductsUpdated)

    // Check existing server session
    getSession()
      .then(res => {
        if (res?.user) {
          setCurrentUser(prev => prev || res.user)
        }
      })
      .catch(() => {})

    return () => {
      window.removeEventListener('abm_products_updated', handleProductsUpdated)
    }
  }, [loadLiveProducts])

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  // Cart Actions
  const handleAddToCart = (productId: number, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId)
      if (existing) {
        return prev.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity + qty } : item
        )
      }
      return [...prev, { productId, quantity: qty }]
    })
  }

  const handleUpdateCartQty = (productId: number, qtyOrDelta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId)
      if (!existing) {
        if (qtyOrDelta > 0) return [...prev, { productId, quantity: qtyOrDelta }]
        return prev
      }
      // If absolute quantity
      const newQty = qtyOrDelta
      if (newQty <= 0) {
        return prev.filter(item => item.productId !== productId)
      }
      return prev.map(item => (item.productId === productId ? { ...item, quantity: newQty } : item))
    })
  }

  const handleClearCart = () => {
    setCart([])
  }

  // Wishlist Actions
  const handleToggleWishlist = (productId: number) => {
    setWishlist(prev => (prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]))
  }

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout()
    } catch {}
    setCurrentUser(null)
  }

  // Delivery Partner Tracking Modal Handler
  const handleOpenTracking = (orderId?: string, address?: string) => {
    setTrackingModal({
      isOpen: true,
      orderId: orderId || 'ABM-98214',
      address: address || selectedLocation.address
    })
  }

  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. TOP HEADER WITH LOCATION PICKER & SEARCH */}
      <Header
        products={products}
        cartCount={cartTotalCount}
        wishlistCount={wishlist.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedLocation={selectedLocation}
        onOpenMapPicker={() => setIsLocationPickerOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        lang={lang}
        setLang={setLang}
        customerType={customerType}
        setCustomerType={setCustomerType}
      />

      {/* 2. MAIN APPLICATION ROUTES */}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* HOME PAGE */}
          <Route
            path="/"
            element={
              <HomePage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onToggleWishlist={handleToggleWishlist}
                onOpenTracking={() => handleOpenTracking()}
                customerType={customerType}
                setCustomerType={setCustomerType}
                lang={lang}
              />
            }
          />

          {/* CATEGORY PAGES */}
          <Route
            path="/category/:slug"
            element={
              <CategoryPage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onToggleWishlist={handleToggleWishlist}
                customerType={customerType}
                lang={lang}
              />
            }
          />
          <Route
            path="/c/:slug"
            element={
              <CategoryPage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onToggleWishlist={handleToggleWishlist}
                customerType={customerType}
                lang={lang}
              />
            }
          />

          {/* PRODUCT DETAIL PAGE */}
          <Route
            path="/product/:id"
            element={
              <ProductDetailPage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                customerType={customerType}
                lang={lang}
              />
            }
          />
          <Route
            path="/p/:id"
            element={
              <ProductDetailPage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                customerType={customerType}
                lang={lang}
              />
            }
          />

          {/* CHECKOUT PAGE */}
          <Route
            path="/checkout"
            element={
              <CheckoutPage
                cart={cart}
                products={products}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                userPincode={selectedLocation.pincode}
                onClearCart={handleClearCart}
                customerType={customerType}
                lang={lang}
              />
            }
          />

          {/* ACCOUNT & ISOLATED ORDERS PAGE */}
          <Route
            path="/account"
            element={
              <AccountPage
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                lang={lang}
                onOpenTracking={handleOpenTracking}
                products={products}
                cart={cart}
                onAddToCart={handleAddToCart}
                wishlist={wishlist}
                toggleWishlist={handleToggleWishlist}
                customerType={customerType}
              />
            }
          />

          {/* TAX INVOICE PAGE */}
          <Route
            path="/invoice/:orderId"
            element={
              <InvoicePage
                products={products}
                lang={lang}
                onOpenTracking={handleOpenTracking}
              />
            }
          />

          {/* STATIC INFORMATIONAL PAGES */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* FALLBACK REDIRECT TO HOME */}
          <Route
            path="*"
            element={
              <HomePage
                products={products}
                cart={cart}
                wishlist={wishlist}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onToggleWishlist={handleToggleWishlist}
                onOpenTracking={() => handleOpenTracking()}
                customerType={customerType}
                setCustomerType={setCustomerType}
                lang={lang}
              />
            }
          />
        </Routes>
      </main>

      {/* 3. FOOTER */}
      <Footer />

      {/* 4. MOBILE BOTTOM APP BAR */}
      <BottomNav
        cartCount={cartTotalCount}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
      />

      {/* 5. SLIDE-OVER CART DRAWER */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        onUpdateCartQty={handleUpdateCartQty}
        onClearCart={handleClearCart}
        customerType={customerType}
        lang={lang}
      />

      {/* 6. LIVE DELIVERY PARTNER TRACKING MAP MODAL */}
      <DeliveryPartnerLiveMapModal
        isOpen={trackingModal.isOpen}
        onClose={() => setTrackingModal(prev => ({ ...prev, isOpen: false }))}
        orderId={trackingModal.orderId}
        customerAddress={trackingModal.address}
        lang={lang}
      />

      {/* 7. MAP LOCATION PICKER MODAL */}
      <MapLocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        currentPincode={selectedLocation.pincode}
        onSelectAddress={loc => {
          setSelectedLocation(loc)
          localStorage.setItem('abm_delivery_location', JSON.stringify(loc))
          setIsLocationPickerOpen(false)
        }}
        lang={lang}
      />
    </div>
  )
}

export default App
