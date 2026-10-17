import { NavLink } from 'react-router-dom'
import { Gift, LogIn } from 'lucide-react'
import { navItems } from './nav'
import { Wordmark } from './Wordmark'
import { useApp } from '../store'

function Badge({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span className="absolute -right-2 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-on-gold">
      {n}
    </span>
  )
}

/**
 * Móvil (< 768px): barra inferior fija con 5 destinos. Al ser fixed con bottom: 0
 * acompaña el borde real de la pantalla cuando el navegador oculta su barra.
 */
export function BottomNav() {
  const { totalItems } = useApp()
  return (
    <nav aria-label="Principal" className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/95 backdrop-blur md:hidden">
      <ul className="grid h-[var(--bottom-nav-h)] grid-cols-5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wide transition-colors duration-150 ${
                  isActive ? 'text-gold' : 'text-muted active:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                    {to === '/pedido' && <Badge n={totalItems} />}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Tablet (768–1023px): rail vertical con íconos y etiqueta corta.
 * Escritorio (≥ 1024px): sidebar con logotipo, etiquetas completas y accesos secundarios.
 */
export function SideNav() {
  const { totalItems } = useApp()
  return (
    <nav
      aria-label="Principal"
      className="safe-top hidden h-full flex-col border-r border-line/60 bg-surface/40 md:flex lg:px-4"
    >
      <div className="flex h-20 items-center justify-center lg:h-28">
        <span className="font-display text-3xl text-gold lg:hidden" aria-label="Galatea">
          G
        </span>
        <Wordmark className="hidden text-2xl lg:inline-flex" />
      </div>

      <ul className="flex flex-1 flex-col gap-1 px-2 lg:px-0">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors duration-150 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm ${
                  isActive ? 'bg-gold/15 text-gold' : 'text-muted hover:bg-elevated hover:text-ink'
                }`
              }
            >
              <span className="relative">
                <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                {to === '/pedido' && <Badge n={totalItems} />}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 px-2 pb-6 lg:px-0">
        <NavLink
          to="/bienvenida"
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-muted transition-colors hover:bg-elevated hover:text-ink lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm"
        >
          <Gift size={20} aria-hidden="true" />
          <span>10% off</span>
        </NavLink>
        <NavLink
          to="/staff"
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-muted transition-colors hover:bg-elevated hover:text-ink lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm"
        >
          <LogIn size={20} aria-hidden="true" />
          <span>Personal</span>
        </NavLink>
      </div>
    </nav>
  )
}
