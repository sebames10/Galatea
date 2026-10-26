import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { formatoPrecio, nombrePresentacion } from '../data/menu'
import { useApp } from '../store'
import { BotonEscanearMesa } from './EscanerMesa'

/**
 * Resumen del pedido. Se usa en la vista Pedido y en el panel que abre el botón
 * de la bolsa (enPanel: el título lo pone el panel). Antes de confirmar muestra el número de mesa
 * para que el Cliente lo verifique (mitigación del riesgo "pedido en mesa incorrecta").
 */
export function OrderSummary({ compact = false, enPanel = false }: { compact?: boolean; enPanel?: boolean }) {
  const { mesa, carrito, total, totalItems, agregar, quitar, anotar, confirmarPedido } = useApp()
  const navigate = useNavigate()
  const tituloId = useId() // puede haber dos a la vez: la vista Pedido y el panel
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await confirmarPedido()
      navigate('/pedido')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id={tituloId} className={enPanel ? 'sr-only' : 'text-xl'}>
          Tu pedido
        </h2>
        {totalItems > 0 && <span className="text-sm text-muted">{totalItems} ítems</span>}
      </div>

      {carrito.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-4 py-8 text-center">
          <ShoppingBag size={28} className="text-gold" aria-hidden="true" />
          <p className="text-sm text-muted">Todavía no agregaste nada.</p>
          <Link to="/menu" className="btn-ghost">
            Ver el menú
          </Link>
        </div>
      ) : (
        <>
          {/* Como el CartDrawer de GalateaLovable: foto, nombre completo (sin cortar) y una nota por línea */}
          <ul className="flex flex-col gap-3">
            {carrito.map(({ producto, presentacion, cantidad, nota }) => {
              const variante = nombrePresentacion(presentacion.nombre)
              const nombre = variante ? `${producto.nombre} ${variante}` : producto.nombre
              return (
                <li key={presentacion.id} className="rounded-2xl border border-line/60 bg-surface p-3">
                  <div className="flex gap-3">
                    {producto.foto ? (
                      <img src={producto.foto} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="size-16 shrink-0 rounded-xl bg-elevated" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{producto.nombre}</p>
                      {variante && <p className="text-xs text-muted">{variante}</p>}
                      <p className="mt-1 text-sm text-gold">{formatoPrecio(presentacion.precio * cantidad)}</p>
                    </div>
                    <div className="flex items-center gap-1 self-center">
                      <button
                        type="button"
                        aria-label={`Quitar uno de ${nombre}`}
                        onClick={() => quitar(presentacion.id)}
                        className="grid size-8 place-items-center rounded-full bg-elevated transition-colors hover:bg-line"
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <span className="w-6 text-center font-bold" aria-live="polite">
                        {cantidad}
                      </span>
                      <button
                        type="button"
                        aria-label={`Sumar uno de ${nombre}`}
                        onClick={() => agregar(presentacion.id)}
                        className="grid size-8 place-items-center rounded-full bg-elevated transition-colors hover:bg-line"
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <input
                    value={nota}
                    onChange={(e) => anotar(presentacion.id, e.target.value)}
                    placeholder="Nota (ej. sin cebolla, punto jugoso)"
                    aria-label={`Nota para ${nombre}`}
                    maxLength={255}
                    className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-gold"
                  />
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-between text-lg">
            <span className="text-muted">Total</span>
            <span className="font-display text-2xl text-ink">{formatoPrecio(total)}</span>
          </div>

          {mesa ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
                <QrCode size={18} className="shrink-0" aria-hidden="true" />
                <span>
                  Se enviará a la <strong className="font-semibold text-gold">mesa {mesa.numero}</strong>.
                </span>
              </p>
              <button type="button" className="btn-primary min-h-12 w-full text-base" onClick={confirmar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar pedido a la cocina'}
              </button>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-line/60 px-4 py-3">
              <p className="text-sm text-muted">Para pedir desde la app escaneá el código QR de tu mesa. También podés pedirle al mozo.</p>
              <BotonEscanearMesa className="btn-primary min-h-12 w-full" />
            </div>
          )}
        </>
      )}

      {compact && (
        <Link to="/bienvenida" className="card mt-2 flex flex-col gap-1 p-4 transition-colors hover:border-gold/60">
          <span className="eyebrow">Bienvenida</span>
          <span className="font-heading text-lg">10% en tu primera visita</span>
          <span className="text-sm text-muted">Solo con tu nombre y teléfono. Sin contraseñas.</span>
        </Link>
      )}
    </section>
  )
}
