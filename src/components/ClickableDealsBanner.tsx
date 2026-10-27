import { Link } from 'react-router-dom'
import { ArrowRight, Printer, Sparkles, BookOpen, PartyPopper } from 'lucide-react'

interface ClickableDealsBannerProps {
  lang?: 'en' | 'ta'
}

export function ClickableDealsBanner({ lang = 'en' }: ClickableDealsBannerProps) {
  const deals = [
    {
      badge: '⚡ 10 MINS DELIVERY',
      title: lang === 'ta' ? 'ஜெராக்ஸ் தாள்கள் & இங்க்' : 'Xerox Paper & Refill Inks',
      subtitle: lang === 'ta' ? 'கார்ட்டன் கட்டுகளுக்கு 25% தள்ளுபடி' : 'Flat 25% OFF on Bulk Cartons & OEM Inks',
      cta: lang === 'ta' ? 'வாங்க' : 'Order Now',
      icon: <Printer size={32} color="rgba(255,255,255,0.85)" />,
      bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      shadow: 'rgba(234, 88, 12, 0.35)',
      link: '/category/xerox-printing',
    },
    {
      badge: '🌸 KAWAII STATIONERY',
      title: lang === 'ta' ? 'ஜப்பானிய ஜெல் பேனாக்கள்' : 'Pastel Aesthetic Gel Pens',
      subtitle: lang === 'ta' ? '₹199 முதல் தொடங்குகிறது | 2 வாங்கினால் 1 இலவசம்' : 'Starting ₹199 | Buy 2 Get 1 Free',
      cta: lang === 'ta' ? 'ஆராய்' : 'Explore',
      icon: <Sparkles size={32} color="rgba(255,255,255,0.85)" />,
      bg: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      shadow: 'rgba(219, 39, 119, 0.35)',
      link: '/category/aesthetic-pens',
    },
    {
      badge: '🎒 SCHOOL COMBO',
      title: lang === 'ta' ? 'பள்ளி அத்தியாவசிய தொகுப்பு' : 'School Notebooks & Kits',
      subtitle: lang === 'ta' ? 'வகுப்பறை தொகுப்புகளுக்கு 35% சேமிப்பு' : 'Save Up to 35% on Classroom Packs',
      cta: lang === 'ta' ? 'வாங்க' : 'Order Now',
      icon: <BookOpen size={32} color="rgba(255,255,255,0.85)" />,
      bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      shadow: 'rgba(2, 132, 199, 0.35)',
      link: '/category/school-essentials',
    },
    {
      badge: '🎉 PARTY & CELEBRATION',
      title: lang === 'ta' ? 'கொண்டாட்ட அலங்காரங்கள்' : 'Party Decor & Balloons',
      subtitle: lang === 'ta' ? 'பலூன்கள், ரிப்பன்கள் & விளக்குகள்' : 'Balloons, Ribbons, Candles & Props',
      cta: lang === 'ta' ? 'பார்க்க' : 'Shop Party',
      icon: <PartyPopper size={32} color="rgba(255,255,255,0.85)" />,
      bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      shadow: 'rgba(124, 58, 237, 0.35)',
      link: '/category/celebration-decor',
    },
  ]

  return (
    <div className="clickable-deals-container" style={{ margin: '18px 0 24px' }}>
      <div
        className="clickable-deals-scroll"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '9px',
        }}
      >
        {deals.map((deal, idx) => (
          <Link
            key={idx}
            to={deal.link}
            className="clickable-deal-card"
            style={{
              background: deal.bg,
              borderRadius: '14px',
              padding: '12px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '116px',
              boxShadow: `0 10px 24px -4px ${deal.shadow}`,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
              e.currentTarget.style.boxShadow = `0 16px 32px -4px ${deal.shadow}`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = `0 10px 24px -4px ${deal.shadow}`
            }}
          >
            {/* Top Badge & Text */}
            <div>
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  padding: '3px 6px',
                  borderRadius: '6px',
                }}
              >
                {deal.badge}
              </span>
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  margin: '6px 0 3px 0',
                  color: '#ffffff',
                  lineHeight: 1.25,
                }}
              >
                {deal.title}
              </h3>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.92)',
                  margin: 0,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {deal.subtitle}
              </p>
            </div>

            {/* Bottom Button Pill & Icon */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
              }}
            >
              <span
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '4px 9px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                }}
              >
                {deal.cta} <ArrowRight size={12} />
              </span>
              <div style={{ opacity: 0.9, transform: 'scale(.72)', transformOrigin: 'right center' }}>{deal.icon}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
