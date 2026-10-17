import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow, types } from 'pg';
import { CONFIG, Configuracion } from '../config/configuracion';

// NUMERIC (importes) como número de JS: dos decimales entran sin pérdida.
types.setTypeParser(1700, (v) => parseFloat(v));
// COUNT(*) devuelve BIGINT: como número.
types.setTypeParser(20, (v) => parseInt(v, 10));
// TIMESTAMP sin zona: se devuelve tal cual está en la base (hora de
// Montevideo) en formato ISO local, sin convertir a UTC.
types.setTypeParser(1114, (v) => v.replace(' ', 'T'));
// DATE: 'YYYY-MM-DD' tal cual.
types.setTypeParser(1082, (v) => v);

/** Cualquier cosa que pueda ejecutar SQL: el pool o un cliente dentro de una transacción. */
export interface Ejecutor {
  query<T extends QueryResultRow = any>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
}

/**
 * Acceso a PostgreSQL con el driver `pg` y SQL explícito.
 * No usamos ORM porque el modelo vive en SQL (triggers, EXCLUDE,
 * funciones como obtener_o_abrir_cuenta) y un ORM lo duplicaría.
 */
@Injectable()
export class Db implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(@Inject(CONFIG) config: Configuracion) {
    this.pool = new Pool({
      connectionString: config.db.url,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      // Parámetros de inicio de cada conexión: schema de Galatea y hora de
      // Montevideo (las fechas se guardan sin zona). El schema ya viene
      // validado (solo [a-z0-9_]) en la configuración.
      options: `-c search_path=${config.db.schema},public,extensions -c TimeZone=${config.db.zonaHoraria.replace(/[^A-Za-z_/+-]/g, '')}`,
    });
  }

  async query<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { rows } = await this.pool.query<T>(sql, params);
    return rows;
  }

  /** Primera fila o null. */
  async uno<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /** Ejecuta `fn` dentro de una transacción: COMMIT si termina bien, ROLLBACK si lanza. */
  async transaccion<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn(client);
      await client.query('COMMIT');
      return resultado;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
