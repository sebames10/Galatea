/**
 * Genera el hash bcrypt de una contraseña, para cargarla a mano en la base.
 *   npm run hash -- "MiClave.2026"
 */
import * as bcrypt from 'bcryptjs';

const clave = process.argv[2];
if (!clave) {
  console.error('Uso: npm run hash -- "contraseña"');
  process.exit(1);
}
console.log(bcrypt.hashSync(clave, 10));
