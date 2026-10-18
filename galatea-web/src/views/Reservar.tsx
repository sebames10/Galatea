import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarCheck, Clock, Minus, Plus } from 'lucide-react'
import { reservas, type Disponibilidad } from '../api'
import { PageHeader } from '../components/PageHeader'
import { ErrorCarga } from '../components/ErrorCarga'
import { duracionEstimada, fechaIso, sumarMinutos } from '../data/reservas'
import { desdeIso, eventoDelDia } from '../data/eventos'
import { telefonoValido, useCliente } from '../useCliente'

// Personas va antes que Horario: la API calcula los horarios libres según la cantidad de personas
const PASOS = ['Fecha', 'Personas', 'Horario', 'Datos', 'Listo'] as const
const [FECHA, PERSONAS, HORARIO, DATOS, LISTO] = [0, 1, 2, 3, 4]

// La API acepta reservas hasta 60 días adelante
const DIAS_VISIBLES = 45
const MAX_PERSONAS = 20

const fmtDia = new Intl.DateTimeFormat('es-UY', { weekday: 'short' })
const fmtMes = new Intl.DateTimeFormat('es-UY', { month: 'short' })
const fmtFecha = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })

function proximosDias(n: number) {
  const hoy = new Date()
  return Array.from({ length: n }, (_, i) => fechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)))
}

export function Reservar() {
  const dias = useMemo(() => proximosDias(DIAS_VISIBLES), [])
  // ?fecha=AAAA-MM-DD llega desde el detalle de un evento: arranca con ese día elegido
  const [params] = useSearchParams()
  const fechaInicial = dias.includes(params.get('fecha') ?? '') ? params.get('fecha')! : ''

  const [paso, setPaso] = useState(fechaInicial ? PERSONAS : FECHA)
  const [fecha, setFecha] = useState(fechaInicial)
  const [personas, setPersonas] = useState(2)
  const [hora, setHora] = useState<string | null>(null)
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null)
  const [errorDisp, setErrorDisp] = useState<string | null>(null)
  const [consulta, setConsulta] = useState(0)
  const { cliente, registrar } = useCliente()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const evento = fecha ? eventoDelDia(fecha) : undefined
  const duracion = duracionEstimada(personas)
  // La API exige nombre y teléfono para reservar: si este dispositivo no está registrado, se piden
  const faltaRegistro = !cliente?.registrado
  const datosOk = !faltaRegistro || (nombre.trim().length > 1 && telefonoValido(telefono))
  const puedeSeguir = [!!fecha, personas > 0, !!hora, datosOk][paso] ?? false

  useEffect(() => {
    if (!fecha) return
    let vigente = true
    setDisponibilidad(null)
    setErrorDisp(null)
    reservas
      .disponibilidad(fecha, personas)
      .then((d) => vigente && setDisponibilidad(d))
      .catch((e: Error) => vigente && setErrorDisp(e.message))
    return () => {
      vigente = false
    }
  }, [fecha, personas, consulta])

  // Si el horario elegido dejó de estar libre (cambió el día o las personas), se deselecciona
  useEffect(() => {
    if (hora && disponibilidad && !disponibilidad.horarios.find((h) => h.hora === hora)?.disponible) setHora(null)
  }, [disponibilidad, hora])

  const confirmar = async () => {
    if (!hora) return
    setEnviando(true)
    setError(null)
    try {
      if (faltaRegistro) await registrar(nombre.trim(), telefono)
    } catch (err) {
      setError((err as Error).message) // datos rechazados: se queda en este paso para corregirlos
      setEnviando(false)
      return
    }
    try {
      await reservas.crear(fecha, hora, personas)
      setPaso(LISTO)
    } catch (err) {
      // Lo más probable es que alguien haya tomado el horario: se vuelve a elegir con la lista actualizada
      setError((err as Error).message)
      setConsulta((n) => n + 1)
      setPaso(HORARIO)
    } finally {
      setEnviando(false)
    }
  }

  const avanzar = (e: FormEvent) => {
    e.preventDefault()
    if (!puedeSeguir || enviando) return
    if (paso === DATOS) void confirmar()
    else setPaso(paso + 1)
  }

  const otraReserva = () => {
    setPaso(FECHA)
    setFecha('')
    setHora(null)
    setError(null)
    setConsulta((n) => n + 1)
  }

  const fechaLarga = fecha ? fmtFecha.format(desdeIso(fecha)) : ''
  const resumen = fecha && (
    <span>
      {fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}
      {paso > PERSONAS && ` · ${personas} ${personas === 1 ? 'persona' : 'personas'}`}
      {hora && paso > HORARIO && ` · ${hora} h`}
    </span>
  )

  return (
    <form onSubmit={avanzar} className="flex flex-col">
      <PageHeader eyebrow="Sin usuario ni contraseña" title="Reservar" subtitle="Cinco pasos y tu mesa queda lista." />

      <ol className="mb-6 grid grid-cols-5 gap-1.5" aria-label="Progreso de la reserva">
        {PASOS.map((nombrePaso, i) => (
          <li key={nombrePaso}>
            <button
              type="button"
              disabled={i >= paso || paso === LISTO}
              onClick={() => setPaso(i)}
              aria-current={i === paso ? 'step' : undefined}
              className="w-full text-left disabled:cursor-default"
            >
              <span className={`block h-1.5 rounded-full transition-colors ${i <= paso ? 'bg-gold' : 'bg-elevated'}`} />
              <span className={`mt-1.5 block text-[11px] font-semibold ${i === paso ? 'text-ink' : 'text-muted'}`}>{nombrePaso}</span>
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={paso}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl border border-line/60 bg-surface p-5 md:p-8"
        >
          {paso === FECHA && (
            <fieldset>
              <legend className="mb-4 font-heading text-2xl font-semibold">¿Qué día venís?</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {dias.map((d, i) => {
                  const dt = desdeIso(d)
                  const ev = eventoDelDia(d)
                  const elegido = fecha === d
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={elegido}
                      aria-label={`${fmtFecha.format(dt)}${ev ? `, ${ev.titulo}` : ''}`}
                      onClick={() => {
                        setFecha(d)
                        setHora(null)
                      }}
                      className={`relative rounded-2xl border py-2.5 text-center transition-colors ${
                        elegido ? 'border-gold bg-gold text-on-gold' : 'border-line/60 bg-elevated/40 hover:bg-elevated'
                      }`}
                    >
                      <span className="block text-[11px] uppercase opacity-70">{i === 0 ? 'Hoy' : fmtDia.format(dt).replace('.', '')}</span>
                      <span className="block font-heading text-xl font-semibold">{dt.getDate()}</span>
                      <span className="block text-[10px] uppercase opacity-70">{fmtMes.format(dt).replace('.', '')}</span>
                      {ev && <span className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${elegido ? 'bg-on-gold' : 'bg-gold'}`} />}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" /> Día con evento.{' '}
                <Link to="/eventos" className="font-semibold text-gold underline-offset-4 hover:underline">
                  Ver la agenda
                </Link>
              </p>
            </fieldset>
          )}

          {paso === PERSONAS && (
            <fieldset>
              <legend className="font-heading text-2xl font-semibold">¿Cuántas personas?</legend>
              <p className="mb-6 mt-1 text-sm text-muted">
                {resumen}
                {evento && <span className="text-gold"> · {evento.titulo} ({evento.hora} h)</span>}
              </p>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label="Una persona menos"
                  disabled={personas <= 1}
                  onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                  className="grid size-12 place-items-center rounded-full bg-elevated transition-colors hover:bg-line disabled:opacity-40"
                >
                  <Minus size={20} aria-hidden="true" />
                </button>
                <output className="w-20 text-center font-display text-6xl" aria-live="polite">
                  {personas}
                </output>
                <button
                  type="button"
                  aria-label="Una persona más"
                  disabled={personas >= MAX_PERSONAS}
                  onClick={() => setPersonas((p) => Math.min(MAX_PERSONAS, p + 1))}
                  className="grid size-12 place-items-center rounded-full bg-elevated transition-colors hover:bg-line disabled:opacity-40"
                >
                  <Plus size={20} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted">
                <Clock size={14} aria-hidden="true" />
                Duración estimada de {duracion} minutos.
              </p>
            </fieldset>
          )}

          {paso === HORARIO && (
            <fieldset>
              <legend className="font-heading text-2xl font-semibold">¿A qué hora?</legend>
              <p className="mb-4 mt-1 text-sm text-muted">
                {resumen}
                {evento && <span className="text-gold"> · {evento.titulo} ({evento.hora} h)</span>}
              </p>
              {errorDisp && <ErrorCarga mensaje={errorDisp} onReintentar={() => setConsulta((n) => n + 1)} />}
              {error && (
                <p role="alert" className="mb-3 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-busy={!disponibilidad}>
                {disponibilidad
                  ? disponibilidad.horarios.map(({ hora: h, disponible }) => (
                      <button
                        key={h}
                        type="button"
                        disabled={!disponible}
                        aria-pressed={hora === h}
                        onClick={() => {
                          setHora(h)
                          setError(null)
                        }}
                        className={`min-h-12 rounded-2xl border font-bold transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-35 ${
                          hora === h ? 'border-gold bg-gold text-on-gold' : 'border-line/60 bg-elevated/40 hover:bg-elevated'
                        }`}
                      >
                        {h}
                      </button>
                    ))
                  : !errorDisp && Array.from({ length: 12 }, (_, i) => <div key={i} className="min-h-12 animate-pulse rounded-2xl bg-elevated/60" />)}
              </div>
              <p className="mt-3 text-xs text-muted">
                {hora
                  ? `Tu mesa queda reservada de ${hora} a ${sumarMinutos(hora, duracion)}.`
                  : 'Los horarios tachados ya no tienen mesas libres o ya pasaron.'}
              </p>
            </fieldset>
          )}

          {paso === DATOS && (
            <fieldset>
              <legend className="font-heading text-2xl font-semibold">{faltaRegistro ? 'Tus datos' : 'Confirmá tu reserva'}</legend>
              <p className="mb-5 mt-1 text-sm text-muted">{resumen}</p>
              {faltaRegistro ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <p className="text-sm text-muted md:col-span-2">Solo para guardarte la mesa. Además te llevás el cupón de 10% de bienvenida.</p>
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
              ) : (
                <p className="rounded-2xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
                  Reservás como <strong className="font-semibold text-gold">{cliente?.nombre}</strong>.
                </p>
              )}
              <p className="mt-4 text-xs text-muted">Si no llegás entre 15 minutos antes y 10 minutos después de la hora, la reserva se libera.</p>
              {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {error}
                </p>
              )}
            </fieldset>
          )}

          {paso === LISTO && hora && (
            <div className="py-4 text-center" role="status">
              <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="mx-auto grid size-16 place-items-center rounded-full bg-ok/15 text-ok">
                <CalendarCheck size={32} aria-hidden="true" />
              </motion.div>
              <h2 className="mt-4 text-3xl">¡Te esperamos{cliente?.nombre ? `, ${cliente.nombre.split(' ')[0]}` : ''}!</h2>
              <p className="mt-2 text-muted first-letter:uppercase">
                {fmtFecha.format(desdeIso(fecha))} · {hora} h · {personas} {personas === 1 ? 'persona' : 'personas'}
              </p>
              <p className="mt-1 text-sm text-muted">Si no llegás entre 15 minutos antes y 10 minutos después, la mesa se libera.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/menu" className="btn-ghost">
                  Mirar el menú
                </Link>
                <button type="button" className="btn-primary" onClick={otraReserva}>
                  Hacer otra reserva
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {paso < LISTO && (
        <div className="mt-5 flex gap-3">
          {paso > FECHA && (
            <button type="button" className="btn-ghost" onClick={() => setPaso(paso - 1)}>
              <ArrowLeft size={16} aria-hidden="true" />
              Atrás
            </button>
          )}
          <button type="submit" className="btn-primary flex-1" disabled={!puedeSeguir || enviando}>
            {paso === DATOS ? (enviando ? 'Reservando…' : 'Confirmar reserva') : 'Continuar'}
          </button>
        </div>
      )}
    </form>
  )
}
