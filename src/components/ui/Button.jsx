export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  const base = 'pressable inline-flex min-h-11 items-center justify-center rounded-none font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40'

  const variants = {
    primary: 'bg-[var(--color-primary)] text-white',
    secondary: 'border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]',
    ghost: 'bg-transparent text-[var(--color-primary)]',
  }

  const sizes = {
    sm: 'text-[var(--font-size-xs)] px-4 py-2',
    md: 'text-[var(--font-size-sm)] px-6 py-3',
    lg: 'text-[var(--font-size-base)] px-8 py-4',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
