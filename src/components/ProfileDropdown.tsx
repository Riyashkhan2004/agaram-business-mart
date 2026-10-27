import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Package, Zap, Sparkles, CreditCard,
  MapPin, Heart, Gift, Bell, LogOut, ChevronRight
} from 'lucide-react'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  currentUser: { id?: string; name?: string; email?: string } | null
  onLogout: () => void
  totalOrdersCount?: number
  wishlistCount?: number
  coins?: number
}

export function ProfileDropdown({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  totalOrdersCount = 0,
  wishlistCount = 0,
  coins = 0,
}: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleNavigate = (path: string) => {
    onClose()
    navigate(path)
  }

  const menuItems = [
    {
      icon: <User size={18} color="#2563eb" />,
      label: 'My Profile',
      sub: 'Personal details & settings',
      path: '/account?tab=profile',
    },
    {
      icon: <Package size={18} color="#f59e0b" />,
      label: 'Orders',
      badge: totalOrdersCount > 0 ? `${totalOrdersCount}` : undefined,
      sub: 'Track, view invoice & reorder',
      path: '/account?tab=orders',
    },
    {
      icon: <Zap size={18} color="#f59e0b" />,
      label: 'Supercoin',
      badge: `${coins} Coins`,
      sub: 'Agaram cash balance rewards',
      path: '/account?tab=supercoin',
    },
    {
      icon: <Sparkles size={18} color="#8b5cf6" />,
      label: 'Agaram Plus Zone',
      badge: 'VIP B2B',
      sub: 'Free priority shipping & lowest slabs',
      path: '/account?tab=plus',
    },
    {
      icon: <CreditCard size={18} color="#06b6d4" />,
      label: 'Saved Cards & Wallet',
      sub: 'UPI, NetBanking & GST details',
      path: '/account?tab=wallet',
    },
    {
      icon: <MapPin size={18} color="#ec4899" />,
      label: 'Saved Addresses',
      sub: 'Office, school & home addresses',
      path: '/account?tab=addresses',
    },
    {
      icon: <Heart size={18} color="#ef4444" />,
      label: 'Wishlist',
      badge: wishlistCount > 0 ? `${wishlistCount}` : undefined,
      sub: 'Saved stationery & bulk items',
      path: '/wishlist',
    },
    {
      icon: <Gift size={18} color="#84cc16" />,
      label: 'Gift Cards',
      sub: 'School student rewards & vouchers',
      path: '/account?tab=giftcards',
    },
    {
      icon: <Bell size={18} color="#6366f1" />,
      label: 'Notifications',
      badge: '2 New',
      sub: 'Delivery alerts & flash offers',
      path: '/account?tab=notifications',
    },
  ]

  return (
    <div
      ref={dropdownRef}
      className="profile-dropdown-card"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '320px',
        maxWidth: '90vw',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '18px',
        boxShadow: '0 20px 48px -6px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header Info Banner */}
      <div
        style={{
          padding: '16px 18px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e03a1f 0%, #ff7828 100%)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '18px',
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(224, 58, 31, 0.25)',
          }}
        >
          {currentUser?.name ? currentUser.name[0].toUpperCase() : 'A'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Account
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.name || 'Valued Customer'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.email || 'Sign in to access orders'}
          </div>
        </div>
      </div>

      {/* Menu Items List */}
      <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px 8px' }}>
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleNavigate(item.path)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f8fafc',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      background: '#ecfdf5',
                      color: '#059669',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                {item.sub}
              </div>
            </div>
            <ChevronRight size={14} color="#94a3b8" />
          </button>
        ))}
      </div>

      {/* Footer Sign Out / Sign In */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: '#f8fafc',
        }}
      >
        {currentUser ? (
          <button
            type="button"
            onClick={() => {
              onClose()
              onLogout()
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              background: '#fee2e2',
              color: '#dc2626',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fee2e2')}
          >
            <LogOut size={16} /> Logout from Account
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleNavigate('/account')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              background: '#e03a1f',
              color: '#fff',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign In / Create Account
          </button>
        )}
      </div>
    </div>
  )
}
