import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { CARGO } from '../auth/cargos';
import { Cargos } from '../auth/decoradores';
import { SubidaFoto } from '../common/subida-foto';
import { ArchivoSubido } from '../storage/storage.service';
import { CargoDto, CrearUsuarioDto, EditarCargoDto, EditarEmpleadoDto, EditarUsuarioDto, EmpleadoDto } from './personal.dto';
import { PersonalService } from './personal.service';

@Controller('cargos')
@Cargos(CARGO.ADMIN)
export class CargosController {
  constructor(private readonly personal: PersonalService) {}

  @Get()
  listar() {
    return this.personal.cargos();
  }

  @Post()
  crear(@Body() dto: CargoDto) {
    return this.personal.crearCargo(dto);
  }

  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarCargoDto) {
    return this.personal.editarCargo(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  borrar(@Param('id', ParseIntPipe) id: number) {
    return this.personal.borrarCargo(id);
  }
}

@Controller('empleados')
@Cargos(CARGO.ADMIN)
export class EmpleadosController {
  constructor(private readonly personal: PersonalService) {}

  /** GET /empleados?inactivos=true para ver también a los dados de baja. */
  @Get()
  listar(@Query('inactivos', new ParseBoolPipe({ optional: true })) inactivos?: boolean) {
    return this.personal.empleados(inactivos ?? false);
  }

  @Get(':id')
  ver(@Param('id', ParseIntPipe) id: number) {
    return this.personal.empleado(id);
  }

  @Post()
  crear(@Body() dto: EmpleadoDto) {
    return this.personal.crearEmpleado(dto);
  }

  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarEmpleadoDto) {
    return this.personal.editarEmpleado(id, dto);
  }

  /** multipart/form-data con el archivo en el campo "foto". */
  @Post(':id/foto')
  @SubidaFoto()
  foto(@Param('id', ParseIntPipe) id: number, @UploadedFile() archivo?: ArchivoSubido) {
    return this.personal.subirFoto(id, archivo);
  }

  /** Crea el acceso al sistema (solo para Administrador, Mozo, Cocinero o Bartender). */
  @Post(':id/usuario')
  crearUsuario(@Param('id', ParseIntPipe) id: number, @Body() dto: CrearUsuarioDto) {
    return this.personal.crearUsuario(id, dto);
  }

  @Patch(':id/usuario')
  editarUsuario(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarUsuarioDto) {
    return this.personal.editarUsuario(id, dto);
  }
}
