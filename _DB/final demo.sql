-- Base de datos para control de licencias de aplicación Android
USE defaultdb;

-- =============================================
-- TABLA DE ROLES (NO MODIFICABLE)
-- =============================================
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    es_modificable BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predefinidos del sistema (NO MODIFICABLES)
INSERT INTO roles (nombre_rol, descripcion, es_modificable) VALUES
('Administrador', 'Acceso total al sistema - puede gestionar usuarios, licencias y configuración', FALSE),
('Usuario', 'Usuario final con licencia de la aplicación Android', FALSE);

-- =============================================
-- TABLA DE ADMINISTRADORES
-- =============================================
CREATE TABLE administradores (
    id_admin INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP NULL,
    creado_por INT NULL,
    FOREIGN KEY (creado_por) REFERENCES administradores(id_admin) ON DELETE SET NULL
);

-- =============================================
-- TABLA DE USUARIOS (CLIENTES CON LICENCIA)
-- =============================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP NULL
);

-- =============================================
-- TABLA DE LICENCIAS (SOLO PARA USUARIOS)
-- =============================================
CREATE TABLE licencias (
    id_licencia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    codigo_licencia VARCHAR(100) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    tipo_licencia ENUM('mensual', 'trimestral', 'anual') DEFAULT 'mensual',
    activa BOOLEAN DEFAULT TRUE,
    dispositivo_id VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    modificado_por INT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (modificado_por) REFERENCES administradores(id_admin) ON DELETE SET NULL
);

-- =============================================
-- TABLA DE NOTIFICACIONES
-- =============================================
CREATE TABLE notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    tipo_destinatario ENUM('administrador', 'usuario') NOT NULL,
    id_destinatario INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'advertencia', 'error', 'exito') DEFAULT 'info',
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    INDEX idx_destinatario (tipo_destinatario, id_destinatario)
);

-- =============================================
-- TABLA DE CONFIGURACIÓN DEL SISTEMA
-- =============================================
CREATE TABLE configuracion_sistema (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descripcion VARCHAR(255),
    es_modificable BOOLEAN DEFAULT TRUE,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    modificado_por INT NULL,
    FOREIGN KEY (modificado_por) REFERENCES administradores(id_admin) ON DELETE SET NULL
);

-- =============================================
-- TABLA DE DATOS DE EMPRESA
-- =============================================
CREATE TABLE datos_empresa (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL,
    razon_social VARCHAR(200),
    direccion VARCHAR(255),
    telefono_principal VARCHAR(20) NOT NULL,
    telefono_secundario VARCHAR(20),
    email_contacto VARCHAR(100),
    sitio_web VARCHAR(100),
    logo_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    modificado_por INT NULL,
    FOREIGN KEY (modificado_por) REFERENCES administradores(id_admin) ON DELETE SET NULL
);

-- =============================================
-- TABLA DE HISTORIAL DE LICENCIAS (AUDITORÍA)
-- =============================================
CREATE TABLE historial_licencias (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_licencia INT NOT NULL,
    accion ENUM('creada', 'activada', 'desactivada', 'renovada', 'vencida', 'eliminada') NOT NULL,
    id_admin_modificador INT,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    FOREIGN KEY (id_licencia) REFERENCES licencias(id_licencia) ON DELETE CASCADE,
    FOREIGN KEY (id_admin_modificador) REFERENCES administradores(id_admin) ON DELETE SET NULL
);

-- =============================================
-- TABLA DE HISTORIAL DE ACCIONES DE ADMINISTRADORES
-- =============================================
CREATE TABLE historial_administradores (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_admin INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50),
    id_registro_afectado INT,
    detalles TEXT,
    ip_address VARCHAR(45),
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_admin) REFERENCES administradores(id_admin) ON DELETE CASCADE
);

-- =============================================
-- INSERTAR CONFIGURACIONES POR DEFECTO
-- =============================================
INSERT INTO configuracion_sistema (clave, valor, descripcion, es_modificable) VALUES
('duracion_licencia_mensual', '30', 'Días de duración de licencia mensual', TRUE),
('duracion_licencia_trimestral', '90', 'Días de duración de licencia trimestral', TRUE),
('duracion_licencia_anual', '365', 'Días de duración de licencia anual', TRUE),
('notificar_vencimiento', '7', 'Días antes de vencer para notificar', TRUE),
('max_dispositivos_por_licencia', '1', 'Número máximo de dispositivos por licencia', TRUE),
('mantenimiento', 'false', 'Sistema en mantenimiento', TRUE),
('version_app', '1.0.0', 'Versión actual de la aplicación Android', TRUE),
('permitir_registro_usuarios', 'true', 'Permitir que usuarios se registren', TRUE);

-- =============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =============================================
CREATE INDEX idx_admin_email ON administradores(email);
CREATE INDEX idx_admin_activo ON administradores(activo);
CREATE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_usuario_activo ON usuarios(activo);
CREATE INDEX idx_licencia_codigo ON licencias(codigo_licencia);
CREATE INDEX idx_licencia_activa ON licencias(activa);
CREATE INDEX idx_licencia_usuario ON licencias(id_usuario);
CREATE INDEX idx_notificacion_leida ON notificaciones(leida);

-- =============================================
-- VISTA PARA LICENCIAS CON INFORMACIÓN COMPLETA
-- =============================================
CREATE VIEW vista_licencias_completa AS
SELECT 
    l.id_licencia,
    l.codigo_licencia,
    u.id_usuario,
    u.nombre_completo,
    u.email,
    u.telefono,
    l.fecha_inicio,
    l.fecha_vencimiento,
    l.tipo_licencia,
    l.activa,
    l.dispositivo_id,
    DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes,
    CASE 
        WHEN l.fecha_vencimiento < CURDATE() THEN 'Vencida'
        WHEN DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 7 THEN 'Por vencer'
        WHEN l.activa = FALSE THEN 'Desactivada'
        ELSE 'Activa'
    END AS estado_licencia,
    l.fecha_creacion
FROM licencias l
INNER JOIN usuarios u ON l.id_usuario = u.id_usuario;

-- =============================================
-- VISTA PARA RESUMEN DE ADMINISTRADORES
-- =============================================
CREATE VIEW vista_administradores AS
SELECT 
    a.id_admin,
    a.nombre_completo,
    a.email,
    a.telefono,
    a.activo,
    a.fecha_registro,
    a.ultima_sesion,
    COALESCE(creador.nombre_completo, 'Sistema') AS creado_por_nombre
FROM administradores a
LEFT JOIN administradores creador ON a.creado_por = creador.id_admin;

-- =============================================
-- PROCEDIMIENTO: CREAR NUEVA LICENCIA
-- =============================================
DELIMITER //
CREATE PROCEDURE crear_licencia(
    IN p_id_usuario INT,
    IN p_tipo_licencia VARCHAR(20),
    IN p_dispositivo_id VARCHAR(255),
    IN p_id_admin INT
)
BEGIN
    DECLARE v_codigo VARCHAR(100);
    DECLARE v_fecha_venc DATE;
    DECLARE v_duracion INT;
    DECLARE v_licencia_id INT;
    
    -- Generar código único
    SET v_codigo = CONCAT('LIC-', LPAD(p_id_usuario, 5, '0'), '-', UNIX_TIMESTAMP());
    
    -- Obtener duración según tipo de licencia
    IF p_tipo_licencia = 'mensual' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_mensual';
    ELSEIF p_tipo_licencia = 'trimestral' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_trimestral';
    ELSEIF p_tipo_licencia = 'anual' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_anual';
    ELSE
        SET v_duracion = 30;
    END IF;
    
    -- Calcular fecha de vencimiento
    SET v_fecha_venc = DATE_ADD(CURDATE(), INTERVAL v_duracion DAY);
    
    -- Insertar licencia
    INSERT INTO licencias (id_usuario, codigo_licencia, fecha_inicio, fecha_vencimiento, tipo_licencia, dispositivo_id, activa, modificado_por)
    VALUES (p_id_usuario, v_codigo, CURDATE(), v_fecha_venc, p_tipo_licencia, p_dispositivo_id, TRUE, p_id_admin);
    
    SET v_licencia_id = LAST_INSERT_ID();
    
    -- Registrar en historial
    INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
    VALUES (v_licencia_id, 'creada', p_id_admin, CONCAT('Licencia ', p_tipo_licencia, ' creada'));
    
    -- Crear notificación para el usuario
    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
    VALUES ('usuario', p_id_usuario, 'Licencia activada', CONCAT('Tu licencia ', p_tipo_licencia, ' ha sido activada exitosamente'), 'exito');
    
    SELECT v_licencia_id AS id_licencia, v_codigo AS codigo_licencia;
END //
DELIMITER ;

-- =============================================
-- PROCEDIMIENTO: CAMBIAR ESTADO DE LICENCIA
-- =============================================
DELIMITER //
CREATE PROCEDURE cambiar_estado_licencia(
    IN p_id_licencia INT,
    IN p_activa BOOLEAN,
    IN p_id_admin INT,
    IN p_notas TEXT
)
BEGIN
    DECLARE v_accion VARCHAR(20);
    DECLARE v_id_usuario INT;
    DECLARE v_mensaje TEXT;
    
    -- Obtener usuario de la licencia
    SELECT id_usuario INTO v_id_usuario FROM licencias WHERE id_licencia = p_id_licencia;
    
    -- Actualizar estado
    UPDATE licencias 
    SET activa = p_activa, modificado_por = p_id_admin 
    WHERE id_licencia = p_id_licencia;
    
    -- Determinar acción
    SET v_accion = IF(p_activa = TRUE, 'activada', 'desactivada');
    
    -- Registrar en historial
    INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
    VALUES (p_id_licencia, v_accion, p_id_admin, p_notas);
    
    -- Crear notificación para el usuario
    SET v_mensaje = IF(p_activa = TRUE, 'Tu licencia ha sido activada', 'Tu licencia ha sido desactivada');
    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
    VALUES ('usuario', v_id_usuario, 'Estado de licencia', v_mensaje, IF(p_activa = TRUE, 'exito', 'advertencia'));
    
END //
DELIMITER ;

-- =============================================
-- PROCEDIMIENTO: RENOVAR LICENCIA
-- =============================================
DELIMITER //
CREATE PROCEDURE renovar_licencia(
    IN p_id_licencia INT,
    IN p_id_admin INT
)
BEGIN
    DECLARE v_tipo_licencia VARCHAR(20);
    DECLARE v_duracion INT;
    DECLARE v_nueva_fecha DATE;
    DECLARE v_id_usuario INT;
    
    -- Obtener tipo de licencia y usuario
    SELECT tipo_licencia, id_usuario INTO v_tipo_licencia, v_id_usuario 
    FROM licencias WHERE id_licencia = p_id_licencia;
    
    -- Obtener duración
    IF v_tipo_licencia = 'mensual' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_mensual';
    ELSEIF v_tipo_licencia = 'trimestral' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_trimestral';
    ELSEIF v_tipo_licencia = 'anual' THEN
        SELECT valor INTO v_duracion FROM configuracion_sistema WHERE clave = 'duracion_licencia_anual';
    END IF;
    
    -- Calcular nueva fecha desde hoy
    SET v_nueva_fecha = DATE_ADD(CURDATE(), INTERVAL v_duracion DAY);
    
    -- Actualizar licencia
    UPDATE licencias 
    SET fecha_inicio = CURDATE(),
        fecha_vencimiento = v_nueva_fecha,
        activa = TRUE,
        modificado_por = p_id_admin
    WHERE id_licencia = p_id_licencia;
    
    -- Registrar en historial
    INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
    VALUES (p_id_licencia, 'renovada', p_id_admin, CONCAT('Licencia renovada hasta ', v_nueva_fecha));
    
    -- Notificar al usuario
    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
    VALUES ('usuario', v_id_usuario, 'Licencia renovada', CONCAT('Tu licencia ha sido renovada hasta el ', v_nueva_fecha), 'exito');
    
END //
DELIMITER ;

-- =============================================
-- EVENTO: VERIFICAR LICENCIAS VENCIDAS DIARIAMENTE
-- =============================================
DELIMITER //
CREATE EVENT verificar_licencias_vencidas
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_licencia INT;
    DECLARE v_id_usuario INT;
    
    -- Cursor para licencias vencidas
    DECLARE cur_vencidas CURSOR FOR 
        SELECT id_licencia, id_usuario 
        FROM licencias 
        WHERE fecha_vencimiento < CURDATE() AND activa = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Desactivar licencias vencidas
    UPDATE licencias 
    SET activa = FALSE 
    WHERE fecha_vencimiento < CURDATE() AND activa = TRUE;
    
    -- Registrar en historial y notificar
    OPEN cur_vencidas;
    read_loop: LOOP
        FETCH cur_vencidas INTO v_id_licencia, v_id_usuario;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        INSERT INTO historial_licencias (id_licencia, accion, notas)
        VALUES (v_id_licencia, 'vencida', 'Licencia vencida automáticamente por el sistema');
        
        INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
        VALUES ('usuario', v_id_usuario, 'Licencia vencida', 'Tu licencia ha vencido. Contacta al administrador para renovarla.', 'error');
    END LOOP;
    CLOSE cur_vencidas;
    
    -- Notificar licencias por vencer
    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
    SELECT 
        'usuario',
        l.id_usuario,
        'Licencia por vencer',
        CONCAT('Tu licencia vence en ', DATEDIFF(l.fecha_vencimiento, CURDATE()), ' días. Renuévala pronto.'),
        'advertencia'
    FROM licencias l
    WHERE l.activa = TRUE 
    AND DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 7
    AND DATEDIFF(l.fecha_vencimiento, CURDATE()) > 0;
END //
DELIMITER ;

-- =============================================
-- TRIGGER: REGISTRAR ACCIONES DE ADMINISTRADORES
-- =============================================
DELIMITER //
CREATE TRIGGER after_licencia_update
AFTER UPDATE ON licencias
FOR EACH ROW
BEGIN
    IF NEW.modificado_por IS NOT NULL THEN
        INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
        VALUES (
            NEW.modificado_por, 
            'UPDATE', 
            'licencias', 
            NEW.id_licencia,
            CONCAT('Licencia actualizada - Activa: ', NEW.activa)
        );
    END IF;
END //
DELIMITER ;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================
SELECT 'Base de datos creada exitosamente' AS mensaje;
SELECT 'Roles predefinidos:' AS info;
SELECT * FROM roles;
SELECT 'Configuraciones por defecto:' AS info;
SELECT * FROM configuracion_sistema;


USE defaultdb;
ALTER TABLE usuarios 
ADD COLUMN device_id VARCHAR(255) NULL AFTER telefono;

-- =============================================
-- ACTUALIZACIÓN DE BASE DE DATOS PARA GRUPOS Y SCREENSHOTS
-- Ejecutar en MySQL/MariaDB
-- =============================================

USE defaultdb;

-- =============================================
-- TABLA DE GRUPOS (PARA LA APP)
-- =============================================
CREATE TABLE IF NOT EXISTS grupos_capturas (
    id_grupo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_grupo VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    INDEX idx_usuario_grupo (id_usuario, activo)
);

-- =============================================
-- TABLA DE SCREENSHOTS/CAPTURAS
-- =============================================
CREATE TABLE IF NOT EXISTS screenshots (
    id_screenshot INT AUTO_INCREMENT PRIMARY KEY,
    id_grupo INT NOT NULL,
    id_usuario INT NOT NULL,
    ruta_imagen VARCHAR(500) NOT NULL,
    fecha_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    procesado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_grupo) REFERENCES grupos_capturas(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    INDEX idx_grupo_screenshot (id_grupo, fecha_captura)
);

-- =============================================
-- TABLA DE RESULTADOS DE ANÁLISIS DE GRUPOS
-- =============================================
CREATE TABLE IF NOT EXISTS analisis_grupos (
    id_analisis INT AUTO_INCREMENT PRIMARY KEY,
    id_grupo INT NOT NULL,
    id_usuario INT NOT NULL,
    ganancia_total DECIMAL(10, 2) NOT NULL,
    km_total DECIMAL(10, 2) NOT NULL,
    min_total INT NOT NULL,
    mxn_por_km DECIMAL(10, 2) NOT NULL,
    mxn_por_min DECIMAL(10, 2) NOT NULL,
    mxn_por_hora DECIMAL(10, 2) NOT NULL,
    num_capturas INT NOT NULL,
    fecha_analisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guardado_en_historial BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_grupo) REFERENCES grupos_capturas(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    INDEX idx_usuario_analisis (id_usuario, fecha_analisis)
);

-- =============================================
-- VISTA PARA GRUPOS CON ESTADÍSTICAS
-- =============================================
CREATE OR REPLACE VIEW vista_grupos_estadisticas AS
SELECT 
    g.id_grupo,
    g.id_usuario,
    g.nombre_grupo,
    g.fecha_creacion,
    g.activo,
    COUNT(DISTINCT s.id_screenshot) AS total_capturas,
    COUNT(DISTINCT a.id_analisis) AS total_analisis,
    COALESCE(SUM(a.ganancia_total), 0) AS ganancia_total_grupo,
    u.nombre_completo,
    u.email
FROM grupos_capturas g
LEFT JOIN screenshots s ON g.id_grupo = s.id_grupo
LEFT JOIN analisis_grupos a ON g.id_grupo = a.id_grupo
INNER JOIN usuarios u ON g.id_usuario = u.id_usuario
WHERE g.activo = TRUE
GROUP BY g.id_grupo, g.id_usuario, g.nombre_grupo, g.fecha_creacion, g.activo, u.nombre_completo, u.email;

-- =============================================
-- PROCEDIMIENTO: GUARDAR ANÁLISIS DE GRUPO EN HISTORIAL
-- =============================================
DELIMITER //
CREATE PROCEDURE guardar_analisis_en_historial(
    IN p_id_analisis INT,
    IN p_id_usuario INT
)
BEGIN
    DECLARE v_ganancia DECIMAL(10,2);
    DECLARE v_km_total DECIMAL(10,2);
    DECLARE v_min_total INT;
    DECLARE v_mxn_km DECIMAL(10,2);
    DECLARE v_mxn_min DECIMAL(10,2);
    DECLARE v_mxn_hora DECIMAL(10,2);
    
    -- Obtener datos del análisis
    SELECT 
        ganancia_total, km_total, min_total, 
        mxn_por_km, mxn_por_min, mxn_por_hora
    INTO 
        v_ganancia, v_km_total, v_min_total,
        v_mxn_km, v_mxn_min, v_mxn_hora
    FROM analisis_grupos
    WHERE id_analisis = p_id_analisis;
    
    -- Insertar en viajes_registrados
    INSERT INTO viajes_registrados (
        id_usuario, monto, km_total, min_total,
        mxn_por_km, mxn_por_min, mxn_por_hora
    ) VALUES (
        p_id_usuario, v_ganancia, v_km_total, v_min_total,
        v_mxn_km, v_mxn_min, v_mxn_hora
    );
    
    -- Marcar como guardado
    UPDATE analisis_grupos 
    SET guardado_en_historial = TRUE 
    WHERE id_analisis = p_id_analisis;
    
END //
DELIMITER ;

-- =============================================
-- PROCEDIMIENTO: LIMPIAR CAPTURAS ANTIGUAS
-- =============================================
DELIMITER //
CREATE PROCEDURE limpiar_capturas_antiguas(
    IN p_dias_antiguedad INT
)
BEGIN
    DECLARE v_fecha_limite TIMESTAMP;
    
    SET v_fecha_limite = DATE_SUB(NOW(), INTERVAL p_dias_antiguedad DAY);
    
    -- Eliminar screenshots antiguos que ya fueron procesados
    DELETE FROM screenshots 
    WHERE fecha_captura < v_fecha_limite 
    AND procesado = TRUE;
    
    -- Eliminar análisis antiguos ya guardados en historial
    DELETE FROM analisis_grupos
    WHERE fecha_analisis < v_fecha_limite
    AND guardado_en_historial = TRUE;
    
END //
DELIMITER ;

-- =============================================
-- EVENTO: LIMPIEZA AUTOMÁTICA SEMANAL
-- =============================================
DELIMITER //
CREATE EVENT IF NOT EXISTS evento_limpieza_capturas
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    CALL limpiar_capturas_antiguas(30); -- Eliminar capturas de más de 30 días
END //
DELIMITER ;

-- =============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =============================================
CREATE INDEX idx_screenshot_procesado ON screenshots(procesado, fecha_captura);
CREATE INDEX idx_analisis_guardado ON analisis_grupos(guardado_en_historial, fecha_analisis);

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Base de datos actualizada con éxito' AS mensaje;

SELECT 'Nuevas tablas creadas:' AS info;
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'defaultdb' 
AND TABLE_NAME IN ('grupos_capturas', 'screenshots', 'analisis_grupos');

SELECT 'Vistas creadas:' AS info;
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'defaultdb' 
AND TABLE_NAME = 'vista_grupos_estadisticas';


-- Ejecuta esto en tu MySQL para crear la tabla que falta

USE defaultdb;

-- =============================================
-- TABLA DE VIAJES REGISTRADOS (HISTORIAL)
-- =============================================
CREATE TABLE IF NOT EXISTS viajes_registrados (
    id_viaje INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    km_total DECIMAL(10, 2) NOT NULL,
    min_total INT NOT NULL,
    mxn_por_km DECIMAL(10, 2) NOT NULL,
    mxn_por_min DECIMAL(10, 2) NOT NULL,
    mxn_por_hora DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (id_usuario, fecha DESC)
);

-- Verificar que se creó
SELECT 'Tabla viajes_registrados creada exitosamente' AS mensaje;
SHOW CREATE TABLE viajes_registrados;


-- Ejecuta esto en tu MySQL para crear la tabla de análisis detallado

USE defaultdb;

-- Tabla para guardar el análisis detallado de cada viaje
CREATE TABLE IF NOT EXISTS analisis_detallado (
    id_analisis INT AUTO_INCREMENT PRIMARY KEY,
    id_viaje INT NOT NULL,
    id_usuario INT NOT NULL,
    
    -- Totales generales
    ganancia_total DECIMAL(10, 2) NOT NULL,
    km_total DECIMAL(10, 2) NOT NULL,
    min_total INT NOT NULL,
    mxn_por_km DECIMAL(10, 2) NOT NULL,
    mxn_por_min DECIMAL(10, 2) NOT NULL,
    mxn_por_hora DECIMAL(10, 2) NOT NULL,
    
    -- Mejor tarifa (el viaje que más ganó)
    mejor_tarifa_monto DECIMAL(10, 2),
    mejor_tarifa_km DECIMAL(10, 2),
    mejor_tarifa_min INT,
    mejor_tarifa_captura INT,
    
    -- Mejor $/km
    mejor_km_monto DECIMAL(10, 2),
    mejor_km_km DECIMAL(10, 2),
    mejor_km_tarifa DECIMAL(10, 2),
    mejor_km_captura INT,
    
    -- Mejor $/hora
    mejor_hora_monto DECIMAL(10, 2),
    mejor_hora_min INT,
    mejor_hora_tarifa DECIMAL(10, 2),
    mejor_hora_captura INT,
    
    -- Ruta más corta
    ruta_corta_km DECIMAL(10, 2),
    ruta_corta_monto DECIMAL(10, 2),
    ruta_corta_min INT,
    ruta_corta_captura INT,
    
    -- Ruta más larga
    ruta_larga_km DECIMAL(10, 2),
    ruta_larga_monto DECIMAL(10, 2),
    ruta_larga_min INT,
    ruta_larga_captura INT,
    
    -- Viaje más rápido
    viaje_rapido_min INT,
    viaje_rapido_monto DECIMAL(10, 2),
    viaje_rapido_km DECIMAL(10, 2),
    viaje_rapido_captura INT,
    
    -- Viaje más lento
    viaje_lento_min INT,
    viaje_lento_monto DECIMAL(10, 2),
    viaje_lento_km DECIMAL(10, 2),
    viaje_lento_captura INT,
    
    -- Mejor eficiencia (mejor ratio ganancia/km)
    mejor_ratio_monto DECIMAL(10, 2),
    mejor_ratio_km DECIMAL(10, 2),
    mejor_ratio_min INT,
    mejor_ratio_valor DECIMAL(10, 2),
    mejor_ratio_captura INT,
    
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_viaje) REFERENCES viajes_registrados(id_viaje) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    
    INDEX idx_viaje (id_viaje),
    INDEX idx_usuario (id_usuario)
);

-- Verificar que se creó
SELECT 'Tabla analisis_detallado creada exitosamente' AS mensaje;

-- Ejecuta esto en tu MySQL para agregar las columnas faltantes

USE defaultdb;

-- Agregar columna id_grupo a viajes_registrados
ALTER TABLE viajes_registrados 
ADD COLUMN id_grupo INT NULL AFTER fecha,
ADD FOREIGN KEY (id_grupo) REFERENCES grupos_capturas(id_grupo) ON DELETE SET NULL;

-- Agregar columna num_capturas a viajes_registrados
ALTER TABLE viajes_registrados 
ADD COLUMN num_capturas INT NULL DEFAULT NULL AFTER id_grupo;

-- Verificar que se agregaron
DESCRIBE viajes_registrados;

SELECT 'Columnas agregadas exitosamente a viajes_registrados' AS mensaje;