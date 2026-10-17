import { useEffect, useState } from 'react'
import { Check, QrCode, Receipt } from 'lucide-react'
import { salon, type Cuenta, type EstadoPedido, type Pedido as PedidoApi } from '../api'
import { formatoPrecio } from '../data/menu'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { OrderSummary } from '../components/OrderSummary'

const estados: { id: EstadoPedido; titulo: string; texto: string }[] = [
  { id: 'pendiente', titulo: 'Recibido', texto: 'Llegó a cocina y barra.' },
  { id: 'preparacion', titulo: 'En preparación', texto: 'Lo están preparando.' },
  { id: 'listo', titulo: 'Listo', texto: 'Un mozo lo está retirando.' },
  { id: 'entregado', titulo: 'Entregado', texto: '¡Buen provecho!' },
]
const orden = (e: EstadoPedido) => estados.findIndex((x) => x.id === e)

// Hasta que la API tenga WebSockets, el estado se consulta cada tanto
const CONSULTA_MS = 5000

// Código QR de la mesa 7 en los datos de prueba (database/seed.sql de galatea-api)
const QR_DEMO = 'GAL-M07-B3X7'

export function Pedido() {
  const { mesa, errorMesa, elegirMesa, pedidosEnviados, olvidarPedidos } = useApp()
  // undefined: todavía no se consultó; null: la mesa no tiene cuenta abierta
  const [cuenta, setCuenta] = useState<Cuenta | null | undefined>(undefined)

  useEffect(() => {
    setCuenta(undefined)
    if (!mesa) return
    let vigente = true
    const consultar = () =>
      salon
        .cuenta(mesa.codigo)
        .then((c) => vigente && setCuenta(c))
        .catch(() => {}) // sin conexión: se reintenta en la próxima vuelta
    consultar()
    const t = window.setInterval(consultar, CONSULTA_MS)
    return () => {
      vigente = false
      window.clearInterval(t)
    }
  }, [mesa])

  // Pedidos de este dispositivo en la cuenta abierta. Si la cuenta se cerró, ya no se siguen.
  const mios = cuenta?.pedidos.filter((p) => pedidosEnviados.includes(p.id)) ?? []
  useEffect(() => {
    if (cuenta === null && pedidosEnviados.length && mesa) olvidarPedidos()
  }, [cuenta, pedidosEnviados.length, mesa, olvidarPedidos])

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={mesa ? `Mesa ${mesa.numero}` : 'Pedido por QR'} title="Pedido" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {mios.length > 0 && <Seguimiento pedidos={mios} />}

        {!mesa ? (
          <section className="card flex flex-col items-center gap-4 p-8 text-center md:col-span-2 lg:col-span-1 xl:col-span-2">
            <span className="grid size-16 place-items-center rounded-2xl bg-gold/15 text-gold">
              <QrCode size={32} aria-hidden="true" />
            </span>
            <h2 className="text-2xl">Escaneá el QR de tu mesa</h2>
            <p className="max-w-md text-muted">
              Cada mesa tiene su código. Al escanearlo, la mesa queda identificada y podés pedir sin esperar a un mozo.
            </p>
            {errorMesa && (
              <p role="alert" className="text-sm text-danger">
                {errorMesa}
              </p>
            )}
            {/* Solo en desarrollo: simula haber escaneado el QR de la mesa 7 */}
            {import.meta.env.DEV && (
              <button type="button" className="btn-ghost" onClick={() => void elegirMesa(QR_DEMO)}>
                Simular mesa 7
              </button>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-8">
            <OrderSummary />
            {cuenta && <CuentaMesa codigo={mesa.codigo} cuenta={cuenta} onCambio={setCuenta} />}
          </div>
        )}
      </div>
    </div>
  )
}

/** Avance de los pedidos que mandó este dispositivo (cocina y barra van por separado). */
function Seguimiento({ pedidos }: { pedidos: PedidoApi[] }) {
  // El paso general es el del pedido más atrasado
  const actual = Math.min(...pedidos.map((p) => orden(p.estado)))

  return (
    <section aria-labelledby="seguimiento" className="card flex flex-col gap-5 p-5">
      <h2 id="seguimiento" className="text-xl">
        Estado de tu pedido
      </h2>
      <ol className="flex flex-col" aria-live="polite">
        {estados.map((e, i) => {
          const hecho = i < actual
          const activo = i === actual
          return (
            <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < estados.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${hecho ? 'bg-gold' : 'bg-line'}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${
                  hecho ? 'border-gold bg-gold text-on-gold' : activo ? 'border-gold text-gold' : 'border-line text-muted'
                }`}
              >
                {hecho ? <Check size={16} aria-hidden="true" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </span>
              <div>
                <p className={`font-heading font-semibold ${activo ? 'text-gold' : hecho ? 'text-ink' : 'text-muted'}`}>
                  {e.titulo}
                  {activo && <span className="sr-only"> (estado actual)</span>}
                </p>
                <p className="text-sm text-muted">{e.texto}</p>
              </div>
            </li>
          )
        })}
      </ol>
      {pedidos.length > 1 && (
        <ul className="flex flex-col gap-1 border-t border-line/60 pt-3 text-sm text-muted">
          {pedidos.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.sector === 'cocina' ? 'Cocina' : 'Barra'}</span>
              <span className="text-ink">{estados[orden(p.estado)].titulo}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Total de la mesa y pedido de la cuenta. */
function CuentaMesa({ codigo, cuenta, onCambio }: { codigo: string; cuenta: Cuenta; onCambio: (c: Cuenta) => void }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pedirCuenta = async () => {
    setEnviando(true)
    setError(null)
    try {
      onCambio(await salon.solicitarCuenta(codigo))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="cuenta-mesa" className="card flex flex-col gap-3 p-5">
      <h2 id="cuenta-mesa" className="flex items-center gap-2 text-xl">
        <Receipt size={20} className="text-gold" aria-hidden="true" />
        Cuenta de la mesa
      </h2>
      <div className="flex items-baseline justify-between">
        <span className="text-muted">Consumido hasta ahora</span>
        <span className="font-heading text-2xl font-semibold">{formatoPrecio(cuenta.total)}</span>
      </div>
      {cuenta.fechaSolicitudCuenta ? (
        <p role="status" className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
          Ya pediste la cuenta: un mozo va a tu mesa. Si tenés el cupón de bienvenida, mostráselo.
        </p>
      ) : (
        <button type="button" className="btn-ghost w-full" onClick={pedirCuenta} disabled={enviando}>
          {enviando ? 'Avisando…' : 'Pedir la cuenta'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
