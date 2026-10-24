import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { categories as defaultCategories, type StationeryCategory } from '../data/products'

interface MiniRoundCategoriesProps {
  selectedCategory: string
  selectedSubcategory?: string
  categories?: StationeryCategory[]
  onSelectCategory: (categorySlug: string, subcategoryId?: string) => void
  lang?: 'en' | 'ta'
}

type MiniRound = { id: string; category: string; subId: string; name: string; icon: string; image?: string; color: string }

export function MiniRoundCategories({
  selectedCategory,
  selectedSubcategory = 'all',
  categories = defaultCategories,
  onSelectCategory,
  lang = 'en'
}: MiniRoundCategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth'
      })
    }
  }

  const miniRounds: MiniRound[] = [
    {
      id: 'all',
      category: 'all',
      subId: 'all',
      name: lang === 'ta' ? 'அனைத்து மொத்த விற்பனை' : 'All Wholesale',
      icon: '🏪',
      color: '#15803d',
    },
    ...categories.map((category, index) => ({
      id: category.slug,
      category: category.slug,
      subId: 'all',
      name: lang === 'ta' && category.nameTa ? category.nameTa : category.name,
      icon: category.icon,
      image: category.image,
      color: ['#0284c7', '#059669', '#ea580c', '#7c3aed', '#e03a1f', '#2563eb', '#db2777', '#f59e0b', '#10b981', '#8b5cf6', '#0891b2'][index % 11],
    })),
  ]

  return (
    <div style={{ margin: '14px 0 20px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Shop Wholesale by Category</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#ecfdf5', padding: '1px 7px', borderRadius: '12px' }}>
            Instant Stock
          </span>
        </div>
        <div style={{ display: 'none', gap: '6px' }} className="desktop-scroll-btns">
          <button
            onClick={() => scroll('left')}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mini-rounds-carousel"
        style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {miniRounds.map(round => {
          const isActive =
            (round.category === 'all' && selectedCategory === 'all') ||
            (selectedCategory === round.category && (round.subId === 'all' || selectedSubcategory === round.subId))

          return (
            <button
              key={round.id}
              type="button"
              onClick={() => onSelectCategory(round.category, round.subId)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '7px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                width: '74px',
                padding: '2px',
                textAlign: 'center',
              }}
            >
              {/* Circular Round Icon Container */}
              <div
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '50%',
                  background: isActive ? '#f0fdf4' : '#ffffff',
                  border: isActive ? `2.5px solid ${round.color}` : '1.5px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: isActive
                    ? `0 6px 18px -2px rgba(21, 128, 61, 0.3), inset 0 0 0 2px #fff`
                    : '0 4px 12px rgba(0, 0, 0, 0.05)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '28px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isActive ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                {round.image
                  ? <img src={round.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <span>{round.icon}</span>}
              </div>

              {/* Title Underneath Circle */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 900 : 700,
                  color: isActive ? round.color : '#334155',
                  lineHeight: 1.25,
                  maxWidth: '72px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {round.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
