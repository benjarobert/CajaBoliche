-- SISTEMA DE VENTAS DE BOLICHE
-- Trabajo Final Integrador · Programación II
--
-- Contenido:
--   0. Base de datos, login prog2 y permisos
--   1. Esquema: 6 tablas con constraints
--   2. Indices
--   3. Datos de prueba (seed)
--   4. Triggers (3)
--   5. Procedimientos almacenados (7) · todos con prefijo usp_
--   6. Vistas (2)
--
-- Convenciones:
--   - Codigos de error propios: desde 50001 (THROW)
--   - Dinero: DECIMAL(12,2)
--   - Timestamps: DATETIME2
--   - Items de venta: JSON parseado con OPENJSON


-- Necesario para los indices filtrados (los CREATE INDEX ... WHERE ...).
-- SSMS deja esta opcion prendida por defecto, pero sqlcmd no, asi que sin
-- esta linea el script falla al correrlo desde la linea de comandos.
SET QUOTED_IDENTIFIER ON;
GO


-- =====================================================================
-- 0. BASE DE DATOS, LOGIN Y PERMISOS
-- Hace que el script sea autosuficiente: se puede correr en una maquina
-- limpia, sin crear nada a mano antes.
-- =====================================================================

-- 0.1 Crear la base solo si todavia no existe.
-- Va dentro de un EXEC porque CREATE DATABASE tiene que ser la unica
-- sentencia de su lote y no se puede escribir adentro de un IF.
IF DB_ID('Boliche.RobertBertinoSuarez') IS NULL
    EXEC ('CREATE DATABASE [Boliche.RobertBertinoSuarez]');
GO

-- 0.2 Crear el login a nivel servidor, solo si no existe.
-- Si ya existe no se modifica, porque el mismo login puede estar en uso
-- por otros trabajos de la materia.
-- Contrasena en una instalacion nueva: Prog2.2026 (la misma de la catedra).
-- CHECK_POLICY = OFF para que el script funcione igual en cualquier maquina,
-- sin depender de la politica de contrasenas de Windows de cada una.
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'prog2')
    CREATE LOGIN prog2 WITH PASSWORD = 'Prog2.2026',
                            CHECK_POLICY = OFF,
                            DEFAULT_DATABASE = [Boliche.RobertBertinoSuarez];
GO

-- 0.3 De aca en adelante, todo corre dentro de la base del proyecto.
USE [Boliche.RobertBertinoSuarez];
GO

-- 0.4 Dar de alta el login como usuario de esta base y darle permisos:
-- leer y escribir las tablas, y ejecutar los procedimientos almacenados.
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'prog2')
    CREATE USER prog2 FOR LOGIN prog2;
GO

ALTER ROLE db_datareader ADD MEMBER prog2;
ALTER ROLE db_datawriter ADD MEMBER prog2;
GRANT EXECUTE TO prog2;
GO


-- 0.5 Limpieza: borra lo anterior para que el script se pueda correr
-- de nuevo sobre una base ya cargada sin que falle.
DROP VIEW IF EXISTS v_ventas_detalle;
DROP VIEW IF EXISTS v_caja_resumen;
DROP PROCEDURE IF EXISTS usp_registrar_venta;
DROP PROCEDURE IF EXISTS usp_anular_venta;
DROP PROCEDURE IF EXISTS usp_cerrar_caja;
DROP PROCEDURE IF EXISTS usp_abrir_caja;
DROP PROCEDURE IF EXISTS usp_resumen_recaudacion;
DROP PROCEDURE IF EXISTS usp_buscar_ventas;
DROP PROCEDURE IF EXISTS usp_cambiar_estado_entrada;
-- Limpiar SPs viejos con prefijo sp_ si quedaron
DROP PROCEDURE IF EXISTS sp_registrar_venta;
DROP PROCEDURE IF EXISTS sp_anular_venta;
DROP PROCEDURE IF EXISTS sp_cerrar_caja;
DROP PROCEDURE IF EXISTS sp_abrir_caja;
DROP PROCEDURE IF EXISTS sp_resumen_recaudacion;
IF TYPE_ID('tipo_items_venta') IS NOT NULL DROP TYPE tipo_items_venta;
DROP TABLE IF EXISTS venta_item;
DROP TABLE IF EXISTS venta;
DROP TABLE IF EXISTS caja;
DROP TABLE IF EXISTS entrada;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS usuario;
GO

-- =====================================================================
-- 1. ESQUEMA
-- Las 6 tablas con sus claves foraneas y sus CHECK.
-- Las reglas que no se pueden saltear viven aca.
-- =====================================================================

-- 1.1 usuario
CREATE TABLE usuario (
    id         INT             IDENTITY(1,1) PRIMARY KEY,
    nombre     NVARCHAR(100)   NOT NULL,
    pin_hash   VARCHAR(255)    NOT NULL,
    barra      VARCHAR(10)     NOT NULL,
    rol        VARCHAR(20)     NOT NULL,
    activo     BIT             NOT NULL DEFAULT 1,
    creado_en  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT chk_usuario_barra CHECK (barra IN ('general','vip','ambas')),
    CONSTRAINT chk_usuario_rol   CHECK (rol   IN ('admin','cajero'))
);
GO

-- 1.2 producto
CREATE TABLE producto (
    id         INT             IDENTITY(1,1) PRIMARY KEY,
    nombre     NVARCHAR(100)   NOT NULL,
    sabor      NVARCHAR(50)    NOT NULL DEFAULT '',
    tamanio    NVARCHAR(50)    NOT NULL DEFAULT '',
    categoria  NVARCHAR(50)    NOT NULL,
    precio     DECIMAL(12,2)   NOT NULL,
    stock      INT             NOT NULL DEFAULT 0,
    barra      VARCHAR(10)     NOT NULL,
    activo     BIT             NOT NULL DEFAULT 1,
    CONSTRAINT chk_producto_precio CHECK (precio >= 0),
    CONSTRAINT chk_producto_stock  CHECK (stock  >= 0),
    CONSTRAINT chk_producto_barra  CHECK (barra IN ('general','vip','ambas')),
    CONSTRAINT uq_producto UNIQUE (nombre, sabor, tamanio, barra)
);
GO

-- 1.3 entrada (ahora con 4 estados posibles)
CREATE TABLE entrada (
    id                INT             IDENTITY(1,1) PRIMARY KEY,
    codigo            VARCHAR(50)     NOT NULL UNIQUE,
    tipo_acceso       VARCHAR(10)     NOT NULL,
    monto_consumible  DECIMAL(12,2)   NOT NULL,
    saldo_actual      DECIMAL(12,2)   NOT NULL,
    estado            VARCHAR(10)     NOT NULL DEFAULT 'activa',
    creada_en         DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT chk_entrada_tipo   CHECK (tipo_acceso IN ('general','vip')),
    CONSTRAINT chk_entrada_monto  CHECK (monto_consumible >= 0),
    CONSTRAINT chk_entrada_saldo  CHECK (saldo_actual     >= 0),
    CONSTRAINT chk_entrada_tope   CHECK (saldo_actual <= monto_consumible),
    CONSTRAINT chk_entrada_estado CHECK (estado IN ('activa','consumida','caducada','anulada'))
);
GO

-- 1.4 caja (sin efectivo_declarado ni diferencia; con total_vendido)
CREATE TABLE caja (
    id             INT             IDENTITY(1,1) PRIMARY KEY,
    barra          VARCHAR(10)     NOT NULL,
    cajero_id      INT             NOT NULL,
    fecha          DATE            NOT NULL,
    abierta_en     DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    cerrada_en     DATETIME2       NULL,
    fondo_inicial  DECIMAL(12,2)   NOT NULL,
    total_vendido  DECIMAL(12,2)   NOT NULL DEFAULT 0,
    estado         VARCHAR(10)     NOT NULL DEFAULT 'abierta',
    CONSTRAINT fk_caja_usuario FOREIGN KEY (cajero_id) REFERENCES usuario(id),
    CONSTRAINT chk_caja_barra   CHECK (barra IN ('general','vip')),
    CONSTRAINT chk_caja_fondo   CHECK (fondo_inicial >= 0),
    CONSTRAINT chk_caja_total   CHECK (total_vendido >= 0),
    CONSTRAINT chk_caja_estado  CHECK (estado IN ('abierta','cerrada')),
    CONSTRAINT chk_caja_horario CHECK (cerrada_en IS NULL OR cerrada_en >= abierta_en),
    CONSTRAINT uq_caja UNIQUE (barra, fecha)
);
GO

-- 1.5 venta
CREATE TABLE venta (
    id           INT             IDENTITY(1,1) PRIMARY KEY,
    caja_id      INT             NOT NULL,
    entrada_id   INT             NULL,
    medio_pago   VARCHAR(20)     NOT NULL,
    cuotas       INT             NULL,
    total        DECIMAL(12,2)   NOT NULL,
    estado       VARCHAR(10)     NOT NULL DEFAULT 'pagada',
    anulada_por  INT             NULL,
    creada_en    DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_venta_caja     FOREIGN KEY (caja_id)     REFERENCES caja(id),
    CONSTRAINT fk_venta_entrada  FOREIGN KEY (entrada_id)  REFERENCES entrada(id),
    CONSTRAINT fk_venta_anulante FOREIGN KEY (anulada_por) REFERENCES usuario(id),
    CONSTRAINT chk_venta_medio  CHECK (medio_pago IN ('efectivo','debito','credito','qr','entrada')),
    CONSTRAINT chk_venta_total  CHECK (total >= 0),
    CONSTRAINT chk_venta_cuotas CHECK (cuotas IS NULL OR cuotas >= 1),
    CONSTRAINT chk_venta_estado CHECK (estado IN ('pagada','anulada')),
    CONSTRAINT chk_venta_entrada_coherente CHECK (
        (medio_pago =  'entrada' AND entrada_id IS NOT NULL) OR
        (medio_pago <> 'entrada' AND entrada_id IS NULL)
    ),
    CONSTRAINT chk_venta_credito_coherente CHECK (
        (medio_pago =  'credito' AND cuotas IS NOT NULL) OR
        (medio_pago <> 'credito' AND cuotas IS NULL)
    ),
    CONSTRAINT chk_venta_anulada_coherente CHECK (
        (estado =  'anulada' AND anulada_por IS NOT NULL) OR
        (estado <> 'anulada' AND anulada_por IS NULL)
    )
);
GO

-- 1.6 venta_item
CREATE TABLE venta_item (
    id               INT             IDENTITY(1,1) PRIMARY KEY,
    venta_id         INT             NOT NULL,
    producto_id      INT             NOT NULL,
    producto_nombre  NVARCHAR(100)   NOT NULL DEFAULT '',
    cantidad         INT             NOT NULL,
    precio_unitario  DECIMAL(12,2)   NOT NULL,
    subtotal         DECIMAL(12,2)   NOT NULL,
    CONSTRAINT fk_item_venta    FOREIGN KEY (venta_id)    REFERENCES venta(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_producto FOREIGN KEY (producto_id) REFERENCES producto(id),
    CONSTRAINT chk_item_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_item_precio   CHECK (precio_unitario >= 0),
    CONSTRAINT chk_item_subtotal CHECK (subtotal = cantidad * precio_unitario),
    CONSTRAINT uq_venta_item UNIQUE (venta_id, producto_id)
);
GO

-- =====================================================================
-- 2. INDICES
-- Los tres con WHERE son indices filtrados: solo indexan las filas
-- que cumplen la condicion. Por eso el script necesita
-- SET QUOTED_IDENTIFIER ON al principio.
-- =====================================================================

CREATE INDEX idx_caja_estado_abierta ON caja(estado)       WHERE estado = 'abierta';
CREATE INDEX idx_venta_caja          ON venta(caja_id);
CREATE INDEX idx_venta_creada        ON venta(creada_en);
CREATE INDEX idx_venta_item_venta    ON venta_item(venta_id);
CREATE INDEX idx_producto_barra      ON producto(barra)    WHERE activo = 1;
CREATE INDEX idx_entrada_activa      ON entrada(estado)    WHERE estado = 'activa';
GO



-- =====================================================================
-- 3. DATOS DE PRUEBA (SEED)
-- Datos realistas en pesos argentinos, listos para la demo:
-- incluye una caja abierta para hoy, asi se puede cobrar enseguida.
-- =====================================================================

INSERT INTO usuario (nombre, pin_hash, barra, rol) VALUES
    (N'Admin',   'hash_admin_demo', 'ambas',   'admin'),
    (N'Juan',    'hash_1234',       'general', 'cajero'),
    (N'Micaela', 'hash_5678',       'vip',     'cajero');

INSERT INTO producto (nombre, sabor, tamanio, categoria, precio, stock, barra) VALUES
    (N'Fernet con Coca',   '', '400 ml', N'tragos',       4500, 200, 'general'),
    (N'Vodka con Speed',   '', '400 ml', N'tragos',       5000, 150, 'general'),
    (N'Gancia con Sprite', '', '400 ml', N'tragos',       4000, 150, 'general'),
    (N'Cerveza Quilmes',   '', '473 ml', N'cerveza',      3500, 300, 'general'),
    (N'Red Bull',          '', '250 ml', N'energizante',  3800,  80, 'general'),
    (N'Agua mineral',      '', '500 ml', N'sin alcohol',  2000, 100, 'general');

INSERT INTO producto (nombre, sabor, tamanio, categoria, precio, stock, barra) VALUES
    (N'Smirnoff',           N'Manzana', '750 ml', N'botella',    25000, 20, 'vip'),
    (N'Smirnoff',           N'Durazno', '750 ml', N'botella',    25000, 20, 'vip'),
    (N'Absolut',            N'Natural', '750 ml', N'botella',    35000, 15, 'vip'),
    (N'Chivas Regal',       '',         '750 ml', N'whisky',     85000, 10, 'vip'),
    (N'Champagne Chandon',  '',         '750 ml', N'espumante',  45000, 15, 'vip');

INSERT INTO entrada (codigo, tipo_acceso, monto_consumible, saldo_actual) VALUES
    ('ENT-GEN-0001', 'general', 15000, 15000),
    ('ENT-GEN-0002', 'general', 15000, 15000),
    ('ENT-GEN-0003', 'general', 15000, 15000),
    ('ENT-VIP-0001', 'vip',     15000, 15000),
    ('ENT-VIP-0002', 'vip',     15000, 15000);

INSERT INTO caja (barra, cajero_id, fecha, fondo_inicial) VALUES
    ('general', 2, CAST(GETDATE() AS DATE), 20000),
    ('vip',     3, CAST(GETDATE() AS DATE), 20000);
GO




-- =====================================================================
-- 4. TRIGGERS
-- Mantienen el stock, el saldo de las entradas y el total de la caja
-- sincronizados solos. Ninguna de estas cuentas la hace el JavaScript.
-- =====================================================================

-- 4.1 Al insertar venta_item: autocompleta nombre y descuenta stock
CREATE OR ALTER TRIGGER trg_venta_item_insert
ON venta_item
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- El stock se valida ANTES de descontarlo. La tabla producto tiene un
    -- CHECK (stock >= 0): si descontaramos primero, esa restriccion cortaria
    -- la operacion con un error generico en ingles y nunca se llegaria al
    -- THROW con nuestro codigo 50001.
    IF EXISTS (
        SELECT 1
          FROM producto p
          JOIN (SELECT producto_id, SUM(cantidad) AS cantidad
                  FROM inserted
                 GROUP BY producto_id) i ON i.producto_id = p.id
         WHERE p.stock < i.cantidad
    )
        THROW 50001, 'Stock insuficiente para alguno de los productos', 1;

    UPDATE vi
       SET vi.producto_nombre = p.nombre
      FROM venta_item vi
      JOIN inserted i ON i.id = vi.id
      JOIN producto  p ON p.id = i.producto_id
     WHERE vi.producto_nombre = '';

    UPDATE p
       SET p.stock = p.stock - i.cantidad
      FROM producto p
      JOIN inserted i ON i.producto_id = p.id;
END
GO

-- 4.2 Al insertar venta: valida caja/entrada, descuenta saldo, suma total_vendido
--     y si la entrada queda en 0 la pasa automaticamente a 'consumida'
CREATE OR ALTER TRIGGER trg_venta_insert
ON venta
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM inserted i
          JOIN caja c ON c.id = i.caja_id
         WHERE c.estado = 'cerrada'
    )
        THROW 50002, 'La caja seleccionada esta cerrada o no existe', 1;

    IF EXISTS (
        SELECT 1 FROM inserted i
          JOIN caja    c ON c.id = i.caja_id
          JOIN entrada e ON e.id = i.entrada_id
         WHERE i.entrada_id IS NOT NULL
           AND (c.barra <> e.tipo_acceso
                OR e.estado <> 'activa'
                OR e.saldo_actual < i.total)
    )
        THROW 50003, 'Entrada invalida: tipo no coincide con la barra, no esta activa o no tiene saldo', 1;

    UPDATE e
       SET e.saldo_actual = e.saldo_actual - i.total
      FROM entrada e
      JOIN inserted i ON i.entrada_id = e.id
     WHERE i.entrada_id IS NOT NULL;

    -- Transicion automatica a 'consumida' si la entrada quedo en 0
    UPDATE entrada
       SET estado = 'consumida'
     WHERE id IN (SELECT entrada_id FROM inserted WHERE entrada_id IS NOT NULL)
       AND saldo_actual = 0
       AND estado = 'activa';

    -- Actualizar total_vendido de la caja
    UPDATE c
       SET c.total_vendido = c.total_vendido + i.total
      FROM caja c
      JOIN inserted i ON i.caja_id = c.id;
END
GO

-- 4.3 Al anular una venta: devuelve stock y saldo, resta de total_vendido
CREATE OR ALTER TRIGGER trg_venta_anular
ON venta
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(estado) RETURN;

    -- Devolver stock
    UPDATE p
       SET p.stock = p.stock + vi.cantidad
      FROM producto p
      JOIN venta_item vi ON vi.producto_id = p.id
      JOIN inserted i    ON i.id = vi.venta_id
      JOIN deleted  d    ON d.id = i.id
     WHERE d.estado = 'pagada' AND i.estado = 'anulada';

    -- Devolver saldo a la entrada y, si tenia saldo > 0, volverla a 'activa'
    UPDATE e
       SET e.saldo_actual = e.saldo_actual + i.total,
           e.estado = CASE WHEN e.estado = 'consumida' THEN 'activa' ELSE e.estado END
      FROM entrada e
      JOIN inserted i ON i.entrada_id = e.id
      JOIN deleted  d ON d.id = i.id
     WHERE d.estado = 'pagada'
       AND i.estado = 'anulada'
       AND i.entrada_id IS NOT NULL;

    -- Restar de total_vendido de la caja
    UPDATE c
       SET c.total_vendido = c.total_vendido - i.total
      FROM caja c
      JOIN inserted i ON i.caja_id = c.id
      JOIN deleted  d ON d.id = i.id
     WHERE d.estado = 'pagada' AND i.estado = 'anulada';
END
GO


-- ================================================================
-- 5. PROCEDIMIENTOS ALMACENADOS
-- ================================================================

-- 5.1 Abrir caja
CREATE OR ALTER PROCEDURE usp_abrir_caja
    @cajero_id      INT,
    @barra          VARCHAR(10),
    @fondo_inicial  DECIMAL(12,2),
    @caja_id        INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 FROM usuario
             WHERE id = @cajero_id AND activo = 1
               AND (barra = @barra OR barra = 'ambas')
        )
            THROW 50006, 'El cajero no existe o no tiene permiso para esta barra', 1;

        IF EXISTS (
            SELECT 1 FROM caja
             WHERE barra = @barra AND fecha = CAST(GETDATE() AS DATE)
        )
            THROW 50007, 'Ya existe una caja hoy para esta barra', 1;

        INSERT INTO caja (barra, cajero_id, fecha, fondo_inicial)
        VALUES (@barra, @cajero_id, CAST(GETDATE() AS DATE), @fondo_inicial);

        SET @caja_id = SCOPE_IDENTITY();

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 5.2 Cerrar caja (cambio de estado abierta -> cerrada, no se puede reabrir)
CREATE OR ALTER PROCEDURE usp_cerrar_caja
    @caja_id  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @estado VARCHAR(10);
        SELECT @estado = estado FROM caja WHERE id = @caja_id;

        IF @estado IS NULL
            THROW 50008, 'La caja no existe', 1;

        IF @estado = 'cerrada'
            THROW 50009, 'La caja ya esta cerrada y no se puede reabrir', 1;

        UPDATE caja
           SET cerrada_en = SYSDATETIME(),
               estado = 'cerrada'
         WHERE id = @caja_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO


CREATE OR ALTER PROCEDURE usp_registrar_venta
    @caja_id         INT,
    @medio_pago      VARCHAR(20),
    @cuotas          INT = NULL,
    @codigo_entrada  VARCHAR(50) = NULL,
    @items_json      NVARCHAR(MAX),
    @venta_id        INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @entrada_id INT = NULL,
                @total      DECIMAL(12,2);

        -- Validar caja abierta
        IF NOT EXISTS (SELECT 1 FROM caja WHERE id = @caja_id AND estado = 'abierta')
            THROW 50002, 'La caja no existe o esta cerrada', 1;

        -- Coherencia entre el medio de pago y los datos que lo acompanan.
        -- La tabla venta ya exige estas dos combinaciones con un CHECK, pero
        -- las validamos aca para devolver un codigo propio en vez de dejar
        -- que salte la restriccion con un error generico en ingles.
        IF @medio_pago = 'credito' AND @cuotas IS NULL
            THROW 50004, 'El pago con credito necesita la cantidad de cuotas', 1;

        IF @medio_pago = 'entrada' AND @codigo_entrada IS NULL
            THROW 50005, 'El pago con entrada necesita el codigo de la entrada', 1;

        -- Resolver entrada si vino el codigo
        IF @codigo_entrada IS NOT NULL
        BEGIN
            SELECT @entrada_id = id FROM entrada WHERE codigo = @codigo_entrada;
            IF @entrada_id IS NULL
                THROW 50011, 'Codigo de entrada no encontrado', 1;
        END

        -- Parsear items del JSON
        DECLARE @items TABLE (producto_id INT, cantidad INT);
        INSERT INTO @items (producto_id, cantidad)
        SELECT producto_id, cantidad
          FROM OPENJSON(@items_json)
          WITH (
              producto_id INT '$.producto_id',
              cantidad    INT '$.cantidad'
          );

        IF NOT EXISTS (SELECT 1 FROM @items)
            THROW 50010, 'La venta no tiene items', 1;

        IF EXISTS (SELECT 1 FROM @items WHERE cantidad <= 0 OR producto_id IS NULL)
            THROW 50010, 'Hay items con cantidad invalida', 1;

        -- Calcular total desde la BD (nunca desde el cliente)
        SELECT @total = SUM(p.precio * i.cantidad)
          FROM @items i
          JOIN producto p ON p.id = i.producto_id;

        IF @total IS NULL OR @total <= 0
            THROW 50010, 'Items invalidos', 1;

        -- Insertar cabecera (los triggers validan caja/entrada y actualizan saldo+total_vendido)
        INSERT INTO venta (caja_id, entrada_id, medio_pago, cuotas, total)
        VALUES (@caja_id, @entrada_id, @medio_pago, @cuotas, @total);

        SET @venta_id = SCOPE_IDENTITY();

        -- Insertar lineas (el trigger descuenta stock y copia el nombre)
        INSERT INTO venta_item (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        SELECT @venta_id, i.producto_id, i.cantidad, p.precio, p.precio * i.cantidad
          FROM @items i
          JOIN producto p ON p.id = i.producto_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 5.4 Anular venta (requiere admin + PIN)
CREATE OR ALTER PROCEDURE usp_anular_venta
    @venta_id     INT,
    @anulada_por  INT,
    @pin_hash     VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1 FROM usuario
             WHERE id = @anulada_por AND activo = 1
               AND rol = 'admin' AND pin_hash = @pin_hash
        )
            THROW 50012, 'No autorizado para anular', 1;

        IF NOT EXISTS (SELECT 1 FROM venta WHERE id = @venta_id AND estado = 'pagada')
            THROW 50013, 'La venta no existe o ya esta anulada', 1;

        UPDATE venta
           SET estado = 'anulada',
               anulada_por = @anulada_por
         WHERE id = @venta_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE usp_resumen_recaudacion
    @caja_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Total general
    SELECT
        ISNULL(SUM(total), 0) AS total_recaudado,
        COUNT(*)              AS cantidad_ventas
      FROM venta
     WHERE estado = 'pagada'
       AND (@caja_id IS NULL OR caja_id = @caja_id);

    -- Desglose por medio de pago
    SELECT
        medio_pago,
        COUNT(*)   AS cantidad_ventas,
        SUM(total) AS recaudacion
      FROM venta
     WHERE estado = 'pagada'
       AND (@caja_id IS NULL OR caja_id = @caja_id)
     GROUP BY medio_pago
     ORDER BY SUM(total) DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_buscar_ventas
    @fecha_desde  DATE          = NULL,
    @fecha_hasta  DATE          = NULL,
    @barra        VARCHAR(10)   = NULL,
    @medio_pago   VARCHAR(20)   = NULL,
    @estado       VARCHAR(10)   = NULL,
    @texto        NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        v.id          AS venta_id,
        v.creada_en,
        c.barra,
        u.nombre      AS cajero,
        v.medio_pago,
        v.cuotas,
        v.total,
        v.estado
      FROM venta v
      JOIN caja    c ON c.id = v.caja_id
      JOIN usuario u ON u.id = c.cajero_id
      LEFT JOIN venta_item vi ON vi.venta_id = v.id
     WHERE (@fecha_desde IS NULL OR CAST(v.creada_en AS DATE) >= @fecha_desde)
       AND (@fecha_hasta IS NULL OR CAST(v.creada_en AS DATE) <= @fecha_hasta)
       AND (@barra       IS NULL OR c.barra      = @barra)
       AND (@medio_pago  IS NULL OR v.medio_pago = @medio_pago)
       AND (@estado      IS NULL OR v.estado     = @estado)
       AND (@texto       IS NULL OR vi.producto_nombre LIKE '%' + @texto + '%')
     ORDER BY v.creada_en DESC;
END
GO


CREATE OR ALTER PROCEDURE usp_cambiar_estado_entrada
    @entrada_id    INT,
    @nuevo_estado  VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @estado_actual VARCHAR(10);
        SELECT @estado_actual = estado FROM entrada WHERE id = @entrada_id;

        IF @estado_actual IS NULL
            THROW 50016, 'La entrada no existe', 1;

        IF @nuevo_estado NOT IN ('consumida','caducada','anulada')
            THROW 50014, 'Estado destino invalido', 1;

        IF NOT (
            (@estado_actual = 'activa'    AND @nuevo_estado IN ('consumida','caducada','anulada'))
         OR (@estado_actual = 'consumida' AND @nuevo_estado = 'caducada')
        )
            THROW 50014, 'Transicion de estado no permitida', 1;

        UPDATE entrada
           SET estado = @nuevo_estado
         WHERE id = @entrada_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO



-- =====================================================================
-- 6. VISTAS
-- Consultas de lectura ya armadas, para no repetir los JOIN
-- en cada procedimiento.
-- =====================================================================

CREATE OR ALTER VIEW v_ventas_detalle AS
SELECT
    v.id          AS venta_id,
    c.barra,
    u.nombre      AS cajero,
    v.creada_en,
    vi.producto_nombre,
    vi.cantidad,
    vi.precio_unitario,
    vi.subtotal,
    v.medio_pago,
    v.cuotas,
    v.total       AS total_venta,
    v.estado,
    e.codigo      AS entrada_codigo
FROM venta v
JOIN caja       c  ON c.id  = v.caja_id
JOIN usuario    u  ON u.id  = c.cajero_id
JOIN venta_item vi ON vi.venta_id = v.id
LEFT JOIN entrada e ON e.id = v.entrada_id;
GO

CREATE OR ALTER VIEW v_caja_resumen AS
SELECT
    c.id          AS caja_id,
    c.barra,
    u.nombre      AS cajero,
    c.fecha,
    c.abierta_en,
    c.cerrada_en,
    c.estado,
    c.fondo_inicial,
    c.total_vendido,
    ISNULL(SUM(CASE WHEN v.medio_pago = 'efectivo' AND v.estado = 'pagada' THEN v.total END), 0) AS total_efectivo,
    ISNULL(SUM(CASE WHEN v.medio_pago = 'debito'   AND v.estado = 'pagada' THEN v.total END), 0) AS total_debito,
    ISNULL(SUM(CASE WHEN v.medio_pago = 'credito'  AND v.estado = 'pagada' THEN v.total END), 0) AS total_credito,
    ISNULL(SUM(CASE WHEN v.medio_pago = 'qr'       AND v.estado = 'pagada' THEN v.total END), 0) AS total_qr,
    ISNULL(SUM(CASE WHEN v.medio_pago = 'entrada'  AND v.estado = 'pagada' THEN v.total END), 0) AS total_entrada,
    COUNT(CASE WHEN v.estado = 'pagada' THEN 1 END) AS cant_ventas
FROM caja c
JOIN usuario u ON u.id = c.cajero_id
LEFT JOIN venta v ON v.caja_id = c.id
GROUP BY c.id, c.barra, u.nombre, c.fecha, c.abierta_en, c.cerrada_en,
         c.estado, c.fondo_inicial, c.total_vendido;
GO

