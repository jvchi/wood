import { useToast } from '../../context/ToastContext'

export default function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div
      className="pointer-events-none fixed top-[var(--nav-height)] bottom-auto left-4 right-4 z-[200] flex flex-col gap-3 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="animate-toast-in pointer-events-auto bg-[var(--color-primary)] px-5 py-3 text-sm text-white"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
