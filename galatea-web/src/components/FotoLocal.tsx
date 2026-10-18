import type { CSSProperties } from 'react'

/** Foto de public/ en WebP con JPG de respaldo. `src` va sin extensión (ej. /eventos/evento-1024). */
export function FotoLocal({
  src,
  alt = '',
  className = '',
  style,
  prioridad = false,
}: {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  prioridad?: boolean
}) {
  return (
    <picture>
      <source type="image/webp" srcSet={`${src}.webp`} />
      <img src={`${src}.jpg`} alt={alt} loading={prioridad ? 'eager' : 'lazy'} decoding="async" className={className} style={style} />
    </picture>
  )
}
