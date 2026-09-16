require('dotenv').config();
const fetch = require('node-fetch');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const TOKEN_GITHUB = process.env.GITHUB_TOKEN;
const REPOSITORIO = process.env.REPOSITORIO;
const EXTENSIONES_PERMITIDAS = ['.js', '.json', '.txt', '.md', '.py', '.html', '.css', '.xml', '.yaml', '.yml'];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

// ==================== CONEXIÓN A BD ====================
async function conectarBaseDatos() {
  try {
    const conexion = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('✅ Conectado a la base de datos');
    return conexion;
  } catch (error) {
    console.error('❌ Error de conexión a BD:', error.message);
    throw error;
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
      
      console.log(`📄 Página ${pagina - 1}: ${datos.length} archivos encontrados`);
    } catch (error) {
      console.error(`❌ Error en página ${pagina}:`, error.message);
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
    console.error(`❌ Error obteniendo ${ruta}:`, error.message);
    return null;
  }
}

// ==================== VALIDACIÓN ====================
function validarArchivo(archivo) {
  if (archivo.size > TAMANO_MAXIMO) {
    console.warn(`⚠️  Archivo muy grande: ${archivo.name} (${archivo.size} bytes)`);
    return false;
  }
  
  const esPermitido = EXTENSIONES_PERMITIDAS.some(ext => 
    archivo.name.toLowerCase().endsWith(ext)
  );
  
  if (!esPermitido) {
    console.log(`⏭️  Saltando: ${archivo.name} (extensión no permitida)`);
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
    console.error(`⚠️  Error verificando cambios en ${ruta}:`, error.message);
    return true;
  }
}

// ==================== INYECCIÓN EN BD ====================
async function inyectarEnBaseDatos(conexion, archivo, contenido) {
  try {
    const hash = generarHash(contenido);
    
    await conexion.execute(
      `INSERT INTO archivos 
       (nombre, contenido, ruta, tamaño, hash, fecha) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [archivo.name, contenido, archivo.path, archivo.size, hash]
    );
    
    return true;
  } catch (error) {
    console.error(`❌ Error inyectando ${archivo.name}:`, error.message);
    return false;
  }
}

// ==================== TRANSACCIONES ====================
async function procesarConTransacciones(conexion, archivosValidos) {
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
        continue;
      }

      const huboCambios = await verificarCambios(conexion, archivo.path, contenido);
      
      if (!huboCambios) {
        await conexion.rollback();
        console.log(`⏭️  Sin cambios: ${archivo.name}`);
        archivosOmitidos++;
        continue;
      }

      const exito = await inyectarEnBaseDatos(conexion, archivo, contenido);
      
      if (exito) {
        await conexion.commit();
        console.log(`✅ Inyectado: ${archivo.name} (${archivo.size} bytes)`);
        archivosExitosos++;
      } else {
        await conexion.rollback();
        archivosError++;
      }
    } catch (error) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error('Error en rollback:', rollbackError.message);
      }
      console.error(`❌ Error procesando ${archivo.name}:`, error.message);
      archivosError++;
    }
  }

  return { archivosExitosos, archivosError, archivosOmitidos };
}

// ==================== FUNCIÓN PRINCIPAL ====================
async function principal() {
  let conexion = null;
  const inicio = Date.now();
  
  try {
    console.log('\n🚀 Iniciando extracción e inyección de archivos...\n');
    
    conexion = await conectarBaseDatos();
    
    console.log('📥 Extrayendo archivos del repositorio...');
    const archivos = await extraerTodosLosArchivos();
    console.log(`\n📊 Total de archivos encontrados: ${archivos.length}`);
    
    const archivosValidos = archivos.filter(validarArchivo);
    console.log(`✅ Archivos válidos para procesar: ${archivosValidos.length}\n`);
    
    if (archivosValidos.length === 0) {
      console.log('⚠️  No hay archivos válidos para procesar');
      return;
    }
    
    console.log('🔄 Procesando con transacciones...\n');
    const { archivosExitosos, archivosError, archivosOmitidos } = 
      await procesarConTransacciones(conexion, archivosValidos);
    
    const duracion = Math.round((Date.now() - inicio) / 1000);
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 RESUMEN DE EJECUCIÓN');
    console.log('='.repeat(50));
    console.log(`   ✅ Exitosos:      ${archivosExitosos}`);
    console.log(`   ❌ Con error:     ${archivosError}`);
    console.log(`   ⏭️  Sin cambios:   ${archivosOmitidos}`);
    console.log(`   ⏱️  Duración:      ${duracion}s`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    process.exit(1);
  } finally {
    if (conexion) {
      await conexion.end();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar
if (require.main === module) {
  principal().catch(console.error);
}

module.exports = { extraerTodosLosArchivos, obtenerContenidoArchivo, principal };