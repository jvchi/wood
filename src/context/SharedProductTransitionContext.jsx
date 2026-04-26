import { createContext, useContext } from 'react'

export const SharedProductTransitionContext = createContext({
  activeProductId: null,
})

export function useSharedProductTransition() {
  return useContext(SharedProductTransitionContext)
}
