import { Link } from 'react-router-dom'
import type { Producto } from '../api'
import { formatoPrecio, nombrePresentacion, precioDesde } from '../data/menu'
import { useApp } from '../store'
import { QtyStepper } from './QtyStepper'
import { Foto } from './Foto'

/**
 * Tarjeta del menú (como en GalateaLovable): con varias presentaciones muestra
 * "Desde" + el precio más bajo y el botón agrega la primera (para uno, individual,
 * copa). Las demás se eligen en el detalle del producto.
 */
export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const { cantidad, agregar, quitar } = useApp()
  const { id, nombre, descripcion, foto, agotado, etiquetas, presentaciones } = producto
  const varias = presentaciones.length > 1
  const pr = presentaciones.find((p) => p.disponible) ?? presentaciones[0]
  const variante = pr ? nombrePresentacion(pr.nombre) : null

  return (
    <article className={`card flex h-full flex-col overflow-hidden ${agotado ? 'opacity-60' : ''}`}>
      {/* La foto y el nombre abren el detalle del producto */}
      {foto && (
        <Link to={`/menu/${id}`} className="group block" tabIndex={-1} aria-hidden="true">
          <Foto src={foto} prioridad={prioridad} />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg leading-snug">
          <Link to={`/menu/${id}`} className="transition-colors hover:text-gold-soft">
            {nombre}
          </Link>
        </h3>
        {descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{descripcion}</p>}
        {varias && <p className="mt-1.5 text-xs text-muted">{presentaciones.map((p) => nombrePresentacion(p.nombre)).join(' · ')}</p>}
        {etiquetas.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Etiquetas">
            {etiquetas.map((e) => (
              <li key={e} className="rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold-soft">
                {e}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="text-sm">
            <span className="font-heading text-lg font-semibold text-gold">
              {varias ? `Desde ${formatoPrecio(precioDesde(producto))}` : pr && formatoPrecio(pr.precio)}
            </span>
            {/* Solo se avisa cuando NO hay: lo disponible es lo normal y no lleva etiqueta */}
            {(agotado || !pr?.disponible) && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
                <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
                Agotado por hoy
              </span>
            )}
          </div>
          {pr && (
            <QtyStepper
              nombre={variante ? `${nombre} ${variante}` : nombre}
              cantidad={cantidad(pr.id)}
              onMas={() => agregar(pr.id)}
              onMenos={() => quitar(pr.id)}
              disabled={!pr.disponible || agotado}
            />
          )}
        </div>
      </div>
    </article>
  )
}
