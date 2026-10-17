import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG, Configuracion } from '../config/configuracion';

export const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024; // 5 MB

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Fotos en Supabase Storage. En la base de datos se guarda solo la URL
 * pública que devuelve este servicio.
 *
 * Usa la service_role key, que saltea las políticas de Storage: por eso
 * vive solo en el backend. El bucket es público para lectura (las fotos
 * del menú las ve cualquiera) y solo la API puede escribir.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('Storage');
  private readonly cliente?: SupabaseClient;
  private readonly bucket: string;

  constructor(@Inject(CONFIG) config: Configuracion) {
    this.bucket = config.supabase.bucket;
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      this.cliente = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.log.warn('Supabase Storage no está configurado: la subida de fotos queda deshabilitada.');
    }
  }

  /**
   * Sube una imagen a `carpeta/nombreBase-<timestamp>.<ext>` y devuelve su
   * URL pública. El timestamp evita que el navegador muestre una versión
   * vieja guardada en caché cuando se reemplaza la foto.
   */
  async subirImagen(carpeta: 'menu' | 'empleados', nombreBase: string, archivo?: ArchivoSubido): Promise<string> {
    if (!archivo) throw new BadRequestException('Falta la imagen (campo "foto").');
    const extension = TIPOS_IMAGEN[archivo.mimetype];
    if (!extension) throw new BadRequestException('La foto tiene que ser JPG, PNG o WebP.');
    if (archivo.size > TAMANO_MAXIMO_IMAGEN) throw new BadRequestException('La foto no puede pesar más de 5 MB.');

    const ruta = `${carpeta}/${slug(nombreBase)}-${Date.now()}.${extension}`;
    const { error } = await this.supabase().storage.from(this.bucket).upload(ruta, archivo.buffer, {
      contentType: archivo.mimetype,
      cacheControl: '31536000', // un año: cada versión tiene su propia URL
      upsert: false,
    });
    if (error) {
      this.log.error(`No se pudo subir ${ruta}: ${error.message}`);
      throw new ServiceUnavailableException('No se pudo guardar la foto. Probá de nuevo.');
    }
    return this.supabase().storage.from(this.bucket).getPublicUrl(ruta).data.publicUrl;
  }

  /** Borra un archivo a partir de su URL pública. Si la URL no es de este bucket, no hace nada. */
  async borrarPorUrl(url?: string | null): Promise<void> {
    if (!url || !this.cliente) return;
    const marcador = `/storage/v1/object/public/${this.bucket}/`;
    const i = url.indexOf(marcador);
    if (i < 0) return;
    const ruta = decodeURIComponent(url.slice(i + marcador.length));
    const { error } = await this.cliente.storage.from(this.bucket).remove([ruta]);
    // Si falla queda un archivo huérfano: no vale la pena cortar la operación por eso.
    if (error) this.log.warn(`No se pudo borrar ${ruta}: ${error.message}`);
  }

  private supabase(): SupabaseClient {
    if (!this.cliente) {
      throw new ServiceUnavailableException(
        'La subida de fotos no está configurada (faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).',
      );
    }
    return this.cliente;
  }
}

export function slug(texto: string): string {
  return texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'foto';
}
