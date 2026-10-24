import { useState, useRef } from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Zap, Layers, TrendingDown } from 'lucide-react'

interface Wholesale3DBannerProps {
  onExploreCatalog: () => void
  totalProducts?: number
  lang?: 'en' | 'ta'
}

export function Wholesale3DBanner({
  onExploreCatalog,
  totalProducts = 41,
  lang = 'en'
}: Wholesale3DBannerProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotX = -((y - centerY) / centerY) * 12
    const rotY = ((x - centerX) / centerX) * 14
    setRotateX(rotX)
    setRotateY(rotY)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
    setIsHovered(false)
  }

  return (
    <div
      style={{
        perspective: '1200px',
        margin: '14px 0 24px 0',
        width: '100%',
      }}
    >
      <div
        ref={cardRef}
        className="wholesale-bulb-card"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={onExploreCatalog}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onExploreCatalog()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Browse the complete wholesale stationery and business catalogue"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${isHovered ? 'scale3d(1.015, 1.015, 1.015)' : 'scale3d(1, 1, 1)'}`,
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, #073d2e 0%, #062a21 60%, #031b16 100%)',
          borderRadius: '24px',
          padding: '42px 40px',
          color: '#ffffff',
          boxShadow: isHovered
            ? '0 30px 70px -10px rgba(224, 58, 31, 0.55), 0 0 35px rgba(251, 191, 36, 0.35)'
            : '0 20px 50px -12px rgba(224, 58, 31, 0.35)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
        }}
      >
        <div className="wholesale-light-row wholesale-light-top" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
        <div className="wholesale-light-row wholesale-light-bottom" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
        <div className="wholesale-light-row wholesale-light-side wholesale-light-left" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
        </div>
        <div className="wholesale-light-row wholesale-light-side wholesale-light-right" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
        </div>
        <div className="wholesale-signboard" aria-hidden="true" />
        {/* Ambient 3D Glowing Flares */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.38) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '20%',
            width: '220px',
            height: '220px',
            background: 'radial-gradient(circle, rgba(255, 120, 40, 0.35) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(35px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, transform: 'translateZ(35px)' }}>
          {/* Top Pill Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              }}
            >
              <Zap size={13} fill="#fff" />
              {lang === 'ta' ? 'மொத்த விற்பனை மையம்' : 'Wholesale Direct Hub'}
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                color: '#fef08a',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(254, 240, 138, 0.3)',
              }}
            >
              🔥 Save 10% on 5+ pcs · 18% on 10+ pcs
            </span>
          </div>

          {/* BRIGHT 3D MOVABLE WHOLESALE TITLE */}
          <div style={{ transform: 'translateZ(50px)' }}>
            <h1
              className="wholesale-neon-title"
              style={{
                fontSize: 'clamp(32px, 6vw, 54px)',
                fontWeight: 900,
                lineHeight: 1.05,
                margin: '0 0 10px 0',
                letterSpacing: '-0.02em',
                color: '#fff1a8',
                textShadow: '0 0 6px #fff, 0 0 18px #facc15, 0 0 36px #f97316, 0 5px 0 #b91c1c',
              }}
            >
              {lang === 'ta' ? 'மொத்த விற்பனை' : 'WHOLESALE'}
            </h1>
            <p
              style={{
                fontSize: 'clamp(14px, 2.5vw, 17px)',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.95)',
                maxWidth: '680px',
                lineHeight: 1.45,
                margin: '0 0 20px 0',
              }}
            >
              {lang === 'ta'
                ? 'பள்ளிகள், கல்லூரிகள், ஜெராக்ஸ் கடைகள் மற்றும் சில்லறை வணிகங்களுக்கான நேரடி தொழிற்சாலை மொத்த விலை மற்றும் உடனடி விநியோகம்.'
                : 'Direct bulk pricing for Xerox shops, schools, coaching centres & retail stores. Buy in cartons & bulk packs to unlock massive tier discounts.'}
            </p>
          </div>

          {/* Clickable Action Banner Button as requested by user */}
          <div
            style={{
              transform: 'translateZ(65px)',
              display: 'inline-flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.98)',
              color: '#0f172a',
              padding: '14px 22px',
              borderRadius: '16px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.2s ease',
              border: '2px solid #fbbf24',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#e03a1f' }}>
                Complete Stationery & Business Catalog ({totalProducts})
              </span>
              <ArrowRight size={18} color="#e03a1f" style={{ strokeWidth: 2.5 }} />
            </div>
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
              Browse all supplies with instant stock availability and tiered discount slabs ➔
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
