import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import QrScanner from 'qr-scanner'
import { ScanLine } from 'lucide-react'
import { useApp } from '../store'
import { Sheet } from './Sheet'

/**
 * Lee el QR de la mesa con la cámara. El QR impreso es una URL con ?mesa=<código>;
 * también se acepta el código suelto (GAL-M07-B3X7), que va impreso debajo del QR
 * por si la cámara no está disponible.
 */
export function codigoDeMesa(texto: string): string | null {
  const limpio = texto.trim()
  try {
    const codigo = new URL(limpio).searchParams.get('mesa')
    if (codigo) return codigo
  } catch {
    // no es una URL: puede ser el código solo
  }
  return /^GAL-M\d{2}-[A-Z0-9]{4}$/i.test(limpio) ? limpio.toUpperCase() : null
}

/** Contenido del panel "Escanear mesa". Se monta al abrir el panel y apaga la cámara al cerrarlo. */
export function EscanerMesa({ onListo }: { onListo: () => void }) {
  const { elegirMesa, errorMesa } = useApp()
  const video = useRef<HTMLVideoElement>(null)
  // La cámara solo se habilita en HTTPS (o localhost)
  const [sinCamara, setSinCamara] = useState<string | null>(
    window.isSecureContext ? null : 'La cámara necesita una conexión segura (HTTPS). Ingresá el código impreso debajo del QR.',
  )
  const [aviso, setAviso] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [validando, setValidando] = useState(false)
  const ocupado = useRef(false)

  const probar = async (texto: string) => {
    if (ocupado.current) return
    const c = codigoDeMesa(texto)
    if (!c) {
      setAviso('Ese QR no es de una mesa de Galatea.')
      return
    }
    ocupado.current = true
    setValidando(true)
    setAviso(null)
    const ok = await elegirMesa(c)
    setValidando(false)
    ocupado.current = false
    if (ok) {
      navigator.vibrate?.(60)
      onListo()
    }
  }
  // El escáner guarda el callback del primer render; con la ref siempre llama al actual
  const probarRef = useRef(probar)
  probarRef.current = probar

  useEffect(() => {
    if (sinCamara || !video.current) return
    const escaner = new QrScanner(video.current, (r) => void probarRef.current(r.data), {
      returnDetailedScanResult: true,
      preferredCamera: 'environment',
      maxScansPerSecond: 5,
    })
    escaner.start().catch((e: unknown) => {
      const permiso = String(e).includes('NotAllowed') || String(e).toLowerCase().includes('permission')
      setSinCamara(
        permiso
          ? 'No diste permiso para usar la cámara. Podés habilitarlo en el navegador o ingresar el código impreso debajo del QR.'
          : 'No encontramos una cámara. Ingresá el código impreso debajo del QR.',
      )
    })
    return () => escaner.destroy()
  }, [sinCamara])

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void probar(codigo)
  }

  const error = aviso ?? errorMesa

  return (
    <div className="flex flex-col gap-5">
      {!sinCamara ? (
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
          <video ref={video} className="size-full object-cover" muted playsInline />
          {/* Marco de enfoque */}
          <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-2 border-gold/90 shadow-[0_0_0_100vmax_rgba(4,15,31,0.45)]" aria-hidden="true" />
          {validando && (
            <p role="status" className="absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-gold">
              Buscando tu mesa…
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-line/60 px-4 py-3 text-sm text-muted">{sinCamara}</p>
      )}

      {!sinCamara && <p className="text-center text-sm text-muted">Apuntá al código QR que está en el centro de la mesa.</p>}

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={enviar} className="flex flex-col gap-2">
        <label htmlFor="codigo-mesa" className="text-sm text-muted">
          ¿No lo lee? Escribí el código que está debajo del QR
        </label>
        <div className="flex gap-2">
          <input
            id="codigo-mesa"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="GAL-M07-B3X7"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 uppercase text-ink placeholder:normal-case placeholder:text-muted/70 focus:border-gold"
          />
          <button type="submit" className="btn-primary shrink-0 px-5" disabled={validando || !codigo.trim()}>
            Listo
          </button>
        </div>
      </form>
    </div>
  )
}

/** Botón que abre la cámara para identificar la mesa. */
export function BotonEscanearMesa({ className = 'btn-primary' }: { className?: string }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])
  return (
    <>
      <button type="button" className={`${className} inline-flex items-center justify-center gap-2`} onClick={() => setAbierto(true)}>
        <ScanLine size={18} aria-hidden="true" />
        Escanear QR de la mesa
      </button>
      <Sheet open={abierto} onClose={cerrar} title="Tu mesa">
        <EscanerMesa onListo={cerrar} />
      </Sheet>
    </>
  )
}
