import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ClienteActual, ClienteSesion, Publico, SoloCliente } from '../auth/decoradores';
import { ClientesService } from './clientes.service';

class IdentificarDto {
  /** visitorId de FingerprintJS */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,255}$/, { message: 'Huella de dispositivo inválida.' })
  huella: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  alias?: string;
}

class RegistroDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(20)
  telefono: string;
}

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  /** Primer paso de la app en la mesa: devuelve el token del cliente (anónimo o no). */
  @Publico()
  @Post('identificar')
  @HttpCode(200)
  identificar(@Body() dto: IdentificarDto) {
    return this.clientes.identificar(dto.huella, dto.alias);
  }

  @SoloCliente()
  @Get('yo')
  yo(@ClienteActual() cliente: ClienteSesion) {
    return this.clientes.perfil(cliente.idCliente);
  }

  /** Nombre y teléfono para el 10 % de bienvenida. Puede devolver un token nuevo si se fusionaron perfiles. */
  @SoloCliente()
  @Post('registro')
  @HttpCode(200)
  registro(@Body() dto: RegistroDto, @ClienteActual() cliente: ClienteSesion) {
    return this.clientes.registrar(cliente.idCliente, dto.nombre, dto.telefono);
  }
}
