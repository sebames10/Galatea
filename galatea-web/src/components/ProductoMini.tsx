import { Link } from 'react-router-dom'
import type { Producto } from '../api'
import { formatoPrecio } from '../data/menu'
import { useApp } from '../store'
import { Foto } from './Foto'
import { QtyStepper } from './QtyStepper'

/** Tarjeta chica para filas con scroll horizontal y respuestas del asistente: se agrega la primera presentación disponible. */
export function ProductoMini({ producto }: { producto: Producto }) {
  const { cantidad, agregar, quitar } = useApp()
  const pr = producto.presentaciones.find((p) => p.disponible) ?? producto.presentaciones[0]
  const variante = pr && pr.nombre !== 'Estándar' ? pr.nombre : null
  const nombre = variante ? `${producto.nombre} ${variante}` : producto.nombre

  return (
    <article className="card flex w-56 shrink-0 flex-col overflow-hidden">
      <Link to={`/menu/${producto.id}`} className="group block" tabIndex={-1} aria-hidden="true">
        {producto.foto ? <Foto src={producto.foto} /> : <div className="aspect-[4/3] w-full bg-elevated" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-base leading-snug">
          <Link to={`/menu/${producto.id}`} className="transition-colors hover:text-gold-soft">
            {producto.nombre}
          </Link>
        </h3>
        {pr && (
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className="text-sm">
              {variante && <span className="mr-1.5 text-muted">{variante}</span>}
              <span className="font-heading font-semibold text-gold">{formatoPrecio(pr.precio)}</span>
            </span>
            <QtyStepper
              nombre={nombre}
              cantidad={cantidad(pr.id)}
              onMas={() => agregar(pr.id)}
              onMenos={() => quitar(pr.id)}
              disabled={!pr.disponible || producto.agotado}
            />
          </div>
        )}
      </div>
    </article>
  )
}
