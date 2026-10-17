import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Db } from '../database/db.service';
import { CargoSistema, esCargoSistema } from './cargos';
import { CARGOS_PERMITIDOS, ES_PUBLICO, SOLO_CLIENTE, UsuarioSesion } from './decoradores';

export interface PayloadToken {
  sub: number;
  tipo: 'personal' | 'cliente';
}

/**
 * Guard global. Por defecto toda ruta pide token de personal.
 *
 * Para el personal no se confía en lo que dice el token: en cada request
 * se vuelve a leer el usuario de la base. Así, si el Administrador da de
 * baja a alguien o le cambia el cargo, el cambio rige en el acto y no
 * cuando vence el token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest();
    const payload = await this.leerToken(req.headers.authorization);

    if (this.reflector.getAllAndOverride<boolean>(SOLO_CLIENTE, objetivos)) {
      if (payload.tipo !== 'cliente') throw new ForbiddenException('Esta acción es para clientes desde la mesa.');
      const existe = await this.db.uno('SELECT 1 FROM Cliente WHERE idCliente = $1', [payload.sub]);
      if (!existe) throw new UnauthorizedException('Sesión de cliente vencida. Volvé a escanear el QR.');
      req.cliente = { idCliente: payload.sub };
      return true;
    }

    if (payload.tipo !== 'personal') throw new ForbiddenException('Acción reservada al personal.');
    const usuario = await this.cargarUsuario(payload.sub);
    if (!usuario) throw new UnauthorizedException('Tu usuario está inactivo. Hablá con el Administrador.');
    req.usuario = usuario;

    const permitidos = this.reflector.getAllAndOverride<CargoSistema[]>(CARGOS_PERMITIDOS, objetivos);
    if (permitidos?.length && !permitidos.includes(usuario.cargo)) {
      throw new ForbiddenException(`Tu cargo (${usuario.cargo}) no permite esta acción.`);
    }
    return true;
  }

  private async leerToken(header?: string): Promise<PayloadToken> {
    const [tipo, token] = (header ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Falta el token de acceso.');
    try {
      return await this.jwt.verifyAsync<PayloadToken>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o vencido.');
    }
  }

  private async cargarUsuario(idUsuarioInterno: number): Promise<UsuarioSesion | null> {
    const fila = await this.db.uno<UsuarioSesion>(
      `SELECT u.idUsuarioInterno AS "idUsuarioInterno", e.idEmpleado AS "idEmpleado", u.usuario,
              e.nombre || ' ' || e.apellido AS nombre, c.nombre AS cargo
         FROM UsuarioInterno u
         JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         JOIN Cargo c    ON c.idCargo = e.idCargo
        WHERE u.idUsuarioInterno = $1 AND u.activo AND e.activo`,
      [idUsuarioInterno],
    );
    return fila && esCargoSistema(fila.cargo) ? fila : null;
  }
}
