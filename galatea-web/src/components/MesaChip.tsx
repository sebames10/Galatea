import { QrCode } from 'lucide-react'
import { useApp } from '../store'

/** Muestra la mesa identificada por el QR. Sin mesa no se muestra nada. */
export function MesaChip() {
  const { mesa } = useApp()
  if (!mesa) return null
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 text-xs font-semibold text-gold">
      <QrCode size={14} aria-hidden="true" />
      Mesa {mesa.numero}
    </span>
  )
}
