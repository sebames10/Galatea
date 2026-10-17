import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ErroresFilter } from './database/pg-error.filter';
import { Configuracion } from './config/configuracion';

/** Configuración común a la app real y a las pruebas e2e. */
export function configurarApp(app: INestApplication, config: Configuracion) {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigenes, credentials: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que no están en el DTO
      forbidNonWhitelisted: true, // y avisa si mandan de más
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new ErroresFilter());
  app.enableShutdownHooks();
}
