-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS proxymenu_bd;
USE proxymenu_bd;

-- Tabla principal de archivos
CREATE TABLE IF NOT EXISTS archivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  contenido LONGTEXT,
  ruta VARCHAR(500) NOT NULL,
  tamaño INT,
  hash VARCHAR(64) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  estado ENUM('activo', 'eliminado', 'archivado') DEFAULT 'activo',
  
  -- Índices para búsquedas rápidas
  UNIQUE INDEX idx_ruta (ruta),
  INDEX idx_hash (hash),
  INDEX idx_fecha (fecha),
  INDEX idx_estado (estado),
  INDEX idx_nombre (nombre)
);

-- Tabla de historial de cambios (versionado)
CREATE TABLE IF NOT EXISTS archivo_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  archivo_id INT NOT NULL,
  contenido_anterior LONGTEXT,
  contenido_nuevo LONGTEXT,
  hash_anterior VARCHAR(64),
  hash_nuevo VARCHAR(64),
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  razon VARCHAR(255),
  
  FOREIGN KEY (archivo_id) REFERENCES archivos(id) ON DELETE CASCADE,
  INDEX idx_archivo (archivo_id),
  INDEX idx_fecha_cambio (fecha_cambio)
);

-- Tabla de logs de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fin TIMESTAMP NULL,
  total_archivos INT DEFAULT 0,
  exitosos INT DEFAULT 0,
  errores INT DEFAULT 0,
  omitidos INT DEFAULT 0,
  duracion_segundos INT DEFAULT 0,
  estado ENUM('en_progreso', 'completado', 'error') DEFAULT 'en_progreso',
  mensaje TEXT,
  
  INDEX idx_estado (estado),
  INDEX idx_inicio (inicio)
);

-- Tabla de errores
CREATE TABLE IF NOT EXISTS sync_errores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_log_id INT,
  archivo_ruta VARCHAR(500),
  error_mensaje TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE,
  INDEX idx_sync_log (sync_log_id),
  INDEX idx_fecha (fecha)
);
