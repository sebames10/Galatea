/** Logotipo en texto con los chevrones dorados del logo original. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-flex flex-col items-center leading-none ${className}`} aria-label="Galatea">
      <svg viewBox="0 0 100 8" className="h-1.5 w-3/4 text-gold" aria-hidden="true">
        <path d="M2 7 L50 1 L98 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-logo text-[1.6em] tracking-[0.12em] text-ink" aria-hidden="true">
        GALATEA
      </span>
      <svg viewBox="0 0 100 8" className="h-1.5 w-3/4 text-gold" aria-hidden="true">
        <path d="M2 1 L50 7 L98 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}
