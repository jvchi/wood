import { createContext, useMemo } from 'react'

const PersistentThreeSceneContext = createContext(null)

export function PersistentThreeSceneProvider({ children }) {
  const api = useMemo(() => ({
    updateScene() {},
  }), [])

  return (
    <PersistentThreeSceneContext.Provider value={api}>
      {children}
    </PersistentThreeSceneContext.Provider>
  )
}

export function PersistentThreeSceneSlot({
  id,
  children,
  className = '',
  disabled = false,
}) {
  return (
    <div id={id} className={`persistent-three-slot ${className}`}>
      {typeof children === 'function' ? children({ active: !disabled }) : children}
    </div>
  )
}
