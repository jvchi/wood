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
    <footer className="section-rule bg-white" role="contentinfo">
      <div className="page-shell flex flex-col items-center gap-3 py-5 text-center md:justify-center md:gap-4 md:py-12">
        <nav
          className="grid w-full max-w-[17rem] grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:max-w-2xl sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-2"
          aria-label="Footer links"
        >
          {footerLinks.map(link => (
            link.to ? (
              <Link key={link.label} to={link.to} className="pressable nav-link label-text-compact inline-flex min-h-8 items-center justify-start md:min-h-11">
                {link.label}
              </Link>
            ) : (
              <span key={link.label} className="label-text-compact inline-flex min-h-8 items-center justify-start text-[var(--color-primary)] md:min-h-11">
                {link.label}
              </span>
            )
          ))}
        </nav>
        <p className="text-center text-xs text-[var(--color-secondary)] tabular-nums">
          © {currentYear} Wood
        </p>
      </div>
    </footer>
  )
}
