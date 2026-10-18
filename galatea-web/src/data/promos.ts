import type { Producto } from '../api'

// Promociones de ejemplo (tomadas de GalateaLovable) hasta que la API las administre.
export interface Promo {
  id: string
  titulo: string
  descripcion: string
  /** AAAA-MM-DD */
  hasta: string
  condiciones: string
  insignia: string
  /** Pestaña del menú que abre "Ver productos" */
  tipo: 'plato' | 'trago'
  /** Productos a los que se aplica el descuento (por categoría de la carta o por etiqueta) */
  aplica: { categorias?: string[]; etiqueta?: string }
}

export const promos: Promo[] = [
  {
    id: 'happy-hour',
    titulo: 'Happy hour 2x1',
    descripcion: 'Tragos seleccionados y entradas para compartir al 2x1.',
    hasta: '2026-12-31',
    condiciones: 'Lunes a jueves de 18 a 20 h. No acumulable.',
    insignia: '2x1',
    tipo: 'trago',
    aplica: { categorias: ['Tragos', 'Para compartir', 'Para picar'] },
  },
  {
    id: 'martes-pizzetas',
    titulo: 'Martes de pizzetas',
    descripcion: '20% off en todas las pizzetas los martes.',
    hasta: '2026-11-30',
    condiciones: 'Solo martes, consumo en el local.',
    insignia: '-20%',
    tipo: 'plato',
    aplica: { categorias: ['Pizzetas'] },
  },
  {
    id: 'veggie',
    titulo: 'Semana verde',
    descripcion: '15% off en platos vegetarianos.',
    hasta: '2026-10-31',
    condiciones: 'Válido hasta agotar stock.',
    insignia: '-15%',
    tipo: 'plato',
    aplica: { etiqueta: 'Vegetariano' },
  },
]

export const promoPorId = (id: string | null) => promos.find((p) => p.id === id)

export function aplicaPromo(promo: Promo, categoria: string, p: Producto) {
  const { categorias, etiqueta } = promo.aplica
  return (!categorias || categorias.includes(categoria)) && (!etiqueta || p.etiquetas.includes(etiqueta))
}
