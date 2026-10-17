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
