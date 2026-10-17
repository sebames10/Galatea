-- =====================================================================
-- GALATEA — Datos de prueba (para el modelo relacional v06)
--
-- * Menú: carta real de Galatea ("Carta Galatea.pdf"), con los textos y
--   precios tal cual. Las fotos se suben aparte a Supabase Storage con
--   `npm run fotos:subir`, que completa Producto.foto con la URL.
-- * Todo lo demás (personal, clientes, mesas, reservas, historial de
--   cuentas y pedidos, juego) es inventado.
-- * Las fechas son relativas al día en que se corre (CURRENT_DATE), así
--   siempre hay historial reciente y reservas a futuro.
-- * Corre en una sola transacción: la regla "todo producto tiene al menos
--   una presentación" se controla al confirmar (COMMIT).
--
-- Usuarios de prueba (contraseñas solo para desarrollo, guardadas con
-- bcrypt):
--   vpereira   / Valentina.2026  Administrador
--   mrodriguez / Martin.2026     Mozo
--   lfernandez / Lucia.2026      Mozo
--   dsosa      / Diego.2026      Cocinero
--   cmendez    / Camila.2026     Cocinero
--   snunez     / Santiago.2026   Bartender
--   fsilva     / Florencia.2026  Mozo (dada de baja: no puede entrar)
-- =====================================================================

BEGIN;

DO $$ BEGIN PERFORM setseed(0.42); END $$;  -- random() reproducible: siempre los mismos datos

-- =====================================================================
-- PERSONAL
-- =====================================================================
INSERT INTO Cargo (nombre, descripcion) VALUES
    ('Administrador', 'Gestiona el menú, el personal y los reportes.'),
    ('Mozo',          'Atiende el salón, carga pedidos y cierra cuentas.'),
    ('Cocinero',      'Prepara los pedidos de cocina.'),
    ('Bartender',     'Prepara los pedidos de barra.'),
    ('Bachero',       'Lavado de vajilla.'),
    ('Portero',       'Recepción y control de ingreso.');

INSERT INTO Empleado (idCargo, nombre, apellido, cedula, telefono, email, fechaIngreso, activo)
SELECT c.idCargo, v.nombre, v.apellido, v.cedula, v.telefono, v.email, v.ingreso, v.activo
  FROM (VALUES
    ('Administrador', 'Valentina', 'Pereira',   '4.512.338-1', '099 412 330', 'valentina.pereira@galatea.uy', DATE '2023-03-01', true),
    ('Mozo',          'Martín',    'Rodríguez', '5.120.774-6', '098 220 145', 'martin.rodriguez@galatea.uy',  DATE '2024-02-15', true),
    ('Mozo',          'Lucía',     'Fernández', '5.334.091-2', '094 871 602', NULL,                           DATE '2025-06-10', true),
    ('Cocinero',      'Diego',     'Sosa',      '3.987.210-4', '091 305 778', 'diego.sosa@galatea.uy',        DATE '2023-03-01', true),
    ('Cocinero',      'Camila',    'Méndez',    '5.601.457-9', '092 640 913', NULL,                           DATE '2025-01-20', true),
    ('Bartender',     'Santiago',  'Núñez',     '4.876.552-3', '099 518 207', 'santiago.nunez@galatea.uy',    DATE '2023-09-05', true),
    ('Mozo',          'Florencia', 'Silva',     '5.210.983-0', '097 446 812', NULL,                           DATE '2024-04-01', false),
    ('Bachero',       'Jorge',     'Acosta',    '3.455.120-8', '096 233 590', NULL,                           DATE '2024-11-11', true),
    ('Portero',       'Ramiro',    'Castro',    '4.098.765-5', '095 781 004', NULL,                           DATE '2025-03-03', true),
    ('Cocinero',      'Andrea',    'Torres',    '6.012.334-7', '093 112 668', NULL,                           DATE '2026-05-02', true)
  ) AS v(cargo, nombre, apellido, cedula, telefono, email, ingreso, activo)
  JOIN Cargo c ON c.nombre = v.cargo;

-- Solo los cuatro cargos del sistema tienen usuario. Andrea (ayudante de
-- cocina), el bachero y el portero no usan el sistema.
INSERT INTO UsuarioInterno (idEmpleado, usuario, contrasenaHash, activo)
SELECT e.idEmpleado, v.usuario, v.hash, v.activo
  FROM (VALUES
    ('4.512.338-1', 'vpereira',   '$2b$10$4X1bksltJQq.p9NYMXTb0.CCIA46otAAEYnBYNg/U1id5JJZmMhiC', true),
    ('5.120.774-6', 'mrodriguez', '$2b$10$NcJExFbVLklYiLAcAxEJ0uqq780ahzSf5GWkk88GrYKPNp0ifXtrG', true),
    ('5.334.091-2', 'lfernandez', '$2b$10$8gBe5K2hHrabAxRexzM3VeA/SuEkwdHlmTlEUfLf3boMK3V7zshCy', true),
    ('3.987.210-4', 'dsosa',      '$2b$10$J0SnYj36bJUbPXDf9fGLQe2E6owILJ9aKRg31Ba3FlUmCDHAc2R6W', true),
    ('5.601.457-9', 'cmendez',    '$2b$10$BwpO.ogLGtp2GzU4.Hs1J.ZQ8z5JIdaODL6tT6VYSEENHjh7mt7O.', true),
    ('4.876.552-3', 'snunez',     '$2b$10$jb0u2yXUNP2iQtUDOlA5MOm0jAhv8R/8lC9Q.KbpsXCG1jnrlvh9C', true),
    ('5.210.983-0', 'fsilva',     '$2b$10$Su84Dy1l.HgjwAFrI72zqOS37e4saJOI0xcX9Vei57P.NJNjfQ5yy', false)
  ) AS v(cedula, usuario, hash, activo)
  JOIN Empleado e ON e.cedula = v.cedula;

-- =====================================================================
-- MESAS (el código QR es el que va impreso en cada mesa)
-- =====================================================================
INSERT INTO Mesa (numero, capacidad, codigoQR) VALUES
    (1, 2, 'GAL-M01-K7Q2'), (2, 2, 'GAL-M02-P4W9'), (3, 4, 'GAL-M03-Z8N1'),
    (4, 4, 'GAL-M04-R2T6'), (5, 4, 'GAL-M05-H9C3'), (6, 4, 'GAL-M06-L5V8'),
    (7, 6, 'GAL-M07-B3X7'), (8, 6, 'GAL-M08-F6J4'), (9, 4, 'GAL-M09-D1M5'),
    (10, 4, 'GAL-M10-S8G2'), (11, 8, 'GAL-M11-Y4K9'), (12, 2, 'GAL-M12-W7E3');

-- =====================================================================
-- MENÚ (carta Galatea)
-- =====================================================================
INSERT INTO CategoriaMenu (nombre, sector, orden) VALUES
    ('Para picar',     'cocina', 1),
    ('Pizzetas',       'cocina', 2),
    ('Chivitos',       'cocina', 3),
    ('Hamburguesas',   'cocina', 4),
    ('Milanesas',      'cocina', 5),
    ('Para compartir', 'cocina', 6),
    ('Postres',        'cocina', 7),
    ('Tragos',         'barra',  8),
    ('Cervezas',       'barra',  9),
    ('Vinos',          'barra',  10);

-- Los productos de cocina los cargó el cocinero (dsosa) y los de barra el
-- bartender (snunez).
INSERT INTO Producto (idCategoriaMenu, idCreador, nombre, descripcion)
SELECT c.idCategoriaMenu, u.idUsuarioInterno, v.nombre, v.descripcion
  FROM (VALUES
    -- Para picar
    ('Para picar', 'Fritas', NULL),
    ('Para picar', 'Fritas salseadas', NULL),
    -- Variantes con foto propia que no figuran en la carta impresa.
    ('Para picar', 'Fritas salseadas con champi', NULL),
    ('Para picar', 'Fritas salseadas con cheddar y bacon', NULL),
    ('Para picar', 'Bastones de muzzarella', NULL),
    ('Para picar', 'Bastones de pollo', NULL),
    ('Para picar', 'Aros de cebolla', NULL),
    ('Para picar', 'Gramajo', NULL),
    ('Para picar', 'Gramajo para 2', NULL),
    ('Para picar', 'Gramajo vegetariano', NULL),
    -- Pizzetas
    ('Pizzetas', 'Pizzeta', 'Muzzarella.'),
    ('Pizzetas', 'Caprese', 'Muzzarella, tomate y albahaca.'),
    ('Pizzetas', 'Galatea', 'Muzzarella, panceta, cheddar y huevo frito.'),
    ('Pizzetas', 'Quijote', 'Muzzarella, cebolla caramelizada y panceta.'),
    ('Pizzetas', 'Dulcinea', 'Muzzarella, jamón y aceitunas.'),
    ('Pizzetas', 'Faina', NULL),
    ('Pizzetas', 'Faina con muzzarella', NULL),
    -- Chivitos
    ('Chivitos', 'Canadiense al plato', 'Jamón, muzzarella, panceta, huevo frito, morron y aceitunas con fritas y mixta.'),
    ('Chivitos', 'Canadiense al pan', 'mayonesa, lechuga, tomate, jamón, muzzarella, panceta, huevo frito, aceitunas y morrón.'),
    ('Chivitos', 'Chivito común', 'Mayonesa, Lechuga, tomate y huevo duro.'),
    -- Hamburguesas
    ('Hamburguesas', 'Hamb completa', 'Lechuga, tomate, cebolla, jamón, muzza, panceta y huevo frito.'),
    ('Hamburguesas', 'Hamb común', 'Lechuga, tomate, cebolla y huevo duro.'),
    ('Hamburguesas', 'Hamb Galatea', 'Cheddar, panceta, cebolla caramelizada, huevo frito, salsa de la casa.'),
    -- Milanesas
    ('Milanesas', 'Al plato', 'Mixta con cebolla.'),
    ('Milanesas', 'A caballo', '2 huevos fritos con fritas.'),
    ('Milanesas', 'Caprese', 'muzzarella, tomate cherry y albahaca con fritas.'),
    ('Milanesas', 'Napolitana', 'jamón, muzzarella, fileto, mixta y fritas.'),
    ('Milanesas', 'Galatea', 'Crema cheddar, cebolla caramelizada, panceta con fritas.'),
    -- Para compartir
    ('Para compartir', 'Picada 1', 'Fritas, aros de cebolla, bastones de muzzarella dip de cheddar.'),
    ('Para compartir', 'Picada 2', 'Fritas salseadas, bastones de pollo, aros de cebolla.'),
    ('Para compartir', 'Picada 3', 'Milanesa de carne, bastones de pollo, bastones de muzzarella, fritas, aros de cebolla y dip de cheddar y fileto.'),
    -- Postres
    ('Postres', 'Bocha de helado', NULL),
    ('Postres', 'Brownie', NULL),
    ('Postres', 'Brownie con helado', NULL),
    ('Postres', 'Crumble con helado', NULL),
    ('Postres', 'Crumble de manzana', NULL),
    ('Postres', 'Panqueque con dulce de leche', NULL),
    -- Tragos
    ('Tragos', 'Highball Blonde & Lemon', 'Johnnie Walker® Blonde™, refresco lima y gajo de limón.'),
    ('Tragos', 'Johnnie Walker Red & Cola', 'Johnnie Walker® Red Label™, refresco cola.'),
    ('Tragos', 'Tanqueray & Tonic', 'Tanqueray® London Dry Gin, agua tónica y rodaja de limón.'),
    ('Tragos', 'Johnnie Walker® Black Label™', NULL),
    ('Tragos', 'Johnnie Walker® Red Label™', NULL),
    ('Tragos', 'Negroni', 'Tanqueray® London Dry Gin, vermut rosso y Campari.'),
    ('Tragos', 'Smirnoff & Pomelo', 'Smirnoff® No. 21 y refresco pomelo.'),
    ('Tragos', 'Mojito', 'Ron, azúcar y menta.'),
    ('Tragos', 'Cuba libre', 'Ron y refresco cola.'),
    ('Tragos', 'Campari Tonic', NULL),
    ('Tragos', 'Tinto de verano', NULL),
    ('Tragos', 'Jäger Bomb', NULL),
    ('Tragos', 'Jäger Mojito', NULL),
    ('Tragos', 'Fernet con coca', NULL),
    ('Tragos', 'Aperol spritz', NULL),
    ('Tragos', 'Campari Orange', NULL),
    ('Tragos', 'Trago sugerencia', NULL),
    -- Cervezas
    ('Cervezas', 'Heineken', NULL),
    ('Cervezas', 'Tirada Rubia', NULL),
    ('Cervezas', 'Tirada IPA', NULL),
    ('Cervezas', 'Tirada Maracuyá', NULL),
    ('Cervezas', 'Estrella Galicia sin gluten', NULL),
    ('Cervezas', 'Estrella Galicia sin alcohol', NULL),
    -- Vinos
    ('Vinos', 'Trapiche', 'Chardonnay, Malbec y Cabernet Sauvignon'),
    ('Vinos', 'Familia Gascón', 'Malbec y Cabernet Sauvignon')
  ) AS v(categoria, nombre, descripcion)
  JOIN CategoriaMenu c ON c.nombre = v.categoria
  JOIN UsuarioInterno u ON u.usuario = CASE c.sector WHEN 'cocina' THEN 'dsosa' ELSE 'snunez' END;

-- Presentaciones: 'Estándar' cuando hay un solo precio.
INSERT INTO Presentacion (idProducto, nombre, precio, orden)
SELECT p.idProducto, v.presentacion, v.precio, v.orden
  FROM (VALUES
    ('Para picar', 'Fritas', 'Estándar', 210, 1),
    ('Para picar', 'Fritas salseadas', 'Estándar', 380, 1),
    ('Para picar', 'Fritas salseadas con champi', 'Estándar', 380, 1),
    ('Para picar', 'Fritas salseadas con cheddar y bacon', 'Estándar', 380, 1),
    ('Para picar', 'Bastones de muzzarella', 'Estándar', 390, 1),
    ('Para picar', 'Bastones de pollo', 'Estándar', 470, 1),
    ('Para picar', 'Aros de cebolla', 'Estándar', 290, 1),
    ('Para picar', 'Gramajo', 'p1', 490, 1),
    ('Para picar', 'Gramajo', 'p2', 580, 2),
    ('Para picar', 'Gramajo para 2', 'Estándar', 580, 1),
    ('Para picar', 'Gramajo vegetariano', 'p1', 550, 1),
    ('Para picar', 'Gramajo vegetariano', 'p2', 690, 2),
    ('Pizzetas', 'Pizzeta', 'Individual (22cm)', 280, 1),
    ('Pizzetas', 'Pizzeta', 'Familiar (32cm)', 390, 2),
    ('Pizzetas', 'Caprese', 'Individual (22cm)', 420, 1),
    ('Pizzetas', 'Caprese', 'Familiar (32cm)', 550, 2),
    ('Pizzetas', 'Galatea', 'Individual (22cm)', 470, 1),
    ('Pizzetas', 'Galatea', 'Familiar (32cm)', 650, 2),
    ('Pizzetas', 'Quijote', 'Individual (22cm)', 420, 1),
    ('Pizzetas', 'Quijote', 'Familiar (32cm)', 550, 2),
    ('Pizzetas', 'Dulcinea', 'Individual (22cm)', 420, 1),
    ('Pizzetas', 'Dulcinea', 'Familiar (32cm)', 550, 2),
    ('Pizzetas', 'Faina', 'Estándar', 210, 1),
    ('Pizzetas', 'Faina con muzzarella', 'Estándar', 260, 1),
    ('Chivitos', 'Canadiense al plato', 'Estándar', 550, 1),
    ('Chivitos', 'Canadiense al pan', 'Estándar', 510, 1),
    ('Chivitos', 'Chivito común', 'Estándar', 490, 1),
    ('Hamburguesas', 'Hamb completa', 'Estándar', 510, 1),
    ('Hamburguesas', 'Hamb común', 'Estándar', 490, 1),
    ('Hamburguesas', 'Hamb Galatea', 'Estándar', 550, 1),
    ('Milanesas', 'Al plato', 'Estándar', 520, 1),
    ('Milanesas', 'A caballo', 'Estándar', 550, 1),
    ('Milanesas', 'Caprese', 'Estándar', 580, 1),
    ('Milanesas', 'Napolitana', 'Estándar', 580, 1),
    ('Milanesas', 'Galatea', 'Estándar', 580, 1),
    ('Para compartir', 'Picada 1', 'Estándar', 790, 1),
    ('Para compartir', 'Picada 2', 'Estándar', 890, 1),
    ('Para compartir', 'Picada 3', 'Estándar', 1090, 1),
    ('Postres', 'Bocha de helado', 'Estándar', 120, 1),
    ('Postres', 'Brownie', 'Estándar', 220, 1),
    ('Postres', 'Brownie con helado', 'Estándar', 310, 1),
    ('Postres', 'Crumble con helado', 'Estándar', 310, 1),
    ('Postres', 'Crumble de manzana', 'Estándar', 220, 1),
    ('Postres', 'Panqueque con dulce de leche', 'Estándar', 250, 1),
    ('Tragos', 'Highball Blonde & Lemon', 'Estándar', 300, 1),
    ('Tragos', 'Johnnie Walker Red & Cola', 'Estándar', 250, 1),
    ('Tragos', 'Tanqueray & Tonic', 'Estándar', 270, 1),
    ('Tragos', 'Johnnie Walker® Black Label™', 'Estándar', 290, 1),
    ('Tragos', 'Johnnie Walker® Red Label™', 'Estándar', 230, 1),
    ('Tragos', 'Negroni', 'Estándar', 340, 1),
    ('Tragos', 'Smirnoff & Pomelo', 'Estándar', 250, 1),
    ('Tragos', 'Mojito', 'Estándar', 270, 1),
    ('Tragos', 'Cuba libre', 'Estándar', 250, 1),
    ('Tragos', 'Campari Tonic', 'Estándar', 250, 1),
    ('Tragos', 'Tinto de verano', 'Estándar', 250, 1),
    ('Tragos', 'Jäger Bomb', 'Estándar', 320, 1),
    ('Tragos', 'Jäger Mojito', 'Estándar', 300, 1),
    ('Tragos', 'Fernet con coca', 'Estándar', 250, 1),
    ('Tragos', 'Aperol spritz', 'Estándar', 290, 1),
    ('Tragos', 'Campari Orange', 'Estándar', 250, 1),
    ('Tragos', 'Trago sugerencia', 'Estándar', 380, 1),
    ('Cervezas', 'Heineken', '1 litro', 380, 1),
    ('Cervezas', 'Tirada Rubia', 'Estándar', 240, 1),
    ('Cervezas', 'Tirada IPA', 'Estándar', 240, 1),
    ('Cervezas', 'Tirada Maracuyá', 'Estándar', 240, 1),
    ('Cervezas', 'Estrella Galicia sin gluten', 'Estándar', 240, 1),
    ('Cervezas', 'Estrella Galicia sin alcohol', 'Estándar', 240, 1),
    ('Vinos', 'Trapiche', 'Copa', 220, 1),
    ('Vinos', 'Trapiche', 'Botella', 690, 2),
    ('Vinos', 'Familia Gascón', 'Copa', 220, 1),
    ('Vinos', 'Familia Gascón', 'Botella', 790, 2)
  ) AS v(categoria, producto, presentacion, precio, orden)
  JOIN CategoriaMenu c ON c.nombre = v.categoria
  JOIN Producto p ON p.idCategoriaMenu = c.idCategoriaMenu AND p.nombre = v.producto;

-- Etiquetas: solo las que la carta dice explícitamente.
INSERT INTO Etiqueta (nombre) VALUES ('Vegetariano'), ('Sin gluten'), ('Sin alcohol');

INSERT INTO ProductoEtiqueta (idProducto, idEtiqueta)
SELECT p.idProducto, e.idEtiqueta
  FROM (VALUES
    ('Gramajo vegetariano', 'Vegetariano'),
    ('Estrella Galicia sin gluten', 'Sin gluten'),
    ('Estrella Galicia sin alcohol', 'Sin alcohol')
  ) AS v(producto, etiqueta)
  JOIN Producto p ON p.nombre = v.producto
  JOIN Etiqueta e ON e.nombre = v.etiqueta;

-- =====================================================================
-- CLIENTES (registrados y anónimos) Y SUS DISPOSITIVOS
-- =====================================================================
INSERT INTO Cliente (alias, nombre, telefono, fechaAlta, preferenciasInferidas) VALUES
    ('Sofi',  'Sofía Martínez',  '099 111 222', CURRENT_DATE - 60, '{"categorias": ["Pizzetas", "Tragos"], "horario": "noche"}'),
    (NULL,    'Nicolás Gómez',   '098 333 444', CURRENT_DATE - 45, '{"categorias": ["Hamburguesas", "Cervezas"], "horario": "noche"}'),
    ('Agus',  'Agustina López',  '094 555 666', CURRENT_DATE - 40, '{"categorias": ["Milanesas", "Vinos"], "horario": "mediodia"}'),
    (NULL,    'Federico Díaz',   '091 777 888', CURRENT_DATE - 33, '{"categorias": ["Para compartir", "Cervezas"], "grupo": true}'),
    ('Caro',  'Carolina Ruiz',   '092 999 000', CURRENT_DATE - 21, '{"etiquetas": ["Vegetariano"], "categorias": ["Pizzetas"]}'),
    (NULL,    'Joaquín Benítez', '097 123 123', CURRENT_DATE - 12, NULL),
    ('Mesa 3', NULL, NULL, CURRENT_DATE - 25, NULL),
    (NULL,     NULL, NULL, CURRENT_DATE - 18, NULL),
    ('Tincho', NULL, NULL, CURRENT_DATE - 10, NULL),
    (NULL,     NULL, NULL, CURRENT_DATE - 6,  NULL),
    (NULL,     NULL, NULL, CURRENT_DATE - 3,  NULL),
    ('Pato',   NULL, NULL, CURRENT_DATE - 1,  NULL);

-- Huella de FingerprintJS (32 hex) por dispositivo; algunos clientes
-- tienen dos dispositivos (por eso se fusionaron perfiles).
INSERT INTO HuellaDispositivo (hash, idCliente, fechaVinculacion)
SELECT md5('dispositivo-' || c.idCliente || '-' || n), c.idCliente, c.fechaAlta + (n || ' days')::interval
  FROM Cliente c
  CROSS JOIN generate_series(1, 2) AS n
 WHERE n = 1 OR c.idCliente IN (1, 3, 4);

-- Cupón de bienvenida (10 %) para cada cliente registrado
INSERT INTO CuponDescuento (idCliente, codigoQR, tipo, porcentaje, fechaGeneracion)
SELECT idCliente, 'CUP-' || upper(substr(md5('cupon-' || idCliente), 1, 8)), 'bienvenida', 10, fechaAlta
  FROM Cliente
 WHERE telefono IS NOT NULL;

-- =====================================================================
-- HISTORIAL: cuentas cerradas de los últimos 28 días, con pedidos por
-- sector, algunas reservas concretadas y cupones usados. Sirve para los
-- reportes y las recomendaciones.
-- =====================================================================
DO $$
DECLARE
    v_pres_cocina  INT[] := ARRAY(SELECT pr.idPresentacion FROM Presentacion pr JOIN Producto p USING (idProducto)
                                   JOIN CategoriaMenu c USING (idCategoriaMenu) WHERE c.sector = 'cocina' ORDER BY 1);
    v_pres_barra   INT[] := ARRAY(SELECT pr.idPresentacion FROM Presentacion pr JOIN Producto p USING (idProducto)
                                   JOIN CategoriaMenu c USING (idCategoriaMenu) WHERE c.sector = 'barra' ORDER BY 1);
    v_mozos        INT[] := ARRAY(SELECT u.idUsuarioInterno FROM UsuarioInterno u WHERE u.usuario IN ('mrodriguez', 'lfernandez') ORDER BY 1);
    v_cierran      INT[] := ARRAY(SELECT u.idUsuarioInterno FROM UsuarioInterno u WHERE u.usuario IN ('mrodriguez', 'lfernandez', 'snunez', 'vpereira') ORDER BY 1);
    v_registrados  INT[] := ARRAY(SELECT idCliente FROM Cliente WHERE telefono IS NOT NULL ORDER BY 1);
    v_clientes     INT[] := ARRAY(SELECT idCliente FROM Cliente ORDER BY 1);
    v_dia          DATE;
    v_turno        INT;
    v_apertura     TIMESTAMP;
    v_mesa         RECORD;
    v_personas     INT;
    v_cliente      INT;
    v_reserva      INT;
    v_cuenta       INT;
    v_pedido       INT;
    v_cupon        INT;
    v_sector       TEXT;
    v_items        INT;
    v_pres         INT;
    v_subtotal     NUMERIC(10,2);
    v_descuento    NUMERIC(10,2);
    v_cierre       TIMESTAMP;
    v_qr           BOOLEAN;
BEGIN
    FOR d IN REVERSE 28..1 LOOP
        v_dia := CURRENT_DATE - d;
        FOR v_turno IN 1..(2 + floor(random() * 4))::INT LOOP
            -- mediodía o noche
            v_apertura := v_dia + CASE WHEN random() < 0.35
                                       THEN TIME '12:30' + (floor(random() * 5) * INTERVAL '20 minutes')
                                       ELSE TIME '20:30' + (floor(random() * 7) * INTERVAL '20 minutes') END;
            SELECT * INTO v_mesa FROM Mesa ORDER BY random() LIMIT 1;
            v_personas := greatest(1, v_mesa.capacidad - floor(random() * 2)::INT);
            v_qr := random() < 0.6;
            v_cliente := v_clientes[1 + floor(random() * array_length(v_clientes, 1))::INT];

            -- 30 % de las veces la mesa venía reservada por un cliente registrado
            v_reserva := NULL;
            IF random() < 0.3 THEN
                v_cliente := v_registrados[1 + floor(random() * array_length(v_registrados, 1))::INT];
                INSERT INTO Reserva (idCliente, fechaHoraInicio, fechaHoraFin, cantidadPersonas, estado)
                VALUES (v_cliente, v_apertura, v_apertura + CASE WHEN v_personas <= 2 THEN INTERVAL '60 minutes'
                                                                 WHEN v_personas <= 4 THEN INTERVAL '90 minutes'
                                                                 WHEN v_personas <= 8 THEN INTERVAL '150 minutes'
                                                                 ELSE INTERVAL '180 minutes' END,
                        v_personas, 'confirmada')
                RETURNING idReserva INTO v_reserva;
                INSERT INTO ReservaMesa (idReserva, idMesa) VALUES (v_reserva, v_mesa.idMesa);
            END IF;

            INSERT INTO Cuenta (idMesa, idReserva, fechaApertura)
            VALUES (v_mesa.idMesa, v_reserva, v_apertura)
            RETURNING idCuenta INTO v_cuenta;

            -- Un pedido de cocina y, casi siempre, uno de barra
            FOREACH v_sector IN ARRAY ARRAY['cocina', 'barra'] LOOP
                CONTINUE WHEN v_sector = 'barra' AND random() < 0.15;
                INSERT INTO Pedido (idCuenta, idCliente, idMozoCarga, fechaHora, canal, sector, estado)
                VALUES (v_cuenta,
                        CASE WHEN v_qr THEN v_cliente END,
                        CASE WHEN v_qr THEN NULL ELSE v_mozos[1 + floor(random() * 2)::INT] END,
                        v_apertura + CASE v_sector WHEN 'barra' THEN INTERVAL '3 minutes' ELSE INTERVAL '6 minutes' END,
                        CASE WHEN v_qr THEN 'qr' ELSE 'asistido' END,
                        v_sector, 'entregado')
                RETURNING idPedido INTO v_pedido;

                v_items := 1 + floor(random() * least(v_personas, 4))::INT;
                FOR i IN 1..v_items LOOP
                    IF v_sector = 'cocina' THEN
                        v_pres := v_pres_cocina[1 + floor(random() * array_length(v_pres_cocina, 1))::INT];
                    ELSE
                        v_pres := v_pres_barra[1 + floor(random() * array_length(v_pres_barra, 1))::INT];
                    END IF;
                    INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario)
                    SELECT v_pedido, pr.idPresentacion, 1 + floor(random() * 2)::INT, pr.precio
                      FROM Presentacion pr WHERE pr.idPresentacion = v_pres;
                END LOOP;
            END LOOP;

            -- Cierre: a veces se aplica el cupón de bienvenida del cliente
            SELECT COALESCE(SUM(d.cantidad * d.precioUnitario), 0) INTO v_subtotal
              FROM Pedido p JOIN DetallePedido d ON d.idPedido = p.idPedido
             WHERE p.idCuenta = v_cuenta;

            v_cupon := NULL;
            IF random() < 0.5 THEN
                SELECT idCupon INTO v_cupon FROM CuponDescuento
                 WHERE idCliente = v_cliente AND idCuenta IS NULL LIMIT 1;
            END IF;
            v_descuento := CASE WHEN v_cupon IS NULL THEN 0 ELSE round(v_subtotal * 0.10, 2) END;
            v_cierre := v_apertura + INTERVAL '75 minutes' + floor(random() * 30) * INTERVAL '1 minute';

            UPDATE Cuenta
               SET estado = 'cerrada',
                   fechaSolicitudCuenta = CASE WHEN v_qr THEN v_cierre - INTERVAL '8 minutes' END,
                   fechaCierre = v_cierre,
                   idUsuarioCierre = v_cierran[1 + floor(random() * array_length(v_cierran, 1))::INT],
                   subtotal = v_subtotal,
                   descuento = v_descuento,
                   total = v_subtotal - v_descuento
             WHERE idCuenta = v_cuenta;

            IF v_cupon IS NOT NULL THEN
                UPDATE CuponDescuento SET idCuenta = v_cuenta, fechaUso = v_cierre WHERE idCupon = v_cupon;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Reservas pasadas que no se concretaron
INSERT INTO Reserva (idCliente, fechaHoraInicio, fechaHoraFin, cantidadPersonas, estado) VALUES
    (2, CURRENT_DATE - 9 + TIME '21:00', CURRENT_DATE - 9 + TIME '22:30', 4, 'no_show'),
    (6, CURRENT_DATE - 4 + TIME '13:00', CURRENT_DATE - 4 + TIME '14:00', 2, 'cancelada');
INSERT INTO ReservaMesa (idReserva, idMesa)
SELECT r.idReserva, m.idMesa
  FROM Reserva r JOIN Mesa m ON m.numero = CASE r.estado WHEN 'no_show' THEN 5 ELSE 1 END
 WHERE r.estado IN ('no_show', 'cancelada');

-- Reservas a futuro (confirmadas): hoy a la noche, mañana y pasado.
-- La de Federico es de 10 personas y usa dos mesas (11 y 7).
INSERT INTO Reserva (idCliente, fechaHoraInicio, fechaHoraFin, cantidadPersonas)
VALUES
    (1, CURRENT_DATE + TIME '21:30',     CURRENT_DATE + TIME '23:00',     4),
    (3, CURRENT_DATE + 1 + TIME '13:00', CURRENT_DATE + 1 + TIME '14:00', 2),
    (4, CURRENT_DATE + 1 + TIME '21:00', CURRENT_DATE + 2 + TIME '00:00', 10),
    (5, CURRENT_DATE + 2 + TIME '20:30', CURRENT_DATE + 2 + TIME '22:00', 3);
INSERT INTO ReservaMesa (idReserva, idMesa)
SELECT r.idReserva, m.idMesa
  FROM Reserva r
  JOIN LATERAL (VALUES (1, 9), (3, 1), (4, 11), (4, 7), (5, 6)) AS a(cliente, mesa) ON a.cliente = r.idCliente
  JOIN Mesa m ON m.numero = a.mesa
 WHERE r.estado = 'confirmada' AND r.fechaHoraInicio >= CURRENT_DATE;

-- =====================================================================
-- AHORA: dos mesas ocupadas, una con la cuenta pedida
-- =====================================================================
DO $$
DECLARE
    v_cuenta INT;
    v_pedido INT;
    v_mozo   INT := (SELECT idUsuarioInterno FROM UsuarioInterno WHERE usuario = 'mrodriguez');
BEGIN
    -- Mesa 3: pidió por QR un cliente anónimo; cocina preparando, barra listo
    v_cuenta := obtener_o_abrir_cuenta((SELECT idMesa FROM Mesa WHERE numero = 3));
    INSERT INTO Pedido (idCuenta, idCliente, canal, sector, estado)
    VALUES (v_cuenta, 12, 'qr', 'cocina', 'preparacion') RETURNING idPedido INTO v_pedido;
    INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario, observacion)
    SELECT v_pedido, pr.idPresentacion, x.cant, pr.precio, x.obs
      FROM (VALUES ('Pizzetas', 'Galatea', 'Familiar (32cm)', 1, NULL),
                   ('Para picar', 'Fritas', 'Estándar', 1, 'Bien crocantes')) AS x(cat, prod, pres, cant, obs)
      JOIN CategoriaMenu c ON c.nombre = x.cat
      JOIN Producto p ON p.idCategoriaMenu = c.idCategoriaMenu AND p.nombre = x.prod
      JOIN Presentacion pr ON pr.idProducto = p.idProducto AND pr.nombre = x.pres;
    INSERT INTO Pedido (idCuenta, idCliente, canal, sector, estado)
    VALUES (v_cuenta, 12, 'qr', 'barra', 'listo') RETURNING idPedido INTO v_pedido;
    INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario)
    SELECT v_pedido, pr.idPresentacion, 2, pr.precio
      FROM Producto p JOIN Presentacion pr USING (idProducto) WHERE p.nombre = 'Tirada IPA';

    -- Mesa 8: pedido cargado por el mozo, ya entregado, y el cliente pidió la cuenta
    v_cuenta := obtener_o_abrir_cuenta((SELECT idMesa FROM Mesa WHERE numero = 8));
    INSERT INTO Pedido (idCuenta, idMozoCarga, canal, sector, estado)
    VALUES (v_cuenta, v_mozo, 'asistido', 'cocina', 'entregado') RETURNING idPedido INTO v_pedido;
    INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario)
    SELECT v_pedido, pr.idPresentacion, 1, pr.precio
      FROM Producto p JOIN Presentacion pr USING (idProducto) WHERE p.nombre IN ('Picada 3');
    INSERT INTO Pedido (idCuenta, idMozoCarga, canal, sector, estado)
    VALUES (v_cuenta, v_mozo, 'asistido', 'barra', 'entregado') RETURNING idPedido INTO v_pedido;
    INSERT INTO DetallePedido (idPedido, idPresentacion, cantidad, precioUnitario)
    SELECT v_pedido, pr.idPresentacion, 1, pr.precio
      FROM Producto p JOIN Presentacion pr USING (idProducto)
     WHERE p.nombre = 'Trapiche' AND pr.nombre = 'Botella';
    UPDATE Cuenta SET fechaSolicitudCuenta = now() WHERE idCuenta = v_cuenta;
END $$;

-- "Agotado por hoy" (se marca al final para no afectar el historial)
UPDATE Presentacion SET disponible = false
 WHERE idPresentacion IN (
    SELECT pr.idPresentacion FROM Presentacion pr JOIN Producto p USING (idProducto)
     WHERE (p.nombre = 'Crumble de manzana')
        OR (p.nombre = 'Familia Gascón' AND pr.nombre = 'Botella'));

-- =====================================================================
-- RECOMENDACIONES (generadas por la IA; aceptada = el cliente lo pidió)
-- =====================================================================
INSERT INTO Recomendacion (idCliente, idProducto, fecha, relevancia, motivo, aceptada)
SELECT v.cliente, p.idProducto, CURRENT_DATE - v.dias + TIME '20:45', v.relevancia, v.motivo, v.aceptada
  FROM (VALUES
    (1, 'Pizzetas', 'Galatea', 2, 0.9200, 'Pidió pizzetas en sus últimas visitas', true),
    (1, 'Tragos', 'Aperol spritz', 2, 0.7100, 'Suele acompañar con un trago', false),
    (2, 'Hamburguesas', 'Hamb Galatea', 5, 0.8800, 'Pide hamburguesas casi siempre', true),
    (2, 'Cervezas', 'Tirada IPA', 5, 0.8400, 'Cerveza más pedida con hamburguesas', true),
    (3, 'Milanesas', 'Napolitana', 7, 0.7900, 'Prefiere milanesas al mediodía', false),
    (3, 'Vinos', 'Trapiche', 7, 0.6600, 'Pidió vino en dos visitas', true),
    (4, 'Para compartir', 'Picada 3', 3, 0.9000, 'Viene en grupo y pide para compartir', true),
    (5, 'Para picar', 'Gramajo vegetariano', 1, 0.9500, 'Prefiere opciones vegetarianas', false),
    (5, 'Pizzetas', 'Caprese', 1, 0.8100, 'Pizzeta vegetariana más pedida', true)
  ) AS v(cliente, categoria, producto, dias, relevancia, motivo, aceptada)
  JOIN CategoriaMenu c ON c.nombre = v.categoria
  JOIN Producto p ON p.idCategoriaMenu = c.idCategoriaMenu AND p.nombre = v.producto;

-- =====================================================================
-- EXPERIENCIA GALATEA (juego del Impostor)
-- =====================================================================
INSERT INTO Tematica (codigo, nombre) VALUES
    ('COM', 'Comidas'), ('PAI', 'Países'), ('ANI', 'Animales'),
    ('PRO', 'Profesiones'), ('BEB', 'Bebidas');

INSERT INTO Palabra (codigoTematica, texto)
SELECT t.codigo, w.texto
  FROM (VALUES
    ('COM', ARRAY['Chivito', 'Milanesa', 'Pizza', 'Asado', 'Empanada', 'Faina', 'Ñoquis', 'Torta frita']),
    ('PAI', ARRAY['Uruguay', 'Japón', 'Italia', 'México', 'Egipto', 'Canadá', 'Australia', 'Noruega']),
    ('ANI', ARRAY['Carpincho', 'Pingüino', 'Jirafa', 'Delfín', 'Águila', 'Tortuga', 'Zorro', 'Pulpo']),
    ('PRO', ARRAY['Bombero', 'Arquitecta', 'Chef', 'Piloto', 'Médica', 'Carpintero', 'Fotógrafa', 'Maestro']),
    ('BEB', ARRAY['Mate', 'Medio y medio', 'Mojito', 'Cerveza', 'Limonada', 'Café', 'Grappamiel', 'Vino tinto'])
  ) AS v(codigo, palabras)
  JOIN Tematica t ON t.codigo = v.codigo
  CROSS JOIN LATERAL unnest(v.palabras) AS w(texto);

INSERT INTO Premio (nombre, puntosRequeridos) VALUES
    ('Porción de fritas', 40),
    ('Postre de la casa', 60),
    ('Trago a elección', 90),
    ('Picada 1', 200);

DO $$
DECLARE
    v_partida INT;
    v_j       INT[];
    v_ronda   INT;
BEGIN
    -- Partida en Modo Mesa (mesa 4), terminada hace 3 días: 4 jugadores, 3 rondas
    INSERT INTO Partida (codigoTematica, idMesa, codigoSala, modo, cantidadRondas, estado, fechaInicio)
    VALUES ('COM', (SELECT idMesa FROM Mesa WHERE numero = 4), 'MESA4X', 'mesa', 3, 'finalizada', CURRENT_DATE - 3 + TIME '22:10')
    RETURNING idPartida INTO v_partida;
    WITH ins AS (
        INSERT INTO Jugador (idPartida, idCliente, rol, puntaje, esAnfitrion)
        VALUES (v_partida, 1, 'civil', 30, true), (v_partida, 2, 'impostor', 45, false),
               (v_partida, 5, 'civil', 20, false), (v_partida, 9, 'civil', 10, false)
        RETURNING idJugador)
    SELECT array_agg(idJugador ORDER BY idJugador) INTO v_j FROM ins;
    FOR n IN 1..3 LOOP
        INSERT INTO Ronda (idPartida, idPalabra, numero, civilesAciertan)
        VALUES (v_partida, (SELECT idPalabra FROM Palabra WHERE codigoTematica = 'COM' ORDER BY idPalabra OFFSET n LIMIT 1), n, n <> 2)
        RETURNING idRonda INTO v_ronda;
        -- En Modo Mesa la pista es oral: no se registra. Votan todos.
        INSERT INTO Voto (idRonda, idJugadorVotante, idJugadorVotado, idPartida)
        VALUES (v_ronda, v_j[1], v_j[2], v_partida), (v_ronda, v_j[2], v_j[3], v_partida),
               (v_ronda, v_j[3], v_j[2], v_partida), (v_ronda, v_j[4], v_j[2], v_partida);
    END LOOP;

    -- Partida online terminada ayer: 3 jugadores, 2 rondas, con pistas escritas
    INSERT INTO Partida (codigoTematica, codigoSala, modo, cantidadRondas, estado, fechaInicio)
    VALUES ('PAI', 'ONL7QZ', 'online', 2, 'finalizada', CURRENT_DATE - 1 + TIME '21:40')
    RETURNING idPartida INTO v_partida;
    WITH ins AS (
        INSERT INTO Jugador (idPartida, idCliente, rol, puntaje, esAnfitrion)
        VALUES (v_partida, 1, 'impostor', 50, true), (v_partida, 3, 'civil', 15, false), (v_partida, 4, 'civil', 15, false)
        RETURNING idJugador)
    SELECT array_agg(idJugador ORDER BY idJugador) INTO v_j FROM ins;
    FOR n IN 1..2 LOOP
        INSERT INTO Ronda (idPartida, idPalabra, numero, civilesAciertan)
        VALUES (v_partida, (SELECT idPalabra FROM Palabra WHERE codigoTematica = 'PAI' ORDER BY idPalabra OFFSET n LIMIT 1), n, false)
        RETURNING idRonda INTO v_ronda;
        INSERT INTO Pista (idRonda, idJugador, idPartida, texto)
        VALUES (v_ronda, v_j[1], v_partida, CASE n WHEN 1 THEN 'Pasta' ELSE 'Pirámides' END),
               (v_ronda, v_j[2], v_partida, CASE n WHEN 1 THEN 'Coliseo' ELSE 'Faraón' END),
               (v_ronda, v_j[3], v_partida, CASE n WHEN 1 THEN 'Bota' ELSE 'Desierto' END);
        INSERT INTO Voto (idRonda, idJugadorVotante, idJugadorVotado, idPartida)
        VALUES (v_ronda, v_j[1], v_j[2], v_partida), (v_ronda, v_j[2], v_j[3], v_partida), (v_ronda, v_j[3], v_j[2], v_partida);
    END LOOP;

    -- Partida online esperando jugadores
    INSERT INTO Partida (codigoTematica, codigoSala, modo, cantidadRondas)
    VALUES ('ANI', 'SALA42', 'online', 3) RETURNING idPartida INTO v_partida;
    INSERT INTO Jugador (idPartida, idCliente, esAnfitrion) VALUES (v_partida, 6, true);
END $$;

-- Sofía canjeó una porción de fritas (tenía 80 puntos)
INSERT INTO Canje (idCliente, idPremio, fechaCanje, puntosUsados)
SELECT 1, idPremio, CURRENT_DATE - 1 + TIME '23:15', puntosRequeridos FROM Premio WHERE nombre = 'Porción de fritas';

COMMIT;
