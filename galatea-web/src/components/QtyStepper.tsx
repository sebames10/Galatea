import { Minus, Plus } from 'lucide-react'

interface Props {
  nombre: string
  cantidad: number
  onMas: () => void
  onMenos: () => void
  disabled?: boolean
}

/** Selector de cantidad con botones de 44px. */
export function QtyStepper({ nombre, cantidad, onMas, onMenos, disabled }: Props) {
  if (cantidad === 0) {
    return (
      <button type="button" onClick={onMas} disabled={disabled} className="btn-primary min-h-11 px-4" aria-label={`Agregar ${nombre}`}>
        <Plus size={18} aria-hidden="true" />
        Agregar
      </button>
    )
  }
  return (
    <div className="inline-flex items-center rounded-xl border border-gold/60 bg-gold/10">
      <button type="button" onClick={onMenos} className="grid size-11 place-items-center text-gold active:opacity-70" aria-label={`Quitar un ${nombre}`}>
        <Minus size={18} aria-hidden="true" />
      </button>
      <span className="min-w-6 text-center font-bold text-ink" aria-live="polite">
        {cantidad}
      </span>
      <button type="button" onClick={onMas} className="grid size-11 place-items-center text-gold active:opacity-70" aria-label={`Agregar otro ${nombre}`}>
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
