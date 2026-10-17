import { Controller, Get } from '@nestjs/common';
import { Publico } from './auth/decoradores';
import { Db } from './database/db.service';

/** Para Railway/Render y para comprobar rápido que la API llega a la base. */
@Controller('salud')
export class SaludController {
  constructor(private readonly db: Db) {}

  @Publico()
  @Get()
  async salud() {
    const fila = await this.db.uno<{ ahora: string }>(`SELECT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS') AS ahora`);
    return { estado: 'ok', horaRestaurante: fila?.ahora };
  }
}
