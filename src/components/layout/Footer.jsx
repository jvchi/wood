import { Link } from 'react-router-dom'

const footerLinks = [
  { label: 'Contact', to: '/about' },
  { label: 'Terms' },
  { label: 'Privacy' },
  { label: 'Accessibility' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="site-footer-reveal">
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner page-shell">
          <p className="site-footer-brand" aria-hidden="true">wood</p>
          <div className="site-footer-bottom">
            <nav
              className="site-footer-nav"
              aria-label="Footer links"
            >
              {footerLinks.map(link => (
                link.to ? (
                  <Link key={link.label} to={link.to} className="pressable site-footer-link">
                    {link.label}
                  </Link>
                ) : (
                  <span key={link.label} className="site-footer-link">
                    {link.label}
                  </span>
                )
              ))}
            </nav>
            <p className="site-footer-copy">
              © {currentYear} Wood
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
