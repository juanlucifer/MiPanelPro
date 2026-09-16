-- ==================== BASE DE DATOS PARA JUEGO ====================
CREATE DATABASE IF NOT EXISTS juego_bd;
USE juego_bd;

-- ==================== TABLA DE JUGADORES ====================
CREATE TABLE IF NOT EXISTS jugadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  contraseña VARCHAR(255) NOT NULL,
  nivel INT DEFAULT 1,
  experiencia INT DEFAULT 0,
  oro INT DEFAULT 1000,
  vidas INT DEFAULT 3,
  puntuacion INT DEFAULT 0,
  estado ENUM('activo', 'bloqueado', 'eliminado') DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultima_sesion TIMESTAMP NULL,
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_estado (estado)
);

-- ==================== TABLA DE PERSONAJES ====================
CREATE TABLE IF NOT EXISTS personajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  clase ENUM('guerrero', 'mago', 'arquero', 'pícaro') DEFAULT 'guerrero',
  nivel INT DEFAULT 1,
  experiencia INT DEFAULT 0,
  vida_maxima INT DEFAULT 100,
  vida_actual INT DEFAULT 100,
  mana_maximo INT DEFAULT 50,
  mana_actual INT DEFAULT 50,
  fuerza INT DEFAULT 10,
  defensa INT DEFAULT 5,
  velocidad INT DEFAULT 8,
  inteligencia INT DEFAULT 10,
  suerte INT DEFAULT 5,
  oro INT DEFAULT 500,
  equipado BOOLEAN DEFAULT FALSE,
  estado ENUM('vivo', 'muerto', 'dormido') DEFAULT 'vivo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
  INDEX idx_jugador (jugador_id),
  INDEX idx_clase (clase),
  INDEX idx_nivel (nivel)
);

-- ==================== TABLA DE ITEMS ====================
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  tipo ENUM('arma', 'armadura', 'accesorio', 'consumible', 'quest') DEFAULT 'consumible',
  rareza ENUM('común', 'poco común', 'raro', 'épico', 'legendario') DEFAULT 'común',
  valor_venta INT DEFAULT 0,
  valor_compra INT DEFAULT 0,
  daño INT DEFAULT 0,
  defensa INT DEFAULT 0,
  efecto_especial VARCHAR(255),
  nivel_requerido INT DEFAULT 1,
  clase_requerida VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tipo (tipo),
  INDEX idx_rareza (rareza),
  INDEX idx_nivel_requerido (nivel_requerido)
);

-- ==================== TABLA DE INVENTARIO ====================
CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  item_id INT NOT NULL,
  cantidad INT DEFAULT 1,
  posicion INT,
  equipado BOOLEAN DEFAULT FALSE,
  fecha_adquirido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_item_personaje (personaje_id, item_id),
  INDEX idx_personaje (personaje_id),
  INDEX idx_equipado (equipado)
);

-- ==================== TABLA DE HABILIDADES ====================
CREATE TABLE IF NOT EXISTS habilidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo ENUM('ataque', 'defensa', 'curacion', 'utilidad') DEFAULT 'ataque',
  clase VARCHAR(50),
  nivel_requerido INT DEFAULT 1,
  costo_mana INT DEFAULT 10,
  cooldown_segundos INT DEFAULT 5,
  daño_base INT DEFAULT 0,
  probabilidad_exito INT DEFAULT 100,
  
  INDEX idx_tipo (tipo),
  INDEX idx_clase (clase),
  INDEX idx_nivel_requerido (nivel_requerido)
);

-- ==================== TABLA PERSONAJE-HABILIDADES ====================
CREATE TABLE IF NOT EXISTS personaje_habilidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  habilidad_id INT NOT NULL,
  nivel_habilidad INT DEFAULT 1,
  cooldown_restante INT DEFAULT 0,
  fecha_adquirida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (habilidad_id) REFERENCES habilidades(id) ON DELETE CASCADE,
  UNIQUE KEY unique_personaje_habilidad (personaje_id, habilidad_id),
  INDEX idx_personaje (personaje_id)
);

-- ==================== TABLA DE MISIONES ====================
CREATE TABLE IF NOT EXISTS misiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo ENUM('principal', 'secundaria', 'diaria', 'evento') DEFAULT 'secundaria',
  nivel_requerido INT DEFAULT 1,
  npc_oferta VARCHAR(100),
  npc_entrega VARCHAR(100),
  experiencia_recompensa INT DEFAULT 100,
  oro_recompensa INT DEFAULT 50,
  item_recompensa_id INT,
  condicion_completacion TEXT,
  activa BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (item_recompensa_id) REFERENCES items(id) ON DELETE SET NULL,
  INDEX idx_tipo (tipo),
  INDEX idx_nivel_requerido (nivel_requerido),
  INDEX idx_activa (activa)
);

-- ==================== TABLA PROGRESO DE MISIONES ====================
CREATE TABLE IF NOT EXISTS mision_progreso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  mision_id INT NOT NULL,
  estado ENUM('no_iniciada', 'en_progreso', 'completada', 'fallida') DEFAULT 'no_iniciada',
  progreso_actual INT DEFAULT 0,
  progreso_objetivo INT DEFAULT 1,
  fecha_iniciada TIMESTAMP,
  fecha_completada TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (mision_id) REFERENCES misiones(id) ON DELETE CASCADE,
  UNIQUE KEY unique_personaje_mision (personaje_id, mision_id),
  INDEX idx_personaje (personaje_id),
  INDEX idx_estado (estado)
);

-- ==================== TABLA DE ENEMIGOS ====================
CREATE TABLE IF NOT EXISTS enemigos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo ENUM('goblin', 'orco', 'dragón', 'esqueleto', 'demonio') DEFAULT 'goblin',
  nivel INT DEFAULT 1,
  vida_maxima INT DEFAULT 50,
  daño_base INT DEFAULT 5,
  defensa INT DEFAULT 2,
  experiencia_otorgada INT DEFAULT 10,
  oro_otorgado INT DEFAULT 5,
  probabilidad_drop_item INT DEFAULT 10,
  
  INDEX idx_tipo (tipo),
  INDEX idx_nivel (nivel)
);

-- ==================== TABLA DE COMBATES ====================
CREATE TABLE IF NOT EXISTS combates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  enemigo_id INT NOT NULL,
  resultado ENUM('victoria', 'derrota', 'huida') DEFAULT 'victoria',
  ronda INT DEFAULT 1,
  daño_personaje INT DEFAULT 0,
  daño_enemigo INT DEFAULT 0,
  experiencia_ganada INT DEFAULT 0,
  oro_ganado INT DEFAULT 0,
  item_obtenido_id INT,
  fecha_combate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (enemigo_id) REFERENCES enemigos(id) ON DELETE CASCADE,
  FOREIGN KEY (item_obtenido_id) REFERENCES items(id) ON DELETE SET NULL,
  INDEX idx_personaje (personaje_id),
  INDEX idx_resultado (resultado),
  INDEX idx_fecha (fecha_combate)
);

-- ==================== TABLA DE LOGROS ====================
CREATE TABLE IF NOT EXISTS logros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  icono VARCHAR(255),
  puntos INT DEFAULT 10,
  condicion TEXT,
  oculto BOOLEAN DEFAULT FALSE,
  
  INDEX idx_nombre (nombre)
);

-- ==================== TABLA PERSONAJE-LOGROS ====================
CREATE TABLE IF NOT EXISTS personaje_logros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  logro_id INT NOT NULL,
  fecha_obtenido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (logro_id) REFERENCES logros(id) ON DELETE CASCADE,
  UNIQUE KEY unique_personaje_logro (personaje_id, logro_id),
  INDEX idx_personaje (personaje_id),
  INDEX idx_logro (logro_id)
);

-- ==================== TABLA DE TIENDA ====================
CREATE TABLE IF NOT EXISTS tienda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  cantidad_disponible INT DEFAULT 99,
  precio_oro INT NOT NULL,
  descuento INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  INDEX idx_item (item_id),
  INDEX idx_activo (activo)
);

-- ==================== TABLA DE TRANSACCIONES ====================
CREATE TABLE IF NOT EXISTS transacciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  tipo ENUM('compra', 'venta', 'recompensa_mision', 'recompensa_combate', 'gasto') DEFAULT 'compra',
  cantidad INT NOT NULL,
  item_id INT,
  detalles TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  INDEX idx_personaje (personaje_id),
  INDEX idx_tipo (tipo),
  INDEX idx_fecha (fecha)
);

-- ==================== TABLA DE RANKING ====================
CREATE TABLE IF NOT EXISTS ranking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personaje_id INT NOT NULL,
  posicion INT,
  puntuacion INT DEFAULT 0,
  nivel INT DEFAULT 1,
  combates_ganados INT DEFAULT 0,
  misiones_completadas INT DEFAULT 0,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personaje_id) REFERENCES personajes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_personaje_ranking (personaje_id),
  INDEX idx_posicion (posicion),
  INDEX idx_puntuacion (puntuacion)
);

-- ==================== INSERTS DE DATOS INICIALES ====================

-- Items ejemplo
INSERT INTO items (nombre, descripcion, tipo, rareza, valor_venta, valor_compra, daño, nivel_requerido) VALUES
('Espada de Hierro', 'Una espada básica de hierro', 'arma', 'común', 50, 100, 15, 1),
('Escudo de Madera', 'Un escudo protector básico', 'armadura', 'común', 40, 80, 0, 1),
('Poción de Vida', 'Restaura 50 puntos de vida', 'consumible', 'común', 25, 50, 0, 1),
('Espada Legendaria', 'Una espada épica y poderosa', 'arma', 'legendario', 1000, 2000, 75, 10);

-- Habilidades ejemplo
INSERT INTO habilidades (nombre, descripcion, tipo, clase, nivel_requerido, costo_mana, daño_base) VALUES
('Golpe Crítico', 'Un golpe potente que causa doble daño', 'ataque', 'guerrero', 1, 15, 30),
('Bola de Fuego', 'Lanza una bola de fuego', 'ataque', 'mago', 3, 20, 40),
('Curación', 'Restaura 50 puntos de vida', 'curacion', 'mago', 1, 15, 0),
('Disparo Certero', 'Un disparo muy preciso', 'ataque', 'arquero', 1, 10, 25);

-- Enemigos ejemplo
INSERT INTO enemigos (nombre, tipo, nivel, vida_maxima, daño_base, defensa, experiencia_otorgada, oro_otorgado) VALUES
('Goblin Verde', 'goblin', 1, 30, 3, 1, 10, 5),
('Orco Guerrero', 'orco', 3, 80, 8, 3, 50, 25),
('Dragón Negro', 'dragón', 10, 500, 25, 10, 500, 200),
('Esqueleto Maldito', 'esqueleto', 2, 40, 5, 2, 20, 10);

-- Misiones ejemplo
INSERT INTO misiones (titulo, descripcion, tipo, nivel_requerido, npc_oferta, experiencia_recompensa, oro_recompensa) VALUES
('El Primer Combate', 'Vence 3 goblins verdes', 'principal', 1, 'Aldeano Mayor', 50, 25),
('Recolector de Tesoros', 'Encuentra 5 pociones de vida', 'secundaria', 1, 'Mercader', 30, 15),
('El Dragón Amenaza', 'Derrota al dragón negro', 'principal', 10, 'Rey', 500, 200);

-- Logros ejemplo
INSERT INTO logros (nombre, descripcion, puntos, condicion) VALUES
('Primer Paso', 'Completa tu primer combate', 10, 'combates_ganados >= 1'),
('Cazador', 'Gana 10 combates', 25, 'combates_ganados >= 10'),
('Héroe Legendario', 'Alcanza nivel 20', 100, 'nivel >= 20'),
('Coleccionista', 'Obtén 50 items diferentes', 50, 'items_obtenidos >= 50');
