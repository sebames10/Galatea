import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Publico, UsuarioActual, UsuarioSesion } from './decoradores';

class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  usuario: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contrasena: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Ingreso del personal (Administrador, Mozo, Cocinero, Bartender). */
  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.usuario, dto.contrasena);
  }

  /** Datos del usuario con sesión iniciada. */
  @Get('yo')
  yo(@UsuarioActual() usuario: UsuarioSesion) {
    return usuario;
  }
}
