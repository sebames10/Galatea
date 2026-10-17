import { RotateCw, WifiOff } from 'lucide-react'

/** Error al traer datos de la API, con botón para reintentar. */
export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 px-4 py-8 text-center">
      <WifiOff size={28} className="text-danger" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted">{mensaje}</p>
      {onReintentar && (
        <button type="button" className="btn-ghost" onClick={onReintentar}>
          <RotateCw size={16} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  )
}
