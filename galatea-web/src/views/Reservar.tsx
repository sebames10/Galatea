import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarCheck, Clock, Minus, Plus, Users } from 'lucide-react'
import { reservas, type Disponibilidad } from '../api'
import { PageHeader } from '../components/PageHeader'
import { ErrorCarga } from '../components/ErrorCarga'
import { duracionEstimada, fechaIso, sumarMinutos } from '../data/reservas'
import { telefonoValido, useCliente } from '../useCliente'

const fmtDia = new Intl.DateTimeFormat('es-UY', { weekday: 'short' })
const fmtFecha = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })

function proximosDias(n: number) {
  const hoy = new Date()
  return Array.from({ length: n }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i))
}

export function Reservar() {
  const dias = useMemo(() => proximosDias(10), [])
  const [dia, setDia] = useState(0)
  const [personas, setPersonas] = useState(2)
  const [hora, setHora] = useState<string | null>(null)
  const [confirmada, setConfirmada] = useState(false)
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null)
  const [errorDisp, setErrorDisp] = useState<string | null>(null)
  const [consulta, setConsulta] = useState(0)
  const { cliente, registrar } = useCliente()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fecha = dias[dia]
  const duracion = duracionEstimada(personas)
  // La API exige nombre y teléfono para reservar: si falta, se piden en el resumen
  const faltaRegistro = !cliente?.registrado

  useEffect(() => {
    let vigente = true
    setDisponibilidad(null)
    setErrorDisp(null)
    reservas
      .disponibilidad(fechaIso(fecha), personas)
      .then((d) => vigente && setDisponibilidad(d))
      .catch((e: Error) => vigente && setErrorDisp(e.message))
    return () => {
      vigente = false
    }
  }, [fecha, personas, consulta])

  // Si el horario elegido dejó de estar libre (cambió la cantidad de personas), se deselecciona
  useEffect(() => {
    if (hora && disponibilidad && !disponibilidad.horarios.find((h) => h.hora === hora)?.disponible) setHora(null)
  }, [disponibilidad, hora])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!hora) return
    if (faltaRegistro && (!nombre.trim() || !telefonoValido(telefono))) {
      setError('Necesitamos tu nombre y un celular válido (ej. 099 123 456) para guardar la reserva.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      if (faltaRegistro) await registrar(nombre.trim(), telefono)
      await reservas.crear(fechaIso(fecha), hora, personas)
      setConfirmada(true)
    } catch (err) {
      setError((err as Error).message)
      setConsulta((n) => n + 1) // alguien pudo haber tomado el horario: se refresca
    } finally {
      setEnviando(false)
    }
  }

  if (confirmada && hora) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-ok/15 text-ok">
          <CalendarCheck size={30} aria-hidden="true" />
        </span>
        <h1 className="text-3xl">¡Reserva confirmada!</h1>
        <p className="text-muted">
          {fmtFecha.format(fecha)} a las {hora} para {personas} {personas === 1 ? 'persona' : 'personas'}.
        </p>
        <p className="text-sm text-muted">
          Si no llegás entre 15 minutos antes y 10 minutos después de la hora, la reserva se libera.
        </p>
        <button
          type="button"
          className="btn-ghost mt-2"
          onClick={() => {
            setConfirmada(false)
            setHora(null)
            setConsulta((n) => n + 1)
          }}
        >
          Hacer otra reserva
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col">
      <PageHeader eyebrow="Sin usuario ni contraseña" title="Reservar mesa" />

      {/* Escritorio: elección a la izquierda y resumen fijo a la derecha */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-8">
          <fieldset>
            <legend className="field-label">Día</legend>
            <div className="scroll-row -mx-4 px-4 md:mx-0 md:grid md:grid-cols-5 md:px-0 xl:grid-cols-10">
              {dias.map((d, i) => (
                <button
                  key={d.toISOString()}
                  type="button"
                  aria-pressed={dia === i}
                  onClick={() => {
                    setDia(i)
                    setHora(null)
                  }}
                  className={`flex min-h-[4.5rem] w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition-colors duration-150 md:w-auto ${
                    dia === i ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span className="text-xs uppercase">{i === 0 ? 'Hoy' : fmtDia.format(d).replace('.', '')}</span>
                  <span className="font-heading text-xl font-semibold">{d.getDate()}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Personas</legend>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="btn-ghost size-12 p-0"
                onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                disabled={personas <= 1}
                aria-label="Una persona menos"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <output className="flex min-w-24 items-center justify-center gap-2 font-heading text-2xl font-semibold" aria-live="polite">
                <Users size={20} className="text-gold" aria-hidden="true" />
                {personas}
              </output>
              <button
                type="button"
                className="btn-ghost size-12 p-0"
                onClick={() => setPersonas((p) => Math.min(20, p + 1))}
                disabled={personas >= 20}
                aria-label="Una persona más"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Horario</legend>
            {errorDisp && <ErrorCarga mensaje={errorDisp} onReintentar={() => setConsulta((n) => n + 1)} />}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-busy={!disponibilidad}>
              {disponibilidad?.horarios.map(({ hora: h, disponible: libre }) => {
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!libre}
                    aria-pressed={hora === h}
                    onClick={() => setHora(h)}
                    className={`min-h-12 rounded-xl border font-heading font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-line/40 disabled:text-muted/40 disabled:line-through ${
                      hora === h ? 'border-gold bg-gold text-on-gold' : 'border-line text-ink hover:border-gold/60'
                    }`}
                  >
                    {h}
                  </button>
                )
              })}
            </div>
            {!disponibilidad && !errorDisp && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="min-h-12 animate-pulse rounded-xl bg-elevated/60" />
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Los horarios tachados ya no tienen mesas libres o ya pasaron.</p>
          </fieldset>
        </div>

        <aside className="card sticky top-0 flex flex-col gap-4 p-5" aria-label="Resumen de la reserva">
          <h2 className="text-lg">Resumen</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Día</dt>
              <dd className="text-right first-letter:uppercase">{fmtFecha.format(fecha)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Personas</dt>
              <dd>{personas}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Horario</dt>
              <dd>{hora ? `${hora} – ${sumarMinutos(hora, duracion)}` : 'Elegí un horario'}</dd>
            </div>
          </dl>
          <p className="flex items-start gap-2 text-xs text-muted">
            <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Duración estimada de {duracion} minutos para {personas} {personas === 1 ? 'persona' : 'personas'}.
          </p>
          {faltaRegistro && (
            <div className="flex flex-col gap-3 border-t border-line/60 pt-4">
              <p className="text-xs text-muted">Para guardarte la mesa necesitamos tu nombre y celular. Además te llevás el 10% de bienvenida.</p>
              <div>
                <label htmlFor="res-nombre" className="field-label">
                  Nombre
                </label>
                <input id="res-nombre" className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" />
              </div>
              <div>
                <label htmlFor="res-telefono" className="field-label">
                  Celular
                </label>
                <input
                  id="res-telefono"
                  className="field"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="099 123 456"
                />
              </div>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={!hora || enviando}>
            {enviando ? 'Reservando…' : 'Confirmar reserva'}
          </button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </aside>
      </div>
    </form>
  )
}
