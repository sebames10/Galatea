import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Sector } from '../api'
import { formatoPrecio } from '../data/menu'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { ProductCard } from '../components/ProductCard'
import { ErrorCarga } from '../components/ErrorCarga'

// Platos = lo que prepara la cocina; tragos = la barra (cervezas y vinos incluidos)
type Tipo = 'plato' | 'trago'
const SECTOR: Record<Tipo, Sector> = { plato: 'cocina', trago: 'barra' }

export function Menu() {
  const [tipo, setTipo] = useState<Tipo>('plato')
  const [categoria, setCategoria] = useState<string | null>(null)
  const { carta, cargandoCarta, errorCarta, recargarCarta, totalItems, total } = useApp()

  const delTipo = carta.filter((c) => c.sector === SECTOR[tipo] && c.productos.length > 0)
  const agrupados = delTipo.filter((c) => !categoria || c.nombre === categoria)

  const cambiarTipo = (t: Tipo) => {
    setTipo(t)
    setCategoria(null)
  }

  return (
    <div className="  flex flex-col gap-1">
      <PageHeader eyebrow=""  title="Menú">
        {/* Control segmentado platos / tragos */}
        <div role="tablist" aria-label="Tipo de producto" className="grid grid-cols-2 rounded-xl border border-line bg-surface p-1 md:w-72">
          {(['plato', 'trago'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tipo === t}
              onClick={() => cambiarTipo(t)}
              className={`min-h-11 rounded-lg font-heading text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
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

      {/* Acceso rápido al pedido en móvil/tablet (en escritorio está el panel lateral) */}
      {totalItems > 0 && (
        // En móvil queda justo arriba de la barra inferior fija; en tablet, al pie del <main>
        <div className="sticky bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] mt-6 md:bottom-0 lg:hidden">
          <Link to="/pedido" className="btn-primary w-full justify-between shadow-lg shadow-bg/80">
            <span>Ver pedido · {totalItems}</span>
            <span>{formatoPrecio(total)}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
