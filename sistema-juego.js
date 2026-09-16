const mysql = require('mysql2/promise');
require('dotenv').config();

// ==================== CONEXIÓN A BD DEL JUEGO ====================
class ConexionJuego {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'juego_bd',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async conectar() {
    return await this.pool.getConnection();
  }

  async cerrar() {
    await this.pool.end();
  }
}

// ==================== CLASE JUGADOR ====================
class Jugador {
  constructor(id, username, email, nivel = 1, oro = 1000) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.nivel = nivel;
    this.oro = oro;
    this.experiencia = 0;
    this.vidas = 3;
    this.puntuacion = 0;
    this.estado = 'activo';
  }

  async registrar(conexion) {
    try {
      const [resultado] = await conexion.execute(
        `INSERT INTO jugadores (username, email, contraseña, nivel, oro) 
         VALUES (?, ?, ?, ?, ?)`,
        [this.username, this.email, 'password_hash', this.nivel, this.oro]
      );
      this.id = resultado.insertId;
      console.log(`✅ Jugador ${this.username} registrado`);
      return true;
    } catch (error) {
      console.error('❌ Error registrando jugador:', error.message);
      return false;
    }
  }

  async obtenerDatos(conexion, idJugador) {
    try {
      const [resultado] = await conexion.execute(
        `SELECT * FROM jugadores WHERE id = ?`,
        [idJugador]
      );
      if (resultado.length > 0) {
        const datos = resultado[0];
        this.id = datos.id;
        this.username = datos.username;
        this.nivel = datos.nivel;
        this.oro = datos.oro;
        this.experiencia = datos.experiencia;
        this.vidas = datos.vidas;
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error obteniendo datos del jugador:', error.message);
      return false;
    }
  }

  async actualizar(conexion) {
    try {
      await conexion.execute(
        `UPDATE jugadores 
         SET nivel = ?, oro = ?, experiencia = ?, vidas = ?, puntuacion = ? 
         WHERE id = ?`,
        [this.nivel, this.oro, this.experiencia, this.vidas, this.puntuacion, this.id]
      );
      return true;
    } catch (error) {
      console.error('❌ Error actualizando jugador:', error.message);
      return false;
    }
  }
}

// ==================== CLASE PERSONAJE ====================
class Personaje {
  constructor(jugadorId, nombre, clase = 'guerrero') {
    this.id = null;
    this.jugadorId = jugadorId;
    this.nombre = nombre;
    this.clase = clase;
    this.nivel = 1;
    this.experiencia = 0;
    this.vidaMaxima = 100;
    this.vidaActual = 100;
    this.manaMaximo = 50;
    this.manaActual = 50;
    this.fuerza = 10;
    this.defensa = 5;
    this.velocidad = 8;
    this.inteligencia = 10;
    this.suerte = 5;
    this.oro = 500;
    this.estado = 'vivo';
  }

  async crear(conexion) {
    try {
      const [resultado] = await conexion.execute(
        `INSERT INTO personajes 
         (jugador_id, nombre, clase, vida_maxima, vida_actual, mana_maximo, mana_actual, 
          fuerza, defensa, velocidad, inteligencia, suerte, oro) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [this.jugadorId, this.nombre, this.clase, this.vidaMaxima, this.vidaActual,
         this.manaMaximo, this.manaActual, this.fuerza, this.defensa, this.velocidad,
         this.inteligencia, this.suerte, this.oro]
      );
      this.id = resultado.insertId;
      console.log(`✅ Personaje ${this.nombre} creado`);
      return true;
    } catch (error) {
      console.error('❌ Error creando personaje:', error.message);
      return false;
    }
  }

  async obtenerDatos(conexion, idPersonaje) {
    try {
      const [resultado] = await conexion.execute(
        `SELECT * FROM personajes WHERE id = ?`,
        [idPersonaje]
      );
      if (resultado.length > 0) {
        const p = resultado[0];
        Object.assign(this, {
          id: p.id,
          nombre: p.nombre,
          clase: p.clase,
          nivel: p.nivel,
          experiencia: p.experiencia,
          vidaMaxima: p.vida_maxima,
          vidaActual: p.vida_actual,
          manaMaximo: p.mana_maximo,
          manaActual: p.mana_actual,
          fuerza: p.fuerza,
          defensa: p.defensa,
          velocidad: p.velocidad,
          inteligencia: p.inteligencia,
          suerte: p.suerte,
          oro: p.oro,
          estado: p.estado
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error obteniendo datos del personaje:', error.message);
      return false;
    }
  }

  async actualizar(conexion) {
    try {
      await conexion.execute(
        `UPDATE personajes 
         SET nivel = ?, experiencia = ?, vida_actual = ?, mana_actual = ?, 
             oro = ?, estado = ? 
         WHERE id = ?`,
        [this.nivel, this.experiencia, this.vidaActual, this.manaActual, 
         this.oro, this.estado, this.id]
      );
      return true;
    } catch (error) {
      console.error('❌ Error actualizando personaje:', error.message);
      return false;
    }
  }

  sumarExperiencia(cantidad) {
    this.experiencia += cantidad;
    const expParaSubir = 100 * this.nivel;
    if (this.experiencia >= expParaSubir) {
      this.nivel++;
      this.experiencia = 0;
      this.vidaMaxima += 10;
      this.vidaActual = this.vidaMaxima;
      this.manaMaximo += 5;
      this.manaActual = this.manaMaximo;
      console.log(`⬆️  ${this.nombre} alcanzó nivel ${this.nivel}`);
      return true;
    }
    return false;
  }
}

// ==================== CLASE INVENTARIO ====================
class Inventario {
  constructor(personajeId) {
    this.personajeId = personajeId;
    this.items = [];
  }

  async cargar(conexion) {
    try {
      const [resultado] = await conexion.execute(
        `SELECT inv.*, it.nombre, it.tipo, it.rareza, it.daño, it.defensa 
         FROM inventario inv 
         JOIN items it ON inv.item_id = it.id 
         WHERE inv.personaje_id = ?`,
        [this.personajeId]
      );
      this.items = resultado;
      return true;
    } catch (error) {
      console.error('❌ Error cargando inventario:', error.message);
      return false;
    }
  }

  async agregarItem(conexion, itemId, cantidad = 1) {
    try {
      // Verificar si el item ya existe
      const [existente] = await conexion.execute(
        `SELECT id, cantidad FROM inventario 
         WHERE personaje_id = ? AND item_id = ?`,
        [this.personajeId, itemId]
      );

      if (existente.length > 0) {
        // Actualizar cantidad
        await conexion.execute(
          `UPDATE inventario SET cantidad = cantidad + ? 
           WHERE personaje_id = ? AND item_id = ?`,
          [cantidad, this.personajeId, itemId]
        );
      } else {
        // Insertar nuevo item
        await conexion.execute(
          `INSERT INTO inventario (personaje_id, item_id, cantidad) 
           VALUES (?, ?, ?)`,
          [this.personajeId, itemId, cantidad]
        );
      }

      console.log(`✅ Item #${itemId} agregado al inventario`);
      return true;
    } catch (error) {
      console.error('❌ Error agregando item:', error.message);
      return false;
    }
  }

  async equiparItem(conexion, itemInventarioId, equipar = true) {
    try {
      await conexion.execute(
        `UPDATE inventario SET equipado = ? WHERE id = ?`,
        [equipar ? 1 : 0, itemInventarioId]
      );
      console.log(`${equipar ? '⚔️' : '🎒'} Item ${equipar ? 'equipado' : 'desquipado'}`);
      return true;
    } catch (error) {
      console.error('❌ Error equipando item:', error.message);
      return false;
    }
  }

  async eliminarItem(conexion, itemInventarioId, cantidad = 1) {
    try {
      await conexion.execute(
        `UPDATE inventario SET cantidad = cantidad - ? 
         WHERE id = ? AND cantidad > ?`,
        [cantidad, itemInventarioId, cantidad - 1]
      );

      // Eliminar si cantidad es 0
      await conexion.execute(
        `DELETE FROM inventario WHERE id = ? AND cantidad <= 0`,
        [itemInventarioId]
      );

      return true;
    } catch (error) {
      console.error('❌ Error eliminando item:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\\n📦 INVENTARIO:');
    if (this.items.length === 0) {
      console.log('   Vacío');
      return;
    }
    this.items.forEach((item, index) => {
      const equipado = item.equipado ? '⚔️' : '';
      console.log(`   ${index + 1}. ${item.nombre} x${item.cantidad} (${item.rareza}) ${equipado}`);
    });
  }
}

// ==================== CLASE COMBATE ====================
class Combate {
  constructor(personaje, enemigo) {
    this.personaje = personaje;
    this.enemigo = { ...enemigo };
    this.ronda = 0;
    this.historial = [];
    this.personajeVidaInicial = personaje.vidaActual;
    this.enemigoVidaInicial = enemigo.vida_maxima;
  }

  calcularDaño(atacante, defensor) {
    const daño = Math.random() * (atacante.daño || atacante.fuerza) * 0.8;
    const mitigacion = defensor.defensa * 0.5;
    const dañoFinal = Math.max(1, daño - mitigacion);
    return Math.round(dañoFinal);
  }

  async ejecutarRonda(conexion) {
    this.ronda++;
    console.log(`\\n⚔️  RONDA ${this.ronda}`);

    // Ataque del personaje
    const daño1 = this.calcularDaño(this.personaje, this.enemigo);
    this.enemigo.vida_maxima -= daño1;
    console.log(`${this.personaje.nombre} ataca: ${daño1} de daño`);
    this.historial.push(`${this.personaje.nombre} ataca: ${daño1} daño`);

    if (this.enemigo.vida_maxima <= 0) {
      return 'victoria';
    }

    // Contraataque del enemigo
    const daño2 = this.calcularDaño(this.enemigo, this.personaje);
    this.personaje.vidaActual -= daño2;
    console.log(`${this.enemigo.nombre} ataca: ${daño2} de daño`);
    this.historial.push(`${this.enemigo.nombre} ataca: ${daño2} daño`);

    if (this.personaje.vidaActual <= 0) {
      return 'derrota';
    }

    console.log(`HP: ${this.personaje.nombre}=${this.personaje.vidaActual} | ${this.enemigo.nombre}=${this.enemigo.vida_maxima}`);
    return 'continuando';
  }

  async finalizarCombate(conexion, resultado) {
    try {
      const experienciaGanada = resultado === 'victoria' ? this.enemigo.experiencia_otorgada : 0;
      const oroGanado = resultado === 'victoria' ? this.enemigo.oro_otorgado : 0;

      // Actualizar personaje
      if (resultado === 'victoria') {
        this.personaje.oro += oroGanado;
        this.personaje.sumarExperiencia(experienciaGanada);
      }
      this.personaje.vidaActual = Math.max(1, this.personaje.vidaActual);

      // Guardar combate en BD
      const [registroCombate] = await conexion.execute(
        `INSERT INTO combates 
         (personaje_id, enemigo_id, resultado, ronda, daño_personaje, daño_enemigo, 
          experiencia_ganada, oro_ganado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [this.personaje.id, this.enemigo.id, resultado, this.ronda,
         this.personajeVidaInicial - this.personaje.vidaActual,
         this.enemigoVidaInicial - this.enemigo.vida_maxima,
         experienciaGanada, oroGanado]
      );

      // Actualizar datos del personaje
      await this.personaje.actualizar(conexion);

      console.log(`\\n${'='.repeat(50)}`);
      console.log(`RESULTADO: ${resultado.toUpperCase()}`);
      console.log(`Experiencia: +${experienciaGanada}`);
      console.log(`Oro: +${oroGanado}`);
      console.log(`${'='.repeat(50)}\\n`);

      return registroCombate.insertId;
    } catch (error) {
      console.error('❌ Error finalizando combate:', error.message);
      return null;
    }
  }
}

// ==================== CLASE MISIONES ====================
class Mision {
  constructor(id, titulo, descripcion, tipo, nivel, recompensaExp, recompensaOro) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.tipo = tipo;
    this.nivel = nivel;
    this.recompensaExp = recompensaExp;
    this.recompensaOro = recompensaOro;
  }

  async iniciar(conexion, personajeId) {
    try {
      const [resultado] = await conexion.execute(
        `INSERT INTO mision_progreso 
         (personaje_id, mision_id, estado, fecha_iniciada) 
         VALUES (?, ?, 'en_progreso', NOW())`,
        [personajeId, this.id]
      );
      console.log(`✅ Misión iniciada: ${this.titulo}`);
      return resultado.insertId;
    } catch (error) {
      console.error('❌ Error iniciando misión:', error.message);
      return null;
    }
  }

  async completar(conexion, personajeId, personaje) {
    try {
      await conexion.execute(
        `UPDATE mision_progreso 
         SET estado = 'completada', fecha_completada = NOW() 
         WHERE personaje_id = ? AND mision_id = ?`,
        [personajeId, this.id]
      );

      // Dar recompensas
      personaje.oro += this.recompensaOro;
      personaje.sumarExperiencia(this.recompensaExp);
      await personaje.actualizar(conexion);

      console.log(`\\n🎉 ¡MISIÓN COMPLETADA!`);
      console.log(`${this.titulo}`);
      console.log(`Recompensas: +${this.recompensaExp} EXP, +${this.recompensaOro} Oro\\n`);

      return true;
    } catch (error) {
      console.error('❌ Error completando misión:', error.message);
      return false;
    }
  }
}

// ==================== SISTEMA DE TIENDA ====================
class Tienda {
  constructor() {
    this.items = [];
  }

  async cargar(conexion) {
    try {
      const [resultado] = await conexion.execute(
        `SELECT t.id, it.id as item_id, it.nombre, it.descripcion, it.tipo, 
                it.rareza, t.precio_oro, t.cantidad_disponible
         FROM tienda t 
         JOIN items it ON t.item_id = it.id 
         WHERE t.activo = TRUE`
      );
      this.items = resultado;
      return true;
    } catch (error) {
      console.error('❌ Error cargando tienda:', error.message);
      return false;
    }
  }

  async comprarItem(conexion, personaje, itemId, cantidad = 1) {
    try {
      const item = this.items.find(i => i.item_id === itemId);
      if (!item) {
        console.log('❌ Item no encontrado en tienda');
        return false;
      }

      const costoTotal = item.precio_oro * cantidad;
      if (personaje.oro < costoTotal) {
        console.log(`❌ No tienes suficiente oro (Necesitas: ${costoTotal}, Tienes: ${personaje.oro})`);
        return false;
      }

      // Restar oro
      personaje.oro -= costoTotal;

      // Agregar item al inventario
      const inv = new Inventario(personaje.id);
      await inv.agregarItem(conexion, itemId, cantidad);

      // Registrar transacción
      await conexion.execute(
        `INSERT INTO transacciones (personaje_id, tipo, cantidad, item_id, detalles) 
         VALUES (?, 'compra', ?, ?, ?)`,
        [personaje.id, cantidad, itemId, `Compra de ${item.nombre}`]
      );

      console.log(`✅ Compraste ${cantidad}x ${item.nombre} por ${costoTotal} oro`);
      return true;
    } catch (error) {
      console.error('❌ Error comprando item:', error.message);
      return false;
    }
  }

  mostrar() {
    console.log('\\n🏪 TIENDA:');
    this.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.nombre} - ${item.precio_oro} oro (${item.cantidad_disponible} disponibles)`);
      console.log(`   ${item.descripcion}`);
    });
  }
}

// ==================== EXPORTAR CLASES ====================
module.exports = {
  ConexionJuego,
  Jugador,
  Personaje,
  Inventario,
  Combate,
  Mision,
  Tienda
};
