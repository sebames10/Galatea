import { Link } from 'react-router-dom'
import { ArrowRight, Gift, QrCode, Sparkles } from 'lucide-react'
import { destacados, formatoPrecio, precioDesde } from '../data/menu'
import { useApp } from '../store'
import { Foto } from '../components/Foto'

// Foto del hero en dos anchos y tres formatos: el navegador elige el más liviano que soporte
const HERO = '/hero/galatea-hero'
const heroSrcSet = (ext: string) => `${HERO}-640.${ext} 640w, ${HERO}-1024.${ext} 1024w`
const HERO_SIZES = '(min-width: 1024px) 50vw, (min-width: 768px) 80vw, 100vw'

const accesos = [
  { to: '/pedido', icon: QrCode, titulo: 'Pedir desde la mesa', texto: 'Escaneá el QR y pedí sin esperar.' },
  { to: '/bienvenida', icon: Gift, titulo: '10% de bienvenida', texto: '' },
]

export function Inicio() {
  const { carta } = useApp()
  const recomendados = destacados(carta)

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/*
        Hero: la foto con zoom lento (Ken Burns) y un solo botón.
        En móvil va de borde a borde (-mx-4 -mt-4 anula el padding de <main>) y llena
        la pantalla visible; en tablet/escritorio es una tarjeta con el marco del logo.
      */}
      <section aria-labelledby="hero-titulo" className="hero -mx-4 -mt-4 md:deco-frame md:mx-0 md:mt-0">
        {/* El título queda para lectores de pantalla y buscadores; visualmente habla la foto */}
        <h1 id="hero-titulo" className="sr-only">
          Galatea, restaurante y bar
        </h1>
        <div className="hero-media">
          <picture>
            <source type="image/avif" srcSet={heroSrcSet('avif')} sizes={HERO_SIZES} />
            <source type="image/webp" srcSet={heroSrcSet('webp')} sizes={HERO_SIZES} />
            <img
              src={`${HERO}-1024.jpg`}
              srcSet={heroSrcSet('jpg')}
              sizes={HERO_SIZES}
              width={1024}
              height={1536}
              alt="Terraza de Galatea al atardecer, con gente cenando bajo las luces"
              decoding="async"
              {...{ fetchpriority: 'high' }}
            />
          </picture>
        </div>
        <div className="flex h-full flex-col justify-end p-5 md:p-10">
          <Link to="/menu" className="btn-primary w-full shadow-lg shadow-bg/60 md:w-auto md:self-start md:px-8">
            Ver el menú
          </Link>
        </div>
      </section>

      {/* Accesos rápidos: 1 columna en móvil, 3 en tablet/escritorio */}
      <section aria-label="Accesos rápidos" className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {accesos.map(({ to, icon: Icon, titulo, texto }) => (
          <Link
            key={to}
            to={to}
            className="card group flex min-h-20 items-center gap-4 p-4 transition-colors duration-150 hover:border-gold/60 active:bg-elevated md:flex-col md:items-start md:p-6"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block font-heading text-lg font-semibold">{titulo}</span>
              <span className="block text-sm text-muted">{texto}</span>
            </span>
            <ArrowRight size={18} className="text-muted transition-colors group-hover:text-gold md:hidden" aria-hidden="true" />
          </Link>
        ))}
      </section>

      {/* Recomendados: carrusel horizontal en móvil, grilla en escritorio */}
      <section aria-labelledby="recomendados">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1 flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden="true" /> Para vos
            </p>
            <h2 id="recomendados" className="text-2xl">
              Recomendados de hoy
            </h2>
          </div>
          <Link to="/menu" className="text-sm font-semibold text-gold underline-offset-4 hover:underline">
            Ver todo
          </Link>
        </div>
        <ul className="scroll-row -mx-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
          {recomendados.map((p) => (
            <li key={p.id} className="card w-64 shrink-0 overflow-hidden md:w-auto">
              {/* Debajo del hero: nunca están en la primera pantalla, van diferidas */}
              {p.foto && <Foto src={p.foto} />}
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.categoria}</p>
                <p className="mt-1 font-heading text-lg font-semibold">{p.nombre}</p>
                {p.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.descripcion}</p>}
                <p className="mt-3 font-heading font-semibold text-gold">
                  {p.presentaciones.length > 1 && <span className="mr-1 text-xs font-normal text-muted">desde</span>}
                  {formatoPrecio(precioDesde(p))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
