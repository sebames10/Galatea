import 'dotenv/config';
import { Client } from 'pg';
import { cargarConfiguracion } from '../src/config/configuracion';

/** Cliente de Postgres para los scripts, con el schema y la zona horaria de Galatea. */
export async function conectar() {
  const config = cargarConfiguracion();
  const cliente = new Client({
    connectionString: config.db.url,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  });
  await cliente.connect();
  await cliente.query(`SET TIME ZONE '${config.db.zonaHoraria.replace(/'/g, '')}'`);
  return { cliente, config };
}
