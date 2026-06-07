import { Link } from 'react-router-dom'

const footerColumns = [
  {
    heading: 'Shop',
    links: [
      { label: 'All Products', to: '/shop' },
      { label: 'New Arrivals', to: '/shop?sort=new' },
      { label: 'Categories', to: '/shop' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/about' },
      { label: 'Journal' },
    ],
  },
  {
    heading: 'Social',
    links: [
      { label: 'Instagram' },
      { label: 'X/Twitter' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy' },
      { label: 'Terms' },
      { label: 'Accessibility' },
    ],
  },
]

function FooterLink({ link }) {
  if (link.to) {
    return (
      <Link to={link.to} className="pressable site-footer-link">
        {link.label}
      </Link>
    )
  }
  return <span className="site-footer-link">{link.label}</span>
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="site-footer-reveal">
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner page-shell">
          <div className="site-footer-top">
            <div className="site-footer-intro">
              <p className="site-footer-mark" aria-hidden="true">wood</p>
              <p className="site-footer-description">
                {/* TODO: replace with provided copy */}
                Wood is a considered collection of objects for the home — designed to last and made to live with.
              </p>
              <p className="site-footer-copy">
                Wood, Inc. © {currentYear}
              </p>
            </div>
            <nav className="site-footer-columns" aria-label="Footer">
              {footerColumns.map(column => (
                <div key={column.heading} className="site-footer-column">
                  <p className="site-footer-heading">{column.heading}</p>
                  <ul className="site-footer-list">
                    {column.links.map(link => (
                      <li key={link.label}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <p className="site-footer-brand" aria-hidden="true">wood</p>
        </div>
      </footer>
    </div>
  )
}
