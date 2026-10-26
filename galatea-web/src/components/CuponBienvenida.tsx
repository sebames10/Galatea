import { useState, type FormEvent } from 'react'
import { MessageCircle } from 'lucide-react'
import { telefonoValido, useCliente } from '../useCliente'

/**
 * Tarjeta dorada del 10% de bienvenida (diseño de GalateaLovable). Con nombre y
 * celular registra al cliente en la API y muestra su cupón; si este dispositivo
 * ya está registrado, muestra el cupón directamente.
 */
export function CuponBienvenida() {
  const { cliente, cargando, registrar } = useCliente()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errorTelefono = tocado && !telefonoValido(telefono) ? 'Ingresá un celular válido, por ejemplo 099 123 456.' : null
  const cupon = cliente?.registrado ? cliente.cuponBienvenida : null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!nombre.trim() || !telefonoValido(telefono)) return
    setEnviando(true)
    setError(null)
    try {
      await registrar(nombre.trim(), telefono)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="cupon-titulo" className="relative overflow-hidden rounded-3xl bg-gold p-6 text-on-gold shadow-glow md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">Descuento de bienvenida</p>
      <h2 id="cupon-titulo" className="mt-2 font-display text-6xl font-normal tracking-normal">
        10% off
      </h2>

      {cargando ? (
        <div className="mt-5 h-12 animate-pulse rounded-full bg-on-gold/10" aria-busy="true" aria-label="Cargando" />
      ) : cupon ? (
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <CuponQr />
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">¡Listo, {cliente?.nombre?.split(' ')[0]}! Este es tu cupón:</p>
            <p className="font-heading text-2xl font-bold tracking-[0.2em]">{cupon.codigo}</p>
            <p className="max-w-md text-sm font-medium">
              {cupon.usado
                ? 'Este cupón ya lo usaste. ¡Gracias por volver!'
                : `${cupon.porcentaje}% de descuento, de un solo uso. Mostráselo al mozo al pedir la cuenta.`}
            </p>
            {/* TODO: cuando la API mande el cupón por WhatsApp (Twilio/n8n), cambiar el aviso */}
            <p className="flex items-center gap-2 text-xs font-medium opacity-80">
              <MessageCircle size={14} aria-hidden="true" />
              Pronto también te va a llegar por WhatsApp.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 max-w-md font-medium">Dejanos tu nombre y celular y te damos un cupón de un solo uso por WhatsApp. </p>
          <form onSubmit={enviar} noValidate className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              aria-label="Nombre"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="given-name"
              className="h-12 rounded-full bg-bg px-5 text-ink placeholder:text-muted focus:ring-2 focus:ring-bg/60"
            />
            <input
              aria-label="Celular"
              placeholder="Celular (099 123 456)"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={() => setTocado(true)}
              aria-invalid={!!errorTelefono}
              className="h-12 rounded-full bg-bg px-5 text-ink placeholder:text-muted focus:ring-2 focus:ring-bg/60"
            />
            <button
              type="submit"
              disabled={!nombre.trim() || enviando}
              className="btn min-h-12 bg-bg text-gold hover:bg-elevated"
            >
              {enviando ? 'Enviando…' : 'Quiero mi cupón'}
            </button>
          </form>
          {(errorTelefono || error) && (
            <p role="alert" className="mt-3 rounded-2xl bg-bg/90 px-4 py-2 text-sm text-danger">
              {errorTelefono ?? error}
            </p>
          )}
        </>
      )}
    </section>
  )
}

/** Patrón de ejemplo con forma de QR. El QR real lo generará el backend (librería qrcode). */
function CuponQr() {
  const n = 21
  const tinta = '#040F1F'
  const celdas: [number, number][] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const enEsquina = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
      if (!enEsquina && (x * 7 + y * 13 + x * y) % 3 === 0) celdas.push([x, y])
    }
  const ojo = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill={tinta} />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={tinta} />
    </g>
  )
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-36 shrink-0 rounded-2xl bg-white" role="img" aria-label="Código QR del cupón (ejemplo)">
      {celdas.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={tinta} />
      ))}
      {ojo(0, 0)}
      {ojo(n - 7, 0)}
      {ojo(0, n - 7)}
    </svg>
  )
}
