import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="page-shell flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="label-text mb-6 text-[var(--color-muted)]">404</p>
      <h1 className="mb-6 text-[var(--font-size-xl)] font-bold uppercase leading-none" style={{ textWrap: 'balance' }}>
        Page Not Found
      </h1>
      <p className="body-copy mb-10 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/"><Button variant="secondary">Return Home</Button></Link>
    </div>
  )
}
