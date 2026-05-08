/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let toastId = 0
const TOAST_EXIT_MS = 180
const MAX_TOASTS = 3

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismissToast = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }

    setToasts(prev => prev.map(toast => (
      toast.id === id ? { ...toast, exiting: true } : toast
    )))

    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
      delete timers.current[id]
    }, TOAST_EXIT_MS)
  }, [])

  const addToast = useCallback((message, duration = 700) => {
    const id = ++toastId

    setToasts(prev => {
      const activeToasts = prev.filter(toast => !toast.exiting)
      const overflowingToasts = activeToasts.length >= MAX_TOASTS
        ? activeToasts.slice(0, activeToasts.length - MAX_TOASTS + 1)
        : []

      overflowingToasts.forEach(toast => {
        if (timers.current[toast.id]) {
          clearTimeout(timers.current[toast.id])
          delete timers.current[toast.id]
        }

        timers.current[toast.id] = setTimeout(() => {
          setToasts(current => current.filter(currentToast => currentToast.id !== toast.id))
          delete timers.current[toast.id]
        }, TOAST_EXIT_MS)
      })

      return [
        ...prev.map(toast => (
          overflowingToasts.some(oldToast => oldToast.id === toast.id)
            ? { ...toast, exiting: true }
            : toast
        )),
        { id, message, exiting: false },
      ]
    })

    timers.current[id] = setTimeout(() => {
      dismissToast(id)
    }, duration)

    return id
  }, [dismissToast])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
