import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  volver,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Vista de detalle: botón para volver a la vista padre */
  volver?: { to: string; label: string }
  children?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        {volver && (
          <Link
            to={volver.to}
            className="-ml-1 mb-4 inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <span className="grid size-9 place-items-center rounded-full bg-elevated text-ink">
              <ArrowLeft size={18} aria-hidden="true" />
            </span>
            {volver.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
