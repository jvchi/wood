import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import ToastContainer from '../ui/ToastContainer'

export default function PageLayout({ children }) {
  const { pathname } = useLocation()
  const showFooter = pathname === '/shop' || pathname === '/about'

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />
      <main id="main-content" className="flex-1">{children}</main>
      {showFooter && <Footer />}
      <ToastContainer />
    </div>
  )
}
