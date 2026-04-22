import Navbar from './Navbar'
import Footer from './Footer'
import ToastContainer from '../ui/ToastContainer'

export default function PageLayout({ children }) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <Navbar />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
    </div>
  )
}
