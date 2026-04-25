import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import ToastContainer from '../ui/ToastContainer'

export default function PageLayout({ children }) {
  const { pathname } = useLocation()
  const action = useNavigationType()
  const showFooter = pathname === '/shop' || pathname === '/about'
  const isHome = pathname === '/'

  useEffect(() => {
    if (action === 'POP') return

    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, action])

  return (
    <div className={`min-h-dvh flex flex-col ${isHome ? 'app-shell-home' : 'bg-white'}`}>
      <Navbar />
      <main id="main-content" className="flex-1">{children}</main>
      {showFooter && <Footer />}
      <ToastContainer />
    </div>
  )
}
