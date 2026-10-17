import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { CARGO } from '../auth/cargos';
import { Cargos, Publico, UsuarioActual, UsuarioSesion } from '../auth/decoradores';
import { SubidaFoto } from '../common/subida-foto';
import { ArchivoSubido } from '../storage/storage.service';
import {
  CategoriaMenuDto,
  CrearProductoDto,
  DisponibilidadDto,
  EditarCategoriaMenuDto,
  EditarPresentacionDto,
  EditarProductoDto,
  EtiquetaDto,
  FiltroMenuDto,
  PresentacionDto,
} from './menu.dto';
import { MenuService } from './menu.service';

const COCINA_O_BARRA = [CARGO.ADMIN, CARGO.COCINERO, CARGO.BARTENDER] as const;

/** Lo que ve cualquiera: la carta. */
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  /** GET /menu?sector=cocina|barra&etiqueta=Vegetariano */
  @Publico()
  @Get()
  carta(@Query() filtro: FiltroMenuDto) {
    return this.menu.carta(filtro);
  }

  @Publico()
  @Get('productos/:id')
  producto(@Param('id', ParseIntPipe) id: number) {
    return this.menu.producto(id);
  }

  @Publico()
  @Get('etiquetas')
  etiquetas() {
    return this.menu.etiquetas();
  }
}

/** Gestión del menú: Cocinero (cocina), Bartender (barra) o Administrador. */
@Controller('productos')
@Cargos(...COCINA_O_BARRA)
export class ProductosController {
  constructor(private readonly menu: MenuService) {}

  @Post()
  crear(@Body() dto: CrearProductoDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.menu.crearProducto(dto, usuario);
  }

  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarProductoDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.menu.editarProducto(id, dto, usuario);
  }

  @Post(':id/presentaciones')
  agregarPresentacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PresentacionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.menu.agregarPresentacion(id, dto, usuario);
  }

  /** Marca todo el producto como "Agotado por hoy" o lo vuelve a habilitar. */
  @Patch(':id/disponibilidad')
  disponibilidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisponibilidadDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.menu.cambiarDisponibilidad(id, dto.disponible, usuario);
  }

  /** multipart/form-data con el archivo en el campo "foto". Se guarda en Supabase Storage. */
  @Post(':id/foto')
  @SubidaFoto()
  subirFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.menu.subirFoto(id, archivo, usuario);
  }

  @Delete(':id/foto')
  quitarFoto(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioSesion) {
    return this.menu.quitarFoto(id, usuario);
  }
}

@Controller('presentaciones')
@Cargos(...COCINA_O_BARRA)
export class PresentacionesController {
  constructor(private readonly menu: MenuService) {}

  /** Precio, nombre, orden o "Agotado por hoy" de una presentación (ej. solo la botella). */
  @Patch(':id')
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarPresentacionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.menu.editarPresentacion(id, dto, usuario);
  }
}

/** Categorías y etiquetas: solo el Administrador. */
@Controller()
@Cargos(CARGO.ADMIN)
export class CategoriasController {
  constructor(private readonly menu: MenuService) {}

  @Get('categorias-menu')
  listar() {
    return this.menu.categorias();
  }

  @Post('categorias-menu')
  crear(@Body() dto: CategoriaMenuDto) {
    return this.menu.crearCategoria(dto);
  }

  @Patch('categorias-menu/:id')
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarCategoriaMenuDto) {
    return this.menu.editarCategoria(id, dto);
  }

  @Post('etiquetas')
  crearEtiqueta(@Body() dto: EtiquetaDto) {
    return this.menu.crearEtiqueta(dto.nombre);
  }
}
