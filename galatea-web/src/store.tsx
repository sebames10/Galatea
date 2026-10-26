import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { menu, salon, type CategoriaMenu, type Presentacion, type Producto } from './api'

export interface LineaPedido {
  producto: Producto
  presentacion: Presentacion
  cantidad: number
  /** Nota para la cocina o la barra (ej. "sin cebolla"); va como observación del detalle */
  nota: string
}

/** Mesa identificada por el QR (?mesa=GAL-M07-B3X7). */
export interface MesaQr {
  codigo: string
  numero: number
}

interface AppState {
  carta: CategoriaMenu[]
  cargandoCarta: boolean
  errorCarta: string | null
  recargarCarta: () => void

  /** null si el Cliente no está en el local */
  mesa: MesaQr | null
  errorMesa: string | null
  /** Valida el código con la API; devuelve false y deja el motivo en errorMesa si no es una mesa. */
  elegirMesa: (codigo: string) => Promise<boolean>

  carrito: LineaPedido[]
  cantidad: (idPresentacion: number) => number
  agregar: (idPresentacion: number) => void
  quitar: (idPresentacion: number) => void
  anotar: (idPresentacion: number, nota: string) => void
  vaciar: () => void
  totalItems: number
  total: number

  /** Envía el carrito a cocina y barra (la API lo divide por sector). */
  confirmarPedido: () => Promise<void>
  /** Ids de los pedidos que mandó este dispositivo en la cuenta abierta, para seguirlos. */
  pedidosEnviados: number[]
  olvidarPedidos: () => void
}

const Ctx = createContext<AppState | null>(null)

const MESA_KEY = 'galatea:mesa'
const PEDIDOS_KEY = 'galatea:pedidos'

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = sessionStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [carta, setCarta] = useState<CategoriaMenu[]>([])
  const [cargandoCarta, setCargandoCarta] = useState(true)
  const [errorCarta, setErrorCarta] = useState<string | null>(null)
  const [mesa, setMesa] = useState<MesaQr | null>(() => leer(MESA_KEY, null))
  const [errorMesa, setErrorMesa] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [notas, setNotas] = useState<Record<number, string>>({})
  const [pedidosEnviados, setPedidosEnviados] = useState<number[]>(() => leer(PEDIDOS_KEY, []))

  const recargarCarta = useCallback(() => {
    setCargandoCarta(true)
    setErrorCarta(null)
    menu
      .carta()
      .then(setCarta)
      .catch((e: Error) => setErrorCarta(e.message))
      .finally(() => setCargandoCarta(false))
  }, [])

  useEffect(recargarCarta, [recargarCarta])

  const elegirMesa = useCallback(async (codigo: string) => {
    setErrorMesa(null)
    try {
      const m = await salon.mesaPorQr(codigo)
      // Otra mesa: los pedidos que se venían siguiendo son de otra cuenta
      if (leer<MesaQr | null>(MESA_KEY, null)?.codigo !== codigo) {
        sessionStorage.removeItem(PEDIDOS_KEY)
        setPedidosEnviados([])
      }
      const nueva = { codigo, numero: m.numero }
      sessionStorage.setItem(MESA_KEY, JSON.stringify(nueva))
      setMesa(nueva)
      return true
    } catch (e) {
      setErrorMesa((e as Error).message)
      return false
    }
  }, [])

  // El QR de la mesa abre la app con ?mesa=<código>; se resuelve una vez y se saca de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codigo = params.get('mesa')
    if (!codigo) return
    params.delete('mesa')
    const resto = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (resto ? `?${resto}` : '') + window.location.hash)
    void elegirMesa(codigo)
  }, [elegirMesa])

  const presentaciones = useMemo(() => {
    const m = new Map<number, { producto: Producto; presentacion: Presentacion }>()
    for (const c of carta) for (const p of c.productos) for (const pr of p.presentaciones) m.set(pr.id, { producto: p, presentacion: pr })
    return m
  }, [carta])

  const confirmarPedido = useCallback(async () => {
    if (!mesa) throw new Error('Escaneá el QR de tu mesa para pedir.')
    const items = Object.entries(cantidades)
      .filter(([, c]) => c > 0)
      .map(([id, cantidad]) => ({ idPresentacion: Number(id), cantidad, observacion: notas[Number(id)]?.trim() || undefined }))
    const r = await salon.pedir(mesa.codigo, items)
    setCantidades({})
    setNotas({})
    setPedidosEnviados((ant) => {
      const ids = [...ant, ...r.pedidos.map((p) => p.id)]
      sessionStorage.setItem(PEDIDOS_KEY, JSON.stringify(ids))
      return ids
    })
    // El stock pudo cambiar ("Agotado por hoy"): se refresca la carta en segundo plano
    recargarCarta()
  }, [mesa, cantidades, notas, recargarCarta])

  const olvidarPedidos = useCallback(() => {
    sessionStorage.removeItem(PEDIDOS_KEY)
    setPedidosEnviados([])
  }, [])

  const value = useMemo<AppState>(() => {
    const carrito = Object.entries(cantidades)
      .filter(([id, c]) => c > 0 && presentaciones.has(Number(id)))
      .map(([id, cantidad]) => ({ ...presentaciones.get(Number(id))!, cantidad, nota: notas[Number(id)] ?? '' }))
    return {
      carta,
      cargandoCarta,
      errorCarta,
      recargarCarta,
      mesa,
      errorMesa,
      elegirMesa,
      carrito,
      cantidad: (id) => cantidades[id] ?? 0,
      agregar: (id) => setCantidades((c) => ({ ...c, [id]: Math.min(20, (c[id] ?? 0) + 1) })),
      quitar: (id) => setCantidades((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) })),
      anotar: (id, nota) => setNotas((n) => ({ ...n, [id]: nota })),
      vaciar: () => {
        setCantidades({})
        setNotas({})
      },
      totalItems: carrito.reduce((s, l) => s + l.cantidad, 0),
      total: carrito.reduce((s, l) => s + l.cantidad * l.presentacion.precio, 0),
      confirmarPedido,
      pedidosEnviados,
      olvidarPedidos,
    }
  }, [carta, cargandoCarta, errorCarta, recargarCarta, mesa, errorMesa, elegirMesa, cantidades, notas, presentaciones, confirmarPedido, pedidosEnviados, olvidarPedidos])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
