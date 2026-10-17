import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ESTADOS_PEDIDO = ['pendiente', 'preparacion', 'listo', 'entregado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export class ItemPedidoDto {
  @IsInt()
  @IsPositive()
  idPresentacion: number;

  @IsInt()
  @Min(1)
  @Max(20)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}

class ItemsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'El pedido está vacío.' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];
}

/** Pedido del cliente escaneando el QR de la mesa. */
export class PedidoQrDto extends ItemsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  codigoQR: string;
}

/** Pedido que carga el Mozo para una mesa. */
export class PedidoAsistidoDto extends ItemsDto {
  @IsInt()
  @IsPositive()
  idMesa: number;
}

export class CambiarEstadoPedidoDto {
  @IsIn(ESTADOS_PEDIDO)
  estado: EstadoPedido;
}

export class FiltroPedidosDto {
  @IsOptional()
  @IsIn(['cocina', 'barra'])
  sector?: 'cocina' | 'barra';

  /** Lista separada por coma. Por defecto: pendiente, preparacion, listo. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value))
  @IsIn(ESTADOS_PEDIDO, { each: true })
  estado?: EstadoPedido[];
}

export class CerrarCuentaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  codigoCupon?: string;

  /** Cerrar aunque haya pedidos sin entregar (ej. el cliente se fue). */
  @IsOptional()
  @IsBoolean()
  forzar?: boolean;
}
