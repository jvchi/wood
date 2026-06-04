import 'maplibre-gl/dist/maplibre-gl.css'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Compass, LocateFixed, MapPin, Maximize2, Minus, Plus } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { MapContext, useMap } from './mapContext'

const DEFAULT_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

function getStyle(theme, styles) {
  if (styles?.[theme]) return styles[theme]
  if (typeof styles === 'string') return styles
  return DEFAULT_STYLES[theme] || DEFAULT_STYLES.light
}

function stableId(prefix, id) {
  return `${prefix}-${id.replace(/:/g, '')}`
}

export function Map({
  children,
  className = '',
  center = [-98.5795, 39.8283],
  zoom = 3,
  bearing = 0,
  pitch = 0,
  theme = 'light',
  styles,
  viewport,
  onViewportChange,
  loading = false,
  ...options
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const onViewportChangeRef = useRef(onViewportChange)
  const [map, setMap] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [initialOptions] = useState(() => {
    const initialViewport = viewport || { center, zoom, bearing, pitch }

    return {
      initialViewport,
      options,
      style: getStyle(theme, styles),
    }
  })

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: initialOptions.style,
      center: initialOptions.initialViewport.center,
      zoom: initialOptions.initialViewport.zoom,
      bearing: initialOptions.initialViewport.bearing,
      pitch: initialOptions.initialViewport.pitch,
      attributionControl: false,
      ...initialOptions.options,
    })

    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = mapInstance
    setMap(mapInstance)

    const handleLoad = () => setIsLoaded(true)
    const handleMove = () => {
      if (!onViewportChangeRef.current) return
      const mapCenter = mapInstance.getCenter()

      onViewportChangeRef.current({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapInstance.getZoom(),
        bearing: mapInstance.getBearing(),
        pitch: mapInstance.getPitch(),
      })
    }

    mapInstance.on('load', handleLoad)
    mapInstance.on('move', handleMove)

    return () => {
      mapInstance.off('load', handleLoad)
      mapInstance.off('move', handleMove)
      mapInstance.remove()
      mapRef.current = null
      setMap(null)
      setIsLoaded(false)
    }
  }, [initialOptions])

  useEffect(() => {
    if (!mapRef.current || !viewport) return
    const mapInstance = mapRef.current
    const mapCenter = mapInstance.getCenter()
    const [nextLng, nextLat] = viewport.center || [mapCenter.lng, mapCenter.lat]

    if (
      Math.abs(mapCenter.lng - nextLng) < 0.0001 &&
      Math.abs(mapCenter.lat - nextLat) < 0.0001 &&
      Math.abs(mapInstance.getZoom() - (viewport.zoom ?? mapInstance.getZoom())) < 0.0001 &&
      Math.abs(mapInstance.getBearing() - (viewport.bearing ?? mapInstance.getBearing())) < 0.0001 &&
      Math.abs(mapInstance.getPitch() - (viewport.pitch ?? mapInstance.getPitch())) < 0.0001
    ) {
      return
    }

    mapInstance.jumpTo({
      center: viewport.center,
      zoom: viewport.zoom,
      bearing: viewport.bearing,
      pitch: viewport.pitch,
    })
  }, [viewport])

  const contextValue = useMemo(() => ({ map, isLoaded }), [map, isLoaded])

  return (
    <div className={`mapcn-root ${className}`}>
      <div ref={containerRef} className="mapcn-canvas" />
      {(loading || !isLoaded) && <div className="mapcn-loading" aria-hidden="true" />}
      <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
    </div>
  )
}

export function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className = '',
  onLocate,
}) {
  const { map } = useMap()
  const positionClass = `mapcn-controls-${position}`

  const locate = () => {
    if (!navigator.geolocation || !map) return

    navigator.geolocation.getCurrentPosition(position => {
      const coords = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      }

      map.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(map.getZoom(), 10) })
      onLocate?.(coords)
    })
  }

  return (
    <div className={`mapcn-controls ${positionClass} ${className}`} aria-label="Map controls">
      {showZoom && (
        <>
          <button type="button" aria-label="Zoom in" onClick={() => map?.zoomIn()}>
            <Plus size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => map?.zoomOut()}>
            <Minus size={16} aria-hidden="true" />
          </button>
        </>
      )}
      {showCompass && (
        <button type="button" aria-label="Reset bearing" onClick={() => map?.resetNorthPitch()}>
          <Compass size={16} aria-hidden="true" />
        </button>
      )}
      {showLocate && (
        <button type="button" aria-label="Find my location" onClick={locate}>
          <LocateFixed size={16} aria-hidden="true" />
        </button>
      )}
      {showFullscreen && (
        <button type="button" aria-label="Toggle fullscreen" onClick={() => map?.getContainer().requestFullscreen?.()}>
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function MapMarker({
  longitude,
  latitude,
  children,
  draggable = false,
  anchor = 'center',
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDrag,
  onDragEnd,
  onDragStart,
}) {
  const { map, isLoaded } = useMap()
  const markerRef = useRef(null)
  const markerElement = useMemo(() => {
    if (typeof document === 'undefined') return null
    const element = document.createElement('div')
    element.className = 'mapcn-marker'
    return element
  }, [])

  useEffect(() => {
    if (!map || !isLoaded || !markerElement) return undefined

    const marker = new maplibregl.Marker({ element: markerElement, draggable, anchor })
      .setLngLat([longitude, latitude])
      .addTo(map)

    const handleDragStart = () => onDragStart?.(marker.getLngLat())
    const handleDrag = () => onDrag?.(marker.getLngLat())
    const handleDragEnd = () => onDragEnd?.(marker.getLngLat())

    if (draggable) {
      marker.on('dragstart', handleDragStart)
      marker.on('drag', handleDrag)
      marker.on('dragend', handleDragEnd)
    }

    if (onClick) markerElement.addEventListener('click', onClick)
    if (onMouseEnter) markerElement.addEventListener('mouseenter', onMouseEnter)
    if (onMouseLeave) markerElement.addEventListener('mouseleave', onMouseLeave)
    markerRef.current = marker

    return () => {
      if (draggable) {
        marker.off('dragstart', handleDragStart)
        marker.off('drag', handleDrag)
        marker.off('dragend', handleDragEnd)
      }

      if (onClick) markerElement.removeEventListener('click', onClick)
      if (onMouseEnter) markerElement.removeEventListener('mouseenter', onMouseEnter)
      if (onMouseLeave) markerElement.removeEventListener('mouseleave', onMouseLeave)
      marker.remove()
      markerRef.current = null
    }
  }, [map, isLoaded, markerElement, draggable, anchor, longitude, latitude, onClick, onMouseEnter, onMouseLeave, onDrag, onDragEnd, onDragStart])

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude])
  }, [longitude, latitude])

  if (!markerElement) return null

  return createPortal(children || <MarkerContent />, markerElement)
}

export function MarkerContent({ children, className = '' }) {
  return (
    <div className={`mapcn-marker-content ${className}`}>
      {children || <MapPin size={18} strokeWidth={2.1} aria-hidden="true" />}
    </div>
  )
}

export function MarkerTooltip({ children, className = '', position = 'top' }) {
  return <div className={`mapcn-marker-tooltip is-${position} ${className}`}>{children}</div>
}

export function MapRoute({
  id,
  coordinates,
  color = '#4285f4',
  width = 3,
  opacity = 0.8,
  dashArray,
}) {
  const reactId = useId()
  const generatedId = stableId('map-route', reactId)
  const routeId = id || generatedId
  const sourceId = `${routeId}-source`
  const layerId = `${routeId}-layer`
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || !coordinates?.length) return undefined

    const data = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {},
    }

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data,
      })
    } else {
      map.getSource(sourceId).setData(data)
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
          ...(dashArray ? { 'line-dasharray': dashArray } : {}),
        },
      })
    } else {
      map.setPaintProperty(layerId, 'line-color', color)
      map.setPaintProperty(layerId, 'line-width', width)
      map.setPaintProperty(layerId, 'line-opacity', opacity)
      if (dashArray) {
        map.setPaintProperty(layerId, 'line-dasharray', dashArray)
      }
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map, isLoaded, coordinates, sourceId, layerId, color, width, opacity, dashArray])

  return null
}
