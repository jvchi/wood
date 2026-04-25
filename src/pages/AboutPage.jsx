import { useState } from 'react'

export default function AboutPage() {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [detailLoaded, setDetailLoaded] = useState(false)

  return (
    <div className="about-page">
      <header className="about-hero" aria-labelledby="about-title">
        <p className="about-kicker">About</p>
        <h1 id="about-title" className="about-title">
          WOOD
          <span>ROOM</span>
          <span>OBJECTS</span>
        </h1>
        <div className="about-hero-index" aria-hidden="true">
          <span>01</span>
          <span>Materials</span>
          <span>Rooms</span>
          <span>Care</span>
        </div>
      </header>

      <section className="about-hero-image" aria-label="Living room">
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
        {[
          ['2019', 'FOUNDED'],
          ['100%', 'NATURAL MATERIALS'],
          ['25YR', 'FRAME WARRANTY'],
        ].map(([number, label]) => (
          <div key={label}>
            <p>{number}</p>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="about-editorial" aria-labelledby="about-edit-title">
        <div className="about-editorial-copy">
          <p className="about-kicker">02</p>
          <h2 id="about-edit-title">Start with the room.</h2>
          <ul>
            <li>Solid frames</li>
            <li>Natural textiles</li>
            <li>Replaceable covers</li>
            <li>No seasonal excess</li>
          </ul>
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

      <section className="about-manifesto" aria-label="Design principles">
        <p>Useful forms.</p>
        <p>Durable materials.</p>
        <p>Direct presentation.</p>
      </section>
    </div>
  )
}
