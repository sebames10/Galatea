import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TAMANO_MAXIMO_IMAGEN } from '../storage/storage.service';

/**
 * Recibe un archivo en el campo "foto" (multipart/form-data). Sin destino
 * en disco, multer lo deja en memoria (buffer) para mandarlo a Supabase.
 * Corta en 5 MB antes de leer de más.
 */
export const SubidaFoto = () =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor('foto', {
        limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1 },
      }),
    ),
  );
