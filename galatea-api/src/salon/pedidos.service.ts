import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { CARGO, CARGOS_POR_SECTOR, CargoSistema } from '../auth/cargos';
import { UsuarioSesion } from '../auth/decoradores';
import { Db } from '../database/db.service';
import { EstadoPedido, FiltroPedidosDto, ItemPedidoDto } from './salon.dto';

type Sector = 'cocina' | 'barra';

interface PresentacionPedida {
  idPresentacion: number;
  producto: string;
  presentacion: string;
  precio: number;
  disponible: boolean;
  activo: boolean;
  sector: Sector;
}

const SIGUIENTE: Record<EstadoPedido, EstadoPedido | null> = {
  pendiente: 'preparacion',
  preparacion: 'listo',
  listo: 'entregado',
  entregado: null,
};

// Un pedido con su mesa y sus líneas, para las pantallas de cocina, barra y mozo.
export const PEDIDO_JSON = `
  json_build_object(
    'id', p.idPedido,
    'idCuenta', p.idCuenta,
    'mesa', m.numero,
    'sector', p.sector,
    'canal', p.canal,
    'estado', p.estado,
    'fechaHora', p.fechaHora,
    'items', (SELECT json_agg(json_build_object(
                       'idDetalle', d.idDetallePedido,
                       'producto', pr.nombre,
                       'presentacion', pre.nombre,
                       'cantidad', d.cantidad,
                       'precioUnitario', d.precioUnitario,
                       'observacion', d.observacion)
                     ORDER BY d.idDetallePedido)
                FROM DetallePedido d
                JOIN Presentacion pre ON pre.idPresentacion = d.idPresentacion
                JOIN Producto pr      ON pr.idProducto = pre.idProducto
               WHERE d.idPedido = p.idPedido)
  )`;

@Injectable()
export class PedidosService {
  constructor(private readonly db: Db) {}

  /** El cliente pide desde la mesa con el QR. */
  async pedidoQr(codigoQR: string, idCliente: number, items: ItemPedidoDto[]) {
    const mesa = await this.db.uno<{ id: number }>('SELECT idMesa AS id FROM Mesa WHERE codigoQR = $1', [codigoQR]);
    if (!mesa) throw new NotFoundException('El código QR no corresponde a ninguna mesa.');
    return this.registrar(mesa.id, 'qr', idCliente, null, items);
  }

  /** El Mozo carga el pedido de una mesa. */
  async pedidoAsistido(idMesa: number, usuario: UsuarioSesion, items: ItemPedidoDto[]) {
    const mesa = await this.db.uno('SELECT 1 FROM Mesa WHERE idMesa = $1', [idMesa]);
    if (!mesa) throw new NotFoundException('No existe esa mesa.');
    return this.registrar(idMesa, 'asistido', null, usuario.idUsuarioInterno, items);
  }

  /**
   * Registra lo que se pidió en una confirmación:
   * 1. abre la cuenta de la mesa si no hay una (obtener_o_abrir_cuenta);
   * 2. divide los ítems por sector: un Pedido para cocina y otro para barra;
   * 3. copia el precio vigente de cada presentación (nunca el que manda el cliente).
   * Todo en una transacción: o se registra todo, o nada.
   */
  private async registrar(
    idMesa: number,
    canal: 'qr' | 'asistido',
    idCliente: number | null,
    idMozo: number | null,
    items: ItemPedidoDto[],
  ) {
    return this.db.transaccion(async (tx) => {
      const presentaciones = await this.cargarPresentaciones(tx, items.map((i) => i.idPresentacion));
      const noDisponibles = [...presentaciones.values()].filter((p) => !p.disponible || !p.activo);
      if (noDisponibles.length) {
        throw new ConflictException(`Agotado por hoy: ${noDisponibles.map(nombreCompleto).join(', ')}.`);
      }

      const { rows } = await tx.query('SELECT obtener_o_abrir_cuenta($1) AS id', [idMesa]);
      const idCuenta: number = rows[0].id;

      const porSector = new Map<Sector, ItemPedidoDto[]>();
      for (const item of items) {
        const sector = presentaciones.get(item.idPresentacion)!.sector;
        porSector.set(sector, [...(porSector.get(sector) ?? []), item]);
      }

      const idsPedidos: number[] = [];
      for (const sector of (['cocina', 'barra'] as const).filter((s) => porSector.has(s))) {
        const lineas = porSector.get(sector)!;
        const pedido = await tx.query(
          `INSERT INTO Pedido (idCuenta, idCliente, idMozoCarga, canal, sector)
           VALUES ($1, $2, $3, $4, $5) RETURNING idPedido AS id`,
          [idCuenta, idCliente, idMozo, canal, sector],
        );
        const idPedido: number = pedido.rows[0].id;
        await tx.query(
          `INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario, observacion)
           SELECT $1, l.idPresentacion, l.cantidad, pr.precio, l.observacion
             FROM unnest($2::int[], $3::int[], $4::text[]) WITH ORDINALITY AS l(idPresentacion, cantidad, observacion, n)
             JOIN Presentacion pr ON pr.idPresentacion = l.idPresentacion
            ORDER BY l.n`,
          [
            idPedido,
            lineas.map((l) => l.idPresentacion),
            lineas.map((l) => l.cantidad),
            lineas.map((l) => l.observacion?.trim() || null),
          ],
        );
        idsPedidos.push(idPedido);
      }

      const { rows: pedidos } = await tx.query(
        `SELECT ${PEDIDO_JSON} AS pedido FROM Pedido p JOIN Cuenta c ON c.idCuenta = p.idCuenta JOIN Mesa m ON m.idMesa = c.idMesa
          WHERE p.idPedido = ANY($1) ORDER BY p.idPedido`,
        [idsPedidos],
      );
      const lista = pedidos.map((f) => f.pedido);
      const total = items.reduce((s, i) => s + presentaciones.get(i.idPresentacion)!.precio * i.cantidad, 0);
      return { idCuenta, pedidos: lista, total: Math.round(total * 100) / 100 };
    });
  }

  private async cargarPresentaciones(tx: PoolClient, ids: number[]) {
    const { rows } = await tx.query<PresentacionPedida>(
      `SELECT pre.idPresentacion AS "idPresentacion", pr.nombre AS producto, pre.nombre AS presentacion,
              pre.precio, pre.disponible, (pr.activo AND c.activa) AS activo, c.sector
         FROM Presentacion pre
         JOIN Producto pr     ON pr.idProducto = pre.idProducto
         JOIN CategoriaMenu c ON c.idCategoriaMenu = pr.idCategoriaMenu
        WHERE pre.idPresentacion = ANY($1)`,
      [ids],
    );
    const mapa = new Map(rows.map((r) => [r.idPresentacion, r]));
    const faltan = [...new Set(ids)].filter((id) => !mapa.has(id));
    if (faltan.length) throw new BadRequestException(`No existen las presentaciones: ${faltan.join(', ')}.`);
    return mapa;
  }

  /**
   * Pantallas de cocina, barra y mozo. El Cocinero ve solo cocina y el
   * Bartender solo barra; Mozo y Administrador ven todo.
   */
  async listar(usuario: UsuarioSesion, filtro: FiltroPedidosDto) {
    const sector: Sector | null =
      usuario.cargo === CARGO.COCINERO ? 'cocina' : usuario.cargo === CARGO.BARTENDER ? 'barra' : (filtro.sector ?? null);
    const estados = filtro.estado?.length ? filtro.estado : ['pendiente', 'preparacion', 'listo'];
    const filas = await this.db.query(
      `SELECT ${PEDIDO_JSON} AS pedido
         FROM Pedido p
         JOIN Cuenta c ON c.idCuenta = p.idCuenta
         JOIN Mesa m   ON m.idMesa = c.idMesa
        WHERE ($1::text IS NULL OR p.sector = $1)
          AND p.estado = ANY($2)
          AND (c.estado = 'abierta' OR p.estado = 'entregado')
        ORDER BY p.fechaHora, p.idPedido
        LIMIT 200`,
      [sector, estados],
    );
    return filas.map((f) => f.pedido);
  }

  /**
   * Avanza un paso: pendiente -> preparacion -> listo (cocina o barra) -> entregado (mozo).
   * El UPDATE exige el estado anterior: si dos personas tocan el mismo
   * pedido a la vez, la segunda recibe un aviso en lugar de pisar al otro.
   */
  async cambiarEstado(idPedido: number, nuevo: EstadoPedido, usuario: UsuarioSesion) {
    const actual = await this.db.uno<{ estado: EstadoPedido; sector: Sector }>(
      'SELECT estado, sector FROM Pedido WHERE idPedido = $1',
      [idPedido],
    );
    if (!actual) throw new NotFoundException('No existe ese pedido.');
    if (SIGUIENTE[actual.estado] !== nuevo) {
      throw new ConflictException(`El pedido está "${actual.estado}" y no puede pasar a "${nuevo}".`);
    }
    const habilitados: CargoSistema[] = nuevo === 'entregado' ? [CARGO.MOZO, CARGO.ADMIN] : CARGOS_POR_SECTOR[actual.sector];
    if (!habilitados.includes(usuario.cargo)) {
      throw new ForbiddenException(`Un ${usuario.cargo} no puede marcar como "${nuevo}" un pedido de ${actual.sector}.`);
    }
    const fila = await this.db.uno(
      'UPDATE Pedido SET estado = $2 WHERE idPedido = $1 AND estado = $3 RETURNING idPedido',
      [idPedido, nuevo, actual.estado],
    );
    if (!fila) throw new ConflictException('El pedido cambió mientras tanto. Actualizá la pantalla.');
    const pedido = await this.db.uno(
      `SELECT ${PEDIDO_JSON} AS pedido FROM Pedido p JOIN Cuenta c ON c.idCuenta = p.idCuenta JOIN Mesa m ON m.idMesa = c.idMesa
        WHERE p.idPedido = $1`,
      [idPedido],
    );
    return pedido!.pedido;
  }
}

function nombreCompleto(p: PresentacionPedida) {
  return p.presentacion === 'Estándar' ? p.producto : `${p.producto} (${p.presentacion})`;
}
