import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Lock, LogOut } from 'lucide-react'
import { personal, type UsuarioPersonal } from '../api'
import { Wordmark } from '../components/Wordmark'

/** Ingreso de Cocinero, Bartender, Mozo y Administrador (RF39). Los paneles llegan en la Iteración 2. */
export function Staff() {
  const [verClave, setVerClave] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [sesion, setSesion] = useState<UsuarioPersonal | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya había una sesión guardada y sigue siendo válida, se retoma
  useEffect(() => {
    personal.yo().then(setSesion).catch(() => {})
  }, [])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      setSesion(await personal.login(usuario, clave))
      setClave('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const salir = () => {
    personal.salir()
    setSesion(null)
  }

  if (sesion) {
    return (
      <div className="grid min-h-[calc(var(--visible-h)-3rem)] place-items-center py-6 md:min-h-[70vh]">
        <section className="card flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center md:p-8">
          <Wordmark className="text-2xl" />
          <p className="eyebrow">{sesion.cargo}</p>
          <h1 className="text-2xl">Hola, {sesion.nombre.split(' ')[0]}</h1>
          <p className="text-sm text-muted">Tu sesión está iniciada. Los paneles de cocina, barra, salón y administración llegan en la próxima iteración.</p>
          <button type="button" className="btn-ghost w-full" onClick={salir}>
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </section>
      </div>
    )
  }

  return (
    // Centrado en la pantalla visible (en móvil la página ya no tiene alto fijo)
    <div className="grid min-h-[calc(var(--visible-h)-3rem)] place-items-center py-6 md:min-h-[70vh]">
      <form onSubmit={enviar} className="card flex w-full max-w-sm flex-col gap-5 p-6 md:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark className="text-2xl" />
          <p className="eyebrow flex items-center gap-1.5">
            <Lock size={12} aria-hidden="true" /> Personal
          </p>
          <h1 className="text-2xl">Iniciar sesión</h1>
        </div>
        <div>
          <label htmlFor="usuario" className="field-label">
            Usuario
          </label>
          <input
            id="usuario"
            className="field"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </div>
        <div>
          <label htmlFor="clave" className="field-label">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="clave"
              className="field pr-12"
              type={verClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verClave}
            >
              {verClave ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
