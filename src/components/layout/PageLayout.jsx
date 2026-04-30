import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import ToastContainer from '../ui/ToastContainer'

export default function PageLayout({ children, brandIntroReady = true, visualLocation }) {
  const location = useLocation()
  const displayedLocation = visualLocation || location
  const { pathname } = location
  const action = useNavigationType()
  const backgroundPathname = displayedLocation.state?.backgroundLocation?.pathname
  const displayedPathname = backgroundPathname || displayedLocation.pathname
  const isAdmin = displayedPathname.startsWith('/admin')
  const showFooter = displayedPathname === '/shop' || displayedPathname === '/about'
  const isHome = displayedPathname === '/'

  useEffect(() => {
    if (action === 'POP') return
    if (location.state?.backgroundLocation) return

    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, action, location.state])

  return (
    <div className={`app-viewport-shell flex flex-col ${isHome ? 'app-shell-home' : 'bg-white'}`}>
      {!isAdmin && <Navbar brandIntroReady={brandIntroReady} visualLocation={displayedLocation} />}
      <main id="main-content" className="flex-1">{children}</main>
      {showFooter && !isAdmin && <Footer />}
      <ToastContainer />
    </div>
  )
}
