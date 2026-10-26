// Datos de ejemplo de Experiencia Galatea (RF13, RF19).
export const modos = [
  {
    id: 'mesa',
    nombre: '',
    descripcion: 'Todos en la misma mesa. Las pistas se dicen en voz alta.',
    reglas: [
      'Cada jugador ve una palabra secreta.',
      'Uno solo es el Impostor y no la conoce.',
      'Por turnos, digan una pista sin delatarla.',
      'Voten: si atrapan al Impostor, gana la mesa.',
    ],
  },
  {
    id: 'online',
    nombre: 'Modo Online',
    descripcion: 'Contra otras mesas del restaurante, en tiempo real.',
    reglas: [
      'Creá una sala y compartí el código.',
      'Todos reciben la palabra menos el Impostor.',
      'Escriban pistas en el chat por rondas.',
      'Voten en la app: el Impostor gana si sobrevive.',
    ],
  },
  {
    id: 'individual',
    nombre: 'Modo Individual',
    descripcion: 'Para jugar solo mientras esperás.',
    reglas: [
      'Te toca un rol al azar.',
      'Leé las pistas de los jugadores virtuales.',
      'Detectá al Impostor o engañá a todos.',
      'Sumá puntos para el ranking.',
    ],
  },
] as const

// Palabras de la partida de prueba (hasta que las reparta la API)
export const palabras = ['Negroni', 'Parrilla', 'Jazz', 'Burrata', 'Catan']

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

export interface JuegoDeMesa {
  nombre: string
  jugadores: string
  duracion: string
  dificultad: 1 | 2 | 3
  descripcion: string
  disponible: boolean
}

export const juegosDeMesa: JuegoDeMesa[] = [
  { nombre: 'Catan', jugadores: '3–4', duracion: '75 min', dificultad: 2, descripcion: 'Comerciá, construí y colonizá la isla.', disponible: true },
  { nombre: 'Dixit', jugadores: '3–8', duracion: '30 min', dificultad: 1, descripcion: 'Contá historias con cartas ilustradas.', disponible: true },
  { nombre: 'Codenames', jugadores: '4–8', duracion: '20 min', dificultad: 1, descripcion: 'Espías, pistas de una palabra y mucha risa.', disponible: false },
  { nombre: 'Carcassonne', jugadores: '2–5', duracion: '40 min', dificultad: 2, descripcion: 'Armá el paisaje medieval pieza a pieza.', disponible: true },
  { nombre: 'Azul', jugadores: '2–4', duracion: '40 min', dificultad: 2, descripcion: 'Diseñá el mosaico más bello del palacio.', disponible: true },
  { nombre: 'Terraforming Mars', jugadores: '1–5', duracion: '120 min', dificultad: 3, descripcion: 'Convertí Marte en un planeta habitable.', disponible: true },
]

export const nivelDificultad = ['', 'Fácil', 'Media', 'Experta'] as const
