import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PresentacionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre?: string; // sin nombre = 'Estándar'

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  precio: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}

export class CrearProductoDto {
  @IsInt()
  @IsPositive()
  idCategoriaMenu: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'El producto tiene que tener al menos una presentación (precio).' })
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PresentacionDto)
  presentaciones: PresentacionDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  etiquetas?: number[];
}

export class EditarProductoDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  idCategoriaMenu?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  etiquetas?: number[];
}

export class EditarPresentacionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  precio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}

export class DisponibilidadDto {
  @IsBoolean()
  disponible: boolean;
}

export class CategoriaMenuDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre: string;

  @IsIn(['cocina', 'barra'])
  sector: 'cocina' | 'barra';

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class EditarCategoriaMenuDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsIn(['cocina', 'barra'])
  sector?: 'cocina' | 'barra';

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

export class EtiquetaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nombre: string;
}

export class FiltroMenuDto {
  @IsOptional()
  @IsIn(['cocina', 'barra'])
  sector?: 'cocina' | 'barra';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  etiqueta?: string;
}
