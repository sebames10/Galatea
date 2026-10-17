-- =====================================================================
-- GALATEA — Modelo relacional (PostgreSQL 15)
-- Versión 06: derivado del modelo conceptual UML (Modelo_Galatea_UML.drawio,
-- páginas "Gestión" y "Experiencia Galatea").
--
-- Cambios respecto a la versión 05:
--   * Menú: Plato y Trago se reemplazan por CategoriaMenu -> Producto ->
--     Presentacion. El sector (cocina o barra) lo define la categoría.
--     Cada Producto tiene una o más Presentaciones con su precio
--     (individual/familiar, p1/p2, copa/botella; 'Estándar' si tiene un
--     solo precio). Producto suma foto.
--   * Etiqueta + ProductoEtiqueta (vegetariano, sin gluten, sin alcohol).
--   * Fotos (Producto.foto y Empleado.foto): los archivos van a Supabase
--     Storage y la base guarda solo la URL pública.
--   * DetallePedido apunta a una Presentacion (antes: Plato o Trago).
--   * Recomendacion apunta a un Producto; score pasa a llamarse
--     relevancia y se agrega aceptada.
--   * Juego: Categoria pasa a llamarse Tematica (codigoCategoria ->
--     codigoTematica), para no confundirla con CategoriaMenu.
--
-- Cambios de la versión 05 respecto a la 04:
--   * Se elimina el concepto de "perfil". Lo que cada persona puede hacer
--     en el sistema lo decide el código según el Cargo de su Empleado.
--     El sistema reconoce cuatro cargos: Administrador, Mozo, Cocinero y
--     Bartender. Los demás cargos (Bachero, Portero, Jardinero...) solo
--     sirven para el registro de personal y no tienen acceso al sistema.
--   * UsuarioInterno queda solo con los datos de acceso; vuelve a ser
--     uno por Empleado (idEmpleado UNIQUE). Si un Empleado cambia de
--     cargo, conserva su usuario.
--   * Plato, Trago, Cuenta y Pedido pierden las columnas de perfil y las
--     FK compuestas; quién crea, cierra o carga es una FK simple a
--     UsuarioInterno. Qué cargo puede hacer cada acción lo valida el
--     backend.
--
-- Cambios de la versión 04 respecto a la 03:
--   * Todas las claves sustitutas pasan de SERIAL a
--     INT GENERATED ALWAYS AS IDENTITY (estándar SQL).
--   * El Administrador también puede crear Platos y Tragos.
--   * Cuenta: el descuento nunca supera al subtotal (total >= 0).
--   * UsuarioInterno: un Empleado puede tener varios usuarios, pero solo
--     uno activo (permite cambiarle el perfil dando de baja el anterior).
--   * Pedido: si llega por QR siempre tiene Cliente (anónimo o no).
--   * obtener_o_abrir_cuenta: solo vincula una Reserva dentro de la
--     ventana de llegada (-15 / +10 min) y no falla si dos Mesas de la
--     misma Reserva abren cuenta a la vez.
--
-- Cambios de la versión 03 respecto a la 02:
--   * Nuevas tablas Cargo y Empleado (registro de todo el personal, con
--     foto opcional). UsuarioInterno pasa a ser solo la cuenta de acceso
--     de un Empleado (0..1) y su nombre se mueve a Empleado.
--   * La generalización UsuarioInterno -> Administrador / Mozo / Cocinero
--     / Bartender se implementa en una sola tabla con la columna "perfil".
--     Las asociaciones que en el diagrama salen de una subclase (Cocinero
--     crea Plato, Bartender crea Trago, Mozo carga Pedido) se garantizan
--     con claves foráneas compuestas (id + perfil).
--   * Cuenta: nueva relación 0..1 con Reserva ("se concreta en") y regla
--     de que nunca la cierra un Cocinero.
--   * CuponDescuento: se agrega codigoQR; un cupón de bienvenida por
--     Cliente; la relación con Cuenta es 1:1.
--   * Mesa.estado y CuponDescuento.estado son derivados en el modelo
--     conceptual: dejan de ser columnas y se calculan en vistas.
--   * Juego: Categoria (hoy Tematica), Palabra, Partida, Jugador (con esAnfitrion),
--     Ronda, Pista (solo partidas online), Voto, Premio y Canje.
--   * La Cuenta se abre automáticamente con el primer Pedido de la Mesa
--     (función obtener_o_abrir_cuenta) y el Cliente puede pedir la cuenta
--     desde la app (fechaSolicitudCuenta).
--   * Cada Pedido pertenece a un sector (cocina o barra): lo que el
--     Cliente pide se divide en un Pedido por sector.
--   * Estado de Mesa derivado con cuatro valores: libre, reservada,
--     ocupada y cuentaSolicitada (vista v_MesaEstado).
--
-- Criterio de claves: el modelo conceptual no tiene ids; acá cada
-- asociación 1 a * se convierte en una clave foránea del lado "muchos"
-- (por ejemplo, Empleado.idCargo), y se usan claves sustitutas (id...)
-- con los identificadores del dominio como UNIQUE (numero de Mesa,
-- cedula de Empleado, usuario, codigoQR, etc.).
-- =====================================================================

-- Necesaria para combinar igualdad (idMesa) y rangos de tiempo
-- superpuestos en una misma restricción EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================================
-- PERSONAL
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cargo: puesto laboral (Mozo, Bachero, Portero...). Lo administra el
-- Administrador.
-- El Cargo también define el acceso al sistema: el código reconoce por
-- nombre los cargos 'Administrador', 'Mozo', 'Cocinero' y 'Bartender' y
-- le da a cada uno sus pantallas y acciones. Esos cuatro no se pueden
-- renombrar ni borrar desde la aplicación. Cualquier otro cargo existe
-- solo para el registro de personal y no puede iniciar sesión.
-- ---------------------------------------------------------------------
CREATE TABLE Cargo (
    idCargo      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL UNIQUE,
    descripcion  VARCHAR(255) NULL
);

-- ---------------------------------------------------------------------
-- Empleado: todas las personas que trabajan en el restaurante, usen o
-- no el sistema. Asociación "ocupa": Empleado * -> 1 Cargo.
-- foto: URL pública de la imagen en Supabase Storage (bucket "galatea",
-- carpeta empleados/). En la base se guarda solo la URL, nunca el archivo.
-- ---------------------------------------------------------------------
CREATE TABLE Empleado (
    idEmpleado    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCargo       INT NOT NULL REFERENCES Cargo(idCargo),
    nombre        VARCHAR(100) NOT NULL,
    apellido      VARCHAR(100) NOT NULL,
    cedula        VARCHAR(20)  NOT NULL UNIQUE,
    telefono      VARCHAR(20)  NOT NULL,
    email         VARCHAR(150) NULL,
    fechaIngreso  DATE NOT NULL DEFAULT CURRENT_DATE,
    foto          VARCHAR(500) NULL,
    activo        BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- UsuarioInterno: cuenta de acceso al sistema de un Empleado
-- (asociación "tiene": Empleado 1 -> 0..1 UsuarioInterno, por eso
-- idEmpleado es UNIQUE).
-- Solo guarda los datos de acceso; lo que el usuario puede hacer depende
-- del Cargo de su Empleado. Si el Empleado cambia de cargo, conserva el
-- mismo usuario. El backend solo crea usuarios (y solo deja iniciar
-- sesión) a Empleados con uno de los cuatro cargos del sistema.
-- La contraseña nunca se guarda en claro: solo su hash bcrypt.
-- ---------------------------------------------------------------------
CREATE TABLE UsuarioInterno (
    idUsuarioInterno  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idEmpleado        INT NOT NULL UNIQUE REFERENCES Empleado(idEmpleado),
    usuario           VARCHAR(50)  NOT NULL UNIQUE,
    contrasenaHash    VARCHAR(255) NOT NULL,
    activo            BOOLEAN NOT NULL DEFAULT true
);

-- Restricción: solo un Empleado activo puede tener un UsuarioInterno
-- activo.
CREATE OR REPLACE FUNCTION fn_usuario_empleado_activo() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activo AND NOT (SELECT activo FROM Empleado WHERE idEmpleado = NEW.idEmpleado) THEN
        RAISE EXCEPTION 'No se puede activar el usuario de un empleado inactivo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_empleado_activo
    BEFORE INSERT OR UPDATE ON UsuarioInterno
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_empleado_activo();

-- Al dar de baja a un Empleado, su usuario se desactiva solo.
CREATE OR REPLACE FUNCTION fn_empleado_baja_desactiva_usuario() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.activo AND NOT NEW.activo THEN
        UPDATE UsuarioInterno SET activo = false WHERE idEmpleado = NEW.idEmpleado;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empleado_baja_desactiva_usuario
    AFTER UPDATE ON Empleado
    FOR EACH ROW EXECUTE FUNCTION fn_empleado_baja_desactiva_usuario();

-- =====================================================================
-- CLIENTES, MESAS Y RESERVAS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cliente: perfil progresivo. nombre y telefono se completan al
-- registrarse para el descuento de bienvenida; telefono es único porque
-- es la clave que dispara la fusión de perfiles duplicados.
-- ---------------------------------------------------------------------
CREATE TABLE Cliente (
    idCliente              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alias                  VARCHAR(50)  NULL,
    nombre                 VARCHAR(100) NULL,
    telefono               VARCHAR(20)  NULL UNIQUE,
    fechaAlta              TIMESTAMP NOT NULL DEFAULT now(),
    preferenciasInferidas  JSONB NULL
);

-- ---------------------------------------------------------------------
-- HuellaDispositivo (Cliente 1 -> * HuellaDispositivo). hash es el valor
-- que entrega FingerprintJS y se usa como PK natural.
-- ---------------------------------------------------------------------
CREATE TABLE HuellaDispositivo (
    hash              VARCHAR(255) PRIMARY KEY,
    idCliente         INT NOT NULL REFERENCES Cliente(idCliente),
    fechaVinculacion  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Mesa. /estado es derivado en el modelo conceptual (libre, reservada,
-- ocupada o cuentaSolicitada): no se guarda, se calcula en la vista
-- v_MesaEstado.
-- ---------------------------------------------------------------------
CREATE TABLE Mesa (
    idMesa     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero     INT NOT NULL UNIQUE,
    capacidad  INT NOT NULL CHECK (capacidad > 0),
    codigoQR   VARCHAR(255) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Reserva (Cliente 1 -> * Reserva).
-- /fechaHoraFin es derivado (fechaHoraInicio + duración según
-- cantidadPersonas: 60 min hasta 2, 90 hasta 4, 150 hasta 8, 180 para
-- más). Se guarda igual porque la restricción EXCLUDE de ReservaMesa la
-- necesita; la calcula el backend, no el Cliente.
-- ---------------------------------------------------------------------
CREATE TABLE Reserva (
    idReserva         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCliente         INT NOT NULL REFERENCES Cliente(idCliente),
    fechaHoraInicio   TIMESTAMP NOT NULL,
    fechaHoraFin      TIMESTAMP NOT NULL,
    cantidadPersonas  INT NOT NULL CHECK (cantidadPersonas > 0),
    estado            VARCHAR(12) NOT NULL DEFAULT 'confirmada'
        CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show')),
    CONSTRAINT chk_reserva_fin_luego_de_inicio CHECK (fechaHoraFin > fechaHoraInicio)
);

-- ---------------------------------------------------------------------
-- ReservaMesa: asociación "se le asigna" (Reserva * -> 1..* Mesa).
-- fechaHoraInicio, fechaHoraFin y bloqueaMesa se copian de la Reserva
-- solo para que la base valide el solapamiento por Mesa. Los completa
-- siempre el trigger; la aplicación solo inserta (idReserva, idMesa).
-- ---------------------------------------------------------------------
CREATE TABLE ReservaMesa (
    idReserva        INT NOT NULL REFERENCES Reserva(idReserva),
    idMesa           INT NOT NULL REFERENCES Mesa(idMesa),
    fechaHoraInicio  TIMESTAMP NOT NULL,
    fechaHoraFin     TIMESTAMP NOT NULL,
    bloqueaMesa      BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (idReserva, idMesa),
    -- Una Mesa no puede estar en dos Reservas confirmadas que se superpongan.
    CONSTRAINT excl_mesa_sin_solapamiento
        EXCLUDE USING gist (
            idMesa WITH =,
            tsrange(fechaHoraInicio, fechaHoraFin) WITH &&
        ) WHERE (bloqueaMesa)
);

CREATE OR REPLACE FUNCTION fn_reservamesa_sync() RETURNS TRIGGER AS $$
BEGIN
    SELECT r.fechaHoraInicio, r.fechaHoraFin, (r.estado = 'confirmada')
      INTO NEW.fechaHoraInicio, NEW.fechaHoraFin, NEW.bloqueaMesa
      FROM Reserva r
     WHERE r.idReserva = NEW.idReserva;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservamesa_sync
    BEFORE INSERT OR UPDATE ON ReservaMesa
    FOR EACH ROW EXECUTE FUNCTION fn_reservamesa_sync();

CREATE OR REPLACE FUNCTION fn_reserva_propagar_a_mesas() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.fechaHoraInicio IS DISTINCT FROM OLD.fechaHoraInicio
       OR NEW.fechaHoraFin IS DISTINCT FROM OLD.fechaHoraFin THEN
        UPDATE ReservaMesa
           SET fechaHoraInicio = fechaHoraInicio  -- no-op: solo dispara trg_reservamesa_sync
         WHERE idReserva = NEW.idReserva;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_propagar_a_mesas
    AFTER UPDATE ON Reserva
    FOR EACH ROW EXECUTE FUNCTION fn_reserva_propagar_a_mesas();

-- =====================================================================
-- MENÚ
-- =====================================================================

-- ---------------------------------------------------------------------
-- CategoriaMenu: secciones de la carta (Para picar, Pizzetas, Tragos,
-- Cervezas, Vinos...). sector define a dónde van los pedidos de sus
-- productos: 'cocina' o 'barra'. orden es el orden de la carta.
-- ---------------------------------------------------------------------
CREATE TABLE CategoriaMenu (
    idCategoriaMenu  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre           VARCHAR(50) NOT NULL UNIQUE,
    sector           VARCHAR(6)  NOT NULL CHECK (sector IN ('cocina', 'barra')),
    orden            INT NOT NULL DEFAULT 0,
    activa           BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- Producto (CategoriaMenu 1 -agrupa-> *; UsuarioInterno 1 -crea-> *).
-- nombre es único dentro de su categoría: "Galatea" y "Caprese" existen
-- como pizzeta y como milanesa.
-- foto: URL pública de la imagen en Supabase Storage (bucket "galatea",
-- carpeta menu/). En la base se guarda solo la URL, nunca el archivo.
-- activo = false: el producto salió de la carta. No se borra porque
-- pedidos viejos apuntan a sus presentaciones.
-- Quién puede crearlo lo valida el backend según el Cargo: categoría de
-- cocina -> Cocinero o Administrador; de barra -> Bartender o
-- Administrador.
-- ---------------------------------------------------------------------
CREATE TABLE Producto (
    idProducto       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCategoriaMenu  INT NOT NULL REFERENCES CategoriaMenu(idCategoriaMenu) ON DELETE RESTRICT,
    idCreador        INT NOT NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    nombre           VARCHAR(100) NOT NULL,
    descripcion      TEXT NULL,
    foto             VARCHAR(500) NULL,
    activo           BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_producto_nombre_por_categoria UNIQUE (idCategoriaMenu, nombre)
);

-- ---------------------------------------------------------------------
-- Presentacion (composición: Producto 1 -> 1..* Presentacion): la
-- variante que se cobra. 'Estándar' cuando el producto tiene un solo
-- precio (la UI no muestra ese nombre).
-- disponible = false es el "Agotado por hoy"; lo cambia una persona.
-- RESTRICT y no CASCADE: pedidos viejos apuntan a las presentaciones.
-- ---------------------------------------------------------------------
CREATE TABLE Presentacion (
    idPresentacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idProducto      INT NOT NULL REFERENCES Producto(idProducto) ON DELETE RESTRICT,
    nombre          VARCHAR(50) NOT NULL DEFAULT 'Estándar',
    precio          NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    orden           INT NOT NULL DEFAULT 0,
    disponible      BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_presentacion_nombre_por_producto UNIQUE (idProducto, nombre)
);

-- Todo Producto tiene al menos una Presentacion (multiplicidad 1..*).
-- Se controla al confirmar la transacción (DEFERRABLE), así se puede
-- insertar el producto y después sus presentaciones.
CREATE OR REPLACE FUNCTION fn_producto_con_presentacion() RETURNS TRIGGER AS $$
DECLARE
    v_idProducto INT;
BEGIN
    IF TG_OP = 'DELETE' OR TG_TABLE_NAME = 'presentacion' THEN
        v_idProducto := OLD.idProducto;   -- se borró o movió una presentación
    ELSE
        v_idProducto := NEW.idProducto;   -- se creó un producto
    END IF;
    IF EXISTS (SELECT 1 FROM Producto WHERE idProducto = v_idProducto)
       AND NOT EXISTS (SELECT 1 FROM Presentacion WHERE idProducto = v_idProducto) THEN
        RAISE EXCEPTION 'El producto % tiene que tener al menos una presentación', v_idProducto;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_producto_con_presentacion
    AFTER INSERT ON Producto
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_producto_con_presentacion();

CREATE CONSTRAINT TRIGGER trg_presentacion_no_deja_producto_vacio
    AFTER DELETE OR UPDATE OF idProducto ON Presentacion
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_producto_con_presentacion();

-- ---------------------------------------------------------------------
-- Etiqueta (Producto * -lleva-> * Etiqueta): vegetariano, sin gluten,
-- sin alcohol... Solo se asignan las que indica el restaurante.
-- ---------------------------------------------------------------------
CREATE TABLE Etiqueta (
    idEtiqueta  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE ProductoEtiqueta (
    idProducto  INT NOT NULL REFERENCES Producto(idProducto) ON DELETE CASCADE,
    idEtiqueta  INT NOT NULL REFERENCES Etiqueta(idEtiqueta) ON DELETE CASCADE,
    PRIMARY KEY (idProducto, idEtiqueta)
);

-- ---------------------------------------------------------------------
-- Recomendacion (* para 1 Cliente; * de 1 Producto). Se recomienda el
-- producto ("la Caprese"), no una presentación.
-- relevancia: 0 a 1, qué tan probable es que le guste al Cliente; sirve
-- para ordenar y descartar.
-- aceptada: el Cliente terminó pidiendo el producto recomendado (mide si
-- la IA acierta en los reportes).
-- ---------------------------------------------------------------------
CREATE TABLE Recomendacion (
    idRecomendacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCliente        INT NOT NULL REFERENCES Cliente(idCliente),
    idProducto       INT NOT NULL REFERENCES Producto(idProducto),
    fecha            TIMESTAMP NOT NULL DEFAULT now(),
    relevancia       NUMERIC(5,4) NOT NULL CHECK (relevancia BETWEEN 0 AND 1),
    motivo           VARCHAR(255) NULL,
    aceptada         BOOLEAN NOT NULL DEFAULT false
);

-- =====================================================================
-- CUENTAS, CUPONES Y PEDIDOS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cuenta (Mesa 1 -tiene-> *; UsuarioInterno 0..1 -cierra-> *;
-- Reserva 0..1 -se concreta en-> 0..1).
-- /subtotal, /descuento y /total son derivados en el modelo conceptual.
-- Se guardan al cerrar la cuenta como "foto" del cierre (el Administrador
-- puede corregirlos si no coinciden con Soft Restaurant).
-- idUsuarioCierre: quién cerró la Cuenta. Que sea un mozo, bartender o
-- administrador (nunca un cocinero) lo valida el backend según el Cargo.
-- ---------------------------------------------------------------------
CREATE TABLE Cuenta (
    idCuenta         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idMesa           INT NOT NULL REFERENCES Mesa(idMesa),
    idReserva        INT NULL UNIQUE REFERENCES Reserva(idReserva),
    idUsuarioCierre  INT NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    fechaApertura    TIMESTAMP NOT NULL DEFAULT now(),
    fechaSolicitudCuenta TIMESTAMP NULL,   -- el Cliente pidió la cuenta desde la app
    fechaCierre      TIMESTAMP NULL,
    subtotal         NUMERIC(10,2) NULL CHECK (subtotal >= 0),
    descuento        NUMERIC(10,2) NULL CHECK (descuento >= 0),
    total            NUMERIC(10,2) NULL,
    estado           VARCHAR(10) NOT NULL DEFAULT 'abierta'
        CHECK (estado IN ('abierta', 'cerrada')),
    -- fechaCierre, quien cierra e importes existen solo si está cerrada.
    CONSTRAINT chk_cuenta_cierre_coherente CHECK (
        (estado = 'abierta' AND num_nonnulls(fechaCierre, idUsuarioCierre, subtotal, descuento, total) = 0)
     OR (estado = 'cerrada' AND num_nulls(fechaCierre, idUsuarioCierre, subtotal, descuento, total) = 0)
    ),
    CONSTRAINT chk_cuenta_total CHECK (total IS NULL OR total = subtotal - descuento),
    -- El descuento nunca supera al subtotal, así el total nunca es negativo.
    CONSTRAINT chk_cuenta_descuento_max CHECK (descuento IS NULL OR descuento <= subtotal),
    CONSTRAINT chk_cuenta_solicitud CHECK (fechaSolicitudCuenta IS NULL OR fechaSolicitudCuenta >= fechaApertura)
);

-- Una Mesa tiene a lo sumo una Cuenta abierta.
CREATE UNIQUE INDEX ux_una_cuenta_abierta_por_mesa
    ON Cuenta (idMesa)
    WHERE estado = 'abierta';

-- Si la Cuenta concreta una Reserva, su Mesa es una de las asignadas a
-- esa Reserva.
CREATE OR REPLACE FUNCTION fn_cuenta_reserva_mesa() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.idReserva IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM ReservaMesa
         WHERE idReserva = NEW.idReserva AND idMesa = NEW.idMesa) THEN
        RAISE EXCEPTION 'La mesa de la cuenta no está asignada a la reserva %', NEW.idReserva;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cuenta_reserva_mesa
    BEFORE INSERT OR UPDATE ON Cuenta
    FOR EACH ROW EXECUTE FUNCTION fn_cuenta_reserva_mesa();

-- ---------------------------------------------------------------------
-- CuponDescuento (Cliente 1 -recibe-> *; 0..1 -se aplica a-> 0..1 Cuenta).
-- /estado es derivado (usado si está aplicado a una Cuenta): se calcula
-- en la vista v_CuponEstado.
-- ---------------------------------------------------------------------
CREATE TABLE CuponDescuento (
    idCupon          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCliente        INT NOT NULL REFERENCES Cliente(idCliente),
    idCuenta         INT NULL UNIQUE REFERENCES Cuenta(idCuenta),  -- UNIQUE: relación 1:1
    codigoQR         VARCHAR(255) NOT NULL UNIQUE,
    tipo             VARCHAR(50) NOT NULL,                          -- ej. 'bienvenida'
    porcentaje       NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
    fechaGeneracion  TIMESTAMP NOT NULL DEFAULT now(),
    fechaUso         TIMESTAMP NULL,
    -- fechaUso existe solo si el cupón está aplicado a una Cuenta.
    CONSTRAINT chk_cupon_uso_coherente CHECK ((idCuenta IS NULL) = (fechaUso IS NULL))
);

-- Cada Cliente tiene a lo sumo un cupón de bienvenida.
CREATE UNIQUE INDEX ux_un_cupon_bienvenida_por_cliente
    ON CuponDescuento (idCliente)
    WHERE tipo = 'bienvenida';

-- ---------------------------------------------------------------------
-- Pedido (Cuenta 1 -contiene-> *; Cliente 0..1 -solicita-> *;
-- Mozo 0..1 -carga-> *).
-- sector: lo que el Cliente pide en una misma confirmación se divide en
-- un Pedido por sector (el de la CategoriaMenu de cada producto), así
-- cocina y barra lo avanzan por separado y el Mozo retira primero lo
-- que sale primero.
-- idMozoCarga: quién cargó el Pedido asistido. Que sea un mozo lo valida
-- el backend según el Cargo. Si canal = 'asistido' hay mozo; si
-- canal = 'qr', no.
-- Un Pedido por QR siempre tiene Cliente: quien escanea sin estar
-- registrado queda como Cliente anónimo, identificado por su
-- HuellaDispositivo (identidad progresiva).
-- ---------------------------------------------------------------------
CREATE TABLE Pedido (
    idPedido     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCuenta     INT NOT NULL REFERENCES Cuenta(idCuenta),
    idCliente    INT NULL REFERENCES Cliente(idCliente),
    idMozoCarga  INT NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    fechaHora    TIMESTAMP NOT NULL DEFAULT now(),
    canal        VARCHAR(10) NOT NULL CHECK (canal IN ('qr', 'asistido')),
    sector       VARCHAR(6)  NOT NULL CHECK (sector IN ('cocina', 'barra')),
    estado       VARCHAR(15) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'preparacion', 'listo', 'entregado')),
    CONSTRAINT chk_pedido_canal_mozo CHECK ((canal = 'asistido') = (idMozoCarga IS NOT NULL)),
    CONSTRAINT chk_pedido_qr_con_cliente CHECK (canal <> 'qr' OR idCliente IS NOT NULL)
);

-- Un Pedido solo se registra en una Cuenta abierta.
CREATE OR REPLACE FUNCTION fn_pedido_cuenta_abierta() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT estado FROM Cuenta WHERE idCuenta = NEW.idCuenta) <> 'abierta' THEN
        RAISE EXCEPTION 'No se pueden registrar pedidos en una cuenta cerrada';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_cuenta_abierta
    BEFORE INSERT ON Pedido
    FOR EACH ROW EXECUTE FUNCTION fn_pedido_cuenta_abierta();

-- ---------------------------------------------------------------------
-- DetallePedido (composición: Pedido 1 -> 1..* DetallePedido;
-- * de 1 Presentacion).
-- precioUnitario: copia del precio de la Presentacion al momento de
-- pedir, así los cambios de precio no alteran cuentas ni reportes.
-- ON DELETE CASCADE refleja la composición: las líneas no existen sin
-- su Pedido.
-- ---------------------------------------------------------------------
CREATE TABLE DetallePedido (
    idDetallePedido  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idPedido         INT NOT NULL REFERENCES Pedido(idPedido) ON DELETE CASCADE,
    idPresentacion   INT NOT NULL REFERENCES Presentacion(idPresentacion),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precioUnitario   NUMERIC(10,2) NOT NULL CHECK (precioUnitario >= 0),
    observacion      VARCHAR(255) NULL
);

-- Cada línea pertenece al sector de su Pedido (el sector de la
-- CategoriaMenu de su producto). Al pedir, además, la presentación tiene
-- que estar disponible y el producto activo. Esto último solo se
-- controla al insertar: si después se agota, los pedidos ya hechos
-- siguen siendo válidos.
CREATE OR REPLACE FUNCTION fn_detalle_validar() RETURNS TRIGGER AS $$
DECLARE
    v_sectorPedido    VARCHAR(6);
    v_sectorProducto  VARCHAR(6);
    v_disponible      BOOLEAN;
    v_activo          BOOLEAN;
BEGIN
    SELECT sector INTO v_sectorPedido FROM Pedido WHERE idPedido = NEW.idPedido;

    SELECT c.sector, pr.disponible, p.activo
      INTO v_sectorProducto, v_disponible, v_activo
      FROM Presentacion pr
      JOIN Producto p       ON p.idProducto = pr.idProducto
      JOIN CategoriaMenu c  ON c.idCategoriaMenu = p.idCategoriaMenu
     WHERE pr.idPresentacion = NEW.idPresentacion;

    IF v_sectorProducto IS DISTINCT FROM v_sectorPedido THEN
        RAISE EXCEPTION 'El ítem es de % y el pedido es de %', v_sectorProducto, v_sectorPedido;
    END IF;
    IF TG_OP = 'INSERT' AND NOT (v_disponible AND v_activo) THEN
        RAISE EXCEPTION 'El ítem no está disponible (agotado o fuera de la carta)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_validar
    BEFORE INSERT OR UPDATE ON DetallePedido
    FOR EACH ROW EXECUTE FUNCTION fn_detalle_validar();

-- ---------------------------------------------------------------------
-- Apertura automática de la Cuenta (la usa el backend al registrar el
-- primer Pedido de una Mesa, venga por QR o lo cargue un Mozo).
-- Devuelve la Cuenta abierta de la Mesa; si no hay, la crea. Si dos
-- pedidos llegan a la vez, el índice ux_una_cuenta_abierta_por_mesa deja
-- pasar solo una inserción y los dos terminan usando la misma Cuenta.
-- Si la Mesa tiene asignada una Reserva confirmada que todavía no se
-- concretó y el primer pedido llega dentro de la ventana de llegada
-- (desde 15 min antes del inicio hasta 10 min después, la misma
-- tolerancia tras la cual la Reserva pasa a no_show), la Cuenta se
-- vincula a ella. Fuera de esa ventana la Cuenta se abre sin Reserva,
-- así un cliente sin reserva no "completa" la Reserva de otro.
-- Si una Reserva tiene varias Mesas y dos abren cuenta al mismo tiempo,
-- solo una se vincula a la Reserva (idReserva es UNIQUE en Cuenta); la
-- otra se abre sin Reserva, igual que si hubieran pedido en distinto
-- momento.
-- El pasaje a no_show lo hace una tarea programada del backend.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION obtener_o_abrir_cuenta(p_idMesa INT) RETURNS INT AS $$
DECLARE
    v_idCuenta  INT;
    v_idReserva INT;
BEGIN
    SELECT r.idReserva INTO v_idReserva
      FROM Reserva r
      JOIN ReservaMesa rm ON rm.idReserva = r.idReserva
     WHERE rm.idMesa = p_idMesa
       AND r.estado = 'confirmada'
       AND now() BETWEEN r.fechaHoraInicio - INTERVAL '15 minutes'
                     AND r.fechaHoraInicio + INTERVAL '10 minutes'
       AND NOT EXISTS (SELECT 1 FROM Cuenta c WHERE c.idReserva = r.idReserva)
     ORDER BY r.fechaHoraInicio
     LIMIT 1;

    BEGIN
        INSERT INTO Cuenta (idMesa, idReserva)
        VALUES (p_idMesa, v_idReserva)
        ON CONFLICT (idMesa) WHERE estado = 'abierta' DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
        -- Otra Mesa de la misma Reserva se vinculó a ella en este mismo
        -- instante: esta Cuenta se abre sin Reserva.
        INSERT INTO Cuenta (idMesa)
        VALUES (p_idMesa)
        ON CONFLICT (idMesa) WHERE estado = 'abierta' DO NOTHING;
    END;

    SELECT idCuenta INTO v_idCuenta
      FROM Cuenta
     WHERE idMesa = p_idMesa AND estado = 'abierta';
    RETURN v_idCuenta;
END;
$$ LANGUAGE plpgsql;

-- Al cerrar una Cuenta vinculada a una Reserva, la Reserva pasa a
-- completada.
CREATE OR REPLACE FUNCTION fn_cuenta_cierre_completa_reserva() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'abierta' AND NEW.estado = 'cerrada' AND NEW.idReserva IS NOT NULL THEN
        UPDATE Reserva SET estado = 'completada' WHERE idReserva = NEW.idReserva;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cuenta_cierre_completa_reserva
    AFTER UPDATE ON Cuenta
    FOR EACH ROW EXECUTE FUNCTION fn_cuenta_cierre_completa_reserva();

-- =====================================================================
-- EXPERIENCIA GALATEA (JUEGO)
-- =====================================================================

-- Tematica: codigo y nombre son únicos (ej. 'COM' Comidas, 'PAI' Países).
CREATE TABLE Tematica (
    codigo  VARCHAR(10)  PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
);

-- Palabra (Tematica 1 -agrupa-> *): texto único dentro de su Tematica.
CREATE TABLE Palabra (
    idPalabra        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigoTematica   VARCHAR(10)  NOT NULL REFERENCES Tematica(codigo),
    texto            VARCHAR(100) NOT NULL,
    CONSTRAINT uq_palabra_por_tematica UNIQUE (codigoTematica, texto)
);

-- ---------------------------------------------------------------------
-- Partida (* de temática 1 Tematica; * se juega en 0..1 Mesa).
-- Solo en modo 'mesa' se juega en una Mesa. codigoSala es único entre
-- las partidas no finalizadas.
-- ---------------------------------------------------------------------
CREATE TABLE Partida (
    idPartida        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigoTematica   VARCHAR(10) NOT NULL REFERENCES Tematica(codigo),
    idMesa           INT NULL REFERENCES Mesa(idMesa),
    codigoSala       VARCHAR(10) NOT NULL,
    modo             VARCHAR(12) NOT NULL CHECK (modo IN ('mesa', 'online', 'individual')),
    cantidadRondas   INT NOT NULL CHECK (cantidadRondas >= 1),  -- el máximo lo fija la configuración del juego
    estado           VARCHAR(12) NOT NULL DEFAULT 'espera'
        CHECK (estado IN ('espera', 'en_curso', 'finalizada')),
    fechaInicio      TIMESTAMP NULL,
    CONSTRAINT chk_partida_mesa_segun_modo CHECK ((modo = 'mesa') = (idMesa IS NOT NULL))
);

CREATE UNIQUE INDEX ux_codigo_sala_activa
    ON Partida (codigoSala)
    WHERE estado <> 'finalizada';

-- ---------------------------------------------------------------------
-- Jugador (composición: Partida 1 -> 1..* Jugador;
-- Cliente 1 -participa como-> * Jugador).
-- Un Cliente es a lo sumo un Jugador por Partida, y cada Partida tiene
-- a lo sumo un anfitrión (índice parcial). Que tenga exactamente uno lo
-- garantiza el backend al crear la partida.
-- ---------------------------------------------------------------------
CREATE TABLE Jugador (
    idJugador    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idPartida    INT NOT NULL REFERENCES Partida(idPartida) ON DELETE CASCADE,
    idCliente    INT NOT NULL REFERENCES Cliente(idCliente),
    rol          VARCHAR(10) NULL CHECK (rol IN ('civil', 'impostor')),  -- se asigna al iniciar
    puntaje      INT NOT NULL DEFAULT 0 CHECK (puntaje >= 0),
    esAnfitrion  BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_jugador_cliente_partida UNIQUE (idPartida, idCliente),
    CONSTRAINT uq_jugador_partida UNIQUE (idJugador, idPartida)   -- para FK compuestas
);

CREATE UNIQUE INDEX ux_un_anfitrion_por_partida
    ON Jugador (idPartida)
    WHERE esAnfitrion;

-- ---------------------------------------------------------------------
-- Ronda (composición: Partida 1 -> * Ronda; * usa 1 Palabra).
-- ---------------------------------------------------------------------
CREATE TABLE Ronda (
    idRonda          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idPartida        INT NOT NULL REFERENCES Partida(idPartida) ON DELETE CASCADE,
    idPalabra        INT NOT NULL REFERENCES Palabra(idPalabra),
    numero           INT NOT NULL CHECK (numero >= 1),
    civilesAciertan  BOOLEAN NULL,
    CONSTRAINT uq_ronda_numero_por_partida UNIQUE (idPartida, numero),
    CONSTRAINT uq_ronda_partida UNIQUE (idRonda, idPartida)       -- para FK compuestas
);

-- numero <= cantidadRondas, y la Palabra es de la Tematica de la Partida.
CREATE OR REPLACE FUNCTION fn_ronda_validar() RETURNS TRIGGER AS $$
DECLARE
    v_cantidad  INT;
    v_temPart   VARCHAR(10);
    v_temPal    VARCHAR(10);
BEGIN
    SELECT cantidadRondas, codigoTematica INTO v_cantidad, v_temPart
      FROM Partida WHERE idPartida = NEW.idPartida;
    SELECT codigoTematica INTO v_temPal
      FROM Palabra WHERE idPalabra = NEW.idPalabra;

    IF NEW.numero > v_cantidad THEN
        RAISE EXCEPTION 'La ronda % supera la cantidad de rondas de la partida (%)', NEW.numero, v_cantidad;
    END IF;
    IF v_temPal IS DISTINCT FROM v_temPart THEN
        RAISE EXCEPTION 'La palabra no pertenece a la temática de la partida';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ronda_validar
    BEFORE INSERT OR UPDATE ON Ronda
    FOR EACH ROW EXECUTE FUNCTION fn_ronda_validar();

-- ---------------------------------------------------------------------
-- Pista (* dada por 1 Jugador; * en 1 Ronda). Solo en partidas online
-- (en Modo Mesa la pista es oral). Una por Jugador en cada Ronda.
-- idPartida se repite para que las FK compuestas exijan que el Jugador
-- y la Ronda sean de la misma Partida.
-- ---------------------------------------------------------------------
CREATE TABLE Pista (
    idRonda    INT NOT NULL,
    idJugador  INT NOT NULL,
    idPartida  INT NOT NULL,
    texto      VARCHAR(100) NOT NULL,
    PRIMARY KEY (idRonda, idJugador),
    FOREIGN KEY (idRonda, idPartida)   REFERENCES Ronda(idRonda, idPartida) ON DELETE CASCADE,
    FOREIGN KEY (idJugador, idPartida) REFERENCES Jugador(idJugador, idPartida) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION fn_pista_solo_online() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT modo FROM Partida WHERE idPartida = NEW.idPartida) <> 'online' THEN
        RAISE EXCEPTION 'Las pistas escritas solo existen en partidas online';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pista_solo_online
    BEFORE INSERT OR UPDATE ON Pista
    FOR EACH ROW EXECUTE FUNCTION fn_pista_solo_online();

-- ---------------------------------------------------------------------
-- Voto (* emitido por 1 Jugador [votante]; * dirigido a 1 Jugador
-- [votado]; * en 1 Ronda). Un voto por votante en cada Ronda; nadie se
-- vota a sí mismo; todos de la misma Partida.
-- ---------------------------------------------------------------------
CREATE TABLE Voto (
    idRonda           INT NOT NULL,
    idJugadorVotante  INT NOT NULL,
    idJugadorVotado   INT NOT NULL,
    idPartida         INT NOT NULL,
    PRIMARY KEY (idRonda, idJugadorVotante),
    FOREIGN KEY (idRonda, idPartida)          REFERENCES Ronda(idRonda, idPartida) ON DELETE CASCADE,
    FOREIGN KEY (idJugadorVotante, idPartida) REFERENCES Jugador(idJugador, idPartida) ON DELETE CASCADE,
    FOREIGN KEY (idJugadorVotado, idPartida)  REFERENCES Jugador(idJugador, idPartida) ON DELETE CASCADE,
    CONSTRAINT chk_voto_no_a_si_mismo CHECK (idJugadorVotante <> idJugadorVotado)
);

-- ---------------------------------------------------------------------
-- Premio y Canje (* realizado por 1 Cliente; * de 1 Premio).
-- puntosUsados = puntosRequeridos del Premio al momento del canje.
-- Que el Cliente tenga puntos suficientes y que el Premio esté activo lo
-- valida el backend en la misma transacción que inserta el Canje.
-- ---------------------------------------------------------------------
CREATE TABLE Premio (
    idPremio          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    puntosRequeridos  INT NOT NULL CHECK (puntosRequeridos > 0),
    activo            BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE Canje (
    idCanje       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCliente     INT NOT NULL REFERENCES Cliente(idCliente),
    idPremio      INT NOT NULL REFERENCES Premio(idPremio),
    fechaCanje    TIMESTAMP NOT NULL DEFAULT now(),
    puntosUsados  INT NOT NULL CHECK (puntosUsados > 0)
);

-- =====================================================================
-- VISTAS PARA LOS ATRIBUTOS DERIVADOS (/)
-- =====================================================================

-- /Mesa.estado:
--   cuentaSolicitada: tiene una Cuenta abierta y el Cliente pidió la cuenta.
--   ocupada:          tiene una Cuenta abierta.
--   reservada:        sin Cuenta abierta, con una Reserva confirmada
--                     asignada que empieza dentro de los próximos 30 min
--                     o empezó hace menos de 10 min (después pasa a no_show).
--   libre:            en cualquier otro caso.
-- Los 30 minutos son un parámetro de la aplicación; acá se fija el valor
-- por defecto.
CREATE VIEW v_MesaEstado AS
SELECT m.*,
       CASE
         WHEN c.idCuenta IS NOT NULL AND c.fechaSolicitudCuenta IS NOT NULL THEN 'cuentaSolicitada'
         WHEN c.idCuenta IS NOT NULL THEN 'ocupada'
         WHEN EXISTS (SELECT 1
                        FROM ReservaMesa rm
                        JOIN Reserva r ON r.idReserva = rm.idReserva
                       WHERE rm.idMesa = m.idMesa
                         AND r.estado = 'confirmada'
                         AND now() BETWEEN r.fechaHoraInicio - INTERVAL '30 minutes'
                                       AND r.fechaHoraInicio + INTERVAL '10 minutes')
           THEN 'reservada'
         ELSE 'libre'
       END AS estado
  FROM Mesa m
  LEFT JOIN Cuenta c ON c.idMesa = m.idMesa AND c.estado = 'abierta';

-- /CuponDescuento.estado: usado si está aplicado a una Cuenta.
CREATE VIEW v_CuponEstado AS
SELECT cu.*,
       CASE WHEN cu.idCuenta IS NULL THEN 'pendiente' ELSE 'usado' END AS estado
  FROM CuponDescuento cu;

-- Subtotal en curso de cada Cuenta (para la que todavía está abierta).
CREATE VIEW v_CuentaSubtotal AS
SELECT c.idCuenta,
       COALESCE(SUM(d.cantidad * d.precioUnitario), 0) AS subtotal
  FROM Cuenta c
  LEFT JOIN Pedido p        ON p.idCuenta = c.idCuenta
  LEFT JOIN DetallePedido d ON d.idPedido = p.idPedido
 GROUP BY c.idCuenta;

-- Carta: cada Producto activo con su categoría, sector y si está
-- "Agotado por hoy" (ninguna de sus presentaciones disponible).
CREATE VIEW v_ProductoCarta AS
SELECT p.idProducto, p.nombre, p.descripcion, p.foto,
       c.idCategoriaMenu, c.nombre AS categoria, c.sector, c.orden AS ordenCategoria,
       NOT EXISTS (SELECT 1 FROM Presentacion pr
                    WHERE pr.idProducto = p.idProducto AND pr.disponible) AS agotado
  FROM Producto p
  JOIN CategoriaMenu c ON c.idCategoriaMenu = p.idCategoriaMenu
 WHERE p.activo AND c.activa;

-- Puntos disponibles de cada Cliente para canjear premios.
CREATE VIEW v_PuntosCliente AS
SELECT cl.idCliente,
       COALESCE((SELECT SUM(j.puntaje) FROM Jugador j WHERE j.idCliente = cl.idCliente), 0)
     - COALESCE((SELECT SUM(k.puntosUsados) FROM Canje k WHERE k.idCliente = cl.idCliente), 0)
       AS puntosDisponibles
  FROM Cliente cl;
