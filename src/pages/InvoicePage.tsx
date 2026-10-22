import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Product, Language, unitPrice, money, CustomerType } from '../data/products'
import { ApiOrder } from '../api'

interface InvoicePageProps {
  products: Product[]
  lang?: Language
  onOpenTracking?: (orderId: string, address: string) => void
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ products, lang = 'en', onOpenTracking }) => {
  const { orderId } = useParams<{ orderId: string }>()

  let orders: ApiOrder[] = []
  try {
    orders = JSON.parse(localStorage.getItem('abm_orders') || '[]')
  } catch {}

  const order = orders.find(o => o.id === orderId) || {
    id: orderId || 'ABM62219233',
    date: new Date().toLocaleDateString('en-GB'),
    items: [
      { productId: 101, quantity: 1 }
    ],
    total: 188.80,
    subtotal: 160.00,
    tax: 28.80,
    discount: 0,
    customerType: 'retail' as CustomerType,
    coinsEarned: 10,
    customerName: 'Valued Customer',
    email: 'customer@agaram.in',
    phone: '9876543210',
    address: 'Cuddalore',
    city: 'Cuddalore',
    pincode: '607001',
    gstin: '33AABCA1234A1Z5'
  }

  // Calculate items with GST & taxable breakdown
  const lineItems = order.items.map((item, idx) => {
    const prod = products.find(p => p.id === item.productId)
    const gstRate = prod?.gst || 18
    const basePrice = prod ? unitPrice(prod, item.quantity, order.customerType) : 160
    const taxableUnitRate = Math.round((basePrice / (1 + gstRate / 100)) * 100) / 100
    const taxableTotal = Math.round((taxableUnitRate * item.quantity) * 100) / 100
    const gstAmount = Math.round((taxableTotal * (gstRate / 100)) * 100) / 100
    const lineTotal = Math.round((taxableTotal + gstAmount) * 100) / 100

    return {
      index: idx + 1,
      name: prod?.name || 'Desk Stationery Item',
      sku: prod?.sku || 'ABM-ST-001',
      brand: prod?.brand || 'Agaram',
      hsn: '9608',
      quantity: item.quantity,
      unitRate: taxableUnitRate,
      taxableValue: taxableTotal,
      gstRate,
      gstAmount,
      lineTotal
    }
  })

  const totalTaxable = lineItems.reduce((sum, item) => sum + item.taxableValue, 0)
  const totalGst = lineItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = totalTaxable + totalGst
  const cgst = totalGst / 2
  const sgst = totalGst / 2

  return (
    <div className="container" style={{ padding: '36px 16px 60px', maxWidth: '860px', margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <Link to="/account?tab=orders" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to My Orders
        </Link>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onOpenTracking && (
            <button
              onClick={() => onOpenTracking(order.id, `${order.address || 'Cuddalore'} - ${order.pincode || '607001'}`)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontWeight: 800 }}
            >
              <span>🚚</span> Track Partner on Map
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Tax Invoice
          </button>
        </div>
      </div>

      {/* ORIGINAL INVOICE CARD */}
      <div
        className="original-invoice-card"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/abm-logo.png" alt="Agaram Business Mart" style={{ height: '46px', width: 'auto' }} onError={e => (e.currentTarget.style.display = 'none')} />
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                Agaram Business Mart
              </h1>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Cuddalore, Tamil Nadu, India</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>+91 7871096937 • support@agaram.in</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.06em' }}>
              TAX INVOICE PREVIEW
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: '2px 0' }}>
              #{order.id}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Date: {order.date}</div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Payment: Verified</div>
          </div>
        </div>

        {/* Pink Dividing Line */}
        <div style={{ borderBottom: '2px solid #e11d48', margin: '18px 0 20px' }} />

        {/* Two-Column Metadata (BILL TO / SHIP TO & ORDER DETAILS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.04em', marginBottom: '6px' }}>
              BILL TO / SHIP TO
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{order.customerName || 'Valued Customer'}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{order.email || 'customer@agaram.in'}</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>{order.address || 'Cuddalore'} - {order.pincode || '607001'}</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>Phone: {order.phone || '9876543210'}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', letterSpacing: '0.04em', marginBottom: '6px' }}>
              ORDER DETAILS
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Stationery Wholesale Order</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Invoice: #{order.id}</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>State: Tamil Nadu (Code 33)</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>Place of Supply: Cuddalore, TN</div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>#</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>Item Description</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>HSN</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Taxable Rate</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>GST %</th>
                <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', color: '#64748b' }}>{item.index}</td>
                  <td style={{ padding: '10px' }}>
                    <b style={{ color: '#0f172a' }}>{item.name}</b>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>SKU: {item.sku}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>{item.hsn}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{money(item.unitRate)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{item.gstRate}%</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Total Taxable Value:</span>
              <b>{money(totalTaxable)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>CGST (Central Tax):</span>
              <b>{money(cgst)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>SGST (State Tax):</span>
              <b>{money(sgst)}</b>
            </div>
            <div style={{ borderTop: '2px solid #e11d48', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Grand Total (INR):</span>
              <b style={{ fontWeight: 900, color: 'var(--primary)' }}>{money(grandTotal)}</b>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          This is a computer-generated tax invoice issued by Agaram Business Mart. Thank you for your business!
        </div>
      </div>
    </div>
  )
}

export default InvoicePage
