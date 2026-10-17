import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { esCargoSistema } from '../auth/cargos';
import { Db } from '../database/db.service';
import { ArchivoSubido, StorageService } from '../storage/storage.service';
import { CargoDto, CrearUsuarioDto, EditarCargoDto, EditarEmpleadoDto, EditarUsuarioDto, EmpleadoDto } from './personal.dto';

const COSTO_BCRYPT = 10;

const EMPLEADO_SELECT = `
  SELECT e.idEmpleado AS id, e.nombre, e.apellido, e.cedula, e.telefono, e.email,
         e.fechaIngreso AS "fechaIngreso", e.foto, e.activo,
         json_build_object('id', c.idCargo, 'nombre', c.nombre, 'accesoSistema', c.nombre IN ('Administrador', 'Mozo', 'Cocinero', 'Bartender')) AS cargo,
         CASE WHEN u.idUsuarioInterno IS NULL THEN NULL
              ELSE json_build_object('id', u.idUsuarioInterno, 'usuario', u.usuario, 'activo', u.activo) END AS usuario
    FROM Empleado e
    JOIN Cargo c ON c.idCargo = e.idCargo
    LEFT JOIN UsuarioInterno u ON u.idEmpleado = e.idEmpleado`;

@Injectable()
export class PersonalService {
  constructor(
    private readonly db: Db,
    private readonly storage: StorageService,
  ) {}

  // ------------------------------------------------------------------
  // Cargos
  // ------------------------------------------------------------------

  cargos() {
    return this.db.query(
      `SELECT c.idCargo AS id, c.nombre, c.descripcion,
              c.nombre IN ('Administrador', 'Mozo', 'Cocinero', 'Bartender') AS "accesoSistema",
              (SELECT count(*) FROM Empleado e WHERE e.idCargo = c.idCargo AND e.activo) AS "empleadosActivos"
         FROM Cargo c ORDER BY "accesoSistema" DESC, c.nombre`,
    );
  }

  crearCargo(dto: CargoDto) {
    return this.db.uno(
      'INSERT INTO Cargo (nombre, descripcion) VALUES ($1, $2) RETURNING idCargo AS id, nombre, descripcion',
      [dto.nombre.trim(), dto.descripcion?.trim() || null],
    );
  }

  /** Los cuatro cargos del sistema no se renombran: el código los reconoce por nombre. */
  async editarCargo(id: number, dto: EditarCargoDto) {
    const actual = await this.cargo(id);
    if (dto.nombre && dto.nombre.trim() !== actual.nombre && esCargoSistema(actual.nombre)) {
      throw new ConflictException(`"${actual.nombre}" es un cargo del sistema y no se puede renombrar.`);
    }
    return this.db.uno(
      `UPDATE Cargo SET nombre = COALESCE($2, nombre),
                        descripcion = CASE WHEN $3::boolean THEN $4 ELSE descripcion END
        WHERE idCargo = $1 RETURNING idCargo AS id, nombre, descripcion`,
      [id, dto.nombre?.trim() ?? null, dto.descripcion !== undefined, dto.descripcion?.trim() || null],
    );
  }

  async borrarCargo(id: number) {
    const actual = await this.cargo(id);
    if (esCargoSistema(actual.nombre)) {
      throw new ConflictException(`"${actual.nombre}" es un cargo del sistema y no se puede borrar.`);
    }
    const enUso = await this.db.uno('SELECT 1 FROM Empleado WHERE idCargo = $1 LIMIT 1', [id]);
    if (enUso) throw new ConflictException('Hay empleados con ese cargo: cambiales el cargo antes de borrarlo.');
    await this.db.query('DELETE FROM Cargo WHERE idCargo = $1', [id]);
  }

  private async cargo(id: number) {
    const fila = await this.db.uno<{ nombre: string }>('SELECT nombre FROM Cargo WHERE idCargo = $1', [id]);
    if (!fila) throw new NotFoundException('No existe ese cargo.');
    return fila;
  }

  // ------------------------------------------------------------------
  // Empleados
  // ------------------------------------------------------------------

  empleados(incluirInactivos: boolean) {
    return this.db.query(
      `${EMPLEADO_SELECT} WHERE $1::boolean OR e.activo ORDER BY e.activo DESC, e.apellido, e.nombre`,
      [incluirInactivos],
    );
  }

  async empleado(id: number) {
    const fila = await this.db.uno(`${EMPLEADO_SELECT} WHERE e.idEmpleado = $1`, [id]);
    if (!fila) throw new NotFoundException('No existe ese empleado.');
    return fila;
  }

  async crearEmpleado(dto: EmpleadoDto) {
    const fila = await this.db.uno<{ id: number }>(
      `INSERT INTO Empleado (idCargo, nombre, apellido, cedula, telefono, email, fechaIngreso)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE)) RETURNING idEmpleado AS id`,
      [dto.idCargo, dto.nombre.trim(), dto.apellido.trim(), dto.cedula.trim(), dto.telefono.trim(), dto.email?.trim() || null, dto.fechaIngreso ?? null],
    );
    return this.empleado(fila!.id);
  }

  /**
   * Si pasa a un cargo sin acceso al sistema (ej. de Mozo a Bachero), su
   * usuario se desactiva: solo los cuatro cargos del sistema pueden entrar.
   * Dar de baja al empleado desactiva el usuario por trigger.
   */
  async editarEmpleado(id: number, dto: EditarEmpleadoDto) {
    await this.empleado(id);
    await this.db.transaccion(async (tx) => {
      await tx.query(
        `UPDATE Empleado
            SET idCargo  = COALESCE($2, idCargo),
                nombre   = COALESCE($3, nombre),
                apellido = COALESCE($4, apellido),
                telefono = COALESCE($5, telefono),
                email    = CASE WHEN $6::boolean THEN $7 ELSE email END,
                activo   = COALESCE($8, activo)
          WHERE idEmpleado = $1`,
        [id, dto.idCargo ?? null, dto.nombre?.trim() ?? null, dto.apellido?.trim() ?? null, dto.telefono?.trim() ?? null,
         dto.email !== undefined, dto.email?.trim() || null, dto.activo ?? null],
      );
      if (dto.idCargo) {
        await tx.query(
          `UPDATE UsuarioInterno u SET activo = false
             FROM Empleado e JOIN Cargo c ON c.idCargo = e.idCargo
            WHERE u.idEmpleado = e.idEmpleado AND e.idEmpleado = $1
              AND c.nombre NOT IN ('Administrador', 'Mozo', 'Cocinero', 'Bartender')`,
          [id],
        );
      }
    });
    return this.empleado(id);
  }

  async subirFoto(id: number, archivo: ArchivoSubido | undefined) {
    const actual = await this.db.uno<{ nombre: string; apellido: string; foto: string | null }>(
      'SELECT nombre, apellido, foto FROM Empleado WHERE idEmpleado = $1',
      [id],
    );
    if (!actual) throw new NotFoundException('No existe ese empleado.');
    const url = await this.storage.subirImagen('empleados', `${id}-${actual.nombre}-${actual.apellido}`, archivo);
    await this.db.query('UPDATE Empleado SET foto = $2 WHERE idEmpleado = $1', [id, url]);
    await this.storage.borrarPorUrl(actual.foto);
    return this.empleado(id);
  }

  // ------------------------------------------------------------------
  // Usuarios (acceso al sistema)
  // ------------------------------------------------------------------

  async crearUsuario(idEmpleado: number, dto: CrearUsuarioDto) {
    const emp = await this.db.uno<{ cargo: string; activo: boolean }>(
      `SELECT c.nombre AS cargo, e.activo FROM Empleado e JOIN Cargo c ON c.idCargo = e.idCargo WHERE e.idEmpleado = $1`,
      [idEmpleado],
    );
    if (!emp) throw new NotFoundException('No existe ese empleado.');
    if (!emp.activo) throw new BadRequestException('El empleado está dado de baja.');
    if (!esCargoSistema(emp.cargo)) {
      throw new BadRequestException(`El cargo ${emp.cargo} no tiene acceso al sistema.`);
    }
    const hash = await bcrypt.hash(dto.contrasena, COSTO_BCRYPT);
    await this.db.query(
      'INSERT INTO UsuarioInterno (idEmpleado, usuario, contrasenaHash) VALUES ($1, $2, $3)',
      [idEmpleado, dto.usuario, hash],
    );
    return this.empleado(idEmpleado);
  }

  /** Cambiar la contraseña o activar/desactivar el acceso. */
  async editarUsuario(idEmpleado: number, dto: EditarUsuarioDto) {
    const usuario = await this.db.uno('SELECT idUsuarioInterno FROM UsuarioInterno WHERE idEmpleado = $1', [idEmpleado]);
    if (!usuario) throw new NotFoundException('El empleado no tiene usuario.');
    const hash = dto.contrasena ? await bcrypt.hash(dto.contrasena, COSTO_BCRYPT) : null;
    // El trigger trg_usuario_empleado_activo impide activar el usuario de un empleado dado de baja.
    await this.db.query(
      `UPDATE UsuarioInterno SET contrasenaHash = COALESCE($2, contrasenaHash), activo = COALESCE($3, activo)
        WHERE idEmpleado = $1`,
      [idEmpleado, hash, dto.activo ?? null],
    );
    return this.empleado(idEmpleado);
  }
}
