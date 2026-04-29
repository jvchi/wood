import { useState } from 'react'

const principles = [
  ['01', 'Structure', 'Every piece starts with a room plan, then resolves into a clear object with a quiet footprint.'],
  ['02', 'Material', 'Solid timber, honest textiles, and replaceable surfaces keep the collection useful beyond one season.'],
  ['03', 'Service', 'Dimensions, care, delivery, and repair information stay visible so ownership is straightforward.'],
]

const specs = [
  ['2019', 'Founded'],
  ['25 yr', 'Frame warranty'],
  ['100%', 'Natural materials'],
  ['12', 'Core forms'],
]

export default function AboutPage() {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [detailLoaded, setDetailLoaded] = useState(false)

  return (
    <div className="about-page">
      <header className="about-hero" aria-labelledby="about-title">
        <div className="about-grid">
          <p className="about-kicker">About / Wood</p>
          <h1 id="about-title" className="about-title">Furniture for rooms that are used every day.</h1>
          <p className="about-hero-copy">
            We design direct, durable living room objects with clear proportions, natural materials, and enough restraint to sit quietly in the background.
          </p>
          <div className="about-hero-index" aria-label="About page sections">
            <span>Index</span>
            <span>Materials</span>
            <span>Rooms</span>
            <span>Care</span>
          </div>
        </div>
      </header>

      <section className="about-hero-image" aria-label="Minimal living room">
        {!heroLoaded && <div className="about-image-placeholder" />}
        <img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="Minimal living room with wood furniture"
          width="1600"
          height="700"
          onLoad={() => setHeroLoaded(true)}
          className={heroLoaded ? 'is-loaded' : ''}
        />
      </section>

      <section className="about-stats" aria-label="Company facts">
        {specs.map(([number, label]) => (
          <div key={label}>
            <p>{number}</p>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="about-editorial" aria-labelledby="about-edit-title">
        <div className="about-editorial-copy">
          <p className="about-kicker">Method</p>
          <h2 id="about-edit-title">Start with the room. Reduce everything else.</h2>
          <p>
            Each product is reviewed against the same simple requirements: stable construction, readable dimensions, repairable parts, and forms that do not dominate the space around them.
          </p>
        </div>
        <div className="about-editorial-media">
          {!detailLoaded && <div className="about-image-placeholder" />}
          <img
            src="https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=1000&q=80"
            alt="Neutral sofa in a quiet room"
            width="1000"
            height="1250"
            loading="lazy"
            onLoad={() => setDetailLoaded(true)}
            className={detailLoaded ? 'is-loaded' : ''}
          />
        </div>
      </section>

      <section className="about-principles" aria-label="Design principles">
        {principles.map(([number, title, text]) => (
          <article key={title}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="about-manifesto" aria-label="Design statement">
        <p>Useful forms.</p>
        <p>Durable materials.</p>
        <p>Direct presentation.</p>
      </section>
    </div>
  )
}
