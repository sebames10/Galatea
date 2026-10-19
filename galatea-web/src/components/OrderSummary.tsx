import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QrCode, ShoppingBag } from 'lucide-react'
import { formatoPrecio, nombrePresentacion } from '../data/menu'
import { useApp } from '../store'
import { QtyStepper } from './QtyStepper'

/**
 * Resumen del pedido. Se usa en la vista Pedido y en el panel que abre el botón
 * de la bolsa (enPanel: el título lo pone el panel). Antes de confirmar muestra el número de mesa
 * para que el Cliente lo verifique (mitigación del riesgo "pedido en mesa incorrecta").
 */
export function OrderSummary({ compact = false, enPanel = false }: { compact?: boolean; enPanel?: boolean }) {
  const { mesa, carrito, total, totalItems, agregar, quitar, confirmarPedido } = useApp()
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
          <ul className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line/60 bg-surface">
            {carrito.map(({ producto, presentacion, cantidad }) => {
              const variante = nombrePresentacion(presentacion.nombre)
              const nombre = variante ? `${producto.nombre} · ${variante}` : producto.nombre
              return (
                <li key={presentacion.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{nombre}</p>
                    <p className="text-sm text-muted">{formatoPrecio(presentacion.precio * cantidad)}</p>
                  </div>
                  <QtyStepper
                    nombre={nombre}
                    cantidad={cantidad}
                    onMas={() => agregar(presentacion.id)}
                    onMenos={() => quitar(presentacion.id)}
                  />
                </li>
              )
            })}
          </ul>

          <div className="flex items-baseline justify-between border-t border-line/60 pt-3">
            <span className="text-muted">Total</span>
            <span className="font-heading text-2xl font-semibold text-ink">{formatoPrecio(total)}</span>
          </div>

          {mesa ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
                <QrCode size={18} className="shrink-0" aria-hidden="true" />
                <span>
                  Se enviará a la <strong className="font-semibold text-gold">mesa {mesa.numero}</strong>.
                </span>
              </p>
              <button type="button" className="btn-primary w-full" onClick={confirmar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Confirmar pedido'}
              </button>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-line/60 px-4 py-3 text-sm text-muted">
              Para pedir desde la app escaneá el código QR de tu mesa. También podés pedirle al mozo.
            </p>
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
