/**
 * Borra y vuelve a crear la base de Galatea: schema (database/schema.sql,
 * copia de modelo_relacional06.sql) + datos de prueba (database/seed.sql).
 *
 * Trabaja SOLO dentro del schema DB_SCHEMA (por defecto "galatea"): nunca
 * toca "public" ni otros schemas, así que es seguro también sobre el
 * Postgres de Supabase.
 *
 *   npm run db:reset              schema + datos de prueba
 *   npm run db:reset -- --vacia   solo el schema, sin datos
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { conectar } from './lib';

export async function resetearBase(opciones: { conDatos: boolean; silencioso?: boolean }) {
  const { cliente, config } = await conectar();
  const schema = config.db.schema;
  const log = (m: string) => !opciones.silencioso && console.log(m);
  try {
    log(`Recreando el schema "${schema}"...`);
    await cliente.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await cliente.query(`CREATE SCHEMA ${schema}`);
    await cliente.query(`SET search_path TO ${schema}, public, extensions`);

    await cliente.query(readFileSync(join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
    log('Tablas, triggers y vistas creados.');

    if (opciones.conDatos) {
      await cliente.query(readFileSync(join(__dirname, '..', 'database', 'seed.sql'), 'utf8'));
      const { rows } = await cliente.query(
        `SELECT (SELECT count(*) FROM Producto) AS productos, (SELECT count(*) FROM Empleado) AS empleados,
                (SELECT count(*) FROM Cuenta) AS cuentas, (SELECT count(*) FROM Reserva) AS reservas`,
      );
      log(`Datos de prueba cargados: ${JSON.stringify(rows[0])}`);
      log('Fotos del menú: corré "npm run fotos:subir" para subirlas a Supabase Storage.');
    }
  } finally {
    await cliente.end();
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--forzar')) {
    console.error('NODE_ENV=production: db:reset borraría datos reales. Si es a propósito, agregá --forzar.');
    process.exit(1);
  }
  resetearBase({ conDatos: !process.argv.includes('--vacia') }).catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}
