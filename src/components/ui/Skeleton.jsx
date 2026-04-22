export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`rounded-none bg-[var(--color-surface-muted)] animate-pulse ${className}`}
      role="status"
      aria-label="Loading…"
      {...props}
    />
  )
}
