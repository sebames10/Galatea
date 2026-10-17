/**
 * Los cuatro cargos que el sistema reconoce por nombre. Cualquier otro
 * cargo (Bachero, Portero, Jardinero...) es solo para el registro de
 * personal: no puede tener usuario ni iniciar sesión.
 */
export const CARGO = {
  ADMIN: 'Administrador',
  MOZO: 'Mozo',
  COCINERO: 'Cocinero',
  BARTENDER: 'Bartender',
} as const;

export type CargoSistema = (typeof CARGO)[keyof typeof CARGO];

export const CARGOS_SISTEMA: readonly string[] = Object.values(CARGO);

export function esCargoSistema(nombre: string): nombre is CargoSistema {
  return CARGOS_SISTEMA.includes(nombre);
}

/** Quién puede preparar (cocina/barra) y quién puede crear productos de cada sector. */
export const CARGOS_POR_SECTOR: Record<'cocina' | 'barra', CargoSistema[]> = {
  cocina: [CARGO.COCINERO, CARGO.ADMIN],
  barra: [CARGO.BARTENDER, CARGO.ADMIN],
};

/** Quién puede cerrar una cuenta: nunca un Cocinero. */
export const CARGOS_CIERRAN_CUENTA: CargoSistema[] = [CARGO.MOZO, CARGO.BARTENDER, CARGO.ADMIN];
