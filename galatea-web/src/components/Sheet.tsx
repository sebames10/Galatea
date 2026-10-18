import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Panel que sube desde abajo en móvil y entra por la derecha en tablet y escritorio.
 * Se cierra con el fondo, con la X o con Escape. Mientras está abierto la página no scrollea.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', alPresionar)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', alPresionar)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[2rem] border border-line/60 bg-surface shadow-soft md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-[2rem]"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" />
            <div className="flex items-center justify-between px-5 pb-2 pt-4 md:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
              <h2 className="text-2xl">{title}</h2>
              <button type="button" aria-label="Cerrar" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-elevated text-ink transition-colors hover:bg-line">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
