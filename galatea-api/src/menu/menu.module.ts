import { Module } from '@nestjs/common';
import { CategoriasController, MenuController, PresentacionesController, ProductosController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController, ProductosController, PresentacionesController, CategoriasController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
