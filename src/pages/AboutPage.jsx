import { useState } from 'react'

export default function AboutPage() {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className="page-top pb-16 md:pb-20">
      <header className="page-shell mb-10 grid gap-5 md:mb-14 md:grid-cols-[minmax(0,0.58fr)_minmax(0,28rem)] md:items-end md:justify-between">
        <div>
          <p className="label-text mb-3 text-[var(--color-muted)]">About</p>
          <h1 className="display-heading">Furniture Without Noise</h1>
        </div>
        <p className="body-copy md:pb-1">
          Wood is a furniture catalog built around plain decisions: useful forms, durable materials, direct presentation, and products that do not need a heavy story to make sense.
        </p>
      </header>

      <section className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-surface)] md:aspect-[16/7]" aria-label="Workshop">
        {!imageLoaded && <div className="absolute inset-0 bg-[var(--color-surface-muted)] animate-pulse" />}
        <img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="Minimal living room with wood furniture"
          width="1600"
          height="700"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-[180ms] ease-[var(--ease-out)] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </section>

      <section className="page-shell grid gap-6 py-12 md:grid-cols-3 md:gap-10 md:py-[var(--section-y)]">
        {[
          ['2019', 'Founded'],
          ['100%', 'Natural Materials'],
          ['25yr', 'Frame Warranty'],
        ].map(([number, label]) => (
          <div key={label} className="border-t border-[var(--color-border)] pt-5">
            <p className="stat-value mb-2">{number}</p>
            <p className="label-text-compact text-[var(--color-muted)]">{label}</p>
          </div>
        ))}
      </section>

      <section className="page-shell section-rule grid gap-6 py-[var(--section-y)] md:grid-cols-[minmax(0,18rem)_minmax(0,34rem)] md:justify-between">
        <h2 className="section-heading">Start with the room</h2>
        <div className="space-y-4">
          <p className="body-copy">
            The best furniture supports the architecture around it. Each piece is designed to hold a room together through proportion, comfort, and restraint.
          </p>
          <p className="body-copy">
            We use solid hardwoods, dense foams, natural textiles, and replaceable covers so the product can keep working after years of use.
          </p>
        </div>
      </section>
    </div>
  )
}
