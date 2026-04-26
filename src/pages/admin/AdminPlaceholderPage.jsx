import { AdminIcon } from '../../components/admin/AdminIcons'

const copy = {
  orders: ['Orders', 'Checkout can attach order records here when it is ready.', 'Order status, fulfillment, payment state'],
  customers: ['Customers', 'Customer profiles and purchase history will live here.', 'Profiles, notes, lifetime value'],
  coupons: ['Coupons', 'Discount rules can be managed from this section.', 'Codes, date ranges, product scopes'],
  shipping: ['Shipping', 'Shipping zones and delivery rates will be configured here.', 'Zones, rates, estimates'],
  settings: ['Store Settings', 'Store-wide defaults will be managed here.', 'Currency, tax, storefront controls'],
}

export default function AdminPlaceholderPage({ type }) {
  const [title, description, detail] = copy[type] || copy.settings
  return (
    <section className="admin-page admin-placeholder">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Prepared structure</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="admin-empty-state">
        <span className="admin-empty-icon"><AdminIcon name={type === 'customers' ? 'users' : type === 'orders' ? 'order' : 'settings'} size={22} /></span>
        <h2>{description}</h2>
        <p>{detail}</p>
      </div>
    </section>
  )
}
