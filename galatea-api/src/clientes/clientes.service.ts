import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { AuthService } from '../auth/auth.service';
import { Db } from '../database/db.service';

const PORCENTAJE_BIENVENIDA = 10;

const PERFIL_SQL = `
  SELECT c.idCliente AS id, c.alias, c.nombre, c.telefono, (c.telefono IS NOT NULL) AS registrado,
         (SELECT json_build_object('codigo', cu.codigoQR, 'porcentaje', cu.porcentaje, 'usado', cu.idCuenta IS NOT NULL)
            FROM CuponDescuento cu WHERE cu.idCliente = c.idCliente AND cu.tipo = 'bienvenida') AS "cuponBienvenida",
         (SELECT puntosDisponibles FROM v_PuntosCliente pc WHERE pc.idCliente = c.idCliente) AS puntos
    FROM Cliente c WHERE c.idCliente = $1`;

/** Celular uruguayo: 09 + 7 dígitos. Se guarda como "099 123 456". */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '').replace(/^598/, '0');
  if (!/^09\d{7}$/.test(digitos)) {
    throw new BadRequestException('El teléfono tiene que ser un celular uruguayo (ej. 099 123 456).');
  }
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly db: Db,
    private readonly auth: AuthService,
  ) {}

  /**
   * Identidad progresiva: la app manda la huella del dispositivo
   * (FingerprintJS). Si ya la conocemos, es ese cliente; si no, se crea un
   * cliente anónimo. Devuelve el token que usa la app en sus pedidos.
   */
  async identificar(huella: string, alias?: string) {
    const idCliente = await this.db.transaccion(async (tx) => {
      const existente = await tx.query('SELECT idCliente AS id FROM HuellaDispositivo WHERE hash = $1', [huella]);
      if (existente.rows[0]) return existente.rows[0].id as number;

      const nuevo = await tx.query('INSERT INTO Cliente (alias) VALUES ($1) RETURNING idCliente AS id', [alias?.trim() || null]);
      const id: number = nuevo.rows[0].id;
      const vinculada = await tx.query(
        'INSERT INTO HuellaDispositivo (hash, idCliente) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING RETURNING idCliente',
        [huella, id],
      );
      if (vinculada.rows[0]) return id;
      // Otro request registró la misma huella en paralelo: usamos ese cliente.
      await tx.query('DELETE FROM Cliente WHERE idCliente = $1', [id]);
      const ganador = await tx.query('SELECT idCliente AS id FROM HuellaDispositivo WHERE hash = $1', [huella]);
      return ganador.rows[0].id as number;
    });
    return { token: await this.auth.tokenCliente(idCliente), cliente: await this.perfil(idCliente) };
  }

  async perfil(idCliente: number) {
    return this.db.uno(PERFIL_SQL, [idCliente]);
  }

  /**
   * Registro para el 10 % de bienvenida: solo nombre y teléfono.
   * Si el teléfono ya es de otro cliente (la misma persona desde otro
   * celular), se fusionan los dos perfiles en el que ya existía: sus
   * dispositivos, pedidos, reservas y puntos pasan a ese cliente.
   */
  async registrar(idCliente: number, nombre: string, telefono: string) {
    const tel = normalizarTelefono(telefono);
    const resultado = await this.db.transaccion(async (tx) => {
      const otro = await tx.query(
        `SELECT idCliente AS id FROM Cliente WHERE telefono = $1 AND idCliente <> $2 FOR UPDATE`,
        [tel, idCliente],
      );
      let destino = idCliente;
      if (otro.rows[0]) {
        destino = otro.rows[0].id;
        await this.fusionar(tx, idCliente, destino);
        await tx.query('UPDATE Cliente SET nombre = COALESCE(nombre, $2) WHERE idCliente = $1', [destino, nombre.trim()]);
      } else {
        await tx.query('UPDATE Cliente SET nombre = $2, telefono = $3 WHERE idCliente = $1', [idCliente, nombre.trim(), tel]);
      }
      // Un solo cupón de bienvenida por cliente (índice único parcial).
      await tx.query(
        `INSERT INTO CuponDescuento (idCliente, codigoQR, tipo, porcentaje)
         VALUES ($1, $2, 'bienvenida', $3)
         ON CONFLICT (idCliente) WHERE tipo = 'bienvenida' DO NOTHING`,
        [destino, codigoCupon(), PORCENTAJE_BIENVENIDA],
      );
      return { destino, fusionado: destino !== idCliente };
    });
    // TODO (Twilio/n8n): enviar el cupón por WhatsApp. Por ahora vuelve en la respuesta.
    return {
      token: await this.auth.tokenCliente(resultado.destino),
      fusionado: resultado.fusionado,
      cliente: await this.perfil(resultado.destino),
    };
  }

  private async fusionar(tx: PoolClient, origen: number, destino: number) {
    for (const tabla of ['HuellaDispositivo', 'Reserva', 'Pedido', 'Recomendacion', 'Canje']) {
      await tx.query(`UPDATE ${tabla} SET idCliente = $2 WHERE idCliente = $1`, [origen, destino]);
    }
    // Cupones: el destino conserva su cupón de bienvenida si ya tenía uno.
    await tx.query(
      `UPDATE CuponDescuento SET idCliente = $2
        WHERE idCliente = $1
          AND NOT (tipo = 'bienvenida' AND EXISTS (SELECT 1 FROM CuponDescuento d WHERE d.idCliente = $2 AND d.tipo = 'bienvenida'))`,
      [origen, destino],
    );
    await tx.query('DELETE FROM CuponDescuento WHERE idCliente = $1 AND idCuenta IS NULL', [origen]);
    // Jugadores: si los dos jugaron la misma partida, queda el del destino.
    await tx.query(
      `UPDATE Jugador j SET idCliente = $2
        WHERE j.idCliente = $1
          AND NOT EXISTS (SELECT 1 FROM Jugador d WHERE d.idCliente = $2 AND d.idPartida = j.idPartida)`,
      [origen, destino],
    );
    const restos = await tx.query(
      `SELECT (SELECT count(*) FROM Jugador WHERE idCliente = $1) + (SELECT count(*) FROM CuponDescuento WHERE idCliente = $1) AS n`,
      [origen],
    );
    if (restos.rows[0].n > 0) {
      throw new ConflictException('No se pudieron unificar los perfiles automáticamente. Pedí ayuda al personal.');
    }
    await tx.query('DELETE FROM Cliente WHERE idCliente = $1', [origen]);
  }
}

function codigoCupon() {
  // 8 caracteres sin letras confusas (0/O, 1/I)
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return 'CUP-' + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}
