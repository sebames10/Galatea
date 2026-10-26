/**
 * Genera los QR que se imprimen en cada mesa. Cada QR es la URL de la app
 * con ?mesa=<codigoQR>: la cámara del celular abre la app con la mesa ya
 * identificada (también lo lee el escáner de la app). Debajo va el código
 * en texto por si la cámara falla.
 *
 * Deja en qr-mesas/ un SVG por mesa y imprimir.html (una hoja A4 con
 * todas las tarjetas, lista para imprimir desde el navegador).
 *
 *   npm run qr:mesas                       # usa WEB_URL del .env
 *   npm run qr:mesas -- https://galatea.uy # o la URL como argumento
 *
 * Sin URL usa la IP de esta PC en la red local y el puerto de Vite (5173),
 * que sirve para probar con el celular en el mismo wifi.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { join } from 'path';
import QRCode from 'qrcode';
import { conectar } from './lib';

/** IP de la PC en el wifi. Se saltean los adaptadores virtuales (VirtualBox, WSL, Docker). */
function ipLocal() {
  const ips = Object.entries(networkInterfaces()).flatMap(([nombre, lista]) =>
    (lista ?? []).filter((i) => i.family === 'IPv4' && !i.internal).map((i) => ({ nombre, ip: i.address })),
  );
  const real = ips.filter((i) => !/vEthernet|VirtualBox|VMware|docker|WSL/i.test(i.nombre) && !i.ip.startsWith('192.168.56.'));
  return (real.find((i) => /wi-?fi|wlan/i.test(i.nombre)) ?? real[0] ?? ips[0])?.ip ?? 'localhost';
}

async function main() {
  const base = (process.argv[2] || process.env.WEB_URL || `http://${ipLocal()}:5173`).replace(/\/+$/, '');
  const { cliente, config } = await conectar();
  const { rows: mesas } = await cliente.query<{ numero: number; capacidad: number; codigoqr: string }>(
    `SELECT numero, capacidad, codigoQR FROM ${config.db.schema}.Mesa ORDER BY numero`,
  );
  await cliente.end();
  if (!mesas.length) throw new Error('No hay mesas en la base. Corré npm run db:reset primero.');

  const carpeta = join(__dirname, '..', 'qr-mesas');
  mkdirSync(carpeta, { recursive: true });

  const tarjetas: string[] = [];
  for (const m of mesas) {
    const url = `${base}/?mesa=${encodeURIComponent(m.codigoqr)}`;
    const svg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: '#040F1F', light: '#FFFFFF' },
    });
    writeFileSync(join(carpeta, `mesa-${String(m.numero).padStart(2, '0')}.svg`), svg);
    tarjetas.push(`
      <article>
        <p class="marca">Galatea</p>
        <h2>Mesa ${m.numero}</h2>
        ${svg}
        <p class="ayuda">Escaneá para ver el menú y pedir</p>
        <p class="codigo">${m.codigoqr}</p>
      </article>`);
    console.log(`Mesa ${String(m.numero).padStart(2)}: ${url}`);
  }

  writeFileSync(
    join(carpeta, 'imprimir.html'),
    `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>QR de las mesas - Galatea</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@500;700&family=Poiret+One&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; font-family: Manrope, sans-serif; color: #040F1F; }
  main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  article { break-inside: avoid; border: 1px dashed #C9A252; border-radius: 4mm; padding: 5mm; text-align: center; }
  svg { width: 100%; max-width: 45mm; display: block; margin: 2mm auto; }
  .marca { font-family: 'Poiret One', serif; font-size: 18pt; letter-spacing: .1em; color: #C9A252; margin: 0; }
  h2 { font-family: Fraunces, serif; font-weight: 500; font-size: 16pt; margin: 1mm 0 0; }
  .ayuda { font-size: 9pt; margin: 1mm 0; }
  .codigo { font-weight: 700; font-size: 9pt; letter-spacing: .08em; color: #555; margin: 0; }
</style>
</head>
<body><main>${tarjetas.join('')}
</main></body>
</html>
`,
  );
  console.log(`\n${mesas.length} QR en ${carpeta} (abrí imprimir.html para imprimirlos).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
