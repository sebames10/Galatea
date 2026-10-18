import { Link } from 'react-router-dom'
import { ArrowRight, KeyRound, Smartphone, Ticket } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { CuponBienvenida } from '../components/CuponBienvenida'

const puntos = [
  { icon: KeyRound, titulo: 'Sin contraseñas', texto: 'No hace falta crear usuario: alcanza con tu nombre y celular.' },
  { icon: Smartphone, titulo: 'Queda en tu celular', texto: 'El cupón se guarda acá; volvé a esta pantalla cuando quieras.' },
  { icon: Ticket, titulo: 'Un solo uso', texto: 'Mostralo al mozo al pedir la cuenta y se descuenta el 10%.' },
]

export function Bienvenida() {
  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Primera visita" title="Bienvenida" subtitle="Tu primera vez en Galatea tiene premio." />

      <CuponBienvenida />

      <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {puntos.map(({ icon: Icon, titulo, texto }) => (
          <li key={titulo} className="flex gap-4 rounded-3xl border border-line/60 bg-surface p-5 md:flex-col md:gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-heading text-lg font-semibold">{titulo}</span>
              <span className="text-sm text-muted">{texto}</span>
            </span>
          </li>
        ))}
      </ul>

      <Link
        to="/promociones"
        className="group mt-6 flex items-center justify-between rounded-3xl border border-line/60 bg-surface p-5 transition-colors hover:bg-elevated"
      >
        <span>
          <span className="eyebrow block">Hay más</span>
          <span className="font-heading text-xl font-semibold">Ver las promociones vigentes</span>
        </span>
        <ArrowRight size={20} className="text-gold transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  )
}
