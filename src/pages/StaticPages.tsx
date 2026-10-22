import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, ArrowLeft, ShieldCheck, Truck, Award, Headphones } from 'lucide-react'

export const AboutPage: React.FC = () => {
  return (
    <div className="container" style={{ padding: '40px 16px 80px', maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Store
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
          About Agaram Stationery Mart
        </h1>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#475569', marginBottom: '20px' }}>
          Agaram Business Mart was founded with a singular mission: to provide schools, colleges, offices, and retail shop owners with factory-direct wholesale pricing on premium aesthetic stationery and daily office supplies.
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#475569', marginBottom: '28px' }}>
          We bridge Japanese & Korean aesthetic stationery culture with everyday Indian school supplies, offering high-durability pens, bulk paper cartons, desk organizers, and art kits backed by our instant 2-hour dispatch warehouse in Cuddalore.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '28px' }}>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
            <Truck size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            <b style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>Fast Bulk Delivery</b>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Same-day local dispatch across Cuddalore and express 24-48 hr courier throughout Tamil Nadu.</p>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
            <Award size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            <b style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>100% Genuine Brands</b>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Direct relationships with Classmate, Doms, Hauser, Pentel, and Camel ensure 100% authenticity.</p>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            <b style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>GST Tax Compliant</b>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Automated B2B tax invoices with full Input Tax Credit (ITC) claiming for registered businesses.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ContactPage: React.FC = () => {
  return (
    <div className="container" style={{ padding: '40px 16px 80px', maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Store
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Help & Support
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>
          Need assistance with a wholesale quote, order delivery tracking, or school bulk supplies? We are here to help!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <MapPin size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>Warehouse & Head Office</b>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                Agaram Business Mart, Main Road, Near Municipal Office, Cuddalore, Tamil Nadu - 607001
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <Phone size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>Phone / WhatsApp Support</b>
              <div style={{ fontSize: '12px', color: '#64748b' }}>+91 78710 96937</div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>Fast response on WhatsApp</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <Mail size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>Email Enquiries</b>
              <div style={{ fontSize: '12px', color: '#64748b' }}>support@agaram.in</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>wholesale@agaram.in</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
            <Clock size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>Working Hours</b>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Monday – Saturday: 9:00 AM – 8:00 PM</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Sunday: 10:00 AM – 2:00 PM (Dispatches active)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
