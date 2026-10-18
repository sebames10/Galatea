import { Link } from 'react-router-dom'
import { promos } from '../data/promos'
import { desdeIso } from '../data/eventos'
import { PageHeader } from '../components/PageHeader'
import { CuponBienvenida } from '../components/CuponBienvenida'

const fmtHasta = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' })

export function Promociones() {
  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Beneficios" title="Promociones" />

      <CuponBienvenida />

      <h2 className="mb-3 mt-10 text-2xl">Vigentes</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {promos.map((p) => (
          <article key={p.id} className="flex flex-col rounded-3xl border border-line/60 bg-surface p-5">
            <span className="self-start rounded-full bg-gold px-3 py-1 text-sm font-bold text-on-gold">{p.insignia}</span>
            <h3 className="mt-3 text-xl">{p.titulo}</h3>
            <p className="mt-1 text-sm text-muted">{p.descripcion}</p>
            <p className="mt-3 text-xs text-muted">{p.condiciones}</p>
            <p className="mt-1 text-xs font-semibold text-gold">Válido hasta {fmtHasta.format(desdeIso(p.hasta))}</p>
            {/* Abre el menú filtrado con los productos de la promo */}
            <div className="mt-auto pt-4">
              <Link to={`/menu?${new URLSearchParams(p.tipo === 'trago' ? { tipo: 'trago', promo: p.id } : { promo: p.id })}`} className="btn-ghost min-h-10 w-full">
                Ver productos
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
