// Datos de ejemplo de Experiencia Galatea (RF13, RF19).
export const modos = [
  { id: 'mesa', nombre: 'Modo Mesa', descripcion: 'Todos en la misma mesa. Las pistas se dicen en voz alta.' },
  { id: 'online', nombre: 'Modo Online', descripcion: 'Contra otras mesas del restaurante, en tiempo real.' },
  { id: 'individual', nombre: 'Modo Individual', descripcion: 'Para jugar solo mientras esperás.' },
] as const

export type ModoId = (typeof modos)[number]['id']

export const ranking = {
  noche: [
    { nombre: 'Mesa 4', puntos: 320 },
    { nombre: 'Lucía', puntos: 280 },
    { nombre: 'Mesa 12', puntos: 255 },
    { nombre: 'Martín', puntos: 190 },
    { nombre: 'Mesa 7', puntos: 160 },
  ],
  mes: [
    { nombre: 'Mesa 12', puntos: 2410 },
    { nombre: 'Sofía', puntos: 2180 },
    { nombre: 'Mesa 4', puntos: 1960 },
    { nombre: 'Diego', puntos: 1540 },
    { nombre: 'Lucía', puntos: 1320 },
  ],
  historico: [
    { nombre: 'Sofía', puntos: 9820 },
    { nombre: 'Mesa 12', puntos: 8710 },
    { nombre: 'Diego', puntos: 7450 },
    { nombre: 'Mesa 4', puntos: 6900 },
    { nombre: 'Martín', puntos: 5120 },
  ],
}

export type Periodo = keyof typeof ranking
