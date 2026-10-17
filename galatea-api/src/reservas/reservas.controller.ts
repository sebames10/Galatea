import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { ClienteActual, ClienteSesion, Publico, SoloCliente } from '../auth/decoradores';
import { HORARIOS } from './reglas';
import { ReservasService } from './reservas.service';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

class DisponibilidadDto {
  @Matches(FECHA, { message: 'La fecha va como AAAA-MM-DD.' })
  fecha: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  personas: number;
}

class CrearReservaDto {
  @Matches(FECHA, { message: 'La fecha va como AAAA-MM-DD.' })
  fecha: string;

  @IsIn(HORARIOS, { message: `Horarios posibles: ${HORARIOS.join(', ')}.` })
  hora: string;

  @IsInt()
  @Min(1)
  @Max(20)
  personas: number;
}

class FiltroDiaDto {
  @IsOptional()
  @Matches(FECHA, { message: 'La fecha va como AAAA-MM-DD.' })
  fecha?: string;
}

@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  /** GET /reservas/disponibilidad?fecha=2026-10-20&personas=4 */
  @Publico()
  @Get('disponibilidad')
  disponibilidad(@Query() q: DisponibilidadDto) {
    return this.reservas.disponibilidad(q.fecha, q.personas);
  }

  @SoloCliente()
  @Post()
  crear(@Body() dto: CrearReservaDto, @ClienteActual() cliente: ClienteSesion) {
    return this.reservas.crear(cliente.idCliente, dto.fecha, dto.hora, dto.personas);
  }

  @SoloCliente()
  @Get('mias')
  mias(@ClienteActual() cliente: ClienteSesion) {
    return this.reservas.mias(cliente.idCliente);
  }

  @SoloCliente()
  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(@Param('id', ParseIntPipe) id: number, @ClienteActual() cliente: ClienteSesion) {
    return this.reservas.cancelar(id, cliente.idCliente);
  }
}

/** Para el personal (cualquier cargo con acceso). */
@Controller('agenda')
export class AgendaController {
  constructor(private readonly reservas: ReservasService) {}

  /** GET /agenda?fecha=2026-10-20 (por defecto hoy) */
  @Get()
  delDia(@Query() q: FiltroDiaDto) {
    return this.reservas.delDia(q.fecha);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.reservas.cancelar(id, null);
  }
}
