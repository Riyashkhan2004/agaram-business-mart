import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, X, Check, Search, Home, Briefcase, GraduationCap, Store } from 'lucide-react'
import { API_URL } from '../api'

// Fix default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapLocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentPincode: string
  onSelectAddress: (addressData: { address: string; city: string; pincode: string; label: string; latitude: number; longitude: number }) => void
  lang?: 'en' | 'ta'
}

const PRESET_LOCATIONS = [
  { name: 'Cuddalore Main Town', lat: 11.7480, lng: 79.7714, pincode: '607001', city: 'Cuddalore' },
  { name: 'OT / Manjakuppam, Cuddalore', lat: 11.7540, lng: 79.7680, pincode: '607001', city: 'Cuddalore' },
  { name: 'Semmandalam, Cuddalore', lat: 11.7610, lng: 79.7520, pincode: '607001', city: 'Cuddalore' },
  { name: 'Koothapakkam / Silver Beach', lat: 11.7320, lng: 79.7820, pincode: '607002', city: 'Cuddalore' },
  { name: 'Neyveli Township', lat: 11.5978, lng: 79.4862, pincode: '607803', city: 'Neyveli' },
  { name: 'Panruti Town', lat: 11.7709, lng: 79.5532, pincode: '607106', city: 'Panruti' },
  { name: 'Pondicherry Center', lat: 11.9416, lng: 79.8083, pincode: '605001', city: 'Pondicherry' },
  { name: 'Chennai Anna Nagar / T.Nagar', lat: 13.0827, lng: 80.2707, pincode: '600040', city: 'Chennai' },
]

export function MapLocationPickerModal({
  isOpen,
  onClose,
  currentPincode,
  onSelectAddress,
  lang = 'en'
}: MapLocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const geocodeTimerRef = useRef<number | null>(null)
  const lookupSequenceRef = useRef(0)
  const addressCacheRef = useRef(new Map<string, { address: string; city: string; pincode: string }>())

  const [coords, setCoords] = useState<[number, number]>([11.7480, 79.7714])
  const [addressLine, setAddressLine] = useState('Main Road, Cuddalore')
  const [city, setCity] = useState('Cuddalore')
  const [pincode, setPincode] = useState(currentPincode || '607001')
  const [addressType, setAddressType] = useState<'home' | 'work' | 'school' | 'shop'>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [locating, setLocating] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Initialize or update Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    // Small timeout to allow modal animation to finish before rendering map
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: coords,
          zoom: 14,
          zoomControl: false,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // Custom pulsing marker icon
        const pinIcon = L.divIcon({
          className: 'instamart-map-pin',
          html: `<div style="background:#e03a1f;color:#fff;width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 4px 14px rgba(224,58,31,0.5);border:2px solid #fff;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        })

        const marker = L.marker(coords, { draggable: true, icon: pinIcon }).addTo(map)

        marker.on('dragend', () => {
          const latlng = marker.getLatLng()
          setCoords([latlng.lat, latlng.lng])
          updateLocationText(latlng.lat, latlng.lng)
        })

        map.on('click', (e) => {
          marker.setLatLng(e.latlng)
          setCoords([e.latlng.lat, e.latlng.lng])
          updateLocationText(e.latlng.lat, e.latlng.lng)
        })

        mapInstanceRef.current = map
        markerRef.current = marker
      } else {
        mapInstanceRef.current.invalidateSize()
        mapInstanceRef.current.setView(coords, 14)
        if (markerRef.current) markerRef.current.setLatLng(coords)
      }
    }, 150)

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimerRef.current !== null) window.clearTimeout(geocodeTimerRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  const updateLocationText = (lat: number, lng: number) => {
    const sequence = ++lookupSequenceRef.current
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
    const cached = addressCacheRef.current.get(key)
    setLocationError('')
    if (cached) {
      setAddressLine(cached.address)
      setCity(cached.city)
      setPincode(cached.pincode)
      setAddressLoading(false)
      return
    }
    setAddressLine(`GPS pin ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    setCity('')
    setPincode('')
    setAddressLoading(true)
    if (geocodeTimerRef.current !== null) window.clearTimeout(geocodeTimerRef.current)
    geocodeTimerRef.current = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ lat: String(lat), lon: String(lng) })
        const response = await fetch(`${API_URL}/api/location/reverse?${query}`, { signal: AbortSignal.timeout(12000), cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Address lookup is temporarily unavailable.')
        if (sequence !== lookupSequenceRef.current) return
        const resolved = {
          address: result.address || result.displayAddress || `GPS pin ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          city: result.city || '',
          pincode: result.pincode || '',
        }
        addressCacheRef.current.set(key, resolved)
        setAddressLine(resolved.address)
        setCity(resolved.city)
        setPincode(resolved.pincode)
        if (!resolved.pincode) setLocationError('The map could not find a PIN code for this address. Enter the delivery PIN below.')
      } catch (error) {
        if (sequence === lookupSequenceRef.current) setLocationError(error instanceof Error ? `${error.message} Enter the street address and PIN code below.` : 'Address lookup failed. Enter the street address and PIN code below.')
      } finally {
        if (sequence === lookupSequenceRef.current) setAddressLoading(false)
      }
    }, 350)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const newCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setCoords(newCoords)
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView(newCoords, 16)
          markerRef.current.setLatLng(newCoords)
        }
        updateLocationText(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLocating(false)
        setLocationError('Could not read your GPS location. Allow location access in your browser and try again.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  }

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    const newCoords: [number, number] = [preset.lat, preset.lng]
    setCoords(newCoords)
    setAddressLine(preset.name)
    setCity(preset.city)
    setPincode(preset.pincode)
    setLocationError('')
    setAddressLoading(false)
    setSearchQuery('')
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView(newCoords, 15)
      markerRef.current.setLatLng(newCoords)
    }
  }

  const handleConfirm = () => {
    if (!addressLine.trim() || !city.trim() || !/^\d{6}$/.test(pincode)) {
      setLocationError('Enter your street address, city and valid 6-digit PIN code to confirm.')
      return
    }
    onSelectAddress({
      address: addressLine,
      city,
      pincode,
      label: addressType.toUpperCase(),
      latitude: coords[0],
      longitude: coords[1],
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="instamart-modal-backdrop" onClick={onClose}>
      <div className="instamart-map-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="instamart-map-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="instamart-lightning-badge">⚡ 10-15 MINS</span>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {lang === 'ta' ? 'விநியோக இடத்தை தேர்வு செய்க' : 'Select Delivery Location'}
              </h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {lang === 'ta' ? 'வரைபடத்தில் கிளிக் செய்து முகவரியை குறிக்கவும்' : 'Tap on the interactive map or choose your area'}
            </p>
          </div>
          <button className="instamart-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Search & GPS Bar */}
        <div style={{ padding: '10px 16px', background: '#fafaf9', borderBottom: '1px solid var(--line)', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-soft)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ta' ? 'பகுதி அல்லது பின்கோடைத் தேடுக...' : 'Search area, landmark or pincode...'}
              className="pdp-pincode-input"
              style={{ paddingLeft: '34px', height: '38px', fontSize: '12.5px' }}
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '0 12px', height: '38px', flexShrink: 0 }}
          >
            <Navigation size={14} style={{ color: 'var(--primary)' }} />
            <span>{locating ? 'GPS...' : (lang === 'ta' ? 'தற்போதைய இடம்' : 'Current GPS')}</span>
          </button>
        </div>

        {/* Search Preset Chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 16px', background: '#fff', borderBottom: '1px solid var(--line)', scrollbarWidth: 'none' }}>
          {PRESET_LOCATIONS.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.pincode.includes(searchQuery)).map(p => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p)}
              style={{
                fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '20px',
                background: pincode === p.pincode ? 'var(--primary-light)' : 'rgba(0,0,0,0.04)',
                color: pincode === p.pincode ? 'var(--primary)' : 'var(--text-main)',
                border: pincode === p.pincode ? '1px solid var(--primary-border)' : '1px solid transparent',
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0
              }}
            >
              📍 {p.name.split(',')[0]} ({p.pincode})
            </button>
          ))}
        </div>

        {/* Real Interactive Leaflet Map Canvas */}
        <div style={{ position: 'relative', width: '100%', height: '260px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating Dark Store Hub Distance Banner */}
          <div style={{
            position: 'absolute', top: '10px', left: '12px', right: '12px', zIndex: 500,
            background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
            padding: '7px 12px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🏬</span>
              <span><b>Agaram Dark Store Hub:</b> ~1.2 km away</span>
            </div>
            <span style={{ color: '#16a34a', fontWeight: 800 }}>⚡ 10-15 Min Express</span>
          </div>
        </div>

        {/* Address Fields & Tag Selection */}
        <div style={{ padding: '14px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>
            Street address / landmark
            <input value={addressLine} onChange={event => setAddressLine(event.target.value)} placeholder="House, street, area or landmark" className="pdp-pincode-input" style={{ height: '40px', fontSize: '12px' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '8px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>
              City / town
              <input value={city} onChange={event => setCity(event.target.value)} placeholder="City" className="pdp-pincode-input" style={{ height: '40px', fontSize: '12px' }} />
            </label>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>
              PIN code
              <input value={pincode} onChange={event => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" inputMode="numeric" maxLength={6} className="pdp-pincode-input" style={{ height: '40px', fontSize: '12px' }} />
            </label>
          </div>
          {addressLoading && <div role="status" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Looking up the street address…</div>}
          {locationError && <div role="status" style={{ padding: '9px 11px', borderRadius: '9px', background: '#fff7ed', color: '#9a3412', fontSize: '11px', lineHeight: 1.45 }}>{locationError}</div>}
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Map and address data © OpenStreetMap contributors. GPS coordinates are shared to find the address when you use GPS or move the pin.</div>

          {/* Address Tag Selector */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '6px' }}>
              {lang === 'ta' ? 'முகவரி வகை' : 'Save Address As'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'work', label: 'Work', icon: Briefcase },
                { id: 'school', label: 'School', icon: GraduationCap },
                { id: 'shop', label: 'Shop', icon: Store },
              ].map(t => {
                const Icon = t.icon
                const active = addressType === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAddressType(t.id as any)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '8px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                      background: active ? 'var(--primary-light)' : '#f8fafc',
                      color: active ? 'var(--primary)' : 'var(--text-main)',
                      border: active ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 800, marginTop: '4px' }}
          >
            <Check size={16} />
            <span>{lang === 'ta' ? 'இந்த இடத்திற்கு விநியோகிக்கவும்' : 'Confirm & Deliver to This Location'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
