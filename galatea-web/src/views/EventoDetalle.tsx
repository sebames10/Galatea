import { Link, Navigate, useParams } from 'react-router-dom'
import { Clock, Ticket } from 'lucide-react'
import { desdeIso, eventoDelDia } from '../data/eventos'
import { PageHeader } from '../components/PageHeader'
import { FotoLocal } from '../components/FotoLocal'

const fmtFecha = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })

export function EventoDetalle() {
  const { fecha = '' } = useParams()
  const e = eventoDelDia(fecha)
  if (!e) return <Navigate to="/eventos" replace />

  return (
    <div className="flex flex-col">
      <PageHeader volver={{ to: '/eventos', label: 'Eventos' }} eyebrow={e.tipo} title={e.titulo} />

      <FotoLocal src={e.foto} alt={e.titulo} prioridad className="aspect-[16/9] w-full rounded-3xl object-cover shadow-soft" />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
        <p className="text-lg leading-relaxed text-muted md:col-span-2">{e.descripcion}</p>
        <aside className="rounded-3xl border border-line/60 bg-surface p-5">
          <p className="font-heading text-xl font-semibold first-letter:uppercase">{fmtFecha.format(desdeIso(e.fecha))}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Clock size={16} aria-hidden="true" />
            {e.hora} h
          </p>
          {e.precio && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Ticket size={16} aria-hidden="true" />
              {e.precio}
            </p>
          )}
          <Link to={`/reservar?fecha=${e.fecha}`} className="btn-primary mt-5 w-full">
            Reservar para este evento
          </Link>
        </aside>
      </div>
    </div>
  )
}
