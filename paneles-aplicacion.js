// ==================== PANELES DE LA APLICACIÓN EXTRAÍDA ====================

/**
 * PANELES DISPONIBLES DE LA APLICACIÓN EXTRAÍDA
 * Integrados con el sistema de juego MiPanelPro
 */

// ==================== PANEL DE ESTADÍSTICAS ====================
class PanelEstadisticas {
  constructor() {
    this.datos = [];
  }

  mostrar(personaje, jugador) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            PANEL DE ESTADÍSTICAS                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Datos del Jugador
    console.log('👤 INFORMACIÓN DEL JUGADOR:');
    console.log(`   Usuario: ${jugador.username}`);
    console.log(`   Email: ${jugador.email}`);
    console.log(`   Nivel Global: ${jugador.nivel}`);
    console.log(`   Oro Total: ${jugador.oro} 💰`);
    console.log(`   Puntuación: ${jugador.puntuacion} ⭐`);
    console.log(`   Vidas Restantes: ${jugador.vidas} ❤️\n`);

    // Datos del Personaje
    if (personaje) {
      console.log('⚔️  INFORMACIÓN DEL PERSONAJE:');
      console.log(`   Nombre: ${personaje.nombre}`);
      console.log(`   Clase: ${personaje.clase.toUpperCase()}`);
      console.log(`   Nivel: ${personaje.nivel}`);
      console.log(`   Experiencia: ${personaje.experiencia}/100`);
      console.log(`   Estado: ${personaje.estado.toUpperCase()}\n`);

      console.log('💪 ATRIBUTOS:');
      console.log(`   ┌─ Fuerza: ${personaje.fuerza}`);
      console.log(`   ├─ Defensa: ${personaje.defensa}`);
      console.log(`   ├─ Velocidad: ${personaje.velocidad}`);
      console.log(`   ├─ Inteligencia: ${personaje.inteligencia}`);
      console.log(`   └─ Suerte: ${personaje.suerte}\n`);

      console.log('💗 RECURSOS:');
      const barraVida = this.crearBarra(personaje.vidaActual, personaje.vidaMaxima, 20);
      const barraMana = this.crearBarra(personaje.manaActual, personaje.manaMaximo, 20);
      console.log(`   Vida:  [${barraVida}] ${personaje.vidaActual}/${personaje.vidaMaxima}`);
      console.log(`   Maná:  [${barraMana}] ${personaje.manaActual}/${personaje.manaMaximo}\n`);
    }
  }

  crearBarra(actual, maximo, longitud = 20) {
    const porcentaje = (actual / maximo) * 100;
    const relleno = Math.round((longitud * actual) / maximo);
    const vacio = longitud - relleno;
    return '█'.repeat(relleno) + '░'.repeat(vacio);
  }
}

// ==================== PANEL DE ACTIVIDADES ====================
class PanelActividades {
  constructor() {
    this.actividades = [];
  }

  async cargar(conexion, personajeId) {
    try {
      const [combates] = await conexion.execute(
        `SELECT 'Combate' as tipo, resultado, fecha_combate as fecha, 
                CONCAT('vs ', e.nombre) as detalles 
         FROM combates c 
         JOIN enemigos e ON c.enemigo_id = e.id 
         WHERE c.personaje_id = ? 
         ORDER BY fecha_combate DESC LIMIT 5`,
        [personajeId]
      );

      const [misiones] = await conexion.execute(
        `SELECT 'Misión' as tipo, m.titulo as detalles, mp.estado as resultado, 
                mp.fecha_completada as fecha 
         FROM mision_progreso mp 
         JOIN misiones m ON mp.mision_id = m.id 
         WHERE mp.personaje_id = ? AND mp.estado = 'completada'
         ORDER BY mp.fecha_completada DESC LIMIT 5`,
        [personajeId]
      );

      this.actividades = [...combates, ...misiones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return true;
    } catch (error) {
      console.error('Error cargando actividades:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              PANEL DE ACTIVIDADES RECIENTES               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (this.actividades.length === 0) {
      console.log('   Sin actividades registradas\n');
      return;
    }

    this.actividades.forEach((actividad, index) => {
      const icono = actividad.tipo === 'Combate' ? '⚔️' : '📜';
      const estado = actividad.resultado === 'victoria' || actividad.resultado === 'completada' ? '✅' : '❌';
      const fecha = new Date(actividad.fecha).toLocaleDateString('es-ES', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`${index + 1}. ${icono} ${actividad.tipo} - ${actividad.detalles}`);
      console.log(`   ${estado} ${actividad.resultado.toUpperCase()} | ${fecha}\n`);
    });
  }
}

// ==================== PANEL DE PROGRESO ====================
class PanelProgreso {
  constructor() {
    this.misionesPendientes = [];
    this.logrosDesbloqueados = [];
  }

  async cargar(conexion, personajeId) {
    try {
      // Misiones en progreso
      const [misiones] = await conexion.execute(
        `SELECT m.titulo, mp.progreso_actual, mp.progreso_objetivo, m.experiencia_recompensa
         FROM mision_progreso mp 
         JOIN misiones m ON mp.mision_id = m.id 
         WHERE mp.personaje_id = ? AND mp.estado = 'en_progreso'`,
        [personajeId]
      );

      // Logros desbloqueados
      const [logros] = await conexion.execute(
        `SELECT l.nombre, l.puntos, pl.fecha_obtenido
         FROM personaje_logros pl 
         JOIN logros l ON pl.logro_id = l.id 
         WHERE pl.personaje_id = ? 
         ORDER BY pl.fecha_obtenido DESC LIMIT 5`,
        [personajeId]
      );

      this.misionesPendientes = misiones;
      this.logrosDesbloqueados = logros;
      return true;
    } catch (error) {
      console.error('Error cargando progreso:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                 PANEL DE PROGRESO                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 MISIONES EN PROGRESO:\n');
    if (this.misionesPendientes.length === 0) {
      console.log('   Sin misiones activas\n');
    } else {
      this.misionesPendientes.forEach((mision, index) => {
        const progreso = (mision.progreso_actual / mision.progreso_objetivo) * 100;
        const barra = this.crearBarraProgreso(progreso, 15);
        console.log(`${index + 1}. ${mision.titulo}`);
        console.log(`   [${barra}] ${mision.progreso_actual}/${mision.progreso_objetivo}`);
        console.log(`   Recompensa: +${mision.experiencia_recompensa} EXP\n`);
      });
    }

    console.log('🏆 LOGROS RECIENTES:\n');
    if (this.logrosDesbloqueados.length === 0) {
      console.log('   Sin logros desbloqueados\n');
    } else {
      this.logrosDesbloqueados.forEach((logro, index) => {
        const fecha = new Date(logro.fecha_obtenido).toLocaleDateString('es-ES');
        console.log(`${index + 1}. ⭐ ${logro.nombre} (+${logro.puntos} puntos)`);
        console.log(`   Desbloqueado: ${fecha}\n`);
      });
    }
  }

  crearBarraProgreso(porcentaje, longitud = 15) {
    const relleno = Math.round((longitud * porcentaje) / 100);
    const vacio = longitud - relleno;
    return '█'.repeat(relleno) + '░'.repeat(vacio);
  }
}

// ==================== PANEL DE LOGROS ====================
class PanelLogros {
  constructor() {
    this.todosLosLogros = [];
    this.logrosDesbloqueados = [];
  }

  async cargar(conexion, personajeId) {
    try {
      // Todos los logros
      const [todos] = await conexion.execute(
        'SELECT * FROM logros WHERE oculto = FALSE'
      );

      // Logros del personaje
      const [desbloqueados] = await conexion.execute(
        'SELECT logro_id FROM personaje_logros WHERE personaje_id = ?',
        [personajeId]
      );

      this.todosLosLogros = todos;
      this.logrosDesbloqueados = desbloqueados.map(l => l.logro_id);
      return true;
    } catch (error) {
      console.error('Error cargando logros:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   PANEL DE LOGROS                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let logrosDesbloqueadosCount = 0;
    const puntosTotal = this.todosLosLogros.reduce((sum, logro) => sum + logro.puntos, 0);
    let puntosTotalesDesbloqueados = 0;

    this.todosLosLogros.forEach((logro, index) => {
      const desbloqueado = this.logrosDesbloqueados.includes(logro.id);
      const icono = desbloqueado ? '⭐' : '🔒';

      if (desbloqueado) {
        logrosDesbloqueadosCount++;
        puntosTotalesDesbloqueados += logro.puntos;
      }

      console.log(`${icono} ${logro.nombre}`);
      console.log(`   ${logro.descripcion}`);
      console.log(`   Puntos: ${logro.puntos}\n`);
    });

    const porcentaje = Math.round((logrosDesbloqueadosCount / this.todosLosLogros.length) * 100);
    console.log(`\n📊 Progreso: ${logrosDesbloqueadosCount}/${this.todosLosLogros.length} logros desbloqueados (${porcentaje}%)`);
    console.log(`⭐ Puntos: ${puntosTotalesDesbloqueados}/${puntosTotal}\n`);
  }
}

// ==================== PANEL DE CONFIGURACIÓN ====================
class PanelConfiguracion {
  mostrar() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                 PANEL DE CONFIGURACIÓN                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('⚙️  CONFIGURACIÓN DE SONIDO:');
    console.log('   1. Música: Activada ✓');
    console.log('   2. Efectos de Sonido: Activados ✓');
    console.log('   3. Volumen: 100%\n');

    console.log('🎮 CONFIGURACIÓN DE JUEGO:');
    console.log('   4. Dificultad: Normal');
    console.log('   5. Velocidad de Combate: Normal');
    console.log('   6. Mostrar Tutorial: Desactivado\n');

    console.log('📺 CONFIGURACIÓN DE GRÁFICOS:');
    console.log('   7. Resolución: Máxima');
    console.log('   8. Calidad: Alta');
    console.log('   9. Animaciones: Activadas\n');

    console.log('👥 CONFIGURACIÓN DE PRIVACIDAD:');
    console.log('   10. Perfil Público: Sí');
    console.log('   11. Mostrar en Ranking: Sí');
    console.log('   12. Permitir Solicitudes de Amistad: Sí\n');
  }
}

// ==================== PANEL DE AMIGOS ====================
class PanelAmigos {
  constructor() {
    this.amigos = [];
    this.solicitudesRecibidas = [];
  }

  async cargar(conexion, jugadorId) {
    try {
      // Simulación de amigos (esta tabla se debe crear)
      console.log('📊 Cargando amigos...');
      this.amigos = [];
      this.solicitudesRecibidas = [];
      return true;
    } catch (error) {
      console.error('Error cargando amigos:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   PANEL DE AMIGOS                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('👥 MIS AMIGOS:\n');
    if (this.amigos.length === 0) {
      console.log('   No tienes amigos agregados\n');
    } else {
      this.amigos.forEach((amigo, index) => {
        console.log(`${index + 1}. ${amigo.username} (Nivel ${amigo.nivel})`);
        console.log(`   Estado: ${amigo.estado}\n`);
      });
    }

    console.log('🔔 SOLICITUDES RECIBIDAS:\n');
    if (this.solicitudesRecibidas.length === 0) {
      console.log('   Sin solicitudes pendientes\n');
    } else {
      this.solicitudesRecibidas.forEach((solicitud, index) => {
        console.log(`${index + 1}. ${solicitud.username} (Nivel ${solicitud.nivel})`);
        console.log('   [Aceptar] [Rechazar]\n');
      });
    }

    console.log('📋 OPCIONES:');
    console.log('1. Agregar Amigo');
    console.log('2. Buscar Jugador');
    console.log('3. Ver Solicitudes');
    console.log('0. Volver\n');
  }
}

// ==================== EXPORTAR TODOS LOS PANELES ====================
module.exports = {
  PanelEstadisticas,
  PanelActividades,
  PanelProgreso,
  PanelLogros,
  PanelConfiguracion,
  PanelAmigos
};
