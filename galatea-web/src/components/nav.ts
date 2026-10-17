import { CalendarDays, Dices, House, ShoppingBag, UtensilsCrossed, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Máximo 5 destinos en la barra inferior móvil
export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/reservar', label: 'Reservar', icon: CalendarDays },
  { to: '/pedido', label: 'Pedido', icon: ShoppingBag },
  { to: '/juego', label: 'Juego', icon: Dices },
]
