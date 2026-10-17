import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioSesion } from '../auth/decoradores';
import { Db } from '../database/db.service';
import { PEDIDO_JSON } from './pedidos.service';

// Cuenta con sus pedidos y el subtotal en curso (o los importes del cierre).
const CUENTA_JSON = `
  json_build_object(
    'id', c.idCuenta,
    'mesa', m.numero,
    'estado', c.estado,
    'fechaApertura', c.fechaApertura,
    'fechaSolicitudCuenta', c.fechaSolicitudCuenta,
    'fechaCierre', c.fechaCierre,
    'subtotal', COALESCE(c.subtotal, s.subtotal),
    'descuento', COALESCE(c.descuento, 0),
    'total', COALESCE(c.total, s.subtotal),
    'pedidos', COALESCE((SELECT json_agg(${PEDIDO_JSON} ORDER BY p.idPedido)
                           FROM Pedido p WHERE p.idCuenta = c.idCuenta), '[]'::json)
  )`;

const CUENTA_FROM = `
  FROM Cuenta c
  JOIN Mesa m ON m.idMesa = c.idMesa
  JOIN v_CuentaSubtotal s ON s.idCuenta = c.idCuenta`;

@Injectable()
export class CuentasService {
  constructor(private readonly db: Db) {}

  /** Lo que ve el cliente en la mesa: su cuenta abierta, o null si todavía no pidió nada. */
  async abiertaPorQr(codigoQR: string) {
    await this.mesaPorQr(codigoQR);
    const fila = await this.db.uno(
      `SELECT ${CUENTA_JSON} AS cuenta ${CUENTA_FROM} WHERE m.codigoQR = $1 AND c.estado = 'abierta'`,
      [codigoQR],
    );
    return fila?.cuenta ?? null;
  }

  /** El cliente pide la cuenta desde la app: la mesa pasa a "cuentaSolicitada". */
  async solicitar(codigoQR: string) {
    await this.mesaPorQr(codigoQR);
    const fila = await this.db.uno(
      `UPDATE Cuenta c SET fechaSolicitudCuenta = COALESCE(c.fechaSolicitudCuenta, now())
         FROM Mesa m
        WHERE m.idMesa = c.idMesa AND m.codigoQR = $1 AND c.estado = 'abierta'
       RETURNING c.idCuenta AS id`,
      [codigoQR],
    );
    if (!fila) throw new NotFoundException('La mesa no tiene una cuenta abierta.');
    return this.detalle(fila.id);
  }

  async abiertas() {
    const filas = await this.db.query(
      `SELECT ${CUENTA_JSON} AS cuenta ${CUENTA_FROM}
        WHERE c.estado = 'abierta'
        ORDER BY c.fechaSolicitudCuenta NULLS LAST, c.fechaApertura`,
    );
    return filas.map((f) => f.cuenta);
  }

  async detalle(idCuenta: number) {
    const fila = await this.db.uno(`SELECT ${CUENTA_JSON} AS cuenta ${CUENTA_FROM} WHERE c.idCuenta = $1`, [idCuenta]);
    if (!fila) throw new NotFoundException('No existe esa cuenta.');
    return fila.cuenta;
  }

  /**
   * Cierra la cuenta (Mozo, Bartender o Administrador). Calcula subtotal,
   * aplica el cupón si viene uno y lo marca como usado. La factura fiscal
   * se sigue haciendo en Soft Restaurant: estos importes son la "foto" del
   * cierre en Galatea.
   */
  async cerrar(idCuenta: number, usuario: UsuarioSesion, codigoCupon?: string, forzar = false) {
    await this.db.transaccion(async (tx) => {
      // FOR UPDATE: si dos personas cierran la misma cuenta a la vez, la segunda espera y ve que ya está cerrada.
      const { rows } = await tx.query('SELECT estado FROM Cuenta WHERE idCuenta = $1 FOR UPDATE', [idCuenta]);
      if (!rows[0]) throw new NotFoundException('No existe esa cuenta.');
      if (rows[0].estado !== 'abierta') throw new ConflictException('La cuenta ya está cerrada.');

      const pendientes = await tx.query(
        `SELECT count(*) AS n FROM Pedido WHERE idCuenta = $1 AND estado <> 'entregado'`,
        [idCuenta],
      );
      if (pendientes.rows[0].n > 0 && !forzar) {
        throw new ConflictException(
          `Hay ${pendientes.rows[0].n} pedido(s) sin entregar. Entregalos o cerrá con "forzar".`,
        );
      }

      const sub = await tx.query('SELECT subtotal FROM v_CuentaSubtotal WHERE idCuenta = $1', [idCuenta]);
      const subtotal: number = sub.rows[0].subtotal;

      let descuento = 0;
      let idCupon: number | null = null;
      if (codigoCupon?.trim()) {
        const cupon = await tx.query(
          `SELECT idCupon, porcentaje, idCuenta FROM CuponDescuento WHERE upper(codigoQR) = upper($1) FOR UPDATE`,
          [codigoCupon.trim()],
        );
        if (!cupon.rows[0]) throw new NotFoundException('El cupón no existe.');
        if (cupon.rows[0].idcuenta !== null) throw new ConflictException('El cupón ya fue usado.');
        idCupon = cupon.rows[0].idcupon;
        descuento = Math.round(subtotal * cupon.rows[0].porcentaje) / 100;
      }

      await tx.query(
        `UPDATE Cuenta
            SET estado = 'cerrada', fechaCierre = now(), idUsuarioCierre = $2,
                subtotal = $3, descuento = $4, total = $3::numeric - $4::numeric
          WHERE idCuenta = $1`,
        [idCuenta, usuario.idUsuarioInterno, subtotal, descuento],
      );
      if (idCupon) {
        await tx.query('UPDATE CuponDescuento SET idCuenta = $2, fechaUso = now() WHERE idCupon = $1', [idCupon, idCuenta]);
      }
    });
    return this.detalle(idCuenta);
  }

  private async mesaPorQr(codigoQR: string) {
    const mesa = await this.db.uno('SELECT idMesa FROM Mesa WHERE codigoQR = $1', [codigoQR]);
    if (!mesa) throw new NotFoundException('El código QR no corresponde a ninguna mesa.');
    return mesa;
  }
}
