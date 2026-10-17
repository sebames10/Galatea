import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Gift, LogIn } from 'lucide-react'
import { BottomNav, SideNav } from './Navigation'
import { Wordmark } from './Wordmark'
import { MesaChip } from './MesaChip'
import { OrderSummary } from './OrderSummary'
import { ComoFunciona } from './ComoFunciona'

/**
 * Layout principal.
 *
 * Móvil (< 768): el scroll lo hace el documento, así el navegador puede
 * ocultar su barra de direcciones y la app ocupa toda la pantalla. El
 * encabezado es sticky arriba y la barra inferior es fixed abajo; <main>
 * reserva abajo el alto de esa barra para que no tape contenido.
 *
 * Tablet y escritorio (≥ 768): alto fijo de pantalla (100dvh) y scroll
 * interno en <main> y en el <aside>.
 *
 *  Móvil  (<768)      Tablet (768–1023)       Escritorio (≥1024)
 *  ┌────────────┐     ┌──┬──────────────┐     ┌──────┬─────────────┬────────┐
 *  │ header ▲   │     │  │              │     │      │             │        │
 *  ├────────────┤     │R │    main      │     │ side │    main     │ aside  │
 *  │   main     │     │a │  (scroll)    │     │ nav  │  (scroll)   │ pedido │
 *  │ (scroll de │     │i │              │     │      │             │        │
 *  │  página)   │     │l │              │     │      │             │        │
 *  ├────────────┤     │  │              │     │      │             │        │
 *  │ bottom nav▼│     │  │              │     │      │             │        │
 *  └────────────┘     └──┴──────────────┘     └──────┴─────────────┴────────┘
 */
export function AppShell() {
  const { pathname } = useLocation()

  // Cada vista nueva empieza arriba (en móvil scrollea la página; en escritorio, <main>)
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('contenido')?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="md:grid md:h-full md:grid-cols-[88px_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[248px_minmax(0,1fr)_340px] xl:grid-cols-[272px_minmax(0,1fr)_380px]">
      <MobileHeader />
      <SideNav />

      <main
        id="contenido"
        className="safe-x pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] max-md:overflow-x-clip md:app-scroll md:pb-0 md:pt-[env(safe-area-inset-top)]"
      >
        {/* key: re-dispara la animación de entrada al cambiar de vista */}
        <div key={pathname} className="view-enter mx-auto w-full max-w-6xl px-4 pb-8 pt-4 md:px-8 md:pb-12 md:pt-8 xl:px-12">
          <Outlet />
        </div>
      </main>

      <aside
        aria-label={pathname === '/pedido' ? 'Cómo funciona el pedido' : 'Tu pedido'}
        className="app-scroll safe-top hidden border-l border-line/60 bg-surface/40 p-6 lg:block"
      >
        {pathname === '/pedido' ? <ComoFunciona /> : <OrderSummary compact />}
      </aside>

      <BottomNav />
    </div>
  )
}

/** Cabecera solo en móvil: en tablet y escritorio su contenido pasa a la navegación lateral. */
function MobileHeader() {
  return (
    <header className="safe-top safe-x sticky top-0 z-30 border-b border-line/60 bg-bg/95 backdrop-blur md:hidden">
      <div className="grid h-[var(--header-h)] grid-cols-[1fr_auto_1fr] items-center px-2">
        <div className="justify-self-start pl-2">
          <MesaChip />
        </div>
        <Link to="/" aria-label="Galatea, ir al inicio" className="text-sm">
          <Wordmark />
        </Link>
        <div className="flex justify-self-end">
          <Link to="/bienvenida" aria-label="Descuento de bienvenida" className="grid size-11 place-items-center rounded-full text-gold active:bg-elevated">
            <Gift size={20} aria-hidden="true" />
          </Link>
          <Link to="/staff" aria-label="Ingreso del personal" className="grid size-11 place-items-center rounded-full text-muted active:bg-elevated">
            <LogIn size={20} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  )
}
