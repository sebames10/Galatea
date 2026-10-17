// Cliente de la API de Galatea (galatea-api).
// En desarrollo Vite redirige /api a http://localhost:3000 (vite.config.ts);
// en producción se puede apuntar a otro host con VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

const TOKEN_CLIENTE = 'galatea:token-cliente'
const TOKEN_PERSONAL = 'galatea:token-personal'
const HUELLA = 'galatea:huella'

/** Error con el mensaje en español que devuelve la API, listo para mostrar. */
export class ApiError extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

type Acceso = 'publico' | 'cliente' | 'personal'

async function pedir<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; acceso?: Acceso } = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, acceso = 'publico' } = opciones
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  if (acceso === 'cliente') headers.Authorization = `Bearer ${await tokenCliente()}`
  if (acceso === 'personal') {
    const token = localStorage.getItem(TOKEN_PERSONAL)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(BASE + ruta, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Probá de nuevo en un momento.')
  }

  // Token de cliente vencido o de una base que se reseteó: se identifica de nuevo una sola vez.
  if (res.status === 401 && acceso === 'cliente' && !reintentando) {
    localStorage.removeItem(TOKEN_CLIENTE)
    reintentando = true
    try {
      return await pedir<T>(ruta, opciones)
    } finally {
      reintentando = false
    }
  }

  const datos = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, datos?.mensaje ?? 'Algo salió mal. Probá de nuevo.')
  return datos as T
}
let reintentando = false

// ---------------------------------------------------------------------
// Identidad del cliente (sin registro)
// ---------------------------------------------------------------------

/** Identificador del dispositivo. Hasta integrar FingerprintJS es un id aleatorio guardado en el navegador. */
function huella() {
  let h = localStorage.getItem(HUELLA)
  if (!h) {
    h = crypto.randomUUID()
    localStorage.setItem(HUELLA, h)
  }
  return h
}

let identificando: Promise<string> | null = null

/** Token del cliente; la primera vez se pide a la API con la huella del dispositivo. */
async function tokenCliente(): Promise<string> {
  const guardado = localStorage.getItem(TOKEN_CLIENTE)
  if (guardado) return guardado
  identificando ??= pedir<{ token: string; cliente: Cliente }>('/clientes/identificar', { metodo: 'POST', cuerpo: { huella: huella() } })
    .then(({ token }) => {
      localStorage.setItem(TOKEN_CLIENTE, token)
      return token
    })
    .finally(() => {
      identificando = null
    })
  return identificando
}

export interface Cliente {
  id: number
  alias: string | null
  nombre: string | null
  telefono: string | null
  registrado: boolean
  cuponBienvenida: { codigo: string; porcentaje: number; usado: boolean } | null
  puntos: number | null
}

export const clientes = {
  yo: () => pedir<Cliente>('/clientes/yo', { acceso: 'cliente' }),
  /** Nombre y teléfono → cupón del 10 %. Si el teléfono ya existía, la API fusiona los perfiles y devuelve otro token. */
  registrar: async (nombre: string, telefono: string) => {
    const r = await pedir<{ token: string; fusionado: boolean; cliente: Cliente }>('/clientes/registro', {
      metodo: 'POST',
      cuerpo: { nombre, telefono },
      acceso: 'cliente',
    })
    localStorage.setItem(TOKEN_CLIENTE, r.token)
    return r.cliente
  },
}

// ---------------------------------------------------------------------
// Menú
// ---------------------------------------------------------------------

export type Sector = 'cocina' | 'barra'

export interface Presentacion {
  id: number
  nombre: string
  precio: number
  orden: number
  disponible: boolean
}

export interface Producto {
  id: number
  idCategoriaMenu: number
  nombre: string
  descripcion: string | null
  foto: string | null
  activo: boolean
  agotado: boolean
  etiquetas: string[]
  presentaciones: Presentacion[]
}

export interface CategoriaMenu {
  id: number
  nombre: string
  sector: Sector
  orden: number
  productos: Producto[]
}

export const menu = {
  carta: () => pedir<CategoriaMenu[]>('/menu'),
}

// ---------------------------------------------------------------------
// Mesa, pedidos y cuenta (cliente con el QR de la mesa)
// ---------------------------------------------------------------------

export type EstadoPedido = 'pendiente' | 'preparacion' | 'listo' | 'entregado'

export interface Mesa {
  id: number
  numero: number
  capacidad: number
}

export interface Pedido {
  id: number
  idCuenta: number
  mesa: number
  sector: Sector
  canal: 'qr' | 'asistido'
  estado: EstadoPedido
  fechaHora: string
  items: { idDetalle: number; producto: string; presentacion: string; cantidad: number; precioUnitario: number; observacion: string | null }[]
}

export interface Cuenta {
  id: number
  mesa: number
  estado: 'abierta' | 'cerrada'
  fechaApertura: string
  fechaSolicitudCuenta: string | null
  subtotal: number
  descuento: number
  total: number
  pedidos: Pedido[]
}

const qr = (codigo: string) => `/mesas/qr/${encodeURIComponent(codigo)}`

export const salon = {
  mesaPorQr: (codigo: string) => pedir<Mesa>(qr(codigo)),
  cuenta: (codigo: string) => pedir<Cuenta | null>(`${qr(codigo)}/cuenta`, { acceso: 'cliente' }),
  solicitarCuenta: (codigo: string) => pedir<Cuenta>(`${qr(codigo)}/solicitar-cuenta`, { metodo: 'POST', acceso: 'cliente' }),
  pedir: (codigoQR: string, items: { idPresentacion: number; cantidad: number }[]) =>
    pedir<{ idCuenta: number; pedidos: Pedido[]; total: number }>('/pedidos/qr', {
      metodo: 'POST',
      cuerpo: { codigoQR, items },
      acceso: 'cliente',
    }),
}

// ---------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------

export interface Disponibilidad {
  fecha: string
  personas: number
  duracionMinutos: number
  horarios: { hora: string; disponible: boolean }[]
}

export const reservas = {
  disponibilidad: (fecha: string, personas: number) =>
    pedir<Disponibilidad>(`/reservas/disponibilidad?fecha=${fecha}&personas=${personas}`),
  crear: (fecha: string, hora: string, personas: number) =>
    pedir<{ id: number }>('/reservas', { metodo: 'POST', cuerpo: { fecha, hora, personas }, acceso: 'cliente' }),
}

// ---------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------

export interface UsuarioPersonal {
  idUsuarioInterno: number
  idEmpleado: number
  nombre: string
  cargo: string
  /** Solo viene en el login. */
  foto?: string | null
}

export const personal = {
  login: async (usuario: string, contrasena: string) => {
    const r = await pedir<{ token: string; usuario: UsuarioPersonal }>('/auth/login', {
      metodo: 'POST',
      cuerpo: { usuario, contrasena },
    })
    localStorage.setItem(TOKEN_PERSONAL, r.token)
    return r.usuario
  },
  /** Usuario de la sesión guardada, o null si no hay sesión o ya no es válida. */
  yo: async () => {
    if (!localStorage.getItem(TOKEN_PERSONAL)) return null
    try {
      return await pedir<UsuarioPersonal>('/auth/yo', { acceso: 'personal' })
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) localStorage.removeItem(TOKEN_PERSONAL)
      throw e
    }
  },
  salir: () => localStorage.removeItem(TOKEN_PERSONAL),
}
