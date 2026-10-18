import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Crown, Eye, Trophy, UserRound, Users, Wifi } from 'lucide-react'
import { modos, palabras, ranking, type ModoId, type Periodo } from '../data/juego'
import { PageHeader } from '../components/PageHeader'

const iconoModo = { mesa: Users, online: Wifi, individual: UserRound }
const periodos: { id: Periodo; label: string }[] = [
  { id: 'noche', label: 'Esta noche' },
  { id: 'mes', label: 'Este mes' },
  { id: 'historico', label: 'Histórico' },
]

/** Experiencia Galatea: el juego del Impostor (modos, reglas, partida de prueba y ranking). */
export function JuegoExperiencia() {
  const [modoId, setModoId] = useState<ModoId>('mesa')
  const [rol, setRol] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('noche')
  const modo = modos.find((m) => m.id === modoId)!

  const elegirModo = (id: ModoId) => {
    setModoId(id)
    setRol(null)
    setAviso(null)
  }

  // Partida de prueba: 1 de cada 4 veces te toca ser el Impostor
  const repartir = () =>
    setRol(Math.random() < 0.25 ? 'Sos el Impostor 🤫' : palabras[Math.floor(Math.random() * palabras.length)])

  const unirse = (e: FormEvent) => {
    e.preventDefault()
    setAviso(`Buscando la sala ${codigo.toUpperCase()}…`)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        volver={{ to: '/juego', label: 'Juegos' }}
        eyebrow="Juego social"
        title="Experiencia Galatea"
        subtitle="Una palabra, un Impostor y mucha sospecha."
      />

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gold p-8 text-on-gold shadow-glow"
      >
        <Eye className="absolute -right-6 -top-6 size-40 opacity-15" aria-hidden="true" />
        <p className="font-display text-4xl md:text-5xl">¿Quién miente?</p>
        <p className="mt-2 max-w-sm font-medium">
          Todos reciben la misma palabra secreta, menos el Impostor. Den pistas, voten y descubran quién es antes de que llegue la comida.
        </p>
      </motion.div>

      <section aria-labelledby="modo" className="mt-8">
        <h2 id="modo" className="mb-3 text-2xl">
          Elegí el modo
        </h2>
        <div role="radiogroup" aria-label="Modo de juego" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {modos.map((m) => {
            const Icon = iconoModo[m.id]
            const activo = modoId === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => elegirModo(m.id)}
                className={`rounded-3xl border p-5 text-left transition-colors duration-150 ${
                  activo ? 'border-gold bg-gold/10' : 'border-line/60 bg-surface hover:bg-elevated'
                }`}
              >
                <Icon size={24} className="text-gold" aria-hidden="true" />
                <span className="mt-3 block font-heading text-xl font-semibold">{m.nombre}</span>
                <span className="block text-sm text-muted">{m.descripcion}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="reglas" className="mt-6 rounded-3xl border border-line/60 bg-surface p-6">
        <p id="reglas" className="eyebrow">
          Reglas · {modo.nombre}
        </p>
        <ol className="mt-3 space-y-2">
          {modo.reglas.map((r, i) => (
            <li key={r} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-elevated text-sm font-bold text-gold">{i + 1}</span>
              <span className="pt-0.5">{r}</span>
            </li>
          ))}
        </ol>

        {modoId === 'online' ? (
          <div className="mt-6 flex flex-col gap-4 border-t border-line/60 pt-6">
            <button type="button" className="btn-primary w-full sm:w-auto sm:self-start" onClick={() => setAviso('Creando la sala…')}>
              Crear sala
            </button>
            <form onSubmit={unirse} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="codigo" className="field-label">
                  O unite con un código
                </label>
                <input
                  id="codigo"
                  className="field font-bold uppercase tracking-[0.3em]"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.slice(0, 6))}
                  placeholder="AB12CD"
                  autoComplete="off"
                  aria-describedby="codigo-ayuda"
                />
                <p id="codigo-ayuda" className="mt-1 text-xs text-muted">
                  6 caracteres. Te lo pasa quien creó la sala.
                </p>
              </div>
              <button type="submit" className="btn-ghost sm:mb-5" disabled={codigo.length < 6}>
                Unirme
              </button>
            </form>
            {aviso && (
              <p role="status" className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
                {aviso} (las partidas online se conectan cuando esté el backend)
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            {rol && (
              <motion.p key={rol} initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} role="status" className="font-display text-4xl text-gold">
                {rol}
              </motion.p>
            )}
            <button type="button" className="btn-primary" onClick={repartir}>
              {rol ? 'Repartir de nuevo' : 'Empezar partida'}
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="ranking" className="card mt-8 flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-gold" aria-hidden="true" />
          <h2 id="ranking" className="text-xl">
            Ranking
          </h2>
        </div>
        <div role="tablist" aria-label="Período del ranking" className="scroll-row">
          {periodos.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={periodo === p.id} className="chip" onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <ol className="flex flex-col gap-2">
          {ranking[periodo].map((r, i) => (
            <li key={r.nombre} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-gold/10' : 'bg-elevated/50'}`}>
              <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold text-on-gold' : 'bg-surface text-muted'}`}>
                {i === 0 ? <Crown size={16} aria-label="Primer puesto" /> : i + 1}
              </span>
              <span className="flex-1 font-medium">{r.nombre}</span>
              <span className="font-heading font-semibold text-gold">{r.puntos.toLocaleString('es-UY')} pts</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
