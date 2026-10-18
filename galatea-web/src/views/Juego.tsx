import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

const tarjetas = [
  {
    to: '/juego/experiencia',
    foto: '/hero/galatea-hero-1024',
    eyebrow: 'Juego social',
    titulo: 'Experiencia Galatea',
    texto: '¿Quién es el Impostor? Mesa, online o individual.',
  },
  {
    to: '/juego/mesa',
    foto: '/juegos/juegos-1024',
    eyebrow: 'En el local',
    titulo: 'Juegos de mesa',
    texto: 'Catan, Dixit, Azul y más. Pedilos al mozo.',
  },
]

export function Juego() {
  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Quedate un rato más" title="Juegos" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tarjetas.map((t) => (
          <Link key={t.to} to={t.to} className="group relative isolate overflow-hidden rounded-3xl border border-line/60 shadow-soft">
            <picture>
              <source type="image/webp" srcSet={`${t.foto}.webp`} />
              <img
                src={`${t.foto}.jpg`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-72 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </picture>
            <div className="fade-bottom absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl md:text-3xl">
                {t.titulo}
                <ArrowRight size={20} className="text-gold transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </h2>
              <p className="text-sm text-muted">{t.texto}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
