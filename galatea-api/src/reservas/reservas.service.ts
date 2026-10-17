import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseError, Pool, PoolClient } from 'pg';
import { Db } from '../database/db.service';
import { duracionMinutos, elegirMesas, HORARIOS, MesaLibre } from './reglas';

const RESERVA_JSON = `
  json_build_object(
    'id', r.idReserva,
    'inicio', r.fechaHoraInicio,
    'fin', r.fechaHoraFin,
    'personas', r.cantidadPersonas,
    'estado', r.estado,
    'cliente', json_build_object('id', cl.idCliente, 'nombre', cl.nombre, 'telefono', cl.telefono),
    'mesas', (SELECT json_agg(m.numero ORDER BY m.numero) FROM ReservaMesa rm JOIN Mesa m ON m.idMesa = rm.idMesa
               WHERE rm.idReserva = r.idReserva)
  )`;

const TOLERANCIA_NO_SHOW_MIN = 10;
const CADA_CUANTO_NO_SHOW_MS = 5 * 60 * 1000;

@Injectable()
export class ReservasService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Reservas');
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly db: Db) {}

  // ------------------------------------------------------------------
  // No show automático (lo que la base no hace sola)
  // ------------------------------------------------------------------

  onModuleInit() {
    if (process.env.NO_SHOW_AUTOMATICO === 'false') return;
    this.temporizador = setInterval(() => void this.marcarNoShow(), CADA_CUANTO_NO_SHOW_MS);
    this.temporizador.unref();
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Reservas confirmadas sin cuenta 10 minutos después del inicio pasan a no_show y liberan la mesa. */
  async marcarNoShow() {
    try {
      const filas = await this.db.query(
        `UPDATE Reserva r SET estado = 'no_show'
          WHERE r.estado = 'confirmada'
            AND r.fechaHoraInicio + make_interval(mins => $1) < now()
            AND NOT EXISTS (SELECT 1 FROM Cuenta c WHERE c.idReserva = r.idReserva)
         RETURNING r.idReserva`,
        [TOLERANCIA_NO_SHOW_MIN],
      );
      if (filas.length) this.log.log(`${filas.length} reserva(s) pasaron a no_show.`);
      return filas.length;
    } catch (e) {
      this.log.error(`No se pudo marcar no_show: ${(e as Error).message}`);
      return 0;
    }
  }

  // ------------------------------------------------------------------
  // Disponibilidad y alta
  // ------------------------------------------------------------------

  /** Para cada horario del día: si hay mesas para esa cantidad de personas. */
  async disponibilidad(fecha: string, personas: number) {
    const duracion = duracionMinutos(personas);
    const resultado = [];
    for (const hora of HORARIOS) {
      const inicio = `${fecha} ${hora}`;
      const futuro = await this.db.uno<{ ok: boolean }>(`SELECT $1::timestamp > now() AS ok`, [inicio]);
      const mesas = futuro?.ok ? elegirMesas(await this.mesasLibres(this.db.pool, inicio, duracion), personas) : null;
      resultado.push({ hora, disponible: mesas !== null });
    }
    return { fecha, personas, duracionMinutos: duracion, horarios: resultado };
  }

  /** Crea la reserva y le asigna mesas. El cliente tiene que estar registrado (nombre y teléfono). */
  async crear(idCliente: number, fecha: string, hora: string, personas: number) {
    if (!HORARIOS.includes(hora)) throw new BadRequestException('Ese horario no se reserva.');
    const cliente = await this.db.uno('SELECT telefono FROM Cliente WHERE idCliente = $1', [idCliente]);
    if (!cliente?.telefono) {
      throw new BadRequestException('Para reservar necesitamos tu nombre y teléfono: registrate primero.');
    }
    const inicio = `${fecha} ${hora}`;
    const validacion = await this.db.uno<{ pasado: boolean; lejos: boolean }>(
      `SELECT $1::timestamp <= now() AS pasado, $1::timestamp > now() + interval '60 days' AS lejos`,
      [inicio],
    );
    if (validacion?.pasado) throw new BadRequestException('Ese horario ya pasó.');
    if (validacion?.lejos) throw new BadRequestException('Se puede reservar hasta con 60 días de anticipación.');

    const duracion = duracionMinutos(personas);
    try {
      const id = await this.db.transaccion(async (tx) => {
        const mesas = elegirMesas(await this.mesasLibres(tx, inicio, duracion), personas);
        if (!mesas) throw new ConflictException('No hay mesas libres para ese horario. Probá con otro.');
        const r = await tx.query(
          `INSERT INTO Reserva (idCliente, fechaHoraInicio, fechaHoraFin, cantidadPersonas)
           VALUES ($1, $2::timestamp, $2::timestamp + make_interval(mins => $3), $4) RETURNING idReserva AS id`,
          [idCliente, inicio, duracion, personas],
        );
        for (const mesa of mesas) {
          await tx.query('INSERT INTO ReservaMesa (idReserva, idMesa) VALUES ($1, $2)', [r.rows[0].id, mesa.idMesa]);
        }
        return r.rows[0].id as number;
      });
      return this.detalle(id);
    } catch (e) {
      // EXCLUDE: otra reserva tomó la mesa entre la consulta y el alta.
      if (e instanceof DatabaseError && e.code === '23P01') {
        throw new ConflictException('Ese horario se acaba de ocupar. Elegí otro.');
      }
      throw e;
    }
  }

  // ------------------------------------------------------------------
  // Consultas y cancelación
  // ------------------------------------------------------------------

  async mias(idCliente: number) {
    const filas = await this.db.query(
      `SELECT ${RESERVA_JSON} AS reserva FROM Reserva r JOIN Cliente cl ON cl.idCliente = r.idCliente
        WHERE r.idCliente = $1 AND r.fechaHoraInicio > now() - interval '30 days'
        ORDER BY r.fechaHoraInicio DESC`,
      [idCliente],
    );
    return filas.map((f) => f.reserva);
  }

  /** Para el personal: las reservas de un día (por defecto hoy). */
  async delDia(fecha?: string) {
    const filas = await this.db.query(
      `SELECT ${RESERVA_JSON} AS reserva FROM Reserva r JOIN Cliente cl ON cl.idCliente = r.idCliente
        WHERE r.fechaHoraInicio::date = COALESCE($1::date, CURRENT_DATE)
        ORDER BY r.fechaHoraInicio`,
      [fecha ?? null],
    );
    return filas.map((f) => f.reserva);
  }

  async detalle(idReserva: number) {
    const fila = await this.db.uno(
      `SELECT ${RESERVA_JSON} AS reserva FROM Reserva r JOIN Cliente cl ON cl.idCliente = r.idCliente WHERE r.idReserva = $1`,
      [idReserva],
    );
    if (!fila) throw new NotFoundException('No existe esa reserva.');
    return fila.reserva;
  }

  /** Cancela una reserva confirmada que todavía no empezó. El cliente solo puede cancelar las suyas. */
  async cancelar(idReserva: number, idCliente: number | null) {
    const r = await this.db.uno<{ idCliente: number; estado: string; futura: boolean }>(
      `SELECT idCliente AS "idCliente", estado, fechaHoraInicio > now() AS futura FROM Reserva WHERE idReserva = $1`,
      [idReserva],
    );
    if (!r) throw new NotFoundException('No existe esa reserva.');
    if (idCliente !== null && r.idCliente !== idCliente) throw new ForbiddenException('Esa reserva no es tuya.');
    if (r.estado !== 'confirmada') throw new ConflictException(`La reserva ya está ${r.estado}.`);
    if (!r.futura) throw new ConflictException('La reserva ya empezó: avisá en el local.');
    // El trigger trg_reserva_propagar_a_mesas libera las mesas.
    await this.db.query(`UPDATE Reserva SET estado = 'cancelada' WHERE idReserva = $1`, [idReserva]);
    return this.detalle(idReserva);
  }

  /** Mesas sin reservas que bloqueen el intervalo [inicio, inicio + duración). */
  private async mesasLibres(ejecutor: Pool | PoolClient, inicio: string, duracion: number): Promise<MesaLibre[]> {
    const { rows } = await ejecutor.query<MesaLibre>(
      `SELECT m.idMesa AS "idMesa", m.numero, m.capacidad
         FROM Mesa m
        WHERE NOT EXISTS (
          SELECT 1 FROM ReservaMesa rm
           WHERE rm.idMesa = m.idMesa AND rm.bloqueaMesa
             AND tsrange(rm.fechaHoraInicio, rm.fechaHoraFin) && tsrange($1::timestamp, $1::timestamp + make_interval(mins => $2)))`,
      [inicio, duracion],
    );
    return rows;
  }
}
