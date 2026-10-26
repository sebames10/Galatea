import { useEffect, useState } from 'react'
import { Check, QrCode, Receipt } from 'lucide-react'
import { salon, type Cuenta, type EstadoPedido, type Pedido as PedidoApi } from '../api'
import { formatoPrecio, nombrePresentacion } from '../data/menu'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { OrderSummary } from '../components/OrderSummary'
import { ComoFunciona } from '../components/ComoFunciona'
import { BotonEscanearMesa } from '../components/EscanerMesa'

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
      <PageHeader eyebrow={mesa ? `Mesa ${mesa.numero}` : 'Tu mesa'} title="Pedido" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        {mios.length > 0 && <Seguimiento pedidos={mios} />}

        {!mesa ? (
          <section className="card flex flex-col items-center gap-4 p-8 text-center md:col-span-2 lg:col-span-1 xl:col-span-2">
            <span className="grid size-16 place-items-center rounded-2xl bg-gold/15 text-gold">
              <QrCode size={32} aria-hidden="true" />
            </span>
            <h2 className="text-2xl">Escaneá el QR de tu mesa</h2>
            <p className="max-w-md text-muted">
              Lo encontrás en el centro de la mesa. Podés escanearlo con la cámara del celular o desde acá.
            </p>
            <BotonEscanearMesa />
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

        {/* En tablet y escritorio hay lugar para explicar el pedido por QR */}
        <div className="hidden md:block">
          <ComoFunciona />
        </div>
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

interface LineaConsumo {
  clave: string
  producto: string
  /** Para uno, Para compartir, Copa…; null si el producto tiene un solo precio */
  variante: string | null
  cantidad: number
}

/**
 * Lo pedido en toda la cuenta (de cualquier dispositivo de la mesa o del mozo), agrupado:
 * el mismo producto y presentación en varios pedidos se muestra una sola vez con la cantidad sumada.
 * Platos son los de cocina y Tragos los de barra.
 */
function consumoPorSector(pedidos: PedidoApi[]) {
  const sectores = [
    { sector: 'cocina', titulo: 'Platos', lineas: new Map<string, LineaConsumo>() },
    { sector: 'barra', titulo: 'Tragos', lineas: new Map<string, LineaConsumo>() },
  ]
  for (const p of pedidos) {
    const lineas = sectores.find((s) => s.sector === p.sector)!.lineas
    for (const it of p.items) {
      const clave = `${it.producto}|${it.presentacion}`
      const linea = lineas.get(clave) ?? {
        clave,
        producto: it.producto,
        variante: nombrePresentacion(it.presentacion),
        cantidad: 0,
      }
      linea.cantidad += it.cantidad
      lineas.set(clave, linea)
    }
  }
  return sectores.filter((s) => s.lineas.size).map((s) => ({ ...s, lineas: [...s.lineas.values()] }))
}

/** Lo consumido por la mesa, el total y el pedido de la cuenta. */
function CuentaMesa({ codigo, cuenta, onCambio }: { codigo: string; cuenta: Cuenta; onCambio: (c: Cuenta) => void }) {
  const consumo = consumoPorSector(cuenta.pedidos)
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
      <p className="text-sm text-muted">Consumido hasta ahora</p>
      {consumo.map(({ sector, titulo, lineas }) => (
        <div key={sector} className="flex flex-col gap-2">
          <h3 className="eyebrow">{titulo}</h3>
          <ul className="flex flex-col gap-2">
            {lineas.map((l) => (
              <li key={l.clave} className="flex items-baseline gap-3">
                <span className="w-7 shrink-0 font-semibold text-gold">{l.cantidad}×</span>
                <span className="flex flex-1 flex-col">
                  <span>{l.producto}</span>
                  {l.variante && <span className="text-sm text-muted">{l.variante}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-line/60 pt-3">
        <span className="text-muted">Total</span>
        <span className="font-heading ">{formatoPrecio(cuenta.total)}</span>
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
