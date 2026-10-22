import { Link, useLocation } from 'react-router-dom'
import { Home, Grid, Heart, ShoppingBag, User } from 'lucide-react'

interface BottomNavProps {
  cartCount: number
  wishlistCount: number
  currentUser: { id?: string; name?: string; email?: string } | null
  onOpenCart: () => void
  lang?: 'en' | 'ta'
}

export function BottomNav({
  cartCount,
  wishlistCount,
  currentUser,
  onOpenCart,
  lang = 'en'
}: BottomNavProps) {
  const location = useLocation()

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 800,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Link
        to="/"
        className={`mobile-nav-btn ${location.pathname === '/' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: location.pathname === '/' ? '#e03a1f' : '#64748b',
          textDecoration: 'none',
          fontSize: '10px',
          fontWeight: 800,
        }}
      >
        <Home size={19} />
        <span>{lang === 'ta' ? 'முகப்பு' : 'Home'}</span>
      </Link>

      <Link
        to="/category/xerox-printing"
        className={`mobile-nav-btn ${location.pathname.startsWith('/category') ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: location.pathname.startsWith('/category') ? '#e03a1f' : '#64748b',
          textDecoration: 'none',
          fontSize: '10px',
          fontWeight: 800,
        }}
      >
        <Grid size={19} />
        <span>{lang === 'ta' ? 'வகைகள்' : 'Categories'}</span>
      </Link>

      <Link
        to="/wishlist"
        className={`mobile-nav-btn ${location.pathname === '/wishlist' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          position: 'relative',
          color: location.pathname === '/wishlist' ? '#e03a1f' : '#64748b',
          textDecoration: 'none',
          fontSize: '10px',
          fontWeight: 800,
        }}
      >
        <Heart size={19} />
        <span>{lang === 'ta' ? 'விருப்பங்கள்' : 'Wishlist'}</span>
        {wishlistCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '8px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 900,
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {wishlistCount}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={onOpenCart}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          position: 'relative',
          color: '#64748b',
          background: 'transparent',
          border: 'none',
          fontSize: '10px',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        <ShoppingBag size={19} />
        <span>{lang === 'ta' ? 'கூடை' : 'Cart'}</span>
        {cartCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '2px',
              background: '#15803d',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 900,
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {cartCount}
          </span>
        )}
      </button>

      <Link
        to="/account"
        className={`mobile-nav-btn ${location.pathname === '/account' ? 'active' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: location.pathname === '/account' ? '#e03a1f' : '#64748b',
          textDecoration: 'none',
          fontSize: '10px',
          fontWeight: 800,
        }}
      >
        <User size={19} />
        <span>{currentUser ? currentUser.name?.split(' ')[0] : lang === 'ta' ? 'கணக்கு' : 'Profile'}</span>
      </Link>
    </nav>
  )
}
