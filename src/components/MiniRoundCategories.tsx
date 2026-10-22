import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { categories, type CategorySlug } from '../data/products'

interface MiniRoundCategoriesProps {
  selectedCategory: string
  selectedSubcategory?: string
  onSelectCategory: (categorySlug: string, subcategoryId?: string) => void
  lang?: 'en' | 'ta'
}

export function MiniRoundCategories({
  selectedCategory,
  selectedSubcategory = 'all',
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

  // Curated list of mini round categories matching user's Image 5
  const miniRounds = [
    {
      id: 'all',
      category: 'all',
      subId: 'all',
      name: lang === 'ta' ? 'அனைத்து மொத்த விற்பனை' : 'All Wholesale',
      icon: '🏪',
      color: '#15803d',
    },
    {
      id: 'pen-cartons',
      category: 'retailer-bulk',
      subId: 'pen-cartons',
      name: lang === 'ta' ? 'பேனா கார்ட்டன் & ஜாடி' : 'Pen Cartons & Jars',
      icon: '🖊️',
      color: '#0284c7',
    },
    {
      id: 'correction-pens',
      category: 'retailer-bulk',
      subId: 'correction-pens',
      name: lang === 'ta' ? 'கரெக்ஷன் பேனாக்கள்' : 'Correction Pens',
      icon: '🖋️',
      color: '#059669',
    },
    {
      id: 'adhesives-glues',
      category: 'retailer-bulk',
      subId: 'adhesives-glues',
      name: lang === 'ta' ? 'ஃபெவிகால் & பசைகள்' : 'Fevicol & Glue Boxes',
      icon: '🧴',
      color: '#ea580c',
    },
    {
      id: 'stationery-tubs',
      category: 'retailer-bulk',
      subId: 'stationery-tubs',
      name: lang === 'ta' ? 'அழிப்பான் & பென்சில் டப்' : 'Eraser & Pencil Tubs',
      icon: '✏️',
      color: '#7c3aed',
    },
    {
      id: 'xerox-paper',
      category: 'xerox-printing',
      subId: 'copier-paper',
      name: lang === 'ta' ? 'A4/A3 ஜெராக்ஸ் தாள்' : 'Xerox & A4 Paper',
      icon: '📄',
      color: '#e03a1f',
    },
    {
      id: 'refill-inks',
      category: 'xerox-printing',
      subId: 'refill-inks',
      name: lang === 'ta' ? 'பிரிண்டர் இங்க் பாட்டில்கள்' : 'Printer Inks',
      icon: '💧',
      color: '#2563eb',
    },
    {
      id: 'aesthetic-pens',
      category: 'aesthetic-pens',
      subId: 'all',
      name: lang === 'ta' ? 'கவாய் ஜெல் பேனாக்கள்' : 'Aesthetic Pens',
      icon: '🌸',
      color: '#db2777',
    },
    {
      id: 'highlighters',
      category: 'highlighters-markers',
      subId: 'all',
      name: lang === 'ta' ? 'பாஸ்டல் ஹைலைட்டர்' : 'Highlighters',
      icon: '🖍️',
      color: '#f59e0b',
    },
    {
      id: 'notebooks',
      category: 'notebooks-journals',
      subId: 'all',
      name: lang === 'ta' ? 'புல்லட் ஜர்னல் & நோட்' : 'Bullet Journals',
      icon: '📓',
      color: '#10b981',
    },
    {
      id: 'sticky-notes',
      category: 'sticky-notes-washi',
      subId: 'all',
      name: lang === 'ta' ? 'வாஷி டேப் & நோட்ஸ்' : 'Sticky Notes',
      icon: '📑',
      color: '#8b5cf6',
    },
    {
      id: 'desk-organizers',
      category: 'desk-organizers',
      subId: 'all',
      name: lang === 'ta' ? 'மேஜை அமைப்பாளர்' : 'Desk Organizers',
      icon: '🗂️',
      color: '#0891b2',
    },
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
                <span>{round.icon}</span>
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
