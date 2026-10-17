/** Horarios en que se puede reservar (mediodía y noche). */
export const HORARIOS = ['12:00', '12:30', '13:00', '13:30', '14:00', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];

/** Regla 8.1 del documento: duración estimada según la cantidad de personas. */
export function duracionMinutos(personas: number): number {
  if (personas <= 2) return 60;
  if (personas <= 4) return 90;
  if (personas <= 8) return 150;
  return 180;
}

export interface MesaLibre {
  idMesa: number;
  numero: number;
  capacidad: number;
}

/**
 * Elige mesas para un grupo:
 * 1. la mesa más chica donde entren todos (no gastar una de 8 en 2 personas);
 * 2. si no hay ninguna, juntar las más grandes, hasta 3 mesas.
 * Devuelve null si no alcanza.
 */
export function elegirMesas(libres: MesaLibre[], personas: number): MesaLibre[] | null {
  const ordenadas = [...libres].sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero);
  const una = ordenadas.find((m) => m.capacidad >= personas);
  if (una) return [una];

  const elegidas: MesaLibre[] = [];
  let lugares = 0;
  for (const mesa of [...ordenadas].reverse()) {
    if (elegidas.length === 3) break;
    elegidas.push(mesa);
    lugares += mesa.capacidad;
    if (lugares >= personas) return elegidas;
  }
  return null;
}
