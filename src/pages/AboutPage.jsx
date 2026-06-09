import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from '../components/ui/map'
import { useMap } from '../components/ui/mapContext'

const hub = {
  id: 'grand-rapids',
  label: 'Workshop 01',
  city: 'Grand Rapids',
  region: 'Michigan',
  coords: [-85.6681, 42.9634],
}

const shops = [
  { id: 'new-york', city: 'New York', region: 'NY', coords: [-74.006, 40.7128], status: 'Open' },
  { id: 'los-angeles', city: 'Los Angeles', region: 'CA', coords: [-118.2437, 34.0522], status: 'Open' },
  { id: 'chicago', city: 'Chicago', region: 'IL', coords: [-87.6298, 41.8781], status: 'Open' },
  { id: 'toronto', city: 'Toronto', region: 'ON', coords: [-79.3832, 43.6532], status: 'Open' },
  { id: 'vancouver', city: 'Vancouver', region: 'BC', coords: [-123.1207, 49.2827], status: 'Open' },
  { id: 'london', city: 'London', region: 'UK', coords: [-0.1276, 51.5072], status: 'Open' },
  { id: 'paris', city: 'Paris', region: 'FR', coords: [2.3522, 48.8566], status: 'Open' },
  { id: 'berlin', city: 'Berlin', region: 'DE', coords: [13.405, 52.52], status: 'Open' },
  { id: 'amsterdam', city: 'Amsterdam', region: 'NL', coords: [4.9041, 52.3676], status: 'Open' },
  { id: 'madrid', city: 'Madrid', region: 'ES', coords: [-3.7038, 40.4168], status: 'Open' },
  { id: 'lagos', city: 'Lagos', region: 'NG', coords: [3.3792, 6.5244], status: 'Open' },
]

const articles = [
  {
    label: 'Origin',
    copy: 'Wood was founded in Grand Rapids, a city that learned furniture by hand before it learned it by catalog. The studio began with one rule: no piece leaves until the room feels quieter, richer, and more settled with it there.',
  },
  {
    label: 'Timber',
    copy: 'Our buyers reject more timber than they keep. Walnut, oak, ash, and maple are chosen for grain, density, movement, and the way they will darken under years of light, touch, and use.',
  },
  {
    label: 'Making',
    copy: 'Frames are joined slowly, upholstery is pulled by hand, and finishes are built in thin coats rather than hidden under a hard shine. The luxury is not loud. It is the weight, the silence, the repairability, and the absence of compromise.',
  },
  {
    label: 'Houses',
    copy: 'The map shows the houses that carry the work now: places to sit with a piece, choose a finish in daylight, arrange delivery, or return years later for service. Grand Rapids remains the workshop point.',
  },
]

function AboutMapMarkers() {
  const { map } = useMap()
  const flyToLocation = coords => {
    map?.flyTo({
      center: coords,
      zoom: 10.8,
      pitch: 58,
      bearing: -22,
      speed: 0.55,
      curve: 1.8,
      essential: true,
    })
  }

  return (
    <>
      <MapMarker
        longitude={hub.coords[0]}
        latitude={hub.coords[1]}
        onClick={() => flyToLocation(hub.coords)}
      >
        <MarkerContent className="about-map-marker about-map-marker-hub" />
        <MarkerTooltip>{hub.label} / {hub.city}</MarkerTooltip>
      </MapMarker>
      {shops.map(shop => (
        <MapMarker
          key={shop.id}
          longitude={shop.coords[0]}
          latitude={shop.coords[1]}
          onClick={() => flyToLocation(shop.coords)}
        >
          <MarkerContent className="about-map-marker" />
          <MarkerTooltip>{shop.city}, {shop.region} / {shop.status}</MarkerTooltip>
        </MapMarker>
      ))}
    </>
  )
}

function StoreDirectory() {
  const { map } = useMap()
  const [isOpen, setIsOpen] = useState(false)
  const stores = [hub, ...shops]
  const flyToLocation = coords => {
    map?.flyTo({
      center: coords,
      zoom: 10.8,
      pitch: 58,
      bearing: -22,
      speed: 0.55,
      curve: 1.8,
      essential: true,
    })
  }

  return (
    <aside
      className={`about-store-directory${isOpen ? ' is-open' : ''}`}
      aria-label="Store locations"
      data-lenis-prevent
      onWheel={event => event.stopPropagation()}
      onTouchMove={event => event.stopPropagation()}
    >
      <button
        className="about-store-directory-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(current => !current)}
      >
        <span>
          <strong>Stores</strong>
          <em>{stores.length} locations</em>
        </span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
      </button>
      <div className="about-store-directory-list" aria-hidden={!isOpen}>
        {stores.map(store => (
          <button
            key={store.id}
            type="button"
            tabIndex={isOpen ? 0 : -1}
            onClick={() => {
              flyToLocation(store.coords)
              setIsOpen(false)
            }}
          >
            <span>{store.city}</span>
            <em>{store.region}</em>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-map-section" aria-label="North American supply corridor">
        <div className="about-map-frame">
          <Map
            className="about-map"
            center={[-97.2, 41.2]}
            zoom={3.2}
            bearing={0}
            pitch={0}
            theme="light"
            scrollZoom={false}
            dragPan
            touchZoomRotate={false}
          >
            <AboutMapMarkers />
            <StoreDirectory />
            <MapControls position="top-right" showCompass showFullscreen />
          </Map>
        </div>
      </section>

      <section className="about-articles" aria-labelledby="about-title">
        <header className="about-intro">
          <p className="about-eyebrow">About Wood</p>
          <h1 id="about-title">Furniture with provenance. Built to gather a patina.</h1>
        </header>
        {articles.map(item => (
          <article key={item.label}>
            <h2>{item.label}</h2>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
