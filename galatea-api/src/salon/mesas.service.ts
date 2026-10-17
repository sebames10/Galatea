import { Injectable, NotFoundException } from '@nestjs/common';
import { Db } from '../database/db.service';

@Injectable()
export class MesasService {
  constructor(private readonly db: Db) {}

  /** Lo que resuelve el QR impreso en la mesa. */
  async porQr(codigoQR: string) {
    const mesa = await this.db.uno(
      'SELECT idMesa AS id, numero, capacidad FROM Mesa WHERE codigoQR = $1',
      [codigoQR],
    );
    if (!mesa) throw new NotFoundException('El código QR no corresponde a ninguna mesa.');
    return mesa;
  }

  /** Plano del salón: estado derivado de cada mesa, su cuenta abierta y la próxima reserva. */
  listar() {
    return this.db.query(
      `SELECT v.idMesa AS id, v.numero, v.capacidad, v.estado,
              CASE WHEN c.idCuenta IS NULL THEN NULL ELSE json_build_object(
                'id', c.idCuenta, 'fechaApertura', c.fechaApertura,
                'fechaSolicitudCuenta', c.fechaSolicitudCuenta, 'subtotal', s.subtotal) END AS cuenta,
              (SELECT json_build_object('id', r.idReserva, 'inicio', r.fechaHoraInicio, 'fin', r.fechaHoraFin,
                                        'personas', r.cantidadPersonas, 'cliente', cl.nombre)
                 FROM ReservaMesa rm
                 JOIN Reserva r  ON r.idReserva = rm.idReserva
                 JOIN Cliente cl ON cl.idCliente = r.idCliente
                WHERE rm.idMesa = v.idMesa AND r.estado = 'confirmada' AND r.fechaHoraFin > now()
                ORDER BY r.fechaHoraInicio LIMIT 1) AS "proximaReserva"
         FROM v_MesaEstado v
         LEFT JOIN Cuenta c ON c.idMesa = v.idMesa AND c.estado = 'abierta'
         LEFT JOIN v_CuentaSubtotal s ON s.idCuenta = c.idCuenta
        ORDER BY v.numero`,
    );
  }
}
