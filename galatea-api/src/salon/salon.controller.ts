import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CARGO, CARGOS_CIERRAN_CUENTA } from '../auth/cargos';
import { Cargos, ClienteActual, ClienteSesion, Publico, SoloCliente, UsuarioActual, UsuarioSesion } from '../auth/decoradores';
import { CuentasService } from './cuentas.service';
import { MesasService } from './mesas.service';
import { PedidosService } from './pedidos.service';
import { CambiarEstadoPedidoDto, CerrarCuentaDto, FiltroPedidosDto, PedidoAsistidoDto, PedidoQrDto } from './salon.dto';

@Controller('mesas')
export class MesasController {
  constructor(
    private readonly mesas: MesasService,
    private readonly cuentas: CuentasService,
  ) {}

  /** Plano del salón para el personal. */
  @Get()
  listar() {
    return this.mesas.listar();
  }

  /** La app del cliente resuelve el QR escaneado a una mesa. */
  @Publico()
  @Get('qr/:codigo')
  porQr(@Param('codigo') codigo: string) {
    return this.mesas.porQr(codigo);
  }

  /** Cuenta abierta de la mesa, con sus pedidos y estados (lo que ve el cliente). */
  @SoloCliente()
  @Get('qr/:codigo/cuenta')
  cuenta(@Param('codigo') codigo: string) {
    return this.cuentas.abiertaPorQr(codigo);
  }

  /** El cliente pide la cuenta desde la app. */
  @SoloCliente()
  @Post('qr/:codigo/solicitar-cuenta')
  @HttpCode(200)
  solicitarCuenta(@Param('codigo') codigo: string) {
    return this.cuentas.solicitar(codigo);
  }
}

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  /** Pedido desde la mesa: el cliente escaneó el QR. Se divide en cocina y barra. */
  @SoloCliente()
  @Post('qr')
  qr(@Body() dto: PedidoQrDto, @ClienteActual() cliente: ClienteSesion) {
    return this.pedidos.pedidoQr(dto.codigoQR, cliente.idCliente, dto.items);
  }

  /** Pedido cargado por el Mozo. */
  @Cargos(CARGO.MOZO, CARGO.ADMIN)
  @Post('asistido')
  asistido(@Body() dto: PedidoAsistidoDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.pedidos.pedidoAsistido(dto.idMesa, usuario, dto.items);
  }

  /** GET /pedidos?sector=cocina&estado=pendiente,preparacion */
  @Get()
  listar(@Query() filtro: FiltroPedidosDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.pedidos.listar(usuario, filtro);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoPedidoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.pedidos.cambiarEstado(id, dto.estado, usuario);
  }
}

@Controller('cuentas')
@Cargos(...CARGOS_CIERRAN_CUENTA)
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  /** Cuentas abiertas; primero las que el cliente ya pidió. */
  @Get()
  abiertas() {
    return this.cuentas.abiertas();
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.cuentas.detalle(id);
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarCuentaDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.cuentas.cerrar(id, usuario, dto.codigoCupon, dto.forzar);
  }
}
