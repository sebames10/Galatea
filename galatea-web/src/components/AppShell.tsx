import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Grid2x2, LogIn, ShoppingBag } from 'lucide-react'
import { estaActivo, navMas, navPrincipal } from './nav'
import { Wordmark } from './Wordmark'
import { MesaChip } from './MesaChip'
import { OrderSummary } from './OrderSummary'
import { Sheet } from './Sheet'
import { useApp } from '../store'

/**
 * Layout principal. El scroll lo hace siempre el documento: en móvil así el
 * navegador puede ocultar su barra de direcciones y la app ocupa toda la pantalla.
 *
 *  Móvil (<768)                     Tablet y escritorio (≥768)
 *  ┌──────────────────────┐         ┌──────────────────────────────────────┐
 *  │ logo      mesa  🛍   │ sticky  │ logo  Menú Pedido Reservar …  mesa 🛍 │ sticky
 *  ├──────────────────────┤         ├──────────────────────────────────────┤
 *  │        main          │         │                main                  │
 *  │  ╭────────────────╮  │         │                                      │
 *  │  │ barra flotante │  │ fixed   │                                      │
 *  └──╰────────────────╯──┘         └──────────────────────────────────────┘
 *
 * El pedido se abre en un panel (Sheet) desde el botón de la bolsa; lo
 * secundario (bienvenida, personal) va al panel "Más" en móvil.
 */
export function AppShell() {
  const { pathname, key } = useLocation()
  const { totalItems } = useApp()
  const [masAbierto, setMasAbierto] = useState(false)
  const [pedidoAbierto, setPedidoAbierto] = useState(false)
  const masActivo = navMas.some((m) => estaActivo(pathname, m.to))

  // Cada vista nueva empieza arriba
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Cualquier navegación (aunque sea a la misma ruta) cierra los paneles
  useEffect(() => {
    setMasAbierto(false)
    setPedidoAbierto(false)
  }, [key])

  const cerrarMas = useCallback(() => setMasAbierto(false), [])
  const cerrarPedido = useCallback(() => setPedidoAbierto(false), [])

  return (
    // reducedMotion="user": con "reducir movimiento" framer-motion no anima transformaciones
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        {/* Escritorio y tablet: barra superior */}
        <header className="safe-top sticky top-0 z-40 hidden border-b border-line/60 bg-bg/85 backdrop-blur-xl md:block">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-8 xl:px-12">
            <Link to="/" aria-label="Galatea, ir al inicio" className="shrink-0 text-sm">
              <Wordmark />
            </Link>
            {/* Tablet: los 4 principales + "Más"; escritorio (≥1024): también los secundarios con enBarra */}
            <nav aria-label="Principal" className="flex flex-1 items-center gap-0.5">
              {[...navPrincipal, ...navMas.filter((m) => m.enBarra)].map((n) => {
                const activo = estaActivo(pathname, n.to)
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    aria-current={activo ? 'page' : undefined}
                    className={`relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors xl:px-3.5 ${
                      activo ? 'text-ink' : 'text-muted hover:text-ink'
                    } ${'enBarra' in n ? 'hidden lg:block' : ''}`}
                  >
                    {activo && <motion.span layoutId="pildora-escritorio" className="absolute inset-0 -z-10 rounded-full bg-elevated" transition={{ duration: 0.25 }} />}
                    {n.label}
                  </Link>
                )
              })}
              <button
                type="button"
                onClick={() => setMasAbierto(true)}
                aria-haspopup="dialog"
                className={`relative rounded-full px-3 py-2 text-sm font-semibold transition-colors lg:hidden ${
                  masActivo ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Más
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <MesaChip />
              <Link
                to="/staff"
                aria-label="Ingreso del personal"
                className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink"
              >
                <LogIn size={20} aria-hidden="true" />
              </Link>
              <BotonPedido cantidad={totalItems} onClick={() => setPedidoAbierto(true)} />
            </div>
          </div>
        </header>

        {/* Móvil: encabezado */}
        <header className="safe-top safe-x sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur-xl md:hidden">
          <div className="flex h-[var(--header-h)] items-center justify-between px-4">
            <Link to="/" aria-label="Galatea, ir al inicio" className="text-[0.7rem]">
              <Wordmark />
            </Link>
            <div className="flex items-center gap-2">
              <MesaChip />
              <BotonPedido cantidad={totalItems} onClick={() => setPedidoAbierto(true)} />
            </div>
          </div>
        </header>

        <main
          id="contenido"
          className="safe-x pb-[calc(var(--bottom-nav-space)+env(safe-area-inset-bottom)+1rem)] max-md:overflow-x-clip md:pb-0"
        >
          {/* key: re-dispara la animación de entrada al cambiar de vista */}
          <div key={pathname} className="view-enter mx-auto w-full max-w-6xl px-4 pb-8 pt-4 md:px-8 md:pb-16 md:pt-8 xl:px-12">
            <Outlet />
          </div>
        </main>

        {/* Móvil: barra inferior flotante */}
        <nav
          aria-label="Principal"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 grid h-[var(--bottom-nav-h)] grid-cols-5 rounded-3xl border border-line/60 bg-surface/95 p-1.5 shadow-soft backdrop-blur-xl md:hidden"
        >
          {navPrincipal.map((n) => {
            const activo = estaActivo(pathname, n.to)
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={activo ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold"
              >
                {activo && <motion.span layoutId="pildora-movil" className="absolute inset-0 rounded-2xl bg-elevated" transition={{ duration: 0.25 }} />}
                <span className="relative">
                  <n.icon size={20} strokeWidth={activo ? 2.2 : 1.8} className={activo ? 'text-gold' : 'text-muted'} aria-hidden="true" />
                  {n.to === '/pedido' && <Contador n={totalItems} />}
                </span>
                <span className={`relative ${activo ? 'text-ink' : 'text-muted'}`}>{n.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMasAbierto(true)}
            aria-haspopup="dialog"
            className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold"
          >
            {masActivo && <span className="absolute inset-0 rounded-2xl bg-elevated" />}
            <Grid2x2 size={20} className={`relative ${masActivo ? 'text-gold' : 'text-muted'}`} aria-hidden="true" />
            <span className={`relative ${masActivo ? 'text-ink' : 'text-muted'}`}>Más</span>
          </button>
        </nav>

        <Sheet open={masAbierto} onClose={cerrarMas} title="Más de Galatea">
          <div className="grid gap-2">
            {navMas.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className={`flex items-center gap-4 rounded-2xl border border-line/60 p-4 transition-colors hover:border-gold/60 ${
                  estaActivo(pathname, m.to) ? 'bg-elevated' : 'bg-bg/40'
                }`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <m.icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-heading font-semibold">{m.label}</span>
                  <span className="text-sm text-muted">{m.texto}</span>
                </span>
              </Link>
            ))}
          </div>
        </Sheet>

        <Sheet open={pedidoAbierto} onClose={cerrarPedido} title="Tu pedido">
          <OrderSummary enPanel />
        </Sheet>
      </div>
    </MotionConfig>
  )
}

function Contador({ n }: { n: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span
          key={n}
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-on-gold"
        >
          {n}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function BotonPedido({ cantidad, onClick }: { cantidad: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={cantidad ? `Ver tu pedido (${cantidad} ítems)` : 'Ver tu pedido'}
      className="relative grid size-11 place-items-center rounded-full bg-elevated text-ink transition-colors hover:bg-line"
    >
      <ShoppingBag size={20} aria-hidden="true" />
      <span className="absolute right-0 top-0">
        <Contador n={cantidad} />
      </span>
    </button>
  )
}
