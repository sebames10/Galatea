import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { buscarProducto, formatoPrecio, maridaje, nombrePresentacion } from '../data/menu'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { Foto } from '../components/Foto'
import { ProductoMini } from '../components/ProductoMini'
import { ErrorCarga } from '../components/ErrorCarga'

export function ProductoDetalle() {
  const { id = '' } = useParams()
  const { carta, cargandoCarta, errorCarta, recargarCarta, agregar, cantidad } = useApp()
  const p = useMemo(() => buscarProducto(carta, Number(id)), [carta, id])
  const pares = useMemo(() => (p ? maridaje(carta, p) : []), [carta, p])

  // Arranca en la primera presentación que se puede pedir (individual, copa, p1…)
  const [idPres, setIdPres] = useState<number>()
  const pr = p?.presentaciones.find((x) => x.id === idPres) ?? p?.presentaciones.find((x) => x.disponible) ?? p?.presentaciones[0]
  const [agregado, setAgregado] = useState(false)

  useEffect(() => {
    if (!agregado) return
    const t = setTimeout(() => setAgregado(false), 1600)
    return () => clearTimeout(t)
  }, [agregado])

  if (!p) {
    if (errorCarta) return <ErrorCarga mensaje={errorCarta} onReintentar={recargarCarta} />
    if (cargandoCarta || !carta.length)
      return (
        <div className="grid gap-8 md:grid-cols-2" aria-busy="true" aria-label="Cargando el producto">
          <div className="aspect-[4/3] animate-pulse rounded-3xl bg-elevated/60" />
          <div className="h-64 animate-pulse rounded-3xl bg-elevated/60" />
        </div>
      )
    return <Navigate to="/menu" replace />
  }

  const esTrago = p.sector === 'barra'
  const pedibles = !p.agotado && !!pr?.disponible
  const enPedido = pr ? cantidad(pr.id) : 0

  const agregarAlPedido = () => {
    if (!pr) return
    agregar(pr.id)
    setAgregado(true)
  }

  return (
    <div className="flex flex-col">
      <PageHeader volver={{ to: esTrago ? '/menu?tipo=trago' : '/menu', label: `Menú · ${p.categoria}` }} eyebrow={p.categoria} title={p.nombre} />

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="relative overflow-hidden rounded-3xl shadow-soft">
          {p.foto ? (
            <Foto src={p.foto} alt={p.nombre} prioridad className={p.agotado ? 'grayscale' : ''} />
          ) : (
            <div className="aspect-[4/3] w-full bg-elevated" />
          )}
          {p.agotado && (
            <span className="absolute left-4 top-4 rounded-full bg-bg/90 px-3 py-1.5 text-sm font-bold text-danger">Agotado por hoy</span>
          )}
        </div>

        <div>
          {p.descripcion && <p className="text-lg leading-relaxed text-muted">{p.descripcion}</p>}
          {p.etiquetas.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Etiquetas">
              {p.etiquetas.map((e) => (
                <li key={e} className="rounded-full border border-gold/40 px-3 py-1 text-xs font-semibold text-gold-soft">
                  {e}
                </li>
              ))}
            </ul>
          )}

          {/* Solo se elige presentación cuando hay más de una (individual/familiar, copa/botella…) */}
          {p.presentaciones.length > 1 && (
            <fieldset className="mt-6">
              <legend className="eyebrow mb-3">Presentación</legend>
              <div className="grid grid-cols-2 gap-2">
                {p.presentaciones.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    aria-pressed={pr?.id === x.id}
                    disabled={!x.disponible || p.agotado}
                    onClick={() => setIdPres(x.id)}
                    className={`rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      pr?.id === x.id ? 'border-gold bg-gold/10' : 'border-line bg-surface hover:border-gold/60'
                    }`}
                  >
                    <span className="block font-semibold">{nombrePresentacion(x.nombre) ?? p.nombre}</span>
                    <span className="text-sm text-gold">{x.disponible ? formatoPrecio(x.precio) : 'Agotado por hoy'}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {pr && <p className="mt-6 font-display text-4xl text-ink">{formatoPrecio(pr.precio)}</p>}

          <button type="button" onClick={agregarAlPedido} disabled={!pedibles} className="btn-primary mt-4 min-h-12 w-full text-base">
            {!pedibles ? (
              'No disponible hoy'
            ) : agregado ? (
              <>
                <Check size={20} aria-hidden="true" /> Agregado
              </>
            ) : (
              'Agregar al pedido'
            )}
          </button>
          <p className="mt-2 min-h-6 text-center text-sm" aria-live="polite">
            {enPedido > 0 && (
              <>
                <span className="text-muted">Tenés {enPedido} en tu pedido · </span>
                <Link to="/pedido" className="font-semibold text-gold hover:text-gold-soft">
                  Ver pedido
                </Link>
              </>
            )}
          </p>

          <Link
            to={`/recomendaciones?para=${p.id}`}
            className="mt-4 flex items-center gap-2 rounded-2xl border border-line/60 bg-surface p-4 text-sm font-semibold transition-colors hover:bg-elevated"
          >
            <Sparkles size={16} className="text-gold" aria-hidden="true" />
            Ver recomendaciones para este {esTrago ? 'trago' : 'plato'}
          </Link>
        </div>
      </div>

      {pares.length > 0 && (
        <section className="mt-12" aria-labelledby="maridaje">
          <p className="eyebrow">Maridaje</p>
          <h2 id="maridaje" className="mb-4 text-2xl">
            Combina bien con
          </h2>
          <div className="scroll-row -mx-4 px-4 pb-2 md:mx-0 md:px-0">
            {pares.map((x) => (
              <ProductoMini key={x.id} producto={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
