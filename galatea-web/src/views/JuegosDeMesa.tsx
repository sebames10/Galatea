import { Clock, Users } from 'lucide-react'
import { juegosDeMesa, nivelDificultad } from '../data/juego'
import { PageHeader } from '../components/PageHeader'

/** Catálogo de juegos de mesa del local. */
export function JuegosDeMesa() {
  return (
    <div className="flex flex-col">
      <PageHeader
        volver={{ to: '/juego', label: 'Juegos' }}
        title="Juegos de mesa"
        subtitle="Pedile al mozo el que quieras. Son gratis con tu consumo."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {juegosDeMesa.map((j, i) => (
          <article key={j.nombre} className={`overflow-hidden rounded-3xl border border-line/60 bg-surface ${j.disponible ? '' : 'opacity-60'}`}>
            <div className="relative h-36 overflow-hidden">
              {/* Hasta tener fotos propias: la misma foto con otro encuadre para cada juego */}
              <picture>
                <source type="image/webp" srcSet="/juegos/juegos-1024.webp" />
                <img
                  src="/juegos/juegos-1024.jpg"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                  style={{ objectPosition: `${(i * 23) % 100}% ${(i * 37) % 100}%` }}
                />
              </picture>
              {!j.disponible && (
                <span className="absolute left-3 top-3 rounded-full bg-bg/90 px-2.5 py-1 text-[11px] font-bold uppercase text-danger">En uso</span>
              )}
            </div>
            <div className="p-4">
              <h2 className="text-xl">{j.nombre}</h2>
              <p className="mt-1 text-sm text-muted">{j.descripcion}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-muted">
                <span className="flex items-center gap-1">
                  <Users size={14} aria-hidden="true" />
                  {j.jugadores} jugadores
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} aria-hidden="true" />
                  {j.duracion}
                </span>
                <span className="flex items-center gap-1">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`size-2 rounded-full ${n <= j.dificultad ? 'bg-gold' : 'bg-line'}`} aria-hidden="true" />
                  ))}
                  {nivelDificultad[j.dificultad]}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
