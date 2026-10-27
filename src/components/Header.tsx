import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ShoppingBag, Heart, UserRound, Zap, ChevronDown,
  MapPin, Globe, Moon, Sun, X, ArrowRight
} from 'lucide-react'
import { ProfileDropdown } from './ProfileDropdown'
import { money, type Product } from '../data/products'

interface HeaderProps {
  products: Product[]
  cartCount: number
  wishlistCount: number
  currentUser: { id?: string; name?: string; email?: string } | null
  onLogout: () => void
  selectedLocation: { address: string; city: string; pincode: string; label: string }
  onOpenMapPicker: () => void
  onOpenCart: () => void
  lang: 'en' | 'ta'
  setLang: (lang: 'en' | 'ta' | ((prev: 'en' | 'ta') => 'en' | 'ta')) => void
  customerType: 'retail' | 'wholesale'
  setCustomerType: (type: 'retail' | 'wholesale') => void
  totalOrdersCount?: number
}

export function Header({
  products,
  cartCount,
  wishlistCount,
  currentUser,
  onLogout,
  selectedLocation,
  onOpenMapPicker,
  onOpenCart,
  lang,
  setLang,
  customerType,
  setCustomerType,
  totalOrdersCount = 0,
}: HeaderProps) {
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Filtered search results
  const searchResults = searchQuery.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : []

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="main-header" style={{ position: 'sticky', top: 0, zIndex: 900 }}>
      <div className="container">
        {/* TOP ROW: Instamart Delivery Location Bar & Quick Toggles */}
        <div
          className="instamart-mobile-top"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 0 8px',
            gap: '10px',
          }}
        >
          {/* Location Picker Trigger */}
          <button
            type="button"
            onClick={onOpenMapPicker}
            className="instamart-loc-btn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, color: '#15803d' }}>
              <Zap size={13} fill="#15803d" />
              <span>{lang === 'ta' ? '10 நிமிடத்தில் டெலிவரி' : 'Delivery in 10 Mins'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedLocation.label} - {selectedLocation.address}
              </span>
              <ChevronDown size={14} color="#15803d" />
            </div>
          </button>

          {/* Right: Wholesale/Retail Mode Pill + Language Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Wholesale Pricing Toggle */}
            <button
              type="button"
              onClick={() => setCustomerType(customerType === 'retail' ? 'wholesale' : 'retail')}
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 9px',
                borderRadius: '14px',
                border: 'none',
                background: customerType === 'wholesale' ? '#f59e0b' : '#f1f5f9',
                color: customerType === 'wholesale' ? '#fff' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Toggle Wholesale B2B Slabs"
            >
              <span>{customerType === 'wholesale' ? '🔥 Wholesale ON' : 'Retail Mode'}</span>
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(l => (l === 'en' ? 'ta' : 'en'))}
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 8px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: Logo, Search Bar, Account Dropdown & Cart */}
        <div
          className="header-inner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            paddingBottom: '6px',
          }}
        >
          {/* Logo */}
          <Link to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src="/abm-logo.png" alt="Agaram Stationery Mart" style={{ height: '38px', width: 'auto' }} />
            <div className="brand-text">
              <span className="brand-title" style={{ fontSize: '18px', fontWeight: 900, color: '#e03a1f' }}>
                Agaram
              </span>
              <span className="brand-tagline" style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                {lang === 'ta' ? 'ஸ்டேஷனரி மார்ட்' : 'Stationery Mart'}
              </span>
            </div>
          </Link>

          {/* Search Bar with Live Autocomplete */}
          <div ref={searchContainerRef} className="header-search-bar" style={{ flex: 1, maxWidth: '540px', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0 12px',
                height: '40px',
                boxShadow: isSearchFocused ? '0 0 0 3px rgba(224, 58, 31, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Search size={16} color="#64748b" style={{ marginRight: '8px', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={lang === 'ta' ? "ஜெராக்ஸ் பேப்பர், ஜெல் பேனா, ஹைலைட்டர் தேடுக..." : "Search 'JK Copier A4 Paper', 'Pastel Pens'..."}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  background: 'transparent',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X size={15} color="#94a3b8" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 16px 36px -4px rgba(0,0,0,0.18)',
                  border: '1px solid #e2e8f0',
                  zIndex: 950,
                  overflow: 'hidden',
                }}
              >
                {searchResults.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setIsSearchFocused(false)
                      setSearchQuery('')
                      navigate(`/product/${prod.id}`)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <img src={prod.image} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {prod.brand} · {prod.unit}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#15803d' }}>
                      {money(prod.price)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Icons (Profile Dropdown, Wishlist, Cart) */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#334155',
                textDecoration: 'none',
              }}
              title="View Wishlist"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 900,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#334155',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Open Shopping Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    background: '#15803d',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 900,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* USER PROFILE BUTTON (Profile Dropdown Trigger - Image 4) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setProfileOpen(o => !o)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: currentUser ? '#f1f5f9' : '#e03a1f',
                  color: currentUser ? '#0f172a' : '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  boxShadow: currentUser ? 'none' : '0 2px 8px rgba(224, 58, 31, 0.25)',
                }}
              >
                <UserRound size={16} />
                <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser ? currentUser.name?.split(' ')[0] : 'Sign In'}
                </span>
                <ChevronDown size={14} style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              {/* RICH PROFILE DROPDOWN (Image 4) */}
              <ProfileDropdown
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                currentUser={currentUser}
                onLogout={onLogout}
                totalOrdersCount={totalOrdersCount}
                wishlistCount={wishlistCount}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
