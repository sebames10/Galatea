/**
 * Sube a Supabase Storage las fotos del menú (assets/menu, sacadas de
 * GalateaMenuFotos.zip y optimizadas a WebP) y guarda en Producto.foto
 * solo la URL pública.
 *
 * Crea el bucket si no existe (público para lectura). Se puede correr
 * varias veces: sobreescribe los archivos y vuelve a guardar las URLs.
 *
 *   npm run fotos:subir
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { conectar } from './lib';

interface Manifiesto {
  bucket_path: string;
  fotos: { categoria: string; producto: string; archivo: string }[];
}

async function main() {
  const { cliente, config } = await conectar();
  const { url, serviceRoleKey, bucket } = config.supabase;
  if (!url || !serviceRoleKey) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env.');
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const existe = await supabase.storage.getBucket(bucket);
  if (existe.error) {
    const creado = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (creado.error) throw new Error(`No se pudo crear el bucket "${bucket}": ${creado.error.message}`);
    console.log(`Bucket "${bucket}" creado (público).`);
  }

  const carpeta = join(__dirname, '..', 'assets', 'menu');
  const manifiesto: Manifiesto = JSON.parse(readFileSync(join(carpeta, 'manifest.json'), 'utf8'));
  await cliente.query(`SET search_path TO ${config.db.schema}, public`);

  let ok = 0;
  for (const foto of manifiesto.fotos) {
    const ruta = `${manifiesto.bucket_path}/${foto.archivo}`;
    const subida = await supabase.storage.from(bucket).upload(ruta, readFileSync(join(carpeta, foto.archivo)), {
      contentType: 'image/webp',
      cacheControl: '86400',
      upsert: true,
    });
    if (subida.error) {
      console.error(`✗ ${foto.categoria} / ${foto.producto}: ${subida.error.message}`);
      continue;
    }
    const publica = supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
    const { rowCount } = await cliente.query(
      `UPDATE Producto p SET foto = $3
         FROM CategoriaMenu c
        WHERE c.idCategoriaMenu = p.idCategoriaMenu AND c.nombre = $1 AND p.nombre = $2`,
      [foto.categoria, foto.producto, publica],
    );
    if (rowCount) {
      ok++;
      console.log(`✓ ${foto.categoria} / ${foto.producto}`);
    } else {
      console.warn(`? ${foto.categoria} / ${foto.producto}: subida, pero no hay un producto con ese nombre.`);
    }
  }
  await cliente.end();
  console.log(`\n${ok} de ${manifiesto.fotos.length} fotos subidas y vinculadas.`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
