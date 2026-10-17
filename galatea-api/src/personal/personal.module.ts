import { Module } from '@nestjs/common';
import { CargosController, EmpleadosController } from './personal.controller';
import { PersonalService } from './personal.service';

@Module({
  controllers: [CargosController, EmpleadosController],
  providers: [PersonalService],
})
export class PersonalModule {}
