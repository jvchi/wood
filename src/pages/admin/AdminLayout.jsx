import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AdminIcon } from '../../components/admin/AdminIcons'
import { hasSupabaseConfig, supabase } from '../../lib/supabase'

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

function isAdminSession(session) {
  return session?.user?.app_metadata?.role === 'admin'
}

function AdminLogin({ initialError = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setSubmitting(false)
      return
    }

    if (!isAdminSession(data.session)) {
      await supabase.auth.signOut()
      setError('This account does not have administrator access.')
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <div className="admin-auth-mark" aria-hidden="true">
          <span>W</span>
          <i />
        </div>
        <div className="admin-auth-heading">
          <p className="admin-kicker">Private catalog</p>
          <h1 id="admin-login-title">Admin access</h1>
          <p>Sign in with the administrator account configured for this store.</p>
        </div>

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="admin-auth-error" role="alert">{error}</p> : null}

          <button className="admin-button admin-button-dark pressable admin-auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Checking access…' : 'Enter dashboard'}
          </button>
        </form>

        <p className="admin-auth-footnote">No public registration. Access is assigned from Supabase.</p>
      </section>
    </main>
  )
}

function AdminAuthLoading() {
  return (
    <main className="admin-auth-shell" aria-busy="true">
      <div className="admin-auth-loading" role="status">
        <span />
        <p>Verifying administrator session</p>
      </div>
    </main>
  )
}

export default function AdminLayout() {
  const [authState, setAuthState] = useState({ status: 'loading', session: null, error: '' })

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return undefined
    let active = true

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        setAuthState({
          status: isAdminSession(data?.session) ? 'admin' : 'signed-out',
          session: data?.session || null,
          error: error?.message || '',
        })
      })
      .catch(error => {
        if (active) setAuthState({ status: 'signed-out', session: null, error: error.message })
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthState({
        status: isAdminSession(session) ? 'admin' : 'signed-out',
        session,
        error: session && !isAdminSession(session) ? 'This account does not have administrator access.' : '',
      })
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (!hasSupabaseConfig || !supabase) {
    return <AdminLogin initialError="Supabase is not configured for this deployment." />
  }
  if (authState.status === 'loading') return <AdminAuthLoading />
  if (authState.status !== 'admin') return <AdminLogin initialError={authState.error} />

  const userLabel = authState.session?.user?.email || 'Administrator'

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
        <div className="admin-session">
          <span title={userLabel}>{userLabel}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
