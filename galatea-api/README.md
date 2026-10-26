# Galatea API

Backend de Galatea: menú, pedidos por QR divididos en cocina y barra, cuentas con cupón de bienvenida, reservas con asignación de mesas y gestión del personal.

**Stack:** Node.js 20+, NestJS 10, PostgreSQL 15+ (driver `pg`, SQL explícito), JWT, bcrypt, Supabase Storage para las fotos.

El modelo de datos es `Documentacion/modelo_relacional06.sql`. Está copiado en `database/schema.sql` y tiene que ser idéntico.

---

## Puesta en marcha

### 1. Requisitos
- Node.js 20 o superior.
- Un PostgreSQL 15 o superior. Puede ser uno local o el de un proyecto de Supabase (ver más abajo).

### 2. Instalar y configurar
```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```
Completá `.env`:
- `DATABASE_URL`: cadena de conexión a Postgres.
- `JWT_SECRET`: una cadena larga y aleatoria.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: los datos de Supabase Storage.
- `BFL_API_KEY` (opcional): solo para generar fotos con FLUX.

### 3. Crear la base con datos de prueba
```bash
npm run db:reset          # schema + datos de prueba
npm run fotos:subir       # sube las 62 fotos del menú a Supabase y guarda las URLs
```
Las 35 fotos generadas con FLUX ya están en `assets/menu`. Para regenerarlas hace falta `BFL_API_KEY` en el `.env` y `npm run fotos:generar` (solo genera las que faltan; `-- --forzar` las rehace todas, cada imagen gasta créditos de BFL).
`db:reset` borra y recrea **solo** el schema `galatea` (configurable con `DB_SCHEMA`), nunca toca `public`. Es seguro correrlo sobre el Postgres de Supabase.

**QR de las mesas:** `npm run qr:mesas` deja en `qr-mesas/` un SVG por mesa y `imprimir.html` (hoja A4 para imprimir). Cada QR apunta a `<WEB_URL>/?mesa=<codigoQR>`; sin `WEB_URL` usa la IP de la PC en el wifi y el puerto 5173, para probar con el celular. Para producción: `npm run qr:mesas -- https://<dominio>`.

### 4. Levantar la API
```bash
npm run dev               # http://localhost:3000/api (se recarga sola al guardar)
```
Para comprobar que llega a la base: `GET http://localhost:3000/api/salud`.

---

## Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **Storage (fotos):**
   - En *Project Settings → API* copiá la **Project URL** a `SUPABASE_URL` y la clave **service_role** a `SUPABASE_SERVICE_ROLE_KEY`.
   - `npm run fotos:subir` crea el bucket `galatea` (público para lectura) si no existe.
   - En la base se guarda **solo la URL pública** de cada foto (`Producto.foto`, `Empleado.foto`).
3. **Base de datos (opcional, si no usás un Postgres local):**
   - En *Connect* copiá la cadena del **Session pooler** o la **Direct connection**. No uses el *Transaction pooler*: la API fija el schema y la zona horaria por conexión.
   - Poné `DATABASE_SSL=true`.

> La `service_role` key saltea los permisos de Storage: va **solo** en este backend, nunca en el frontend ni en un repositorio público.

---

## Usuarios de prueba

Las contraseñas están guardadas con bcrypt y son solo para desarrollo.

| Usuario | Contraseña | Cargo |
|---|---|---|
| `vpereira` | `Valentina.2026` | Administrador |
| `mrodriguez` | `Martin.2026` | Mozo |
| `lfernandez` | `Lucia.2026` | Mozo |
| `dsosa` | `Diego.2026` | Cocinero |
| `cmendez` | `Camila.2026` | Cocinero |
| `snunez` | `Santiago.2026` | Bartender |
| `fsilva` | `Florencia.2026` | Mozo **dada de baja**: no puede entrar |

El bachero, el portero y la ayudante de cocina no tienen usuario: sus cargos no tienen acceso al sistema.

Para generar el hash de otra contraseña: `npm run hash -- "MiClave.2026"`.

## Datos de prueba
- **Menú:** la carta real de Galatea (`Carta Galatea.pdf`): 10 categorías, 62 productos, 71 presentaciones (individual/familiar, p1/p2, copa/botella). Todos tienen foto en `assets/menu`: 27 reales y 35 generadas con FLUX (postres, tragos, cervezas, vinos, gramajo vegetariano y las tres variantes de abajo).
  - Fuera de la carta impresa: *Fritas salseadas con champi*, *Fritas salseadas con cheddar y bacon* ($380) y *Gramajo para 2* ($580), porque había fotos de esos platos.
  - Agotado por hoy: el Crumble de manzana y la botella de Familia Gascón.
  - Etiquetas: solo las que dice la carta (Gramajo vegetariano, Estrella Galicia sin gluten y sin alcohol).
- **Inventado:** 12 mesas con su QR, 12 clientes (6 registrados con cupón de bienvenida), 28 días de historial (unas 108 cuentas cerradas, 206 pedidos), reservas pasadas y futuras, recomendaciones y partidas del juego.
- **Ahora mismo:** la mesa 3 está ocupada (pedido en preparación) y la 8 pidió la cuenta.
- **Fechas:** son relativas al día en que se corre `db:reset`, así siempre hay historial reciente y reservas a futuro.

---

## Endpoints (prefijo `/api`)

Hay tres tipos de acceso:
- **Público:** sin token.
- **Cliente:** token de `POST /clientes/identificar`.
- **Personal:** token de `POST /auth/login`, con permisos según el cargo.

| Método y ruta | Acceso | Para qué |
|---|---|---|
| `GET /menu?sector=&etiqueta=` | Público | Carta por categoría, con presentaciones, etiquetas y "agotado" |
| `GET /menu/productos/:id` · `GET /menu/etiquetas` | Público | Detalle de un producto y lista de etiquetas |
| `POST /auth/login` · `GET /auth/yo` | Público · Personal | Ingreso del personal |
| `POST /clientes/identificar` | Público | Huella del dispositivo → token del cliente (anónimo o no) |
| `POST /clientes/registro` · `GET /clientes/yo` | Cliente | Nombre y teléfono → cupón del 10 %. Si el teléfono ya existe, fusiona los perfiles |
| `GET /mesas/qr/:codigo` | Público | Resuelve el QR de la mesa |
| `GET /mesas/qr/:codigo/cuenta` · `POST .../solicitar-cuenta` | Cliente | Ver la cuenta de la mesa y pedirla |
| `POST /pedidos/qr` | Cliente | Pedido desde la mesa; se divide en cocina y barra |
| `POST /pedidos/asistido` | Mozo, Admin | Pedido cargado por el mozo |
| `GET /pedidos` · `PATCH /pedidos/:id/estado` | Personal | Pantallas de cocina/barra/mozo; pendiente → preparación → listo → entregado |
| `GET /mesas` | Personal | Plano del salón: estado, cuenta abierta, próxima reserva |
| `GET /cuentas` · `GET /cuentas/:id` · `POST /cuentas/:id/cerrar` | Mozo, Bartender, Admin | Cuentas abiertas y cierre con cupón |
| `GET /reservas/disponibilidad?fecha=&personas=` | Público | Horarios con lugar |
| `POST /reservas` · `GET /reservas/mias` · `POST /reservas/:id/cancelar` | Cliente (registrado) | Reservar, ver y cancelar |
| `GET /agenda?fecha=` · `POST /agenda/:id/cancelar` | Personal | Reservas del día |
| `POST/PATCH /productos…` · `PATCH /presentaciones/:id` | Cocinero (cocina), Bartender (barra), Admin | Alta y edición del menú, "Agotado por hoy" |
| `POST/DELETE /productos/:id/foto` | Igual que arriba | Foto a Supabase Storage (multipart, campo `foto`, JPG/PNG/WebP, hasta 5 MB) |
| `GET/POST/PATCH /categorias-menu` · `POST /etiquetas` | Admin | Categorías y etiquetas |
| `GET/POST/PATCH/DELETE /cargos` | Admin | Cargos (los 4 del sistema no se renombran ni se borran) |
| `GET/POST/PATCH /empleados` · `POST /empleados/:id/foto` · `POST/PATCH /empleados/:id/usuario` | Admin | Personal y acceso al sistema |

Los errores vuelven como `{ "statusCode": 409, "mensaje": "..." }`, con el mensaje en español listo para mostrar.

---

## Decisiones técnicas
- **SQL explícito con `pg`, sin ORM.** Buena parte de las reglas viven en la base (triggers, `EXCLUDE` de reservas, `obtener_o_abrir_cuenta`) y un ORM las duplicaría o las saltearía. La API traduce esos errores a mensajes claros.
- **Precios siempre desde la base.** Al pedir se copia el precio vigente de la presentación; lo que mande el cliente no cuenta.
- **Permisos por cargo, revisados en cada request.** Si el Administrador da de baja a alguien o le cambia el cargo, pierde el acceso en el acto, sin esperar a que venza el token.
- **Hora de Montevideo.** Las fechas se guardan sin zona (`TIMESTAMP`) y cada conexión usa `America/Montevideo`. Así funciona igual sobre Supabase, que corre en UTC.
- **No show automático.** Cada 5 minutos, las reservas confirmadas sin cuenta 10 minutos después del inicio pasan a `no_show` y liberan la mesa.
- **Login sin pistas.** El mismo mensaje y el mismo tiempo de respuesta para usuario inexistente, contraseña mala o usuario dado de baja.

## Pruebas
27 pruebas de punta a punta contra un PostgreSQL real, en una base aparte. Recrean el schema y los datos al empezar.
```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/galatea_test npm test
```
Cubren la carta, el login, los permisos por cargo y sector, las fotos, el pedido por QR dividido por sector, los estados de cocina/barra, el cierre con cupón, la fusión de perfiles, las reservas y el no show, y la gestión del personal.

## Pendiente
- Tiempo real con WebSockets (avisar a cocina, barra y mozo sin recargar).
- Enviar el cupón por WhatsApp (Twilio/n8n). Hoy vuelve en la respuesta del registro.
- Endpoints del juego (Experiencia Galatea) y de recomendaciones con IA: el modelo y los datos ya están.
- Promociones, cuando se definan con el restaurante.
- Límite de intentos en el login.
