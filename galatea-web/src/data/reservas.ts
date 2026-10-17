// Regla 8.1 del documento: duración estimada según la cantidad de personas (la API usa la misma).
export function duracionEstimada(personas: number) {
  if (personas <= 2) return 60
  if (personas <= 4) return 90
  if (personas <= 8) return 150
  return 180
}

export function sumarMinutos(hora: string, minutos: number) {
  const [h, m] = hora.split(':').map(Number)
  const total = (h * 60 + m + minutos) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Fecha local como AAAA-MM-DD (lo que espera la API). */
export function fechaIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
