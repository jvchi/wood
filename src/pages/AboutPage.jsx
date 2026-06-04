import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from '../components/ui/map'
import { useMap } from '../components/ui/mapContext'

const hub = {
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
    label: 'Founded',
    copy: 'Wood began as a small furniture studio for rooms that had to work every day. The first pieces were built slowly, sold locally, and adjusted after living with them in real homes.',
  },
  {
    label: 'Materials',
    copy: 'We buy fewer boards than a volume catalog would accept. The usable timber pool is smaller, the inspection takes longer, and the final object carries that selection.',
  },
  {
    label: 'Pricing',
    copy: 'The price includes what usually disappears: joinery, finishing, freight, replacement surfaces, and people who can answer for the product after delivery.',
  },
  {
    label: 'Network',
    copy: 'The map shows where the work moves now. Grand Rapids remains the workshop point; each shop city is a place where the piece can be seen, ordered, serviced, or returned to us.',
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
      className="about-store-directory"
      aria-label="Store locations"
      data-lenis-prevent
      onWheel={event => event.stopPropagation()}
      onTouchMove={event => event.stopPropagation()}
    >
      <p>Stores</p>
      <div>
        {stores.map(store => (
          <button
            key={`${store.city}-${store.region}`}
            type="button"
            onClick={() => flyToLocation(store.coords)}
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
            touchZoomRotate
          >
            <AboutMapMarkers />
            <StoreDirectory />
            <MapControls position="top-right" showCompass showFullscreen />
          </Map>

          <p className="about-map-caption">Wood / North American corridor</p>
        </div>
      </section>

      <section className="about-articles" aria-labelledby="about-title">
        <header className="about-intro">
          <p className="about-eyebrow">About Wood</p>
          <h1 id="about-title">Built slowly. Priced accordingly.</h1>
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
