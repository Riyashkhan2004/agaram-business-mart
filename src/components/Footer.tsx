import { Link } from 'react-router-dom'

interface FooterProps {
  lang?: 'en' | 'ta'
}

export function Footer({ lang = 'en' }: FooterProps) {
  return (
    <footer className="site-footer" style={{ marginTop: '40px', background: '#0f172a', color: '#cbd5e1', padding: '40px 0 20px' }}>
      <div className="container footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <img src="/abm-logo.png" alt="Agaram" style={{ height: '42px', width: 'auto', background: '#fff', borderRadius: '10px', padding: '3px' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>Agaram Stationery Mart</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.1em', fontWeight: 800 }}>EST. 2024 · TAMIL NADU</div>
            </div>
          </div>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
            B2B & B2C stationery superstore delivering high-speed Xerox copier papers, OEM printer refill inks, Japanese aesthetic pens, and classroom packs with 10-minute dispatch.
          </p>
        </div>

        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Shop Categories</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><Link to="/category/xerox-printing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Xerox & Copier Papers</Link></li>
            <li><Link to="/category/retailer-bulk" style={{ color: '#94a3b8', textDecoration: 'none' }}>Retailers & Kirana Wholesale</Link></li>
            <li><Link to="/category/aesthetic-pens" style={{ color: '#94a3b8', textDecoration: 'none' }}>Japanese Gel Pens</Link></li>
            <li><Link to="/category/highlighters-markers" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pastel Highlighters</Link></li>
            <li><Link to="/category/notebooks-journals" style={{ color: '#94a3b8', textDecoration: 'none' }}>Notebooks & Journals</Link></li>
          </ul>
        </div>

        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Customer Support</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><Link to="/account?tab=orders" style={{ color: '#94a3b8', textDecoration: 'none' }}>Track Your Order</Link></li>
            <li><Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>Institutional Bulk Quotes</Link></li>
            <li><Link to="/about" style={{ color: '#94a3b8', textDecoration: 'none' }}>About Agaram Mart</Link></li>
            <li><Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>Help & WhatsApp Support</Link></li>
          </ul>
        </div>

        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Bulk Wholesale Enquiries</div>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '12px' }}>
            Schools, tuition centres, and photocopier shops: get factory rates, GST tax invoices, and bulk savings up to 35%.
          </p>
          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', fontSize: '12px', border: '1px solid #334155' }}>
            <div>📞 <b>Helpline:</b> +91 98400 12345</div>
            <div style={{ marginTop: '4px' }}>✉️ <b>Email:</b> orders@agaram.in</div>
          </div>
        </div>
      </div>

      <div className="container footer-bottom" style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#64748b' }}>
        <div>© {new Date().getFullYear()} Agaram Business Mart Pvt Ltd. All rights reserved.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>100% Genuine OEM Guarantee</span>
          <span>GST Invoiced</span>
          <span>10-Min Fast Dispatch</span>
        </div>
      </div>
    </footer>
  )
}
