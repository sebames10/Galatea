import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  /** Las primeras fotos visibles: se bajan ya y con prioridad alta (sin carga diferida). */
  prioridad?: boolean
  className?: string
}

/**
 * Foto del menú (Supabase Storage, 720x540).
 * - Reserva el espacio 4:3 para que la tarjeta no salte cuando llega la imagen.
 * - Carga diferida: el navegador baja solo las que están cerca de la pantalla.
 * - Mientras carga se ve el fondo de la tarjeta y al llegar aparece con un fundido.
 * - crossOrigin="anonymous": la pide en modo CORS (Supabase lo permite) para que el
 *   service worker pueda guardarla para la próxima visita.
 */
export function Foto({ src, prioridad = false, className = '' }: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const [cargada, setCargada] = useState(false)

  // Si ya estaba en caché, puede terminar de cargar antes de que React escuche onLoad
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setCargada(true)
  }, [src])

  return (
    <div className={`aspect-[4/3] w-full overflow-hidden bg-elevated ${className}`}>
      <img
        ref={ref}
        src={src}
        alt=""
        width={720}
        height={540}
        crossOrigin="anonymous"
        loading={prioridad ? 'eager' : 'lazy'}
        decoding="async"
        {...{ fetchpriority: prioridad ? 'high' : 'auto' }}
        onLoad={() => setCargada(true)}
        className={`size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${cargada ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
