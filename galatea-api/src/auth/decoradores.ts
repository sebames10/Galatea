import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { CargoSistema } from './cargos';

export const ES_PUBLICO = 'esPublico';
export const SOLO_CLIENTE = 'soloCliente';
export const CARGOS_PERMITIDOS = 'cargosPermitidos';

/** Ruta abierta: no pide token (ej. ver el menú). */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

/** Ruta del cliente en la mesa: pide el token que entrega POST /clientes/identificar. */
export const SoloCliente = () => SetMetadata(SOLO_CLIENTE, true);

/**
 * Ruta del personal limitada a ciertos cargos. Sin este decorador (y sin
 * @Publico / @SoloCliente) la ruta pide token de personal de cualquier cargo.
 */
export const Cargos = (...cargos: CargoSistema[]) => SetMetadata(CARGOS_PERMITIDOS, cargos);

export interface UsuarioSesion {
  idUsuarioInterno: number;
  idEmpleado: number;
  usuario: string;
  nombre: string;
  cargo: CargoSistema;
}

export interface ClienteSesion {
  idCliente: number;
}

export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioSesion => ctx.switchToHttp().getRequest().usuario,
);

export const ClienteActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClienteSesion => ctx.switchToHttp().getRequest().cliente,
);
