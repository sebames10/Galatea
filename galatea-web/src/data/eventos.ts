// Agenda de ejemplo (tomada de GalateaLovable) hasta que la API tenga eventos.
// foto: ruta en public/ sin extensión; existe en .webp y .jpg (ver components/FotoLocal.tsx).

export interface Evento {
  /** AAAA-MM-DD: un evento por día */
  fecha: string
  titulo: string
  tipo: string
  hora: string
  descripcion: string
  foto: string
  precio?: string
}

const SHOW = '/eventos/evento-1024'
const NEGRONI = '/eventos/negroni-1024'
const JUEGOS = '/juegos/juegos-1024'
const SALON = '/hero/galatea-hero-1024'

export const eventos: Evento[] = [
  {
    fecha: '2026-10-22',
    titulo: 'Jazz en penumbra',
    tipo: 'Show en vivo',
    hora: '21:30',
    descripcion: 'Cuarteto de jazz con standards y composiciones propias. Ambiente íntimo, velas y carta de tragos de autor.',
    foto: SHOW,
    precio: 'Entrada libre',
  },
  {
    fecha: '2026-10-30',
    titulo: 'Noche de Halloween negroni',
    tipo: 'Noche temática',
    hora: '20:00',
    descripcion: 'Negronis intervenidos, música oscura y disfraces bienvenidos. Premio al mejor disfraz.',
    foto: NEGRONI,
  },
  {
    fecha: '2026-11-05',
    titulo: 'Torneo de Catan',
    tipo: 'Juegos',
    hora: '19:30',
    descripcion: 'Torneo abierto de Catan por parejas. Inscripción en la barra o al reservar.',
    foto: JUEGOS,
    precio: '$ 300 por pareja',
  },
  {
    fecha: '2026-11-14',
    titulo: 'Bossa & vino',
    tipo: 'Show en vivo',
    hora: '21:00',
    descripcion: 'Dúo de bossa nova con maridaje de tres vinos uruguayos.',
    foto: SHOW,
    precio: '$ 650 con maridaje',
  },
  {
    fecha: '2026-11-21',
    titulo: 'Cena a ciegas del chef',
    tipo: 'Noche temática',
    hora: '20:30',
    descripcion: 'Menú sorpresa de cinco pasos diseñado por nuestro chef. Cupos limitados.',
    foto: SALON,
    precio: '$ 1.900',
  },
  {
    fecha: '2026-12-04',
    titulo: 'Experiencia Galatea: noche Impostor',
    tipo: 'Juegos',
    hora: '21:00',
    descripcion: 'Gran partida del juego Impostor con toda la sala. Premios para los mejores detectives.',
    foto: JUEGOS,
  },
]

export const eventoDelDia = (fecha: string) => eventos.find((e) => e.fecha === fecha)

/** "AAAA-MM-DD" → Date al mediodía local (evita corrimientos de día por zona horaria). */
export const desdeIso = (fecha: string) => new Date(`${fecha}T12:00`)
