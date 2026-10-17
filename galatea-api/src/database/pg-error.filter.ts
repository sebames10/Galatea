import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseError } from 'pg';

/**
 * Traduce los errores de PostgreSQL a respuestas HTTP claras. Muchas
 * reglas del negocio viven en la base (triggers, UNIQUE, EXCLUDE), así
 * que sus mensajes tienen que llegar bien al frontend.
 */
@Catch()
export class ErroresFilter implements ExceptionFilter {
  private readonly log = new Logger('Errores');

  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (error instanceof HttpException) {
      const cuerpo = error.getResponse();
      const detalle = typeof cuerpo === 'string' ? cuerpo : (cuerpo as any).message;
      // Los errores de validación vienen como lista: el primero va en "mensaje" y todos en "errores".
      const mensaje = Array.isArray(detalle) ? detalle[0] : detalle;
      return res
        .status(error.getStatus())
        .json({ statusCode: error.getStatus(), mensaje, ...(Array.isArray(detalle) ? { errores: detalle } : {}) });
    }

    if (error instanceof DatabaseError) {
      const [status, mensaje] = traducir(error);
      if (status >= 500) this.log.error(error.message, error.stack);
      return res.status(status).json({ statusCode: status, mensaje });
    }

    this.log.error(error instanceof Error ? error.stack : String(error));
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, mensaje: 'Error interno. Probá de nuevo en un momento.' });
  }
}

function traducir(e: DatabaseError): [number, string] {
  switch (e.code) {
    case 'P0001': // RAISE EXCEPTION de un trigger: es una regla del negocio
      return [HttpStatus.CONFLICT, e.message];
    case '23505':
      return [HttpStatus.CONFLICT, mensajeUnico(e.constraint)];
    case '23503':
      return [HttpStatus.CONFLICT, 'El registro está en uso o hace referencia a algo que no existe.'];
    case '23514':
      return [HttpStatus.BAD_REQUEST, `Dato inválido (${e.constraint ?? 'restricción'}).`];
    case '23P01':
      return [HttpStatus.CONFLICT, 'La mesa ya está reservada en ese horario.'];
    case '22P02':
    case '22007':
    case '22008':
      return [HttpStatus.BAD_REQUEST, 'Formato de dato inválido.'];
    default:
      return [HttpStatus.INTERNAL_SERVER_ERROR, 'Error de base de datos.'];
  }
}

function mensajeUnico(constraint?: string): string {
  const conocidos: Record<string, string> = {
    uq_producto_nombre_por_categoria: 'Ya existe un producto con ese nombre en la categoría.',
    uq_presentacion_nombre_por_producto: 'El producto ya tiene una presentación con ese nombre.',
    categoriamenu_nombre_key: 'Ya existe una categoría con ese nombre.',
    cargo_nombre_key: 'Ya existe un cargo con ese nombre.',
    empleado_cedula_key: 'Ya existe un empleado con esa cédula.',
    usuariointerno_usuario_key: 'Ese nombre de usuario ya está en uso.',
    usuariointerno_idempleado_key: 'El empleado ya tiene un usuario.',
    cliente_telefono_key: 'Ese teléfono ya está registrado.',
    etiqueta_nombre_key: 'Ya existe una etiqueta con ese nombre.',
    ux_una_cuenta_abierta_por_mesa: 'La mesa ya tiene una cuenta abierta.',
  };
  return (constraint && conocidos[constraint]) || 'Ya existe un registro con esos datos.';
}
