import { useEffect, useState } from 'react'
import { X, MapPin, Navigation, RefreshCw } from 'lucide-react'
import { fetchDriverLocation, type DriverLocation } from '../api'

interface DeliveryPartnerLiveMapModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  customerAddress: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  lang?: 'en' | 'ta'
}

export function DeliveryPartnerLiveMapModal({ isOpen, onClose, orderId, customerAddress, deliveryLatitude, deliveryLongitude, lang = 'en' }: DeliveryPartnerLiveMapModalProps) {
  const [driver, setDriver] = useState<DriverLocation | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !orderId) return
    let active = true
    const refresh = async () => {
      try {
        const next = await fetchDriverLocation(orderId)
        if (!active) return
        setDriver(next)
        setError('')
      } catch (err) {
        if (!active) return
        setDriver(null)
        setError(err instanceof Error ? err.message : 'Live location is not available yet.')
      } finally {
        if (active) setLastChecked(new Date())
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 8000)
    return () => { active = false; window.clearInterval(timer) }
  }, [isOpen, orderId])

  if (!isOpen) return null
  const destLat = driver?.destinationLatitude ?? deliveryLatitude
  const destLng = driver?.destinationLongitude ?? deliveryLongitude
  const mapLat = driver?.latitude ?? destLat
  const mapLng = driver?.longitude ?? destLng
  const mapUrl = mapLat != null && mapLng != null ? `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(customerAddress)}&z=16&output=embed`
  const directionsUrl = destLat != null && destLng != null
    ? `https://www.google.com/maps/dir/?api=1&${driver ? `origin=${driver.latitude},${driver.longitude}&` : ''}destination=${destLat},${destLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerAddress)}`

  return <div role="dialog" aria-modal="true" aria-label="Live delivery tracking" className="instamart-modal-backdrop" onClick={onClose}>
    <section className="instamart-map-modal" onClick={event => event.stopPropagation()} style={{ width: 'min(620px, 95vw)', maxHeight: '92vh', overflow: 'auto' }}>
      <header style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
        <div><b style={{ display: 'block' }}>{lang === 'ta' ? 'நேரடி டெலிவரி கண்காணிப்பு' : 'Live delivery tracking'}</b><small style={{ color: 'var(--text-muted)' }}>Order #{orderId}</small></div>
        <button className="instamart-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </header>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: driver ? '#dcfce7' : '#f1f5f9', color: driver ? '#15803d' : '#64748b' }}><Navigation size={20} /></span>
          <div><b>{driver ? 'Driver location is live' : 'Waiting for driver GPS'}</b><small style={{ display: 'block', color: 'var(--text-muted)' }}>{driver ? `Updated ${new Date(driver.updatedAt).toLocaleTimeString()}` : (error || 'The driver will appear here after sharing location from the admin order screen.')}</small></div>
          <button onClick={() => { setLastChecked(null); void fetchDriverLocation(orderId).then(setDriver).catch(err => setError(err.message)).finally(() => setLastChecked(new Date())) }} className="btn btn-secondary" style={{ marginLeft: 'auto', padding: 8 }} aria-label="Refresh location"><RefreshCw size={16} /></button>
        </div>
        <div style={{ height: 320, borderRadius: 14, overflow: 'hidden', background: '#f1f5f9', border: '1px solid var(--line)' }}>
          {mapLat != null && mapLng != null ? <iframe title="Google Map delivery location" src={mapUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}><MapPin size={30} /><span>Delivery pin not saved for this order. View the address in Google Maps to navigate.</span></div>}
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f8fafc', fontSize: 12 }}><b>Delivery address</b><div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{customerAddress}</div></div>
        <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, textDecoration: 'none' }}><Navigation size={16} /> Open Google Maps directions</a>
        <small style={{ color: 'var(--text-soft)', display: 'block', marginTop: 10, textAlign: 'center' }}>Location refreshes every 8 seconds{lastChecked ? ` · Checked ${lastChecked.toLocaleTimeString()}` : ''}</small>
      </div>
    </section>
  </div>
}
