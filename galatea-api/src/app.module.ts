import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { DatabaseModule } from './database/database.module';
import { MenuModule } from './menu/menu.module';
import { PersonalModule } from './personal/personal.module';
import { ReservasModule } from './reservas/reservas.module';
import { SalonModule } from './salon/salon.module';
import { StorageModule } from './storage/storage.module';
import { SaludController } from './salud.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    StorageModule,
    MenuModule,
    PersonalModule,
    ClientesModule,
    ReservasModule,
    SalonModule,
  ],
  controllers: [SaludController],
})
export class AppModule {}
