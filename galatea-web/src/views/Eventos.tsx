import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { desdeIso, eventoDelDia, eventos } from '../data/eventos'
import { fechaIso } from '../data/reservas'
import { PageHeader } from '../components/PageHeader'
import { FotoLocal } from '../components/FotoLocal'

const fmtMes = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' })
const fmtCorto = new Intl.DateTimeFormat('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Eventos() {
  const navigate = useNavigate()
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario')
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const hoy = fechaIso(new Date())

  // La semana empieza el lunes: getDay() da 0 para domingo
  const huecos = (mes.getDay() + 6) % 7
  const diasDelMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const mover = (n: number) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
  const proximos = eventos.filter((e) => e.fecha >= hoy)

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Agenda" title="Eventos" subtitle="Shows en vivo, noches temáticas y torneos. Tocá un día marcado para ver el detalle." />

      <div className="mb-5 flex gap-2">
        <button type="button" className="chip" aria-pressed={vista === 'calendario'} onClick={() => setVista('calendario')}>
          <CalendarDays size={16} aria-hidden="true" />
          Calendario
        </button>
        <button type="button" className="chip" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>
          <List size={16} aria-hidden="true" />
          Lista
        </button>
      </div>

      {vista === 'calendario' ? (
        <section aria-label="Calendario de eventos" className="rounded-3xl border border-line/60 bg-surface p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" aria-label="Mes anterior" onClick={() => mover(-1)} className="grid size-11 place-items-center rounded-full bg-elevated hover:bg-line">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h2 className="text-2xl first-letter:uppercase" aria-live="polite">
              {fmtMes.format(mes)}
            </h2>
            <button type="button" aria-label="Mes siguiente" onClick={() => mover(1)} className="grid size-11 place-items-center rounded-full bg-elevated hover:bg-line">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-muted" aria-hidden="true">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="py-2">
                {d}
              </span>
            ))}
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-7 gap-1">
            {Array.from({ length: huecos }, (_, i) => (
              <span key={`h${i}`} />
            ))}
            {Array.from({ length: diasDelMes }, (_, i) => {
              const fecha = fechaIso(new Date(mes.getFullYear(), mes.getMonth(), i + 1))
              const ev = eventoDelDia(fecha)
              const esHoy = fecha === hoy
              return (
                <button
                  key={fecha}
                  type="button"
                  disabled={!ev}
                  aria-label={ev ? `${i + 1}: ${ev.titulo}` : undefined}
                  onClick={() => navigate(`/eventos/${fecha}`)}
                  className={`relative aspect-square rounded-2xl font-heading text-sm font-semibold transition md:text-base ${
                    ev ? 'bg-gold text-on-gold shadow-glow hover:bg-gold-soft' : 'cursor-default text-muted'
                  } ${esHoy && !ev ? 'text-ink ring-1 ring-gold' : ''}`}
                >
                  {i + 1}
                  {ev && <span className="absolute inset-x-0 bottom-1.5 mx-auto size-1 rounded-full bg-on-gold" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {proximos.map((e) => (
            <li key={e.fecha}>
              <Link to={`/eventos/${e.fecha}`} className="flex gap-4 rounded-3xl border border-line/60 bg-surface p-3 transition-colors hover:bg-elevated">
                <FotoLocal src={e.foto} className="size-20 shrink-0 rounded-2xl object-cover" />
                <div className="py-1">
                  <p className="eyebrow">
                    {fmtCorto.format(desdeIso(e.fecha))} · {e.hora} h
                  </p>
                  <p className="font-heading text-lg font-semibold">{e.titulo}</p>
                  <p className="text-sm text-muted">{e.tipo}</p>
                </div>
              </Link>
            </li>
          ))}
          {proximos.length === 0 && <p className="text-muted">No hay eventos próximos por ahora.</p>}
        </ul>
      )}
    </div>
  )
}
