import { useState, type FormEvent } from 'react'
import { Crown, Trophy, UserRound, Users, Wifi } from 'lucide-react'
import { modos, ranking, type ModoId, type Periodo } from '../data/juego'
import { PageHeader } from '../components/PageHeader'

const iconoModo = { mesa: Users, online: Wifi, individual: UserRound }
const periodos: { id: Periodo; label: string }[] = [
  { id: 'noche', label: 'Esta noche' },
  { id: 'mes', label: 'Este mes' },
  { id: 'historico', label: 'Histórico' },
]

export function Juego() {
  const [modo, setModo] = useState<ModoId>('mesa')
  const [codigo, setCodigo] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('noche')
  const [aviso, setAviso] = useState<string | null>(null)

  const unirse = (e: FormEvent) => {
    e.preventDefault()
    setAviso(`Buscando la sala ${codigo.toUpperCase()}…`)
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="" title="El Impostor" />

      <p className="-mt-3 mb-6 max-w-prose text-muted md:-mt-5 md:mb-8">
        Todos reciben la misma palabra secreta, menos el Impostor. Den pistas, voten y descubran quién es antes de que llegue la comida.
      </p>

      {/* Escritorio: crear/unirse a la izquierda y ranking a la derecha */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="crear">
            <h2 id="crear" className="mb-3 text-xl">
              Crear partida
            </h2>
            <div role="radiogroup" aria-label="Modo de juego" className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {modos.map((m) => {
                const Icon = iconoModo[m.id]
                const activo = modo === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => setModo(m.id)}
                    className={`card flex items-start gap-3 p-4 text-left transition-colors duration-150 md:flex-col xl:flex-row ${
                      activo ? 'border-gold bg-gold/10' : 'hover:border-gold/50'
                    }`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${activo ? 'bg-gold text-on-gold' : 'bg-elevated text-gold'}`}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-heading font-semibold">{m.nombre}</span>
                      <span className="block text-sm text-muted">{m.descripcion}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button type="button" className="btn-primary mt-4 w-full md:w-auto" onClick={() => setAviso('Creando la sala…')}>
              Crear sala
            </button>
          </section>

          <section aria-labelledby="unirse" className="card p-5">
            <h2 id="unirse" className="mb-3 text-xl">
              Unirse con código
            </h2>
            <form onSubmit={unirse} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="codigo" className="field-label">
                  Código de la sala
                </label>
                <input
                  id="codigo"
                  className="field font-heading uppercase tracking-[0.3em]"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.slice(0, 6))}
                  placeholder="AB12CD"
                  autoComplete="off"
                  inputMode="text"
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
          </section>

          {aviso && (
            <p role="status" className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-soft">
              {aviso} (las partidas se conectan cuando esté el backend)
            </p>
          )}
        </div>

        <section aria-labelledby="ranking" className="card flex flex-col gap-4 p-5">
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
                <span className={`grid size-8 place-items-center rounded-full font-heading text-sm font-bold ${i === 0 ? 'bg-gold text-on-gold' : 'bg-surface text-muted'}`}>
                  {i === 0 ? <Crown size={16} aria-label="Primer puesto" /> : i + 1}
                </span>
                <span className="flex-1 font-medium">{r.nombre}</span>
                <span className="font-heading font-semibold text-gold">{r.puntos.toLocaleString('es-UY')} pts</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
