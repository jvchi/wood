export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`rounded-none bg-black/[0.04] animate-pulse ${className}`}
      role="status"
      aria-label="Loading…"
      {...props}
    />
  )
}
