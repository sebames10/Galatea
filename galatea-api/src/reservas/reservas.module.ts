import { Module } from '@nestjs/common';
import { AgendaController, ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  controllers: [ReservasController, AgendaController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
