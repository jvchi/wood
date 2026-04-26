import { NavLink, Outlet } from 'react-router-dom'
import { AdminIcon } from '../../components/admin/AdminIcons'

const navItems = [
  { to: '/admin', label: 'Overview', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products', icon: 'box' },
  { to: '/admin/taxonomy', label: 'Categories', icon: 'tag' },
  { to: '/admin/orders', label: 'Orders', icon: 'order' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/coupons', label: 'Coupons', icon: 'tag' },
  { to: '/admin/shipping', label: 'Shipping', icon: 'archive' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>Wood</span>
          <small>Admin</small>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link pressable ${isActive ? 'is-active' : ''}`}
            >
              <AdminIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
