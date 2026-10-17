import { useState, type FormEvent } from 'react'
import { Gift, MessageCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { telefonoValido, useCliente } from '../useCliente'

export function Bienvenida() {
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
    <div className="flex flex-col">
      <PageHeader eyebrow="Primera visita" title="10% de bienvenida" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-3 text-muted">
          <p className="text-lg text-ink">Dejanos tu nombre y tu celular y te regalamos un 10% de descuento.</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>· No hace falta crear usuario ni contraseña.</li>
            <li>· El cupón queda guardado acá, en este celular.</li>
            <li>· Es de un solo uso: mostralo al mozo al pedir la cuenta.</li>
          </ul>
        </div>

        {cargando ? (
          <div className="card h-64 animate-pulse bg-elevated/60" aria-busy="true" aria-label="Cargando" />
        ) : cupon ? (
          <section aria-labelledby="cupon" className="deco-frame flex flex-col items-center gap-4 bg-gradient-to-b from-elevated to-surface p-8 text-center">
            <Gift size={28} className="text-gold" aria-hidden="true" />
            <h2 id="cupon" className="text-2xl">
              ¡Listo, {cliente?.nombre?.split(' ')[0]}!
            </h2>
            <CuponQr />
            <p className="font-heading text-lg font-semibold tracking-[0.2em] text-gold">{cupon.codigo}</p>
            {cupon.usado ? (
              <p className="text-sm text-muted">Este cupón ya lo usaste. ¡Gracias por volver!</p>
            ) : (
              <p className="text-sm text-muted">{cupon.porcentaje}% de descuento. Mostráselo al mozo al pedir la cuenta.</p>
            )}
            {/* TODO: cuando la API mande el cupón por WhatsApp (Twilio/n8n), volver a avisarlo acá */}
            <p className="flex items-center gap-2 text-xs text-muted">
              <MessageCircle size={14} aria-hidden="true" />
              Pronto también te va a llegar por WhatsApp.
            </p>
          </section>
        ) : (
          <form onSubmit={enviar} noValidate className="card flex flex-col gap-4 p-5">
            <div>
              <label htmlFor="nombre" className="field-label">
                Nombre
              </label>
              <input id="nombre" className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" required />
            </div>
            <div>
              <label htmlFor="telefono" className="field-label">
                Celular
              </label>
              <input
                id="telefono"
                className={`field ${errorTelefono ? 'border-danger' : ''}`}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={() => setTocado(true)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="099 123 456"
                aria-invalid={!!errorTelefono}
                aria-describedby="telefono-ayuda"
                required
              />
              <p id="telefono-ayuda" className={`mt-1 text-xs ${errorTelefono ? 'text-danger' : 'text-muted'}`}>
                {errorTelefono ?? 'Lo usamos solo para enviarte el cupón.'}
              </p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={!nombre.trim() || enviando}>
              {enviando ? 'Enviando…' : 'Quiero mi 10%'}
            </button>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

/** Patrón de ejemplo con forma de QR. El QR real lo generará el backend (librería qrcode). */
function CuponQr() {
  const n = 21
  const celdas: [number, number][] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const enEsquina = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
      if (!enEsquina && (x * 7 + y * 13 + x * y) % 3 === 0) celdas.push([x, y])
    }
  const ojo = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#06162B" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#06162B" />
    </g>
  )
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-48 rounded-xl bg-white" role="img" aria-label="Código QR del cupón (ejemplo)">
        {celdas.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#06162B" />
        ))}
        {ojo(0, 0)}
        {ojo(n - 7, 0)}
        {ojo(0, n - 7)}
      </svg>
      <figcaption className="text-xs text-muted">QR de ejemplo</figcaption>
    </figure>
  )
}
