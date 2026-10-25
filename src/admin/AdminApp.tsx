import { useEffect, useState, useMemo, useRef } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Database,
  LogOut,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Printer,
  Eye,
  X,
  ArrowUpRight,
  ShieldCheck,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  Download,
  Image as ImageIcon,
  Menu,
  Layers,
  Star,
  ExternalLink,
  Store
} from 'lucide-react'
import {
  API_URL,
  fetchProducts,
  fetchStoreCategories,
  fetchAdminProducts,
  fetchAdminCategories,
  createProduct,
  saveProduct,
  deleteProduct,
  fetchAdminOrders,
  fetchAdminUsers,
  fetchAdminStats,
  updateOrderStatus,
  deleteAdminOrder,
  saveAdminCategories,
  deleteAdminCategory,
  pingBackend,
  adminLogin,
  getSession,
  logout,
  type ApiOrder,
  type ApiUser,
  type AdminStats
} from '../api'
import { categories as defaultCategories, mergeStoreCategories, brands, money, type Product, type CategorySlug, type StationeryCategory, getProductGallery, getProductTiers } from '../data/products'
import { StorefrontCategories } from './StorefrontCategories'
import { downloadProductSpreadsheetTemplate, parseProductSpreadsheet, type SpreadsheetProduct } from './productSpreadsheet'

type AdminTab = 'dashboard' | 'products' | 'storefront' | 'orders' | 'customers' | 'database'

export function AdminApp() {
  const [auth, setAuth] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('abm_admin_token'))
  })
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    const saved = localStorage.getItem('abm_admin_last_tab') as AdminTab | null
    return saved && ['dashboard', 'products', 'storefront', 'orders', 'customers', 'database'].includes(saved) ? saved : 'dashboard'
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('abm_admin_theme') === 'light' ? 'light' : 'dark')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Real-time Data
  const [products, setProducts] = useState<Product[]>([])
  const [storeCategories, setStoreCategories] = useState<StationeryCategory[]>(defaultCategories)
  const [savingCategories, setSavingCategories] = useState(false)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const [ordersLoadError, setOrdersLoadError] = useState('')

  // Modals & Filters
  const [productSearch, setProductSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const [previewActiveImageIdx, setPreviewActiveImageIdx] = useState(0)
  const [viewingOrder, setViewingOrder] = useState<ApiOrder | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  // File Upload input refs
  const addFileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const excelFileInputRef = useRef<HTMLInputElement>(null)
  const [excelProducts, setExcelProducts] = useState<SpreadsheetProduct[]>([])
  const [excelErrors, setExcelErrors] = useState<string[]>([])
  const [excelReading, setExcelReading] = useState(false)
  const [excelSaving, setExcelSaving] = useState(false)
  const [excelProgress, setExcelProgress] = useState(0)

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    nameTa: '',
    category: 'xerox-printing',
    brand: 'Agaram Select',
    price: 199,
    mrp: 249,
    unit: '1 Piece',
    stock: 50,
    gst: 18,
    sku: `ABM-${Math.floor(1000 + Math.random() * 9000)}`,
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
    gallery: ['https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80'],
    description: 'High-quality tested office & school supplies.',
    badge: 'NEW',
    rating: 4.8,
    reviewCount: 12
  })

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
    localStorage.setItem('abm_admin_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('abm_admin_last_tab', currentTab)
  }, [currentTab])

  // Check initial session
  useEffect(() => {
    getSession()
      .then(res => {
        if (res && res.role === 'admin') setAuth(true)
      })
      .catch(() => {})
  }, [])

  // Load all live data from Backend & Neon DB
  const refreshAllData = async () => {
    setLoading(true)
    setOrdersLoadError('')
    try {
      let orderError = ''
      const [prods, cats, ords, usrs, st] = await Promise.all([
        fetchAdminProducts().catch(() => fetchProducts()),
        fetchAdminCategories().catch(() => fetchStoreCategories()),
        fetchAdminOrders().catch(err => {
          orderError = err instanceof Error ? err.message : 'Orders could not be loaded.'
          return []
        }),
        fetchAdminUsers().catch(() => []),
        fetchAdminStats().catch(() => null)
      ])
      if (prods && prods.length > 0) {
        setProducts(prods)
        setDbConnected(true)
      } else {
        setDbConnected(false)
      }
      setStoreCategories(mergeStoreCategories(cats || []))
      setOrders(ords || [])
      setOrdersLoadError(orderError)
      setUsers(usrs || [])
      setStats(st)
    } catch (err) {
      console.error('Failed to refresh data:', err)
      setDbConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategories = async (nextCategories: StationeryCategory[]) => {
    setSavingCategories(true)
    try {
      const saved = await saveAdminCategories(nextCategories)
      setStoreCategories(mergeStoreCategories(saved))
      window.dispatchEvent(new CustomEvent('abm_categories_updated'))
      localStorage.setItem('abm_categories_refresh', String(Date.now()))
      setStatusMessage('Store categories saved and published.')
      window.setTimeout(() => setStatusMessage(''), 4000)
      return true
    } catch (err) {
      setStatusMessage(`Could not save categories: ${err instanceof Error ? err.message : 'Please try again.'}`)
      return false
    } finally {
      setSavingCategories(false)
    }
  }

  const handleDeleteCategory = async (slug: string) => {
    try {
      await deleteAdminCategory(slug)
      setStoreCategories(current => current.filter(category => category.slug !== slug))
      window.dispatchEvent(new CustomEvent('abm_categories_updated'))
      localStorage.setItem('abm_categories_refresh', String(Date.now()))
      setStatusMessage('Store category deleted.')
      window.setTimeout(() => setStatusMessage(''), 4000)
      return true
    } catch (err) {
      setStatusMessage(`Could not delete category: ${err instanceof Error ? err.message : 'Please try again.'}`)
      return false
    }
  }

  useEffect(() => {
    if (auth) refreshAllData()
  }, [auth])

  useEffect(() => {
    if (!auth) return
    const refreshTimer = window.setInterval(() => refreshAllData(), 30_000)
    return () => window.clearInterval(refreshTimer)
  }, [auth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      await adminLogin(adminEmail, password)
      setAuth(true)
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check admin credentials.')
    }
  }

  const handleLogout = async () => {
    await logout()
    setAuth(false)
  }

  // Pre-warm backend
  useEffect(() => {
    pingBackend()
  }, [])

  // Helper: Read file from device / phone
  const handleDeviceImageUpload = async (files: FileList | null, isEdit: boolean) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (selectedFiles.some(file => file.size > 2 * 1024 * 1024)) {
      setStatusMessage('Each image must be 2 MB or smaller. Please choose smaller files.')
      return
    }
    try {
      const dataUrls = await Promise.all(selectedFiles.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'))
        reader.onerror = () => reject(new Error('Could not read image'))
        reader.readAsDataURL(file)
      })))
      const addImages = (existing: string[]) => [...new Set([...dataUrls, ...existing])].slice(0, 5)
      if (isEdit) {
        setEditingProduct(prev => {
          if (!prev) return null
          const images = addImages(prev.gallery?.length ? prev.gallery : [prev.image])
          return { ...prev, image: images[0] || prev.image, gallery: images }
        })
      } else {
        setNewProduct(prev => {
          const images = addImages(prev.gallery?.length ? prev.gallery : [prev.image || ''])
          return { ...prev, image: images[0] || prev.image, gallery: images }
        })
      }
      setStatusMessage('Images added to the product gallery.')
      window.setTimeout(() => setStatusMessage(''), 3000)
    } catch {
      setStatusMessage('Could not read one of those images. Please try another file.')
    }
  }

  // Handle Save / Add Product (Optimistic + Neon DB)
  const handleSaveProduct = async (p: Product, isCreate = false) => {
    const price = Math.max(0, Number.isFinite(Number(p.price)) ? Number(p.price) : 0)
    const mrp = Math.max(price, Number.isFinite(Number(p.mrp)) ? Number(p.mrp) : price)
    const stock = Math.max(0, Math.floor(Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0))
    const gst = Math.min(100, Math.max(0, Number.isFinite(Number(p.gst)) ? Number(p.gst) : 18))
    const multiGallery = [...new Set((p.gallery?.length ? p.gallery : getProductGallery(p)).filter(image => typeof image === 'string' && image.trim()))].slice(0, 5)
    const discountFor = (tierPrice: number) => mrp > 0
      ? Math.min(100, Math.max(0, Math.round(((mrp - tierPrice) / mrp) * 100)))
      : 0
    const defaultTiers = [
      { minQty: 1, maxQty: 2, label: '1–2 units', price, discountPct: discountFor(price) },
      { minQty: 3, maxQty: 5, label: '3–5 units', price: Math.round(price * 0.92), discountPct: discountFor(Math.round(price * 0.92)) },
      { minQty: 6, label: '6+ units', price: Math.round(price * 0.84), discountPct: discountFor(Math.round(price * 0.84)) },
    ]
    const cleanTiers = p.tiers?.length
      ? p.tiers
        .filter(tier => Number.isFinite(Number(tier.minQty)) && Number(tier.minQty) > 0 && Number.isFinite(Number(tier.price)) && Number(tier.price) >= 0)
        .slice(0, 10)
        .map(tier => {
          const minQty = Math.max(1, Math.floor(Number(tier.minQty)))
          const maxQty = tier.maxQty == null ? undefined : Math.floor(Number(tier.maxQty))
          return {
            ...tier,
            minQty,
            ...(maxQty == null || maxQty < minQty ? {} : { maxQty }),
            price: Number(tier.price),
            discountPct: Math.min(100, Math.max(0, Number.isFinite(Number(tier.discountPct)) ? Number(tier.discountPct) : 0)),
            label: String(tier.label || `${minQty}+ units`).slice(0, 80),
          }
        })
      : []
    const tiers = cleanTiers.length ? cleanTiers : defaultTiers

    const safeProduct: Product = {
      ...p,
      business: p.business === 'cctv' || p.business === 'furniture' ? p.business : 'stationery',
      mrp,
      price,
      stock,
      gst,
      name: String(p.name || '').trim().slice(0, 180),
      category: String(p.category || 'stationery').trim().slice(0, 80),
      unit: String(p.unit || '1 Piece').trim().slice(0, 80) || '1 Piece',
      brand: String(p.brand || 'Agaram Select').trim().slice(0, 100) || 'Agaram Select',
      description: String(p.description || 'Agaram Verified Premium Stationery').slice(0, 3000),
      sku: String(p.sku || '').trim().slice(0, 80) || `ABM-${p.category?.slice(0, 2).toUpperCase()}-${p.id || 'NEW'}`,
      image: p.image || multiGallery[0] || '',
      gallery: multiGallery,
      tiers,
    }

    try {
      const response = isCreate
        ? await createProduct((({ id: _id, ...product }) => product)(safeProduct))
        : await saveProduct(safeProduct)
      const savedProduct = response.product
      setProducts(prev => [savedProduct, ...prev.filter(item => item.id !== savedProduct.id)])
      setIsAddingProduct(false)
      setEditingProduct(null)
      setStatusMessage(`Product “${savedProduct.name}” is live in the catalogue.`)
      window.dispatchEvent(new CustomEvent('abm_products_updated'))
      localStorage.setItem('abm_products_refresh', String(Date.now()))
      refreshAllData()
      setTimeout(() => setStatusMessage(''), 4000)
    } catch (err: any) {
      setStatusMessage(`Could not save product: ${err.message || 'Please check your connection and try again.'}`)
    }
  }

  const handleReadProductSpreadsheet = async (file: File | undefined) => {
    if (!file) return
    setExcelReading(true)
    setExcelErrors([])
    setExcelProducts([])
    try {
      const parsed = await parseProductSpreadsheet(file, storeCategories, newProduct.category || 'xerox-printing')
      const seen = new Set<string>()
      const duplicateErrors: string[] = []
      const unique = parsed.products.filter(product => {
        const sku = product.sku.trim().toLowerCase()
        if (seen.has(sku)) { duplicateErrors.push(`SKU ${product.sku} appears more than once in the file.`); return false }
        seen.add(sku)
        return true
      })
      setExcelProducts(unique)
      setExcelErrors([...parsed.errors, ...duplicateErrors])
      if (!unique.length && !parsed.errors.length) setExcelErrors(['No product rows were found in the spreadsheet.'])
    } catch (error) {
      setExcelErrors([error instanceof Error ? error.message : 'Could not read that spreadsheet.'])
    } finally {
      setExcelReading(false)
    }
  }

  const resetSpreadsheetImport = () => {
    setExcelProducts([])
    setExcelErrors([])
    setExcelProgress(0)
    if (excelFileInputRef.current) excelFileInputRef.current.value = ''
  }

  const handleImportSpreadsheetProducts = async () => {
    if (!excelProducts.length || excelSaving) return
    setExcelSaving(true)
    setExcelProgress(0)
    const created: Product[] = []
    const failures: string[] = [...excelErrors]
    const failedProducts: SpreadsheetProduct[] = []
    for (let index = 0; index < excelProducts.length; index += 1) {
      const product = excelProducts[index]
      try {
        const existing = products.find(item => item.sku.trim().toLowerCase() === product.sku.trim().toLowerCase())
        const response = existing
          ? await saveProduct({
              ...existing,
              ...product,
              id: existing.id,
              nameTa: existing.nameTa,
              rating: existing.rating,
              reviewCount: existing.reviewCount,
              tiers: existing.tiers,
              specs: existing.specs,
              colors: existing.colors,
            })
          : await createProduct(product)
        created.push(response.product)
      } catch (error) {
        failedProducts.push(product)
        failures.push(`${product.sku}: ${error instanceof Error ? error.message : 'Could not save this product.'}`)
      }
      setExcelProgress(index + 1)
    }
    if (created.length) {
      setProducts(previous => [...created, ...previous.filter(item => !created.some(saved => saved.id === item.id))])
      window.dispatchEvent(new CustomEvent('abm_products_updated'))
      localStorage.setItem('abm_products_refresh', String(Date.now()))
      void refreshAllData()
      setStatusMessage(`${created.length} product${created.length === 1 ? '' : 's'} added or updated from the spreadsheet.`)
      window.setTimeout(() => setStatusMessage(''), 5000)
    }
    setExcelProducts(failedProducts)
    setExcelErrors(failures)
    if (!failedProducts.length && !failures.length) {
      setIsAddingProduct(false)
      resetSpreadsheetImport()
    }
    setExcelSaving(false)
  }

  // Handle Quick Inline Stock Adjust
  const handleQuickStock = async (product: Product, delta: number) => {
    const updatedStock = Math.max(0, (product.stock || 0) + delta)
    const updatedProd = { ...product, stock: updatedStock }
    setProducts(prev => prev.map(p => (p.id === product.id ? updatedProd : p)))
    try {
      await saveProduct(updatedProd)
      setStatusMessage('Stock updated.')
      window.setTimeout(() => setStatusMessage(''), 2500)
    } catch (err: any) {
      setStatusMessage(`Could not update stock: ${err.message || 'Please try again.'}`)
      refreshAllData()
    }
  }

  // Handle Delete Product (Optimistic + Neon DB)
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Product #${id} from the live store?`)) return
    try {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      window.dispatchEvent(new CustomEvent('abm_products_updated'))
      localStorage.setItem('abm_products_refresh', String(Date.now()))
      setStatusMessage(`Product #${id} removed from the catalogue.`)
      refreshAllData()
      setTimeout(() => setStatusMessage(''), 4000)
    } catch (err: any) {
      setStatusMessage(`Could not delete product: ${err.message || 'Please try again.'}`)
      refreshAllData()
    }
  }

  // Handle Order Status Update (Optimistic + Neon DB)
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? ({ ...o, status } as any) : o)))
    setStatusMessage(`Order #${orderId} marked as ${status.toUpperCase()}!`)
    try {
      await updateOrderStatus(orderId, status)
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (err: any) {
      alert(`Error updating order status: ${err.message}`)
      refreshAllData()
    }
  }

  // Handle Delete Order (Test Orders)
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Delete Order #${orderId} permanently from database?`)) return
    setOrders(prev => prev.filter(o => o.id !== orderId))
    try {
      await deleteAdminOrder(orderId)
      setStatusMessage(`✓ Order #${orderId} deleted!`)
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (err: any) {
      alert(`Failed to delete order: ${err.message}`)
      refreshAllData()
    }
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.brand?.toLowerCase().includes(productSearch.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, productSearch, categoryFilter])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesStatus = orderStatusFilter === 'all' || (o.status || 'received') === orderStatusFilter
      const query = orderSearch.trim().toLowerCase()
      const matchesSearch = !query || [o.id, o.customerName, o.email, o.phone, o.address, o.city, o.pincode, ...o.items.map(item => item.name || item.sku || '')]
        .some(value => String(value || '').toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [orders, orderStatusFilter, orderSearch])

  // If Not Authenticated, Show Clean Admin Software Login Gate
  if (!auth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0b0f19 80%)',
          padding: '20px',
          color: '#fff'
        }}
      >
        <div
          style={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid #1e293b',
            borderRadius: '24px',
            padding: '36px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <img
              src="/abm-logo.png"
              alt="Agaram"
              style={{ height: '42px', width: 'auto', background: '#fff', borderRadius: '10px', padding: '3px' }}
              onError={e => ((e.currentTarget as HTMLElement).style.display = 'none')}
            />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>Agaram Admin Software</h2>
              <div style={{ fontSize: '11px', color: '#e03a1f', fontWeight: 800, letterSpacing: '0.08em' }}>
                ENTERPRISE STORE COMMAND
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '20px' }}>
            Sign in to manage live inventory, Neon PostgreSQL tables, customer orders, and store analytics.
          </p>

          {loginError && (
            <div
              style={{
                background: '#7f1d1d',
                border: '1px solid #b91c1c',
                color: '#fecaca',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '16px'
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="admin-form-group">
              <label>Administrator Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="admin-form-input"
                placeholder="admin@agaram.in or admin@abm.in"
              />
            </div>
            <div className="admin-form-group">
              <label>Admin Secure Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="admin-form-input"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px', height: '44px' }}
            >
              Sign In to Command Center
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
            Connected to Render API & Neon PostgreSQL Database
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      {/* Mobile Top Header */}
      <div
        className="admin-mobile-header"
        style={{
          display: 'none',
          padding: '12px 16px',
          background: 'var(--admin-sidebar)',
          borderBottom: '1px solid var(--admin-border)',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 60
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: 800, fontSize: '15px' }}>Agaram Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={refreshAllData}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--admin-primary)', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            Storefront &rarr;
          </a>
        </div>
      </div>

      {/* 1. SIDEBAR */}
      <aside
        className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          display: mobileMenuOpen ? 'flex' : undefined
        }}
      >
        <div className="admin-brand">
          <img
            src="/abm-logo.png"
            alt="Agaram"
            onError={e => ((e.currentTarget as HTMLElement).style.display = 'none')}
          />
          <div>
            <div className="admin-brand-title">Agaram Admin</div>
            <div className="admin-brand-tag">WHOLESALE ENTERPRISE</div>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            onClick={() => {
              setCurrentTab('dashboard')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('products')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'products' ? 'active' : ''}`}
          >
            <Package size={18} />
            <span>Products & Inventory</span>
            <span className="admin-nav-badge">{products.length}</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('storefront')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'storefront' ? 'active' : ''}`}
          >
            <Store size={18} />
            <span>Storefront Categories</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('orders')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
          >
            <ShoppingBag size={18} />
            <span>Customer Orders</span>
            <span className="admin-nav-badge">{orders.length}</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('customers')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'customers' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Customer Directory</span>
            <span className="admin-nav-badge">{users.length}</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('database')
              setMobileMenuOpen(false)
            }}
            className={`admin-nav-item ${currentTab === 'database' ? 'active' : ''}`}
          >
            <Database size={18} />
            <span>Neon DB Diagnostic</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-db-status">
            <span className="admin-status-dot" />
            <span>{dbConnected ? `Database connected (${products.length} products)` : 'Database connection unavailable'}</span>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="admin-btn admin-btn-secondary"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open Live Store
          </a>
          <button onClick={handleLogout} className="admin-btn admin-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title" style={{ textTransform: 'capitalize' }}>
              {currentTab === 'dashboard' && 'Store Analytics & Performance'}
              {currentTab === 'products' && 'Product Inventory Management'}
              {currentTab === 'storefront' && 'Storefront Categories & Images'}
              {currentTab === 'orders' && 'Real-time Customer Orders'}
              {currentTab === 'customers' && 'Registered Customer Directory'}
              {currentTab === 'database' && 'Neon PostgreSQL Database Hub'}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            <button onClick={refreshAllData} className="admin-btn admin-btn-secondary" title="Refresh all data from Neon DB">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Sync Live DB'}</span>
            </button>
            <button
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              className="admin-btn admin-btn-secondary"
              title="Toggle Dark / Light Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {currentTab === 'products' && (
              <button onClick={() => setIsAddingProduct(true)} className="admin-btn admin-btn-primary">
                <Plus size={16} /> Add Product
              </button>
            )}
          </div>
        </header>

        {/* Global Toast Notification */}
        {statusMessage && (
          <div
            style={{
              background: '#10b981',
              color: '#fff',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <CheckCircle size={16} /> {statusMessage}
          </div>
        )}

        <div className="admin-content">
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span>Total Store Revenue</span>
                    <span>💰</span>
                  </div>
                  <div className="admin-stat-val">
                    {money(stats?.revenue || orders.reduce((sum, o) => sum + (o.total || 0), 0))}
                  </div>
                  <div className="admin-stat-sub">From {orders.length} placed orders</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span>Total Orders</span>
                    <span>📦</span>
                  </div>
                  <div className="admin-stat-val">{orders.length}</div>
                  <div className="admin-stat-sub">
                    {orders.filter(o => (o as any).status === 'delivered').length} delivered •{' '}
                    {orders.filter(o => (o as any).status !== 'delivered').length} active
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span>Active Products</span>
                    <span>🏷️</span>
                  </div>
                  <div className="admin-stat-val">{products.length}</div>
                  <div className="admin-stat-sub">Across {storeCategories.length} categories</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span>Registered Customers</span>
                    <span>👥</span>
                  </div>
                  <div className="admin-stat-val">{users.length}</div>
                  <div className="admin-stat-sub">Customer accounts in the database</div>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div className="admin-table-container" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Recent Orders</h3>
                  {orders.length === 0 ? (
                    <div style={{ color: 'var(--admin-text-soft)', fontSize: '13px' }}>
                      No live orders placed yet. Orders placed by customers will appear here immediately.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {orders.slice(0, 5).map(o => (
                        <div
                          key={o.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            background: 'var(--admin-bg)',
                            borderRadius: '8px'
                          }}
                        >
                          <div>
                            <b style={{ fontSize: '13px' }}>#{o.id}</b>
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>
                              {o.customerName} • {o.city}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <b style={{ color: 'var(--admin-primary)' }}>{money(o.total)}</b>
                            <div style={{ fontSize: '10px' }}>{(o as any).status || 'received'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-table-container" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Live store connections</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-line)', paddingBottom: '8px' }}>
                      <span>Store API:</span>
                      <code style={{ color: '#38bdf8' }}>{API_URL}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-line)', paddingBottom: '8px' }}>
                      <span>Database:</span>
                      <span style={{ color: dbConnected ? '#10b981' : '#f87171', fontWeight: 800 }}>{dbConnected ? 'Connected' : 'Unavailable'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Live data:</span>
                      <span>{products.length} products · {orders.length} orders · {users.length} customers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS INVENTORY */}
          {currentTab === 'products' && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                  <div className="admin-table-search">
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--admin-text-soft)' }} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search title, SKU, brand..."
                      className="admin-input"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="admin-input"
                    style={{ width: 'auto', paddingLeft: '12px' }}
                  >
                    <option value="all">All Categories</option>
                    {storeCategories.map(c => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)', fontWeight: 700 }}>
                  Showing {filteredProducts.length} of {products.length} products (Click row for preview)
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>Image</th>
                      <th>Product / SKU</th>
                      <th>Category</th>
                      <th>Brand</th>
                      <th>Price</th>
                      <th>MRP</th>
                      <th>Stock</th>
                      <th>GST</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setPreviewProduct(p)
                          setPreviewActiveImageIdx(0)
                        }}
                      >
                        <td>
                          <img
                            src={p.image}
                            alt={p.name}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '6px',
                              objectFit: 'contain',
                              background: '#fff',
                              border: '1px solid var(--admin-border)'
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--admin-text-main)' }}>{p.name}</div>
                          {p.nameTa && <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>{p.nameTa}</div>}
                          <div style={{ fontSize: '10.5px', color: 'var(--admin-text-soft)', fontFamily: 'var(--admin-font-mono)' }}>
                            SKU: {p.sku || `ABM-${p.id}`} • {getProductGallery(p).length} photos
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', background: 'var(--admin-bg)', padding: '3px 8px', borderRadius: '6px' }}>
                            {storeCategories.find(c => c.slug === p.category)?.name || p.category}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{p.brand}</td>
                        <td style={{ fontWeight: 800, color: '#10b981' }}>{money(p.price)}</td>
                        <td style={{ fontSize: '11.5px', color: 'var(--admin-text-soft)', textDecoration: 'line-through' }}>
                          {money(p.mrp)}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: p.stock <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: p.stock <= 5 ? '#f87171' : '#34d399'
                              }}
                            >
                              {p.stock}
                            </span>
                            <button
                              onClick={() => handleQuickStock(p, -5)}
                              disabled={p.stock <= 0}
                              title="Decrease stock by 5"
                              style={{
                                border: '1px solid var(--admin-border)',
                                background: 'var(--admin-bg)',
                                color: 'var(--admin-text-soft)',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleQuickStock(p, 10)}
                              title="Restock +10 units"
                              style={{
                                border: '1px solid var(--admin-border)',
                                background: 'var(--admin-bg)',
                                color: '#10b981',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              +10
                            </button>
                          </div>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>{p.gst || 18}%</td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setPreviewProduct(p)
                                setPreviewActiveImageIdx(0)
                              }}
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '6px 9px', fontSize: '11px' }}
                              title="Preview Product"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '6px 9px', fontSize: '11px' }}
                              title="Edit in Neon DB"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: '6px 9px', fontSize: '11px', color: '#ef4444' }}
                              title="Delete permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'storefront' && (
            <StorefrontCategories categories={storeCategories} saving={savingCategories} onSave={handleSaveCategories} onDelete={handleDeleteCategory} />
          )}

          {/* TAB 3: CUSTOMER ORDERS */}
          {currentTab === 'orders' && (
            <div className="admin-orders-page">
              <div className="admin-orders-summary">
                {[
                  { label: 'All orders', value: orders.length, tone: '#60a5fa' },
                  { label: 'Needs attention', value: orders.filter(order => ['received', 'confirmed'].includes(order.status || 'received')).length, tone: '#fbbf24' },
                  { label: 'In progress', value: orders.filter(order => ['packed', 'shipped'].includes(order.status || '')).length, tone: '#38bdf8' },
                  { label: 'Delivered', value: orders.filter(order => order.status === 'delivered').length, tone: '#34d399' },
                ].map(metric => (
                  <div className="admin-orders-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong style={{ color: metric.tone }}>{metric.value}</strong>
                  </div>
                ))}
              </div>
              {ordersLoadError && (
                <div className="admin-orders-error" role="alert">
                  <AlertTriangle size={17} />
                  <span>Orders could not be loaded: {ordersLoadError}. Use <b>Sync Live DB</b> to retry.</span>
                </div>
              )}
              <div className="admin-table-container">
              <div className="admin-table-header">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <div className="admin-table-search">
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--admin-text-soft)' }} />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Search order, customer, phone, address, item..."
                      className="admin-input"
                      aria-label="Search customer orders"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="admin-input"
                    style={{ width: 'auto', paddingLeft: '12px', minHeight: '38px' }}
                  >
                    <option value="all">All Orders</option>
                    <option value="received">Received</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)' }}>
                  Showing {filteredOrders.length} of {orders.length} orders
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Delivery address</th>
                      <th>Order items</th>
                      <th style={{ textAlign: 'right' }}>Order total</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--admin-text-soft)' }}>
                          <Package size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.6 }} />
                          <b style={{ display: 'block', color: 'var(--admin-text-main)', marginBottom: '4px' }}>{ordersLoadError ? 'Order list unavailable' : orders.length ? 'No matching orders' : 'No orders to show'}</b>
                          {ordersLoadError ? 'Check the connection message above and retry the live database sync.' : orders.length ? 'Try a different search or status filter.' : 'New customer orders will appear here after they are placed.'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <b style={{ fontFamily: 'var(--admin-font-mono)' }}>#{order.id}</b>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-soft)', marginTop: '3px' }}>{order.customerType === 'wholesale' ? 'Wholesale' : 'Retail'}</div>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--admin-text-soft)' }}>
                            {new Date(order.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800 }}>{order.customerName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>{order.phone || 'Phone not provided'}</div>
                            {order.email && <div style={{ fontSize: '10px', color: 'var(--admin-text-soft)' }}>{order.email}</div>}
                          </td>
                          <td style={{ fontSize: '11.5px', maxWidth: '220px' }}>
                            <div>{[order.address, order.city].filter(Boolean).join(', ') || 'Address not provided'}</div>
                            {order.pincode && <div style={{ color: 'var(--admin-text-soft)', marginTop: '3px' }}>PIN {order.pincode}</div>}
                          </td>
                          <td>
                            <b>{order.items.reduce((s, i) => s + i.quantity, 0)} units</b> · {order.items.length} products
                            <div style={{ fontSize: '10.5px', color: 'var(--admin-text-soft)', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.items.map(item => item.name || `Product #${item.productId}`).join(', ')}>
                              {order.items.map(item => item.name || `Product #${item.productId}`).join(', ') || 'No items listed'}
                            </div>
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--admin-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {money(order.total)}
                          </td>
                          <td>
                            <select
                              value={order.status || 'received'}
                              onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`admin-status-pill status-${order.status || 'received'}`}
                              style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="received">Received</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="packed">Packed</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => setViewingOrder(order)}
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                <Eye size={13} /> View / Invoice
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '11px', color: '#ef4444' }}
                                title="Delete order permanently"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGISTERED CUSTOMERS */}
          {currentTab === 'customers' && (
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Customer Accounts</h3>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)' }}>
                  Total Registered: {users.length}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Customer ID</th>
                      <th>Email Address</th>
                      <th>User Role</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 800 }}>{u.name}</td>
                        <td><code style={{ fontSize: '10px', color: 'var(--admin-text-soft)' }}>{u.id}</code></td>
                        <td style={{ color: 'var(--admin-text-soft)' }}>{u.email}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: u.role === 'admin' ? '#e03a1f' : 'var(--admin-bg)',
                              color: u.role === 'admin' ? '#fff' : 'var(--admin-text-main)'
                            }}
                          >
                            {(u.role || 'customer').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--admin-text-soft)' }}>
                          {new Date(u.createdAt || u.created_at || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DATABASE DIAGNOSTICS */}
          {currentTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="admin-table-container" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={20} color="#10b981" />
                  Store database connection
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '20px' }}>
                  Check that the admin page can load products, orders, and customer accounts from your connected database.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ padding: '14px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Database Status</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: dbConnected ? '#10b981' : '#f87171', marginTop: '4px' }}>
                      {dbConnected === null ? 'Checking connection…' : dbConnected ? 'Connected' : 'Unavailable'}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Total Catalog Products</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px' }}>{products.length} Items Live</div>
                  </div>
                  <div style={{ padding: '14px', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Store API</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '4px', color: '#38bdf8' }}>{API_URL}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={refreshAllData} className="admin-btn admin-btn-primary">
                    <RefreshCw size={15} /> Refresh live data
                  </button>
                  <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary">
                    Open Live Customer Storefront <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD / CREATE PRODUCT (WITH LOCAL DEVICE UPLOAD & MULTI-ANGLE GALLERY) */}
      {isAddingProduct && (
        <div className="admin-modal-backdrop" onClick={() => { if (!excelSaving) { setIsAddingProduct(false); resetSpreadsheetImport() } }}>
          <div className="admin-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Add product to the live catalogue</h3>
              <button onClick={() => { if (!excelSaving) { setIsAddingProduct(false); resetSpreadsheetImport() } }} style={{ background: 'none', border: 'none', color: 'var(--admin-text-soft)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSaveProduct(newProduct as Product, true)
              }}
            >
              <div className="admin-modal-body">
                <section style={{ padding: '14px', marginBottom: '16px', border: '1px solid var(--admin-border)', borderRadius: '12px', background: 'var(--admin-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ display: 'flex', gap: '7px', alignItems: 'center', fontSize: '13px' }}><FileSpreadsheet size={16} /> Add products from Excel</strong>
                      <p style={{ margin: '5px 0 0', color: 'var(--admin-text-soft)', fontSize: '11px' }}>Upload .xlsx or .csv. Review the rows before adding them to the live catalogue.</p>
                    </div>
                    <button type="button" onClick={downloadProductSpreadsheetTemplate} className="admin-btn admin-btn-secondary" style={{ minHeight: '38px', fontSize: '11px' }}><Download size={14} /> Download template</button>
                  </div>
                  <input ref={excelFileInputRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={e => handleReadProductSpreadsheet(e.target.files?.[0])} />
                  <button type="button" disabled={excelReading || excelSaving} onClick={() => excelFileInputRef.current?.click()} className="admin-btn admin-btn-secondary" style={{ marginTop: '12px', minHeight: '40px' }}><Upload size={14} /> {excelReading ? 'Reading spreadsheet…' : 'Choose Excel or CSV file'}</button>
                  {excelProducts.length > 0 && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--admin-text)' }}>
                    {excelProducts.length} valid rows ready · {excelProducts.filter(product => products.some(existing => existing.sku.trim().toLowerCase() === product.sku.trim().toLowerCase())).length} will update by SKU · {excelProducts.filter(product => !products.some(existing => existing.sku.trim().toLowerCase() === product.sku.trim().toLowerCase())).length} new
                    {excelSaving ? ` · Saving ${excelProgress} of ${excelProducts.length}` : ''}
                  </div>}
                  {excelErrors.length > 0 && <div role="alert" style={{ marginTop: '9px', color: '#b42318', fontSize: '11px', maxHeight: '120px', overflow: 'auto' }}>{excelErrors.map((error, index) => <div key={`${index}-${error}`}>{error}</div>)}</div>}
                  {excelProducts.length > 0 && <button type="button" disabled={excelSaving} onClick={handleImportSpreadsheetProducts} className="admin-btn admin-btn-primary" style={{ marginTop: '10px', minHeight: '40px' }}>{excelSaving ? `Saving ${excelProgress}/${excelProducts.length}…` : `Add or update ${excelProducts.length} products`}</button>}
                </section>
                <div className="admin-form-group">
                    <label>SKU (Stock Keeping Unit)</label>
                    <input
                      type="text"
                      required
                      value={newProduct.sku}
                      onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))}
                      className="admin-form-input"
                    />
                </div>

                <div className="admin-form-group">
                  <label>Product Title (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hauser XO Ball Pen Carton (50 Pcs)"
                    value={newProduct.name}
                    onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Product Title (Tamil)</label>
                  <input
                    type="text"
                    placeholder="e.g. ஹவுசர் பால் பாயிண்ட் பேனா கார்டன்"
                    value={newProduct.nameTa || ''}
                    onChange={e => setNewProduct(p => ({ ...p, nameTa: e.target.value }))}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Category</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct(p => ({ ...p, category: e.target.value as CategorySlug, subcategory: undefined }))}
                      className="admin-form-input"
                    >
                      {storeCategories.map(c => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Brand</label>
                    <input
                      type="text"
                      value={newProduct.brand}
                      onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Subcategory filter</label>
                  <select
                    value={newProduct.subcategory || ''}
                    onChange={e => setNewProduct(p => ({ ...p, subcategory: e.target.value || undefined }))}
                    className="admin-form-input"
                  >
                    <option value="">No subcategory</option>
                    {storeCategories.find(c => c.slug === newProduct.category)?.subcategories.filter(sub => sub.id !== 'all').map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct(p => ({ ...p, price: Number(e.target.value) }))}
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProduct.mrp}
                      onChange={e => setNewProduct(p => ({ ...p, mrp: Number(e.target.value) }))}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={newProduct.stock}
                      onChange={e => setNewProduct(p => ({ ...p, stock: Number(e.target.value) }))}
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Unit / Pack (e.g. 50 Pcs Tub)</label>
                    <input
                      type="text"
                      value={newProduct.unit}
                      onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                {/* IMAGE UPLOAD SECTION */}
                <div className="admin-form-group" style={{ background: 'var(--admin-bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Product Images & Gallery (3-5 Photos)</span>
                    <span style={{ fontSize: '11px', color: '#10b981' }}>Device Upload Supported</span>
                  </label>

                  {/* Upload button from Local Device */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '8px 0' }}>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        void handleDeviceImageUpload(e.target.files, false)
                        e.currentTarget.value = ''
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '12px', padding: '7px 12px' }}
                    >
                      <Upload size={14} /> Upload from Local Device / Phone
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>or paste URL below</span>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="https://..."
                    value={newProduct.image}
                    onChange={e => setNewProduct(p => ({ ...p, image: e.target.value, gallery: [e.target.value, ...(p.gallery || []).slice(1)] }))}
                    className="admin-form-input"
                  />

                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px' }}>
                    {(newProduct.gallery || [newProduct.image || '']).filter(Boolean).map((image, index) => (
                      <img key={`${index}-${image.slice(0, 30)}`} src={image} alt={`Product image ${index + 1}`} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 7, background: '#fff', border: '1px solid var(--admin-border)', flexShrink: 0 }} />
                    ))}
                    <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--admin-text-soft)' }}>{(newProduct.gallery || []).length}/5 images</span>
                  </div>

                  {/* Thumbnail Previews */}
                  {newProduct.image && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                      <img
                        src={newProduct.image}
                        alt="Preview"
                        style={{ width: '50px', height: '50px', objectFit: 'contain', background: '#fff', borderRadius: '6px', border: '1px solid var(--admin-border)' }}
                      />
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>✓ Primary Image Ready</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" onClick={() => setIsAddingProduct(false)} className="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PRODUCT (WITH LOCAL DEVICE UPLOAD & MULTI-ANGLE GALLERY) */}
      {editingProduct && (
        <div className="admin-modal-backdrop" onClick={() => setEditingProduct(null)}>
          <div className="admin-modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Edit Product #{editingProduct.id}</h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-soft)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSaveProduct(editingProduct)
              }}
            >
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label>Product Title (English) *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={e => setEditingProduct(p => (p ? { ...p, name: e.target.value } : null))}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Product Title (Tamil)</label>
                  <input
                    type="text"
                    value={editingProduct.nameTa || ''}
                    onChange={e => setEditingProduct(p => (p ? { ...p, nameTa: e.target.value } : null))}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Category</label>
                    <select
                      value={editingProduct.category}
                      onChange={e => setEditingProduct(p => p ? { ...p, category: e.target.value, subcategory: undefined } : null)}
                      className="admin-form-input"
                    >
                      {storeCategories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Subcategory filter</label>
                    <select
                      value={editingProduct.subcategory || ''}
                      onChange={e => setEditingProduct(p => p ? { ...p, subcategory: e.target.value || undefined } : null)}
                      className="admin-form-input"
                    >
                      <option value="">No subcategory</option>
                      {storeCategories.find(category => category.slug === editingProduct.category)?.subcategories.filter(sub => sub.id !== 'all').map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.price}
                      onChange={e => setEditingProduct(p => (p ? { ...p, price: Number(e.target.value) } : null))}
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.mrp}
                      onChange={e => setEditingProduct(p => (p ? { ...p, mrp: Number(e.target.value) } : null))}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.stock}
                      onChange={e => setEditingProduct(p => (p ? { ...p, stock: Number(e.target.value) } : null))}
                      className="admin-form-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>GST Rate (%)</label>
                    <input
                      type="number"
                      value={editingProduct.gst}
                      onChange={e => setEditingProduct(p => (p ? { ...p, gst: Number(e.target.value) } : null))}
                      className="admin-form-input"
                    />
                  </div>
                </div>

                {/* EDIT IMAGE UPLOAD SECTION */}
                <div className="admin-form-group" style={{ background: 'var(--admin-bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Product Image & Multi-Angle Photos</span>
                    <span style={{ fontSize: '11px', color: '#10b981' }}>Device Upload Supported</span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '8px 0' }}>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        void handleDeviceImageUpload(e.target.files, true)
                        e.currentTarget.value = ''
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '12px', padding: '7px 12px' }}
                    >
                      <Upload size={14} /> Upload New Photo from Device
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={editingProduct.image}
                    onChange={e => setEditingProduct(p => (p ? { ...p, image: e.target.value, gallery: [e.target.value, ...(p.gallery || []).slice(1)] } : null))}
                    className="admin-form-input"
                  />

                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px' }}>
                    {(editingProduct.gallery || [editingProduct.image]).filter(Boolean).map((image, index) => (
                      <img key={`${index}-${image.slice(0, 30)}`} src={image} alt={`Product image ${index + 1}`} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 7, background: '#fff', border: '1px solid var(--admin-border)', flexShrink: 0 }} />
                    ))}
                    <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--admin-text-soft)' }}>{(editingProduct.gallery || []).length}/5 images</span>
                  </div>

                  {editingProduct.image && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                      <img
                        src={editingProduct.image}
                        alt="Current"
                        style={{ width: '50px', height: '50px', objectFit: 'contain', background: '#fff', borderRadius: '6px', border: '1px solid var(--admin-border)' }}
                      />
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>✓ Live Preview Updated</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" onClick={() => setEditingProduct(null)} className="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INTERACTIVE PRODUCT PREVIEW MODAL (3-5 PHOTOS & WHOLESALE SLABS) */}
      {previewProduct && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewProduct(null)}>
          <div className="admin-modal" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={18} color="var(--admin-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Storefront Product Preview</h3>
              </div>
              <button onClick={() => setPreviewProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-soft)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {/* Left: Multi-angle Gallery Preview */}
              <div>
                {(() => {
                  const gallery = getProductGallery(previewProduct)
                  const activeImg = gallery[previewActiveImageIdx] || previewProduct.image
                  return (
                    <div>
                      <div
                        style={{
                          width: '100%',
                          height: '240px',
                          background: '#fff',
                          borderRadius: '12px',
                          display: 'grid',
                          placeItems: 'center',
                          padding: '12px',
                          border: '1px solid var(--admin-border)',
                          marginBottom: '10px'
                        }}
                      >
                        <img
                          src={activeImg}
                          alt={previewProduct.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>

                      {/* Clickable Multi-Angle Thumbnails (3-5 images) */}
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {gallery.map((img: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewActiveImageIdx(i)}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '8px',
                              padding: '2px',
                              border: previewActiveImageIdx === i ? '2px solid var(--admin-primary)' : '1px solid var(--admin-border)',
                              background: '#fff',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Right: Specs & Wholesale Tiered Slabs */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--admin-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {previewProduct.brand} • SKU: {previewProduct.sku || `ABM-${previewProduct.id}`}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-main)', margin: '4px 0 8px', lineHeight: 1.3 }}>
                  {previewProduct.name}
                </h2>
                {previewProduct.nameTa && (
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)', marginBottom: '8px' }}>
                    {previewProduct.nameTa}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>
                    {money(previewProduct.price)}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--admin-text-soft)', textDecoration: 'line-through' }}>
                    {money(previewProduct.mrp)}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 6px', borderRadius: '4px' }}>
                    {Math.round(((previewProduct.mrp - previewProduct.price) / previewProduct.mrp) * 100)}% OFF
                  </span>
                </div>

                <div style={{ background: 'var(--admin-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--admin-border)', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--admin-text-soft)', marginBottom: '6px' }}>
                    WHOLESALE BULK SLABS:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    {getProductTiers(previewProduct).map(tier => (
                      <div key={`${tier.minQty}-${tier.maxQty || 'up'}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span>{tier.label}:</span>
                        <b style={{ color: '#10b981' }}>{money(tier.price)} / unit · {tier.discountPct}% off</b>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setEditingProduct(previewProduct)
                      setPreviewProduct(null)
                    }}
                    className="admin-btn admin-btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Edit3 size={14} /> Edit This Product
                  </button>
                  <button
                    onClick={() => setPreviewProduct(null)}
                    className="admin-btn admin-btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW ORDER & PRINT TAX INVOICE */}
      {viewingOrder && (
        <div className="admin-modal-backdrop" onClick={() => setViewingOrder(null)}>
          <div className="admin-modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Order #{viewingOrder.id} Details</h3>
                <div style={{ fontSize: '11.5px', color: 'var(--admin-text-soft)' }}>
                  Placed on {new Date(viewingOrder.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <button onClick={() => setViewingOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-soft)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--admin-bg)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Customer Info</div>
                  <div style={{ fontWeight: 800, marginTop: '4px' }}>{viewingOrder.customerName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)' }}>{viewingOrder.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-soft)' }}>Phone: {viewingOrder.phone}</div>
                </div>

                <div style={{ background: 'var(--admin-bg)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)', textTransform: 'uppercase', fontWeight: 800 }}>Delivery Address</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    {[viewingOrder.address, viewingOrder.city, viewingOrder.pincode].filter(Boolean).join(', ') || 'Address not provided'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {viewingOrder.items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.productId)
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--admin-bg)',
                          borderRadius: '6px',
                          fontSize: '12.5px'
                        }}
                      >
                        <div>
                          <b>{it.name || prod?.name || `Product #${it.productId}`}</b>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-soft)' }}>{it.sku && `SKU: ${it.sku} · `}Qty: {it.quantity} · Unit price: {money(it.price ?? prod?.price ?? 0)}</div>
                        </div>
                        <div style={{ fontWeight: 800 }}>{money((it.price ?? prod?.price ?? 0) * it.quantity)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--admin-line)', paddingTop: '14px', marginTop: '10px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Grand Total:</span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--admin-primary)' }}>{money(viewingOrder.total)}</span>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => window.open(`/invoice/${viewingOrder.id}`, '_blank')} className="admin-btn admin-btn-primary">
                <Printer size={15} /> Print Full GST Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminApp
