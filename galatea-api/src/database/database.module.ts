import { Global, Module } from '@nestjs/common';
import { CONFIG, cargarConfiguracion } from '../config/configuracion';
import { Db } from './db.service';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => cargarConfiguracion() }, Db],
  exports: [CONFIG, Db],
})
export class DatabaseModule {}
