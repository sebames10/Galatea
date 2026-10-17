import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CargoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}

export class EditarCargoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string | null;
}

export class EmpleadoDto {
  @IsInt()
  @IsPositive()
  idCargo: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido: string;

  @IsString()
  @Matches(/^\d{1,2}\.?\d{3}\.?\d{3}-?\d$/, { message: 'Cédula inválida (ej. 4.512.338-1).' })
  cedula: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  telefono: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido.' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;
}

export class EditarEmpleadoDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  idCargo?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido.' })
  @MaxLength(150)
  email?: string | null;

  /** false = dar de baja (también desactiva su usuario). */
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

const CLAVE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const MENSAJE_CLAVE = 'La contraseña tiene que tener al menos 8 caracteres, con letras y números.';

export class CrearUsuarioDto {
  @IsString()
  @Matches(/^[a-z0-9._]{3,50}$/, { message: 'El usuario solo puede tener minúsculas, números, punto y guion bajo (3 a 50).' })
  usuario: string;

  @IsString()
  @Matches(CLAVE, { message: MENSAJE_CLAVE })
  @MaxLength(200)
  contrasena: string;
}

export class EditarUsuarioDto {
  @IsOptional()
  @IsString()
  @Matches(CLAVE, { message: MENSAJE_CLAVE })
  @MaxLength(200)
  contrasena?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
