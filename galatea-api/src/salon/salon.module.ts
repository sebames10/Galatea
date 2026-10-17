import { Module } from '@nestjs/common';
import { CuentasService } from './cuentas.service';
import { MesasService } from './mesas.service';
import { PedidosService } from './pedidos.service';
import { CuentasController, MesasController, PedidosController } from './salon.controller';

/** Mesas, pedidos y cuentas: todo lo que pasa en el salón. */
@Module({
  controllers: [MesasController, PedidosController, CuentasController],
  providers: [MesasService, PedidosService, CuentasService],
})
export class SalonModule {}
