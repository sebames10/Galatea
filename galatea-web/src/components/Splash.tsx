import { useEffect, useRef, useState } from 'react'

const DURACION_MAXIMA_MS = 7000 // por si el video no dispara "ended" (autoplay bloqueado, error de carga)
const SALIDA_MS = 450

/**
 * Primera vista: reproduce animated-logo.webm a pantalla completa y luego se desvanece.
 * Con "reducir movimiento" activado muestra el logo fijo un momento, sin animación.
 * touch-none: mientras está la bienvenida no se scrollea la página de atrás.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [saliendo, setSaliendo] = useState(false)
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const terminar = () => setSaliendo(true)

  useEffect(() => {
    const t = window.setTimeout(terminar, reducirMovimiento ? 900 : DURACION_MAXIMA_MS)
    if (!reducirMovimiento) {
      videoRef.current?.play().catch(terminar)
    }
    return () => window.clearTimeout(t)
  }, [reducirMovimiento])

  useEffect(() => {
    if (!saliendo) return
    const t = window.setTimeout(onDone, SALIDA_MS)
    return () => window.clearTimeout(t)
  }, [saliendo, onDone])

  return (
    <div
      role="dialog"
      aria-label="Bienvenida a Galatea"
      // Fondo exacto del logo (no el de la app) para que el video no muestre un recuadro
      className={`fixed inset-0 z-50 grid touch-none place-items-center bg-[var(--logo-bg)] transition-opacity ease-out ${
        saliendo ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${SALIDA_MS}ms` }}
    >
      {reducirMovimiento ? (
        <img src="/logo.jpg" alt="Galatea" className="h-full max-h-[70dvh] w-full max-w-md object-contain" />
      ) : (
        <video
          ref={videoRef}
          src="/animated-logo.webm"
          poster="/logo.jpg"
          className="h-full w-full object-contain md:max-h-[80dvh] md:max-w-3xl"
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={terminar}
          onError={terminar}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={terminar}
        className="btn-ghost absolute right-4 border-line/60 bg-bg/60 text-xs backdrop-blur"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        Saltar
      </button>
    </div>
  )
}
