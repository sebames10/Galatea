import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchX, X } from 'lucide-react'
import type { Sector } from '../api'
import { formatoPrecio } from '../data/menu'
import { aplicaPromo, promoPorId } from '../data/promos'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { ProductCard } from '../components/ProductCard'
import { ErrorCarga } from '../components/ErrorCarga'

// Platos = lo que prepara la cocina; tragos = la barra (cervezas y vinos incluidos)
type Tipo = 'plato' | 'trago'
const SECTOR: Record<Tipo, Sector> = { plato: 'cocina', trago: 'barra' }

export function Menu() {
  // El tipo va en la URL (?tipo=trago) para que al volver del detalle de un trago se siga viendo la barra
  const [params, setParams] = useSearchParams()
  const tipo: Tipo = params.get('tipo') === 'trago' ? 'trago' : 'plato'
  const [categoria, setCategoria] = useState<string | null>(null)
  const { carta, cargandoCarta, errorCarta, recargarCarta, totalItems, total } = useApp()

  // ?promo=id (desde Promociones): solo los productos donde se aplica el descuento
  const promo = promoPorId(params.get('promo'))

  const delTipo = carta
    .filter((c) => c.sector === SECTOR[tipo])
    .map((c) => (promo ? { ...c, productos: c.productos.filter((p) => aplicaPromo(promo, c.nombre, p)) } : c))
    .filter((c) => c.productos.length > 0)
  const agrupados = delTipo.filter((c) => !categoria || c.nombre === categoria)

  const irA = (t: Tipo, conPromo: typeof promo | null = promo) => {
    const p = new URLSearchParams()
    if (t === 'trago') p.set('tipo', t)
    if (conPromo) p.set('promo', conPromo.id)
    setParams(p, { replace: true })
    setCategoria(null)
  }
  const cambiarTipo = (t: Tipo) => irA(t)

  return (
    <div className="flex flex-col gap-1">
      <PageHeader eyebrow="Carta" title="Menú" subtitle="Tocá un plato o un trago para ver más.">
        {/* Control segmentado platos / tragos */}
        <div role="tablist" aria-label="Tipo de producto" className="grid grid-cols-2 rounded-xl border border-line bg-surface p-1 md:w-72">
          {(['plato', 'trago'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tipo === t}
              onClick={() => cambiarTipo(t)}
              className={`min-h-11 rounded-lg text-sm font-bold transition-colors duration-150 ${
                tipo === t ? 'bg-gold text-on-gold' : 'text-muted hover:text-ink'
              }`}
            >
              {t === 'plato' ? 'Platos' : 'Tragos'}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="scroll-row -mx-4 mb-6 px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Categorías">
        <button type="button" className="chip" aria-pressed={categoria === null} onClick={() => setCategoria(null)}>
          Todo
        </button>
        {delTipo.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={categoria === c.nombre} onClick={() => setCategoria(c.nombre)}>
            {c.nombre}
          </button>
        ))}
      </div>

      {promo && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <span>
            Mostrando productos de <b className="text-gold">{promo.titulo}</b>
          </span>
          <button
            type="button"
            aria-label="Quitar filtro de la promoción"
            onClick={() => irA(tipo, null)}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-elevated transition-colors hover:bg-line"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {promo && carta.length > 0 && delTipo.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mb-3 grid size-14 place-items-center rounded-full bg-elevated text-gold">
            <SearchX size={24} aria-hidden="true" />
          </span>
          <h2 className="text-xl">Nada por acá</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Esta promoción no aplica a los {tipo === 'plato' ? 'platos' : 'tragos'}. Probá en la otra pestaña.
          </p>
          <button type="button" className="btn-ghost mt-4 min-h-10" onClick={() => irA(tipo === 'plato' ? 'trago' : 'plato')}>
            Ver {tipo === 'plato' ? 'tragos' : 'platos'}
          </button>
        </div>
      )}

      {errorCarta && <ErrorCarga mensaje={errorCarta} onReintentar={recargarCarta} />}
      {cargandoCarta && carta.length === 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3" aria-busy="true" aria-label="Cargando el menú">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card aspect-[4/3] animate-pulse bg-elevated/60" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {agrupados.map(({ id, nombre: c, productos: items }) => (
          <section key={id} aria-labelledby={`cat-${id}`}>
            <h2 id={`cat-${id}`} className="mb-3 text-xl text-gold-soft">
              {c}
            </h2>
            {/* 1 columna en móvil, 2 en tablet, 3 en escritorio ancho */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {/* Las 3 primeras de la primera categoría se ven al abrir: van sin diferir */}
              {items.map((p, i) => (
                <ProductCard key={p.id} producto={p} prioridad={id === agrupados[0].id && i < 3} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Acceso rápido al pedido */}
      {totalItems > 0 && (
        // En móvil queda justo arriba de la barra inferior flotante; en tablet y escritorio, al pie de la pantalla
        <div className="sticky bottom-[calc(var(--bottom-nav-space)+env(safe-area-inset-bottom)+0.75rem)] mt-6 md:bottom-6 md:flex md:justify-end">
          <Link to="/pedido" className="btn-primary w-full justify-between shadow-glow md:w-96">
            <span>Ver pedido · {totalItems}</span>
            <span>{formatoPrecio(total)}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
