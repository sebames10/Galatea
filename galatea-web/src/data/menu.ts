import type { CategoriaMenu, Producto } from '../api'

export const formatoPrecio = (n: number) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(n)

// Recomendados de la portada hasta que existan las recomendaciones con IA: [categoría, producto].
const DESTACADOS: [string, string][] = [
  ['Hamburguesas', 'Hamb Galatea'],
  ['Milanesas', 'Galatea'],
  ['Pizzetas', 'Quijote'],
  ['Para compartir', 'Picada 3'],
  ['Tragos', 'Negroni'],
  ['Tragos', 'Aperol spritz'],
]

export function destacados(carta: CategoriaMenu[]): (Producto & { categoria: string })[] {
  return DESTACADOS.flatMap(([cat, nombre]) => {
    const p = carta.find((c) => c.nombre === cat)?.productos.find((x) => x.nombre === nombre)
    return p && !p.agotado ? [{ ...p, categoria: cat }] : []
  })
}

/** Precio que se muestra en la tarjeta: el único, o "desde" el más barato. */
export function precioDesde(p: Producto) {
  return Math.min(...p.presentaciones.map((pr) => pr.precio))
}

export type ProductoConCategoria = Producto & { categoria: string; sector: CategoriaMenu['sector'] }

export function buscarProducto(carta: CategoriaMenu[], id: number): ProductoConCategoria | undefined {
  for (const c of carta) {
    const p = c.productos.find((x) => x.id === id)
    if (p) return { ...p, categoria: c.nombre, sector: c.sector }
  }
}

/** "Combina bien con": a un plato le va un trago, a un postre un trago y a la barra algo para picar. */
export function maridaje(carta: CategoriaMenu[], p: ProductoConCategoria): Producto[] {
  const objetivo = p.sector === 'barra' ? ['Para picar', 'Para compartir'] : p.categoria === 'Postres' ? ['Tragos'] : ['Tragos', 'Cervezas']
  return carta
    .filter((c) => objetivo.includes(c.nombre))
    .flatMap((c) => c.productos)
    .filter((x) => x.id !== p.id && !x.agotado)
    .slice(0, 6)
}

// Nombres internos de presentación → lo que ve el cliente. "Estándar" es el único precio: no se muestra.
const NOMBRES_PRESENTACION: Record<string, string | null> = { Estándar: null, p1: 'Para uno', p2: 'Para compartir' }

export const nombrePresentacion = (nombre: string) => (nombre in NOMBRES_PRESENTACION ? NOMBRES_PRESENTACION[nombre] : nombre)
