import { CalendarDays, Dices, Gift, LogIn, PartyPopper, ShoppingBag, Sparkles, Tag, UtensilsCrossed, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavExtra extends NavItem {
  texto: string
  /** También va en la barra superior de tablet y escritorio */
  enBarra?: boolean
}

// Barra inferior móvil: 4 destinos + "Más". Inicio se abre desde el logotipo.
export const navPrincipal: NavItem[] = [
  { to: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/pedido', label: 'Pedido', icon: ShoppingBag },
  { to: '/reservar', label: 'Reservar', icon: CalendarDays },
  { to: '/juego', label: 'Juegos', icon: Dices },
]

// Destinos secundarios: panel "Más de Galatea" en móvil; los enBarra también arriba en escritorio
export const navMas: NavExtra[] = [
  { to: '/eventos', label: 'Eventos', icon: PartyPopper, texto: 'Shows en vivo y noches temáticas', enBarra: true },
  { to: '/recomendaciones', label: 'Recomendaciones', icon: Sparkles, texto: 'Para vos y el asistente Gala', enBarra: true },
  { to: '/promociones', label: 'Promociones', icon: Tag, texto: '10% de bienvenida y más', enBarra: true },
  //{ to: '/bienvenida', label: 'Bienvenida', icon: Gift, texto: 'Tu cupón de 10% para la primera visita' },
  { to: '/staff', label: 'Personal', icon: LogIn, texto: 'Ingreso del personal del local' },
]

export const estaActivo = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))
