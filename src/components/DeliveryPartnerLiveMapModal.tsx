import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Phone, MessageSquare, X, ShieldCheck, CheckCircle2, Clock, MapPin, Zap } from 'lucide-react'

interface DeliveryPartnerLiveMapModalProps {
  isOpen: boolean
  onClose: () => void
  orderId?: string
  customerAddress?: string
  lang?: 'en' | 'ta'
}

// Hub in Cuddalore
const STORE_HUB: [number, number] = [11.7560, 79.7620]
// Customer location
const CUSTOMER_LOC: [number, number] = [11.7430, 79.7745]

// Route waypoints simulating road turns in town
const ROUTE_POINTS: [number, number][] = [
  [11.7560, 79.7620],
  [11.7545, 79.7640],
  [11.7520, 79.7665],
  [11.7490, 79.7690],
  [11.7465, 79.7715],
  [11.7445, 79.7730],
  [11.7430, 79.7745],
]

export function DeliveryPartnerLiveMapModal({
  isOpen,
  onClose,
  orderId = 'ABM-928174',
  customerAddress = 'Anna Nagar, Cuddalore 607001',
  lang = 'en'
}: DeliveryPartnerLiveMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const riderMarkerRef = useRef<L.Marker | null>(null)

  const [etaMinutes, setEtaMinutes] = useState(8)
  const [partnerStep, setPartnerStep] = useState(1) // 0 to ROUTE_POINTS.length - 1
  const [orderStage, setOrderStage] = useState<'packed' | 'on_the_way' | 'arriving'>('on_the_way')

  // Smooth live scooter rider animation along the polyline route
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      setPartnerStep(prev => {
        const next = (prev + 1) % ROUTE_POINTS.length
        if (next === ROUTE_POINTS.length - 1) {
          setOrderStage('arriving')
          setEtaMinutes(1)
        } else {
          setOrderStage('on_the_way')
          setEtaMinutes(Math.max(2, 9 - next))
        }
        return next
      })
    }, 3500)

    return () => clearInterval(interval)
  }, [isOpen])

  // Update rider marker position when step changes
  useEffect(() => {
    if (!mapInstanceRef.current || !riderMarkerRef.current) return
    const currentPos = ROUTE_POINTS[partnerStep]
    riderMarkerRef.current.setLatLng(currentPos)
  }, [partnerStep])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [11.7500, 79.7680],
          zoom: 14,
          zoomControl: false,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // 1. Store Hub Icon
        const storeIcon = L.divIcon({
          className: 'instamart-store-pin',
          html: `<div style="background:#1e293b;color:#fff;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);font-size:16px;">🏬</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        })
        L.marker(STORE_HUB, { icon: storeIcon }).addTo(map).bindPopup('<b>Agaram Dark Store Hub</b><br/>Order Packed & Dispatched')

        // 2. Customer Destination Icon
        const customerIcon = L.divIcon({
          className: 'instamart-customer-pin',
          html: `<div style="background:#e03a1f;color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(224,58,31,0.5);"><span style="transform:rotate(45deg);font-size:16px;">🏠</span></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        })
        L.marker(CUSTOMER_LOC, { icon: customerIcon }).addTo(map).bindPopup(`<b>Your Delivery Location</b><br/>${customerAddress}`)

        // 3. Route Polyline
        L.polyline(ROUTE_POINTS, {
          color: '#e03a1f',
          weight: 5,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round',
        }).addTo(map)

        // 4. Moving Delivery Partner Scooter Icon
        const riderIcon = L.divIcon({
          className: 'instamart-rider-pin',
          html: `<div style="position:relative;width:42px;height:42px;background:#15803d;color:#fff;border-radius:50%;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 16px rgba(21,128,61,0.6);"><span style="font-size:20px;">🛵</span><div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #22c55e;animation:partnerPulse 1.6s infinite;"></div></div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        })
        const riderMarker = L.marker(ROUTE_POINTS[partnerStep], { icon: riderIcon }).addTo(map)
        riderMarkerRef.current = riderMarker

        map.fitBounds([STORE_HUB, CUSTOMER_LOC], { padding: [40, 40] })
        mapInstanceRef.current = map
      } else {
        mapInstanceRef.current.invalidateSize()
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="instamart-modal-backdrop" onClick={onClose}>
      <div className="instamart-tracking-modal" onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div className="instamart-tracking-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="instamart-pulse-dot" />
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {lang === 'ta' ? 'நேரலை டெலிவரி கண்காணிப்பு' : 'Live Delivery Partner Tracking'}
              </h2>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Order #{orderId} · ⚡ 10-15 Min Express Delivery
            </div>
          </div>
          <button className="instamart-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Real-time Map Canvas */}
        <div style={{ position: 'relative', width: '100%', height: '280px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating ETA Badge */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 500,
            background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
            borderRadius: '12px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                🛵
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#15803d' }}>
                  {orderStage === 'arriving' ? (lang === 'ta' ? 'கதவு அருகில் உள்ளது!' : 'Arriving at your Door!') : `${etaMinutes} MINS ETA`}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {orderStage === 'arriving' ? (lang === 'ta' ? 'டெலிவரி பார்ட்னர் வந்துவிட்டார்' : 'Partner is at your gate') : (lang === 'ta' ? 'அகரம் எக்ஸ்பிரஸ் பார்ட்னர் வழியில் உள்ளார்' : 'On the way from Agaram Dark Store')}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              LIVE GPS
            </span>
          </div>
        </div>

        {/* Delivery Partner Details & Actions */}
        <div style={{ padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Rider Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Rider Karthik"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e' }}
                />
                <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#22c55e', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '6px' }}>
                  4.9★
                </span>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>Karthik Raja</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>⚡ Agaram Express Rider · TVS iQube (TN 31 AB 4421)</div>
                <div style={{ fontSize: '10.5px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 700 }}>
                  <ShieldCheck size={12} /> Sanitized stationery box · Temperature: 98.2°F
                </div>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href="tel:9840012345"
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'grid', placeItems: 'center', textDecoration: 'none' }}
                title="Call Partner"
              >
                <Phone size={17} />
              </a>
              <a
                href="https://wa.me/919840012345?text=Hello%20Karthik,%20regarding%20my%20Agaram%20Stationery%20Order"
                target="_blank"
                rel="noreferrer"
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', textDecoration: 'none' }}
                title="Chat with Partner"
              >
                <MessageSquare size={17} />
              </a>
            </div>
          </div>

          {/* Instamart Order Status Timeline */}
          <div style={{ padding: '12px 14px', background: '#fafaf9', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '10px' }}>
              {lang === 'ta' ? 'ஆர்டர் நிலை' : 'Order Progress'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
              {[
                { title: 'Placed', icon: '✓', done: true },
                { title: 'Packed', icon: '✓', done: true },
                { title: 'On Road', icon: '🛵', done: true, active: orderStage === 'on_the_way' },
                { title: 'Arrived', icon: '📍', done: orderStage === 'arriving', active: orderStage === 'arriving' },
              ].map((s, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px', fontWeight: 800,
                    background: s.active ? '#15803d' : s.done ? '#22c55e' : '#e2e8f0',
                    color: s.done ? '#fff' : '#64748b', display: 'grid', placeItems: 'center',
                    boxShadow: s.active ? '0 0 0 3px rgba(34, 197, 94, 0.3)' : 'none'
                  }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: s.done ? 800 : 600, color: s.done ? 'var(--text-main)' : 'var(--text-soft)' }}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address Preview */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <MapPin size={15} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <span>Delivering to: <b>{customerAddress}</b></span>
          </div>
        </div>
      </div>
    </div>
  )
}
