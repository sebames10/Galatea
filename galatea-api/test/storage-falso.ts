import { BadRequestException } from '@nestjs/common';
import { ArchivoSubido, slug, TIPOS_IMAGEN } from '../src/storage/storage.service';

/** Reemplaza a Supabase Storage en las pruebas: valida igual, pero no sube nada. */
export class StorageFalso {
  subidas: string[] = [];
  borradas: string[] = [];
  private n = 0;

  async subirImagen(carpeta: string, nombreBase: string, archivo?: ArchivoSubido) {
    if (!archivo) throw new BadRequestException('Falta la imagen (campo "foto").');
    const ext = TIPOS_IMAGEN[archivo.mimetype];
    if (!ext) throw new BadRequestException('La foto tiene que ser JPG, PNG o WebP.');
    const url = `https://falso.supabase.co/storage/v1/object/public/galatea/${carpeta}/${slug(nombreBase)}-${++this.n}.${ext}`;
    this.subidas.push(url);
    return url;
  }

  async borrarPorUrl(url?: string | null) {
    if (url) this.borradas.push(url);
  }
}
