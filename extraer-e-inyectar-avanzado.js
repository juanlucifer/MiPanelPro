require('dotenv').config();
const fetch = require('node-fetch');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_GITHUB = process.env.GITHUB_TOKEN;
const REPOSITORIO = process.env.REPOSITORIO;
const EXTENSIONES_PERMITIDAS = ['.js', '.json', '.txt', '.md', '.py', '.html', '.css', '.xml', '.yaml', '.yml'];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

// ==================== LOGGER ====================
class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }
  }

  log(nivel, mensaje) {
    const timestamp = new Date().toISOString();
    const linea = `[${timestamp}] [${nivel}] ${mensaje}`;
    console.log(linea);
    this.escribirLog(linea);
  }

  escribirLog(linea) {
    const archivo = path.join(this.logsDir, `sync-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(archivo, linea + '\n');
  }

  info(msg) { this.log('INFO', msg); }
  error(msg) { this.log('ERROR', msg); }
  warn(msg) { this.log('WARN', msg); }
  success(msg) { this.log('SUCCESS', msg); }
}

const logger = new Logger();

// ==================== CONEXIÓN A BD ====================
async function conectarBaseDatos() {
  try {
    const conexion = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    logger.success('Conectado a la base de datos');
    return conexion;
  } catch (error) {
    logger.error(`Error de conexión a BD: ${error.message}`);
    throw error;
  }
}

// ==================== REGISTRO DE SINCRONIZACIÓN ====================
async function iniciarRegistroSync(conexion) {
  try {
    const [resultado] = await conexion.execute(
      `INSERT INTO sync_logs 
       (estado, mensaje) 
       VALUES (?, ?)`,
      ['en_progreso', 'Iniciando sincronización...']
    );
    return resultado.insertId;
  } catch (error) {
    logger.error(`Error registrando sync: ${error.message}`);
    return null;
  }
}

async function finalizarRegistroSync(conexion, syncLogId, estadisticas) {
  try {
    const duracion = Math.round((Date.now() - estadisticas.inicio) / 1000);
    
    await conexion.execute(
      `UPDATE sync_logs 
       SET estado = ?, fin = NOW(), total_archivos = ?, exitosos = ?, 
           errores = ?, omitidos = ?, duracion_segundos = ?, mensaje = ?
       WHERE id = ?`,
      [
        'completado',
        estadisticas.total,
        estadisticas.exitosos,
        estadisticas.errores,
        estadisticas.omitidos,
        duracion,
        `Sincronización completada: ${estadisticas.exitosos} exitosos, ${estadisticas.errores} errores, ${estadisticas.omitidos} omitidos`,
        syncLogId
      ]
    );
  } catch (error) {
    logger.error(`Error finalizando sync: ${error.message}`);
  }
}

async function registrarError(conexion, syncLogId, ruta, mensaje) {
  try {
    await conexion.execute(
      `INSERT INTO sync_errores 
       (sync_log_id, archivo_ruta, error_mensaje) 
       VALUES (?, ?, ?)`,
      [syncLogId, ruta, mensaje]
    );
  } catch (error) {
    logger.error(`Error registrando error: ${error.message}`);
  }
}

// ==================== GITHUB API ====================
async function extraerTodosLosArchivos() {
  const archivos = [];
  let pagina = 1;
  let tieneProxima = true;
  
  while (tieneProxima) {
    try {
      const respuesta = await fetch(
        `https://api.github.com/repos/${REPOSITORIO}/contents?page=${pagina}&per_page=100`,
        { 
          headers: { 
            Authorization: `token ${TOKEN_GITHUB}`,
            Accept: 'application/vnd.github.v3+json'
          } 
        }
      );
      
      if (!respuesta.ok) {
        throw new Error(`GitHub API error: ${respuesta.status}`);
      }
      
      const datos = await respuesta.json();
      if (!Array.isArray(datos) || datos.length === 0) break;
      
      archivos.push(...datos);
      pagina++;
      tieneProxima = datos.length === 100;
      
      logger.info(`Página ${pagina - 1}: ${datos.length} archivos encontrados`);
    } catch (error) {
      logger.error(`Error en página ${pagina}: ${error.message}`);
      break;
    }
  }
  
  return archivos;
}

async function obtenerContenidoArchivo(ruta) {
  try {
    const respuesta = await fetch(
      `https://api.github.com/repos/${REPOSITORIO}/contents/${ruta}`,
      { 
        headers: { 
          Authorization: `token ${TOKEN_GITHUB}`,
          Accept: 'application/vnd.github.v3.raw'
        } 
      }
    );
    
    if (!respuesta.ok) {
      throw new Error(`No se pudo obtener ${ruta}: ${respuesta.status}`);
    }
    
    return await respuesta.text();
  } catch (error) {
    logger.error(`Error obteniendo ${ruta}: ${error.message}`);
    return null;
  }
}

// ==================== VALIDACIÓN ====================
function validarArchivo(archivo) {
  if (archivo.size > TAMANO_MAXIMO) {
    logger.warn(`Archivo muy grande: ${archivo.name} (${archivo.size} bytes)`);
    return false;
  }
  
  const esPermitido = EXTENSIONES_PERMITIDAS.some(ext => 
    archivo.name.toLowerCase().endsWith(ext)
  );
  
  if (!esPermitido) {
    logger.info(`Saltando: ${archivo.name} (extensión no permitida)`);
  }
  
  return esPermitido;
}

// ==================== HASH Y VERSIONADO ====================
function generarHash(contenido) {
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

async function verificarCambios(conexion, ruta, contenido) {
  try {
    const [resultado] = await conexion.execute(
      'SELECT hash FROM archivos WHERE ruta = ? ORDER BY fecha DESC LIMIT 1',
      [ruta]
    );
    
    const hashActual = generarHash(contenido);
    if (resultado.length > 0) {
      return resultado[0].hash !== hashActual;
    }
    return true; // Archivo nuevo
  } catch (error) {
    logger.error(`Error verificando cambios en ${ruta}: ${error.message}`);
    return true;
  }
}

// ==================== HISTORIAL DE CAMBIOS ====================
async function guardarHistorial(conexion, archivo, contenidoAnterior, contenidoNuevo) {
  try {
    const [archivos] = await conexion.execute(
      'SELECT id FROM archivos WHERE ruta = ? LIMIT 1',
      [archivo.path]
    );

    if (archivos.length > 0) {
      const archivoId = archivos[0].id;
      const hashAnterior = contenidoAnterior ? generarHash(contenidoAnterior) : null;
      const hashNuevo = generarHash(contenidoNuevo);

      await conexion.execute(
        `INSERT INTO archivo_historial 
         (archivo_id, contenido_anterior, contenido_nuevo, hash_anterior, hash_nuevo, razon)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [archivoId, contenidoAnterior || '', contenidoNuevo, hashAnterior, hashNuevo, 'Sincronización automática']
      );
    }
  } catch (error) {
    logger.warn(`Error guardando historial para ${archivo.name}: ${error.message}`);
  }
}

// ==================== INYECCIÓN EN BD ====================
async function inyectarEnBaseDatos(conexion, archivo, contenido) {
  try {
    const hash = generarHash(contenido);
    
    // Verificar si el archivo ya existe
    const [archivosExistentes] = await conexion.execute(
      'SELECT contenido FROM archivos WHERE ruta = ? LIMIT 1',
      [archivo.path]
    );

    if (archivosExistentes.length > 0) {
      const contenidoAnterior = archivosExistentes[0].contenido;
      
      // Guardar en historial
      await guardarHistorial(conexion, archivo, contenidoAnterior, contenido);

      // Actualizar
      await conexion.execute(
        `UPDATE archivos 
         SET contenido = ?, tamaño = ?, hash = ? 
         WHERE ruta = ?`,
        [contenido, archivo.size, hash, archivo.path]
      );
    } else {
      // Insertar nuevo
      await conexion.execute(
        `INSERT INTO archivos 
         (nombre, contenido, ruta, tamaño, hash, fecha) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [archivo.name, contenido, archivo.path, archivo.size, hash]
      );
    }
    
    return true;
  } catch (error) {
    logger.error(`Error inyectando ${archivo.name}: ${error.message}`);
    return false;
  }
}

// ==================== PROCESAMIENTO ====================
async function procesarConTransacciones(conexion, archivosValidos, syncLogId) {
  let archivosExitosos = 0;
  let archivosError = 0;
  let archivosOmitidos = 0;

  for (const archivo of archivosValidos) {
    try {
      await conexion.beginTransaction();
      
      const contenido = await obtenerContenidoArchivo(archivo.path);
      
      if (!contenido) {
        await conexion.rollback();
        archivosError++;
        await registrarError(conexion, syncLogId, archivo.path, 'No se pudo obtener contenido');
        continue;
      }

      const huboCambios = await verificarCambios(conexion, archivo.path, contenido);
      
      if (!huboCambios) {
        await conexion.rollback();
        logger.info(`Sin cambios: ${archivo.name}`);
        archivosOmitidos++;
        continue;
      }

      const exito = await inyectarEnBaseDatos(conexion, archivo, contenido);
      
      if (exito) {
        await conexion.commit();
        logger.success(`Inyectado: ${archivo.name} (${archivo.size} bytes)`);
        archivosExitosos++;
      } else {
        await conexion.rollback();
        archivosError++;
        await registrarError(conexion, syncLogId, archivo.path, 'Error inyectando en BD');
      }
    } catch (error) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        logger.error(`Error en rollback: ${rollbackError.message}`);
      }
      logger.error(`Error procesando ${archivo.name}: ${error.message}`);
      archivosError++;
      await registrarError(conexion, syncLogId, archivo.path, error.message);
    }
  }

  return { archivosExitosos, archivosError, archivosOmitidos };
}

// ==================== FUNCIÓN PRINCIPAL ====================
async function principal() {
  let conexion = null;
  const inicio = Date.now();
  let syncLogId = null;
  
  try {
    logger.info('='.repeat(50));
    logger.info('Iniciando extracción e inyección de archivos...');
    logger.info('='.repeat(50));
    
    conexion = await conectarBaseDatos();
    syncLogId = await iniciarRegistroSync(conexion);
    
    logger.info('Extrayendo archivos del repositorio...');
    const archivos = await extraerTodosLosArchivos();
    logger.info(`Total de archivos encontrados: ${archivos.length}`);
    
    const archivosValidos = archivos.filter(validarArchivo);
    logger.info(`Archivos válidos para procesar: ${archivosValidos.length}`);
    
    if (archivosValidos.length === 0) {
      logger.warn('No hay archivos válidos para procesar');
      return;
    }
    
    logger.info('Procesando con transacciones...');
    const { archivosExitosos, archivosError, archivosOmitidos } = 
      await procesarConTransacciones(conexion, archivosValidos, syncLogId);
    
    // Finalizar registro
    await finalizarRegistroSync(conexion, syncLogId, {
      total: archivosValidos.length,
      exitosos: archivosExitosos,
      errores: archivosError,
      omitidos: archivosOmitidos,
      inicio
    });
    
    const duracion = Math.round((Date.now() - inicio) / 1000);
    
    logger.info('='.repeat(50));
    logger.success('RESUMEN DE EJECUCIÓN');
    logger.info('='.repeat(50));
    logger.success(`   Exitosos:      ${archivosExitosos}`);
    logger.error(`   Con error:     ${archivosError}`);
    logger.warn(`   Sin cambios:   ${archivosOmitidos}`);
    logger.info(`   Duración:      ${duracion}s`);
    logger.info('='.repeat(50));
    
  } catch (error) {
    logger.error('ERROR FATAL: ' + error.message);
    if (syncLogId && conexion) {
      try {
        await conexion.execute(
          `UPDATE sync_logs SET estado = ?, mensaje = ? WHERE id = ?`,
          ['error', error.message, syncLogId]
        );
      } catch (e) {
        logger.error('Error actualizando estado: ' + e.message);
      }
    }
    process.exit(1);
  } finally {
    if (conexion) {
      await conexion.end();
      logger.info('Conexión cerrada');
    }
  }
}

// Ejecutar
if (require.main === module) {
  principal().catch(console.error);
}

module.exports = { principal, Logger };