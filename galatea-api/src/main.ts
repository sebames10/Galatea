import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG, Configuracion } from './config/configuracion';
import { configurarApp } from './configurar-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<Configuracion>(CONFIG);
  configurarApp(app, config);
  await app.listen(config.puerto, '0.0.0.0');
  new Logger('Galatea').log(`API escuchando en http://localhost:${config.puerto}/api`);
}

void bootstrap();
