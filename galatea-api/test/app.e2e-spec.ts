/**
 * Pruebas de punta a punta contra un PostgreSQL real (TEST_DATABASE_URL).
 * Antes de empezar recrean el schema y cargan los datos de prueba.
 * Supabase Storage se reemplaza por un falso que no sube nada.
 *
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/galatea_test npm test
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { resetearBase } from '../scripts/db-reset';
import { StorageFalso } from './storage-falso';

if (!process.env.TEST_DATABASE_URL) throw new Error('Falta TEST_DATABASE_URL (una base solo para pruebas).');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DB_SCHEMA = 'galatea_test';
process.env.JWT_SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';
process.env.NO_SHOW_AUTOMATICO = 'false';
process.env.SUPABASE_URL = '';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../src/app.module');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { configurarApp } = require('../src/configurar-app');
import { CONFIG } from '../src/config/configuracion';
import { Db } from '../src/database/db.service';
import { ReservasService } from '../src/reservas/reservas.service';
import { StorageService } from '../src/storage/storage.service';

const QR_MESA_5 = 'GAL-M05-H9C3';
const QR_MESA_3 = 'GAL-M03-Z8N1';
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000000020001e221bc330000000049454e44ae426082', 'hex');

let app: INestApplication;
let db: Db;
const storage = new StorageFalso();
const api = () => request(app.getHttpServer());
const tokens: Record<string, string> = {};

async function login(usuario: string, contrasena: string) {
  const res = await api().post('/api/auth/login').send({ usuario, contrasena }).expect(200);
  return res.body.token as string;
}
const como = (usuario: string) => ({ Authorization: `Bearer ${tokens[usuario]}` });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** id de la presentación "producto (presentación)" dentro de una categoría */
async function presentacion(categoria: string, producto: string, nombre = 'Estándar'): Promise<number> {
  const fila = await db.uno(
    `SELECT pr.idPresentacion AS id FROM Presentacion pr JOIN Producto p USING (idProducto)
       JOIN CategoriaMenu c USING (idCategoriaMenu) WHERE c.nombre = $1 AND p.nombre = $2 AND pr.nombre = $3`,
    [categoria, producto, nombre],
  );
  return fila!.id;
}
async function productoId(categoria: string, producto: string): Promise<number> {
  const fila = await db.uno(
    `SELECT p.idProducto AS id FROM Producto p JOIN CategoriaMenu c USING (idCategoriaMenu) WHERE c.nombre = $1 AND p.nombre = $2`,
    [categoria, producto],
  );
  return fila!.id;
}
function manana() {
  const d = new Date(Date.now() + 36 * 3600 * 1000); // con margen por la zona horaria
  return d.toISOString().slice(0, 10);
}

beforeAll(async () => {
  await resetearBase({ conDatos: true, silencioso: true });
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(StorageService)
    .useValue(storage)
    .compile();
  app = modulo.createNestApplication();
  configurarApp(app, app.get(CONFIG));
  await app.init();
  db = app.get(Db);
  for (const [u, c] of [
    ['vpereira', 'Valentina.2026'],
    ['mrodriguez', 'Martin.2026'],
    ['dsosa', 'Diego.2026'],
    ['snunez', 'Santiago.2026'],
  ]) {
    tokens[u] = await login(u, c);
  }
});

afterAll(async () => {
  await app?.close();
});

// ---------------------------------------------------------------------
describe('Menú (público)', () => {
  it('devuelve la carta en el orden de la carta, con presentaciones y agotados', async () => {
    const res = await api().get('/api/menu').expect(200);
    expect(res.body.map((c: any) => c.nombre)).toEqual([
      'Para picar', 'Pizzetas', 'Chivitos', 'Hamburguesas', 'Milanesas',
      'Para compartir', 'Postres', 'Tragos', 'Cervezas', 'Vinos',
    ]);
    const pizzetas = res.body.find((c: any) => c.nombre === 'Pizzetas');
    const caprese = pizzetas.productos.find((p: any) => p.nombre === 'Caprese');
    expect(caprese.presentaciones.map((p: any) => [p.nombre, p.precio])).toEqual([
      ['Individual (22cm)', 420],
      ['Familiar (32cm)', 550],
    ]);
    const postres = res.body.find((c: any) => c.nombre === 'Postres');
    expect(postres.productos.find((p: any) => p.nombre === 'Crumble de manzana').agotado).toBe(true);
    const gascon = res.body.find((c: any) => c.nombre === 'Vinos').productos.find((p: any) => p.nombre === 'Familia Gascón');
    expect(gascon.agotado).toBe(false); // queda la copa
    expect(gascon.presentaciones.find((p: any) => p.nombre === 'Botella').disponible).toBe(false);
  });

  it('filtra por sector y por etiqueta', async () => {
    const barra = await api().get('/api/menu?sector=barra').expect(200);
    expect(barra.body.map((c: any) => c.nombre)).toEqual(['Tragos', 'Cervezas', 'Vinos']);
    const veg = await api().get('/api/menu?etiqueta=vegetariano').expect(200);
    const conProductos = veg.body.flatMap((c: any) => c.productos.map((p: any) => p.nombre));
    expect(conProductos).toEqual(['Gramajo vegetariano']);
  });

  it('rechaza parámetros inválidos', async () => {
    await api().get('/api/menu?sector=terraza').expect(400);
  });
});

// ---------------------------------------------------------------------
describe('Autenticación del personal', () => {
  it('entra con usuario y contraseña correctos', async () => {
    const res = await api().post('/api/auth/login').send({ usuario: 'vpereira', contrasena: 'Valentina.2026' }).expect(200);
    expect(res.body.usuario.cargo).toBe('Administrador');
  });

  it('mismo mensaje para clave incorrecta y para usuario dado de baja', async () => {
    const mala = await api().post('/api/auth/login').send({ usuario: 'vpereira', contrasena: 'otra' }).expect(401);
    const baja = await api().post('/api/auth/login').send({ usuario: 'fsilva', contrasena: 'Florencia.2026' }).expect(401);
    expect(mala.body.mensaje).toBe('Usuario o contraseña incorrectos.');
    expect(baja.body.mensaje).toBe(mala.body.mensaje);
  });

  it('las rutas del personal piden token', async () => {
    await api().get('/api/auth/yo').expect(401);
    const yo = await api().get('/api/auth/yo').set(como('dsosa')).expect(200);
    expect(yo.body.cargo).toBe('Cocinero');
  });
});

// ---------------------------------------------------------------------
describe('Gestión del menú por cargo y sector', () => {
  it('un Cocinero no puede crear tragos; un Bartender sí', async () => {
    const tragos = (await db.uno(`SELECT idCategoriaMenu AS id FROM CategoriaMenu WHERE nombre = 'Tragos'`))!.id;
    const cuerpo = { idCategoriaMenu: tragos, nombre: 'Gin de la casa', presentaciones: [{ precio: 320 }] };
    await api().post('/api/productos').set(como('dsosa')).send(cuerpo).expect(403);
    await api().post('/api/productos').set(como('mrodriguez')).send(cuerpo).expect(403);
    const res = await api().post('/api/productos').set(como('snunez')).send(cuerpo).expect(201);
    expect(res.body.presentaciones).toEqual([expect.objectContaining({ nombre: 'Estándar', precio: 320, disponible: true })]);
  });

  it('valida presentaciones y nombres repetidos dentro de la categoría', async () => {
    const pizzetas = (await db.uno(`SELECT idCategoriaMenu AS id FROM CategoriaMenu WHERE nombre = 'Pizzetas'`))!.id;
    await api().post('/api/productos').set(como('dsosa')).send({ idCategoriaMenu: pizzetas, nombre: 'Nueva', presentaciones: [] }).expect(400);
    const dup = await api()
      .post('/api/productos')
      .set(como('dsosa'))
      .send({ idCategoriaMenu: pizzetas, nombre: 'Caprese', presentaciones: [{ precio: 1 }] })
      .expect(409);
    expect(dup.body.mensaje).toMatch(/Ya existe un producto con ese nombre/);
  });

  it('sube la foto a Storage, guarda la URL y borra la anterior', async () => {
    const id = await productoId('Pizzetas', 'Caprese');
    const r1 = await api().post(`/api/productos/${id}/foto`).set(como('dsosa')).attach('foto', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(201);
    expect(r1.body.foto).toMatch(/^https:\/\/falso\.supabase\.co\/.+\/menu\/.+\.png$/);
    const r2 = await api().post(`/api/productos/${id}/foto`).set(como('dsosa')).attach('foto', PNG, { filename: 'b.png', contentType: 'image/png' }).expect(201);
    expect(r2.body.foto).not.toBe(r1.body.foto);
    expect(storage.borradas).toContain(r1.body.foto);
    const guardada = await db.uno('SELECT foto FROM Producto WHERE idProducto = $1', [id]);
    expect(guardada!.foto).toBe(r2.body.foto);
    await api().post(`/api/productos/${id}/foto`).set(como('dsosa')).attach('foto', Buffer.from('hola'), { filename: 'x.txt', contentType: 'text/plain' }).expect(400);
    await api().post(`/api/productos/${id}/foto`).set(como('snunez')).attach('foto', PNG, { filename: 'c.png', contentType: 'image/png' }).expect(403);
  });

  it('"Agotado por hoy" de un producto entero', async () => {
    const id = await productoId('Postres', 'Brownie');
    const res = await api().patch(`/api/productos/${id}/disponibilidad`).set(como('dsosa')).send({ disponible: false }).expect(200);
    expect(res.body.agotado).toBe(true);
    await api().patch(`/api/productos/${id}/disponibilidad`).set(como('dsosa')).send({ disponible: true }).expect(200);
  });
});

// ---------------------------------------------------------------------
describe('Pedido por QR, cocina, barra y cuenta', () => {
  let tokenCliente: string;
  let pedidoCocina: number;
  let pedidoBarra: number;
  let idCuenta: number;
  let cupon: string;

  it('el cliente se identifica con la huella del dispositivo', async () => {
    const res = await api().post('/api/clientes/identificar').send({ huella: 'huella-de-prueba-0001' }).expect(200);
    tokenCliente = res.body.token;
    expect(res.body.cliente.registrado).toBe(false);
    const otraVez = await api().post('/api/clientes/identificar').send({ huella: 'huella-de-prueba-0001' }).expect(200);
    expect(otraVez.body.cliente.id).toBe(res.body.cliente.id);
  });

  it('el pedido se divide en cocina y barra con el precio de la base', async () => {
    const caprese = await presentacion('Pizzetas', 'Caprese', 'Individual (22cm)');
    const ipa = await presentacion('Cervezas', 'Tirada IPA');
    const res = await api()
      .post('/api/pedidos/qr')
      .set(bearer(tokenCliente))
      .send({ codigoQR: QR_MESA_5, items: [{ idPresentacion: caprese, cantidad: 1, observacion: 'Sin albahaca' }, { idPresentacion: ipa, cantidad: 2 }] })
      .expect(201);
    expect(res.body.total).toBe(420 + 2 * 240);
    expect(res.body.pedidos.map((p: any) => p.sector)).toEqual(['cocina', 'barra']);
    expect(res.body.pedidos[0].items[0]).toEqual(expect.objectContaining({ producto: 'Caprese', precioUnitario: 420, observacion: 'Sin albahaca' }));
    pedidoCocina = res.body.pedidos[0].id;
    pedidoBarra = res.body.pedidos[1].id;
    idCuenta = res.body.idCuenta;
  });

  it('no deja pedir algo agotado, ni pedir por QR con token de personal', async () => {
    const crumble = await presentacion('Postres', 'Crumble de manzana');
    const res = await api().post('/api/pedidos/qr').set(bearer(tokenCliente)).send({ codigoQR: QR_MESA_5, items: [{ idPresentacion: crumble, cantidad: 1 }] }).expect(409);
    expect(res.body.mensaje).toContain('Crumble de manzana');
    await api().post('/api/pedidos/qr').set(como('mrodriguez')).send({ codigoQR: QR_MESA_5, items: [{ idPresentacion: crumble, cantidad: 1 }] }).expect(403);
  });

  it('el cliente ve su cuenta abierta con los pedidos', async () => {
    const res = await api().get(`/api/mesas/qr/${QR_MESA_5}/cuenta`).set(bearer(tokenCliente)).expect(200);
    expect(res.body.id).toBe(idCuenta);
    expect(res.body.subtotal).toBe(900);
    expect(res.body.pedidos).toHaveLength(2);
  });

  it('cada sector ve y avanza solo lo suyo; el mozo entrega', async () => {
    const cocina = await api().get('/api/pedidos').set(como('dsosa')).expect(200);
    expect(cocina.body.every((p: any) => p.sector === 'cocina')).toBe(true);
    expect(cocina.body.map((p: any) => p.id)).toContain(pedidoCocina);

    await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('snunez')).send({ estado: 'preparacion' }).expect(403);
    await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('dsosa')).send({ estado: 'listo' }).expect(409); // se saltea un paso
    await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('dsosa')).send({ estado: 'preparacion' }).expect(200);
    await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('dsosa')).send({ estado: 'listo' }).expect(200);
    await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('dsosa')).send({ estado: 'entregado' }).expect(403);
    const entregado = await api().patch(`/api/pedidos/${pedidoCocina}/estado`).set(como('mrodriguez')).send({ estado: 'entregado' }).expect(200);
    expect(entregado.body.estado).toBe('entregado');
  });

  it('el cliente se registra y recibe el cupón de bienvenida', async () => {
    const res = await api().post('/api/clientes/registro').set(bearer(tokenCliente)).send({ nombre: 'Lucas Prueba', telefono: '099 000 111' }).expect(200);
    expect(res.body.fusionado).toBe(false);
    expect(res.body.cliente.registrado).toBe(true);
    cupon = res.body.cliente.cuponBienvenida.codigo;
    expect(cupon).toMatch(/^CUP-[A-Z2-9]{8}$/);
    await api().post('/api/clientes/registro').set(bearer(tokenCliente)).send({ nombre: 'X', telefono: '1234' }).expect(400);
  });

  it('pide la cuenta y la mesa queda en "cuentaSolicitada"', async () => {
    await api().post(`/api/mesas/qr/${QR_MESA_5}/solicitar-cuenta`).set(bearer(tokenCliente)).expect(200);
    const mesas = await api().get('/api/mesas').set(como('mrodriguez')).expect(200);
    expect(mesas.body.find((m: any) => m.numero === 5).estado).toBe('cuentaSolicitada');
  });

  it('cierra la cuenta con el cupón (10 %) y el cupón queda usado', async () => {
    await api().post(`/api/cuentas/${idCuenta}/cerrar`).set(como('dsosa')).send({}).expect(403); // un cocinero no cierra
    const pendiente = await api().post(`/api/cuentas/${idCuenta}/cerrar`).set(como('mrodriguez')).send({ codigoCupon: cupon }).expect(409);
    expect(pendiente.body.mensaje).toMatch(/sin entregar/);
    const res = await api().post(`/api/cuentas/${idCuenta}/cerrar`).set(como('mrodriguez')).send({ codigoCupon: cupon, forzar: true }).expect(200);
    expect(res.body).toEqual(expect.objectContaining({ estado: 'cerrada', subtotal: 900, descuento: 90, total: 810 }));

    const otraCuenta = (await db.uno(`SELECT c.idCuenta AS id FROM Cuenta c JOIN Mesa m USING (idMesa) WHERE m.codigoQR = $1 AND c.estado = 'abierta'`, [QR_MESA_3]))!.id;
    const usado = await api().post(`/api/cuentas/${otraCuenta}/cerrar`).set(como('mrodriguez')).send({ codigoCupon: cupon, forzar: true }).expect(409);
    expect(usado.body.mensaje).toBe('El cupón ya fue usado.');
    await api().post(`/api/cuentas/${idCuenta}/cerrar`).set(como('mrodriguez')).send({}).expect(409); // ya cerrada
    void pedidoBarra;
  });
});

// ---------------------------------------------------------------------
describe('Fusión de perfiles por teléfono', () => {
  it('el mismo teléfono desde otro celular se une al cliente existente', async () => {
    const nuevo = await api().post('/api/clientes/identificar').send({ huella: 'otro-celular-de-sofia' }).expect(200);
    const res = await api().post('/api/clientes/registro').set(bearer(nuevo.body.token)).send({ nombre: 'Sofi', telefono: '099111222' }).expect(200);
    expect(res.body.fusionado).toBe(true);
    expect(res.body.cliente.nombre).toBe('Sofía Martínez');
    const otraVez = await api().post('/api/clientes/identificar').send({ huella: 'otro-celular-de-sofia' }).expect(200);
    expect(otraVez.body.cliente.id).toBe(res.body.cliente.id);
    // el token del perfil que se borró ya no sirve
    await api().get('/api/clientes/yo').set(bearer(nuevo.body.token)).expect(401);
  });
});

// ---------------------------------------------------------------------
describe('Reservas', () => {
  let tokenRegistrado: string;
  let tokenAnonimo: string;

  beforeAll(async () => {
    tokenAnonimo = (await api().post('/api/clientes/identificar').send({ huella: 'huella-anonima-0002' })).body.token;
    const t = (await api().post('/api/clientes/identificar').send({ huella: 'huella-reserva-0003' })).body.token;
    tokenRegistrado = (await api().post('/api/clientes/registro').set(bearer(t)).send({ nombre: 'Ana Reserva', telefono: '098 765 432' })).body.token;
  });

  it('muestra la disponibilidad por horario', async () => {
    const res = await api().get(`/api/reservas/disponibilidad?fecha=${manana()}&personas=4`).expect(200);
    expect(res.body.duracionMinutos).toBe(90);
    expect(res.body.horarios).toHaveLength(12);
    expect(res.body.horarios.some((h: any) => h.disponible)).toBe(true);
  });

  it('pide registro para reservar', async () => {
    const res = await api().post('/api/reservas').set(bearer(tokenAnonimo)).send({ fecha: manana(), hora: '20:00', personas: 2 }).expect(400);
    expect(res.body.mensaje).toMatch(/registrate/);
  });

  it('asigna mesas, junta mesas para grupos grandes y avisa cuando no hay lugar', async () => {
    const chica = await api().post('/api/reservas').set(bearer(tokenRegistrado)).send({ fecha: manana(), hora: '12:30', personas: 2 }).expect(201);
    expect(chica.body.mesas).toHaveLength(1);
    const grande = await api().post('/api/reservas').set(bearer(tokenRegistrado)).send({ fecha: manana(), hora: '12:30', personas: 20 }).expect(201);
    expect(grande.body.mesas.length).toBeGreaterThan(1);
    await api().post('/api/reservas').set(bearer(tokenRegistrado)).send({ fecha: manana(), hora: '12:30', personas: 20 }).expect(409);

    // cancelar: solo el dueño
    await api().post(`/api/reservas/${chica.body.id}/cancelar`).set(bearer(tokenAnonimo)).expect(403);
    const cancelada = await api().post(`/api/reservas/${chica.body.id}/cancelar`).set(bearer(tokenRegistrado)).expect(200);
    expect(cancelada.body.estado).toBe('cancelada');
    const agenda = await api().get(`/api/agenda?fecha=${manana()}`).set(como('mrodriguez')).expect(200);
    expect(agenda.body.map((r: any) => r.id)).toContain(grande.body.id);
  });

  it('marca no_show las reservas vencidas sin cuenta', async () => {
    await db.query(
      `INSERT INTO Reserva (idCliente, fechaHoraInicio, fechaHoraFin, cantidadPersonas)
       VALUES (2, now()::timestamp - interval '30 minutes', now()::timestamp + interval '60 minutes', 2)`,
    );
    const marcadas = await app.get(ReservasService).marcarNoShow();
    expect(marcadas).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------
describe('Personal (Administrador)', () => {
  it('solo el Administrador gestiona empleados', async () => {
    await api().get('/api/empleados').set(como('dsosa')).expect(403);
    const res = await api().get('/api/empleados').set(como('vpereira')).expect(200);
    expect(res.body.length).toBe(9); // Florencia está dada de baja
  });

  it('alta de empleado con usuario; los cargos sin acceso no tienen usuario', async () => {
    const cargos = (await api().get('/api/cargos').set(como('vpereira')).expect(200)).body;
    const mozo = cargos.find((c: any) => c.nombre === 'Mozo');
    const bachero = cargos.find((c: any) => c.nombre === 'Bachero');
    expect(mozo.accesoSistema).toBe(true);
    expect(bachero.accesoSistema).toBe(false);

    const emp = await api().post('/api/empleados').set(como('vpereira'))
      .send({ idCargo: mozo.id, nombre: 'Pablo', apellido: 'Vega', cedula: '6.111.222-3', telefono: '099 555 444' }).expect(201);
    await api().post(`/api/empleados/${emp.body.id}/usuario`).set(como('vpereira')).send({ usuario: 'pvega', contrasena: 'corta' }).expect(400);
    await api().post(`/api/empleados/${emp.body.id}/usuario`).set(como('vpereira')).send({ usuario: 'pvega', contrasena: 'Pablo.2026' }).expect(201);
    const token = await login('pvega', 'Pablo.2026');

    // Pasa a Bachero: pierde el acceso en el acto, aunque su token no haya vencido
    await api().patch(`/api/empleados/${emp.body.id}`).set(como('vpereira')).send({ idCargo: bachero.id }).expect(200);
    await api().get('/api/auth/yo').set(bearer(token)).expect(401);

    const jorge = res(await api().get('/api/empleados').set(como('vpereira'))).find((e: any) => e.nombre === 'Jorge');
    await api().post(`/api/empleados/${jorge.id}/usuario`).set(como('vpereira')).send({ usuario: 'jacosta', contrasena: 'Jorge.2026' }).expect(400);
  });

  it('dar de baja a un empleado le corta el acceso', async () => {
    const lista = (await api().get('/api/empleados').set(como('vpereira'))).body;
    const lucia = lista.find((e: any) => e.nombre === 'Lucía');
    const token = await login('lfernandez', 'Lucia.2026');
    await api().patch(`/api/empleados/${lucia.id}`).set(como('vpereira')).send({ activo: false }).expect(200);
    await api().get('/api/auth/yo').set(bearer(token)).expect(401);
    await api().post('/api/auth/login').send({ usuario: 'lfernandez', contrasena: 'Lucia.2026' }).expect(401);
  });

  it('los cuatro cargos del sistema no se renombran ni se borran', async () => {
    const cargos = (await api().get('/api/cargos').set(como('vpereira'))).body;
    const mozo = cargos.find((c: any) => c.nombre === 'Mozo');
    await api().patch(`/api/cargos/${mozo.id}`).set(como('vpereira')).send({ nombre: 'Camarero' }).expect(409);
    await api().delete(`/api/cargos/${mozo.id}`).set(como('vpereira')).expect(409);
    const nuevo = await api().post('/api/cargos').set(como('vpereira')).send({ nombre: 'Jardinero' }).expect(201);
    await api().delete(`/api/cargos/${nuevo.body.id}`).set(como('vpereira')).expect(204);
  });
});

function res(r: request.Response) {
  return r.body;
}
