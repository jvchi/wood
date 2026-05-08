import { motion } from 'framer-motion'
import { useToast } from '../../context/ToastContext'

const MotionDiv = motion.div
const isDesktopToastStack = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches

const toastLayoutTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 40,
  mass: 0.75,
}

export default function ToastContainer() {
  const { toasts } = useToast()
  const renderedToasts = isDesktopToastStack ? [...toasts].reverse() : toasts

  return (
    <div
      className="pointer-events-none fixed top-[var(--nav-height)] bottom-auto left-4 right-4 z-[200] flex flex-col gap-3 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
      role="status"
      aria-live="polite"
    >
      {renderedToasts.map(toast => (
        <MotionDiv
          key={toast.id}
          layout
          initial={{
            filter: 'blur(6px)',
            opacity: 0,
            scale: 0.96,
            y: isDesktopToastStack ? 12 : -12,
          }}
          animate={toast.exiting ? {
            filter: 'blur(6px)',
            maxHeight: 0,
            opacity: 0,
            paddingBottom: 0,
            paddingTop: 0,
            scale: 0.98,
            y: isDesktopToastStack ? 14 : -14,
          } : {
            filter: 'blur(0px)',
            maxHeight: 96,
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            default: toast.exiting
              ? { duration: 0.18, ease: [0.32, 0, 0.67, 0] }
              : { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
            layout: toastLayoutTransition,
          }}
          className="pointer-events-auto overflow-hidden bg-[var(--color-primary)] px-5 py-3 text-sm text-white"
        >
          {toast.message}
        </MotionDiv>
      ))}
    </div>
  )
}
