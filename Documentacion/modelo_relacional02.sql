-- =====================================================================
-- GALATEA — Modelo relacional (PostgreSQL)
-- Alcance: tablas sin relación con Experiencia Galatea (el juego).
-- Basado en el modelo conceptual de la Primera Entrega + decisiones
-- tomadas en las sesiones de diseño (identidad progresiva, pedidos,
-- cuentas, descuento de bienvenida).
-- =====================================================================

-- ---------------------------------------------------------------------
-- UsuarioInterno
-- No estaba en la lista pedida, pero Plato, Trago, Pedido y Cuenta
-- necesitan referenciarlo (Cocinero, Bartender, Mozo, Administrador).
-- Versión mínima; se amplía cuando se diseñe login/credenciales.
-- ---------------------------------------------------------------------
CREATE TABLE UsuarioInterno (
    idUsuarioInterno    SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    rol                 VARCHAR(20)  NOT NULL
                         CHECK (rol IN ('cocinero', 'bartender', 'mozo', 'administrador')),
    credenciales        VARCHAR(255) NOT NULL,   -- placeholder: hash de password u otro mecanismo
    activo              BOOLEAN      NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- Cliente
-- alias: apodo (ej. para mostrar en el juego más adelante).
-- nombre y telefono: se completan recién al registrarse (RF34); por
-- eso son NULL hasta ese momento.
-- telefono es UNIQUE porque es la clave que dispara la fusión de
-- perfiles duplicados.
-- preferenciasInferidas: se guarda como JSON por ahora; es candidato
-- a pasar a una tabla propia el día que el motor de recomendaciones
-- necesite algo más estructurado que esto.
-- ---------------------------------------------------------------------
CREATE TABLE Cliente (
    idCliente               SERIAL PRIMARY KEY,
    alias                   VARCHAR(50)  NULL,
    nombre                  VARCHAR(100) NULL,
    telefono                VARCHAR(20)  NULL UNIQUE,
    preferenciasInferidas   JSONB        NULL,
    fechaAlta               TIMESTAMP    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- HuellaDispositivo
-- idHuella es el propio hash que entrega FingerprintJS: se usa como
-- PK natural en vez de inventar un id sustituto.
-- ---------------------------------------------------------------------
CREATE TABLE HuellaDispositivo (
    idHuella            VARCHAR(255) PRIMARY KEY,
    idCliente           INT          NOT NULL REFERENCES Cliente(idCliente),
    fechaVinculacion    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Mesa
-- estado: se actualiza automáticamente (no lo carga una persona) al
-- abrir o cerrar una Cuenta sobre esa mesa.
-- ---------------------------------------------------------------------
CREATE TABLE Mesa (
    idMesa      SERIAL PRIMARY KEY,
    numero      INT          NOT NULL UNIQUE,
    capacidad   INT          NOT NULL,
    codigoQR    VARCHAR(255) NOT NULL UNIQUE,
    estado      VARCHAR(10)  NOT NULL DEFAULT 'libre'
                CHECK (estado IN ('libre', 'ocupada'))
);

-- ---------------------------------------------------------------------
-- Reserva
-- El Cliente solo da fecha, hora de llegada y cantidadPersonas. El
-- backend calcula fechaHoraFin sumando a fechaHoraInicio una duración
-- estimada que depende de cantidadPersonas (parámetro en el backend,
-- no en la base -- ej. 1-2 personas: 60 min, 3-4: 90 min, 5-8: 150 min,
-- 9+: 180 min). Ese intervalo [fechaHoraInicio, fechaHoraFin) es una
-- estimación de planificación, no una obligación real de horario de
-- salida; cuando el cliente llega de verdad, la ocupación real de la
-- Mesa pasa a reflejarla la Cuenta.
--
-- Una Reserva puede involucrar más de una Mesa (grupos grandes que
-- juntan mesas), pero cada Mesa individual no puede pertenecer a dos
-- Reservas cuyos intervalos estimados se superpongan (no se comparte
-- una Mesa con otro grupo). Por eso el intervalo se duplica en
-- ReservaMesa: ahí es donde se puede expresar la restricción de
-- solapamiento por Mesa (ver EXCLUDE más abajo).
-- ---------------------------------------------------------------------
CREATE TABLE Reserva (
    idReserva           SERIAL PRIMARY KEY,
    idCliente           INT         NOT NULL REFERENCES Cliente(idCliente),
    fechaHoraInicio     TIMESTAMP   NOT NULL,
    fechaHoraFin        TIMESTAMP   NOT NULL,   -- calculada por el backend, no la ingresa el Cliente
    cantidadPersonas    INT         NOT NULL,
    estado              VARCHAR(12) NOT NULL DEFAULT 'confirmada'
                        CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show')),
    CONSTRAINT chk_reserva_fin_luego_de_inicio CHECK (fechaHoraFin > fechaHoraInicio)
);

-- Necesaria para poder combinar igualdad (idMesa) y rangos de tiempo
-- superpuestos en una misma restricción EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- fechaHoraInicio/fechaHoraFin quedan duplicadas acá (copiadas de la
-- Reserva) únicamente para que la base pueda validar el solapamiento
-- por Mesa sin ir a buscarlas a otra tabla. bloqueaMesa también se
-- deriva de Reserva.estado: sirve para que una Reserva cancelada,
-- completada o no_show deje de competir por la Mesa sin necesidad de
-- borrar la fila (se conserva el historial). Ninguna de las tres
-- columnas se carga a mano: las completa el trigger de más abajo, así
-- que la aplicación solo necesita insertar (idReserva, idMesa).
CREATE TABLE ReservaMesa (
    idReserva           INT       NOT NULL REFERENCES Reserva(idReserva),
    idMesa              INT       NOT NULL REFERENCES Mesa(idMesa),
    fechaHoraInicio     TIMESTAMP NOT NULL,
    fechaHoraFin        TIMESTAMP NOT NULL,
    bloqueaMesa         BOOLEAN   NOT NULL DEFAULT true,
    PRIMARY KEY (idReserva, idMesa),
    -- Ninguna Mesa puede tener dos filas ACTIVAS (bloqueaMesa = true)
    -- cuyo rango de tiempo se pise: garantiza "no se comparte una Mesa
    -- con otro grupo" a nivel base, pero solo mientras la Reserva siga
    -- confirmada.
    CONSTRAINT excl_mesa_sin_solapamiento
        EXCLUDE USING gist (
            idMesa WITH =,
            tsrange(fechaHoraInicio, fechaHoraFin) WITH &&
        ) WHERE (bloqueaMesa)
);

-- ---------------------------------------------------------------------
-- Sincronización ReservaMesa <- Reserva
-- Se completan/actualizan fechaHoraInicio, fechaHoraFin y bloqueaMesa
-- SIEMPRE a partir de la Reserva real, nunca con lo que mande la
-- aplicación. Esto elimina el riesgo de que las fechas duplicadas se
-- desincronicen.
-- ---------------------------------------------------------------------
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

-- Cuando cambia el estado (ej. se cancela) o se reprograma el horario
-- de una Reserva ya existente, propaga ese cambio a sus filas de
-- ReservaMesa (dispara el trigger de arriba en cada una).
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

-- ---------------------------------------------------------------------
-- Plato / Trago
-- Se agrega "descripcion" a Trago (no estaba en el MC, pero no hay
-- razón para que Plato la tenga y Trago no).
-- idUsuarioInterno: referencia al Cocinero/Bartender que lo gestiona.
-- ---------------------------------------------------------------------
CREATE TABLE Plato (
    idPlato             SERIAL PRIMARY KEY,
    idUsuarioInterno    INT           NOT NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    nombre              VARCHAR(100)  NOT NULL,
    descripcion         TEXT          NULL,
    disponible          BOOLEAN       NOT NULL DEFAULT true,
    precio              NUMERIC(10,2) NOT NULL CHECK (precio >= 0)
);

CREATE TABLE Trago (
    idTrago             SERIAL PRIMARY KEY,
    idUsuarioInterno    INT           NOT NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    nombre              VARCHAR(100)  NOT NULL,
    descripcion         TEXT          NULL,   -- agregado: faltaba respecto a Plato
    disponible          BOOLEAN       NOT NULL DEFAULT true,
    precio              NUMERIC(10,2) NOT NULL CHECK (precio >= 0)
);

-- ---------------------------------------------------------------------
-- Recomendacion
-- Recomienda un Plato o un Trago, nunca los dos a la vez ni ninguno.
-- ---------------------------------------------------------------------
CREATE TABLE Recomendacion (
    idRecomendacion INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idCliente       INT           NOT NULL REFERENCES Cliente(idCliente),
    idPlato         INT           NULL REFERENCES Plato(idPlato),
    idTrago         INT           NULL REFERENCES Trago(idTrago),
    fecha           TIMESTAMP     NOT NULL DEFAULT now(),
    score           NUMERIC(5,4)  NOT NULL,
    motivo          VARCHAR(255)  NULL,
    CONSTRAINT chk_recomendacion_un_solo_item
        CHECK (num_nonnulls(idPlato, idTrago) = 1)
);

-- ---------------------------------------------------------------------
-- CuponDescuento
-- Genérico (no exclusivo del descuento de bienvenida), tal como se
-- decidió, para poder reutilizarlo en futuras promociones.
-- idCuenta se completa recién cuando el cupón se usa.
-- ---------------------------------------------------------------------
CREATE TABLE CuponDescuento (
    idCupon             SERIAL PRIMARY KEY,
    idCliente           INT           NOT NULL REFERENCES Cliente(idCliente),
    tipo                VARCHAR(50)   NOT NULL,   -- ej. 'bienvenida'
    porcentaje          NUMERIC(5,2)  NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
    estado              VARCHAR(10)   NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'usado')),
    fechaGeneracion     TIMESTAMP     NOT NULL DEFAULT now(),
    fechaUso            TIMESTAMP     NULL,
    idCuenta            INT           NULL   -- FK a Cuenta se agrega más abajo (orden de creación)
);

-- ---------------------------------------------------------------------
-- Cuenta
-- Agrupa los Pedido de una visita a una Mesa. idUsuarioCierre registra
-- quién la cerró (Mozo, Bartender o Administrador indistintamente).
-- ---------------------------------------------------------------------
CREATE TABLE Cuenta (
    idCuenta            SERIAL PRIMARY KEY,
    idMesa              INT           NOT NULL REFERENCES Mesa(idMesa),
    idUsuarioCierre     INT           NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    fechaApertura       TIMESTAMP     NOT NULL DEFAULT now(),
    fechaCierre         TIMESTAMP     NULL,
    subtotal            NUMERIC(10,2) NULL,
    descuento           NUMERIC(10,2) NOT NULL DEFAULT 0,
    total               NUMERIC(10,2) NULL,
    estado              VARCHAR(10)   NOT NULL DEFAULT 'abierta'
                        CHECK (estado IN ('abierta', 'cerrada'))
);

-- Ahora sí se puede completar la FK de CuponDescuento hacia Cuenta:
ALTER TABLE CuponDescuento
    ADD CONSTRAINT fk_cupon_cuenta FOREIGN KEY (idCuenta) REFERENCES Cuenta(idCuenta);

-- Regla "una Mesa no puede tener más de una Cuenta abierta a la vez":
-- se garantiza con un índice único parcial (solo aplica a filas 'abierta').
CREATE UNIQUE INDEX ux_una_cuenta_abierta_por_mesa
    ON Cuenta (idMesa)
    WHERE estado = 'abierta';

-- ---------------------------------------------------------------------
-- Pedido
-- Referencia a Cuenta (no a Mesa directamente): la Mesa se obtiene a
-- través de la Cuenta, evitando guardar el mismo dato dos veces.
-- idCliente: quien pidió, si se identificó (canal QR). Puede ser NULL.
-- idMozoCarga: quien cargó el pedido, solo si el canal es 'asistido'.
-- ---------------------------------------------------------------------
CREATE TABLE Pedido (
    idPedido        SERIAL PRIMARY KEY,
    idCuenta        INT         NOT NULL REFERENCES Cuenta(idCuenta),
    idCliente       INT         NULL REFERENCES Cliente(idCliente),
    idMozoCarga     INT         NULL REFERENCES UsuarioInterno(idUsuarioInterno),
    fechaHora       TIMESTAMP   NOT NULL DEFAULT now(),
    canal           VARCHAR(10) NOT NULL CHECK (canal IN ('qr', 'asistido')),
    estado          VARCHAR(15) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'preparacion', 'listo', 'entregado')),
    CONSTRAINT chk_pedido_asistido_requiere_mozo
        CHECK (canal <> 'asistido' OR idMozoCarga IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- DetallePedido
-- Un renglón por cada Plato o Trago dentro de un Pedido.
-- precioUnitario: se copia el precio del Plato/Trago al momento de
-- pedir, para que un cambio de precio posterior no altere pedidos ya
-- hechos.
-- ---------------------------------------------------------------------
CREATE TABLE DetallePedido (
    idDetallePedido INT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idPedido        INT           NOT NULL REFERENCES Pedido(idPedido),
    idPlato         INT           NULL REFERENCES Plato(idPlato),
    idTrago         INT           NULL REFERENCES Trago(idTrago),
    cantidad        INT           NOT NULL CHECK (cantidad > 0),
    precioUnitario  NUMERIC(10,2) NOT NULL,
    observacion     VARCHAR(255)  NULL,
    CONSTRAINT chk_detalle_un_solo_item
        CHECK (num_nonnulls(idPlato, idTrago) = 1)
);
