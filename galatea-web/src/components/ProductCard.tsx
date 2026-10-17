import type { Producto } from '../api'
import { formatoPrecio } from '../data/menu'
import { useApp } from '../store'
import { QtyStepper } from './QtyStepper'
import { Foto } from './Foto'

// "Estándar" es el nombre interno cuando hay un solo precio: no se muestra
const nombreVisible = (presentacion: string) => (presentacion === 'Estándar' ? null : presentacion)

export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const { cantidad, agregar, quitar } = useApp()
  const { nombre, descripcion, foto, agotado, etiquetas, presentaciones } = producto
  const unica = presentaciones.length === 1 ? presentaciones[0] : null

  return (
    <article className={`card flex h-full flex-col overflow-hidden ${agotado ? 'opacity-60' : ''}`}>
      {foto && <Foto src={foto} prioridad={prioridad} />}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug">{nombre}</h3>
          {unica && <span className="shrink-0 font-heading font-semibold text-gold">{formatoPrecio(unica.precio)}</span>}
        </div>
        {descripcion && <p className="text-sm text-muted">{descripcion}</p>}
        {etiquetas.length > 0 && (
          <ul className="flex flex-wrap gap-8" aria-label="Etiquetas">
            {etiquetas.map((e) => (
              <li key={e} className="rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold-soft">
                {e}
              </li>
            ))}
          </ul>
        )}

        {/* Una fila por presentación (individual/familiar, p1/p2, copa/botella) */}
        <ul className="mt-auto flex flex-col gap-2">
          {presentaciones.map((pr) => {
            const etiqueta = nombreVisible(pr.nombre)
            const nombreCompleto = etiqueta ? `${nombre} ${etiqueta}` : nombre
            return (
              <li key={pr.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm">
                  {etiqueta && <span className="text-ink">{etiqueta}</span>}
                  {!unica && <span className="ml-2 font-heading font-semibold text-gold">{formatoPrecio(pr.precio)}</span>}
                  {/* Solo se avisa cuando NO hay: lo disponible es lo normal y no lleva etiqueta */}
                  {!pr.disponible && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
                      <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
                      Agotado por hoy
                    </span>
                  )}
                </div>
                <div className="ml-auto shrink-0">
                  <QtyStepper
                    nombre={nombreCompleto}
                    cantidad={cantidad(pr.id)}
                    onMas={() => agregar(pr.id)}
                    onMenos={() => quitar(pr.id)}
                    disabled={!pr.disponible}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}
