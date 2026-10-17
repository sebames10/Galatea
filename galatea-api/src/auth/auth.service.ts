import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Db } from '../database/db.service';
import { esCargoSistema } from './cargos';
import { PayloadToken } from './auth.guard';

// Hash de una contraseña cualquiera: se compara igual cuando el usuario no
// existe, para que la respuesta tarde lo mismo y no revele qué usuarios hay.
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  async login(usuario: string, contrasena: string) {
    const fila = await this.db.uno(
      `SELECT u.idUsuarioInterno AS "idUsuarioInterno", u.contrasenaHash AS "hash", u.activo AS "usuarioActivo",
              e.activo AS "empleadoActivo", e.idEmpleado AS "idEmpleado", e.nombre, e.apellido, e.foto,
              c.nombre AS cargo
         FROM UsuarioInterno u
         JOIN Empleado e ON e.idEmpleado = u.idEmpleado
         JOIN Cargo c    ON c.idCargo = e.idCargo
        WHERE lower(u.usuario) = lower($1)`,
      [usuario.trim()],
    );

    const claveOk = await bcrypt.compare(contrasena, fila?.hash ?? HASH_FALSO);
    // Mismo mensaje para todo: usuario inexistente, clave mala o dado de baja.
    if (!fila || !claveOk || !fila.usuarioActivo || !fila.empleadoActivo || !esCargoSistema(fila.cargo)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const payload: PayloadToken = { sub: fila.idUsuarioInterno, tipo: 'personal' };
    return {
      token: await this.jwt.signAsync(payload),
      usuario: {
        idUsuarioInterno: fila.idUsuarioInterno,
        idEmpleado: fila.idEmpleado,
        nombre: `${fila.nombre} ${fila.apellido}`,
        cargo: fila.cargo,
        foto: fila.foto,
      },
    };
  }

  /** Token para el cliente en la mesa (identidad progresiva, sin contraseña). */
  tokenCliente(idCliente: number) {
    const payload: PayloadToken = { sub: idCliente, tipo: 'cliente' };
    return this.jwt.signAsync(payload, { expiresIn: '30d' });
  }
}
