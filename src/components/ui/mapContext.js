import { createContext, useContext } from 'react'

export const MapContext = createContext(null)

export function useMap() {
  const context = useContext(MapContext)

  if (!context) {
    throw new Error('Map controls and overlays must be used within a Map component.')
  }

  return context
}
