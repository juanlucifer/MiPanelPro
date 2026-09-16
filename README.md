# 🎛️ MiPanelPro - Extractor de Repositorios GitHub

Sistema completo para extraer archivos de repositorios GitHub e inyectarlos en una base de datos MySQL con control de versiones y sincronización inteligente.

## ✨ Características

- ✅ **Extracción automática** de archivos de GitHub
- ✅ **Inyección en MySQL** con transacciones
- ✅ **Control de versiones** con hash SHA256
- ✅ **Detección de cambios** automática
- ✅ **Manejo de errores** robusto
- ✅ **Logs detallados** de sincronización
- ✅ **Paginación** para grandes repositorios
- ✅ **Filtrado** de extensiones permitidas
- ✅ **Límite de tamaño** para archivos

## 🚀 Instalación Rápida

### 1. Clonar repositorio
```bash
git clone https://github.com/juanlucifer/MiPanelPro.git
cd MiPanelPro
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
nano .env
```

Edita `.env` con tus valores:
```env
GITHUB_TOKEN=ghp_tu_token_aqui
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=proxymenu_bd
REPOSITORIO=usuario/nombre-repo
```

### 4. Crear base de datos
```bash
mysql -u root -p < crear_tabla_archivos.sql
```

O desde MySQL:
```sql
USE mysql;
SOURCE /ruta/a/crear_tabla_archivos.sql;
```

## 📖 Uso

### Ejecutar sincronización
```bash
npm start
```

O directamente:
```bash
node extraer-e-inyectar.js
```

### Ejemplo de salida
```
🚀 Iniciando extracción e inyección de archivos...

✅ Conectado a la base de datos
📥 Extrayendo archivos del repositorio...
📄 Página 1: 45 archivos encontrados

📊 Total de archivos encontrados: 45
✅ Archivos válidos para procesar: 38

🔄 Procesando con transacciones...

✅ Inyectado: archivo1.js (1250 bytes)
✅ Inyectado: archivo2.json (890 bytes)
⏭️  Sin cambios: archivo3.md
...

==================================================
📈 RESUMEN DE EJECUCIÓN
==================================================
   ✅ Exitosos:      35
   ❌ Con error:     0
   ⏭️  Sin cambios:   3
   ⏱️  Duración:      12s
==================================================

🔌 Conexión cerrada
```

## 🔧 Configuración

### Variables de entorno (.env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Token personal de GitHub | `ghp_xxxxx` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | `password123` |
| `DB_NAME` | Nombre de la base de datos | `proxymenu_bd` |
| `REPOSITORIO` | Repositorio a sincronizar | `usuario/repo` |
| `NODE_ENV` | Entorno | `development` |

### Extensiones permitidas

Edita en `extraer-e-inyectar.js`:
```javascript
const EXTENSIONES_PERMITIDAS = [
  '.js', '.json', '.txt', '.md', '.py', '.html', 
  '.css', '.xml', '.yaml', '.yml'
];
```

### Tamaño máximo de archivo

```javascript
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB
```

## 📊 Estructura de Base de Datos

### Tabla: `archivos`
- `id`: ID único
- `nombre`: Nombre del archivo
- `contenido`: Contenido completo
- `ruta`: Ruta en el repositorio
- `tamaño`: Tamaño en bytes
- `hash`: SHA256 del contenido
- `fecha`: Fecha de inserción
- `actualizado`: Última actualización
- `estado`: activo/eliminado/archivado

### Tabla: `archivo_historial`
- Guarda todos los cambios realizados
- Permite recuperar versiones anteriores
- Incluye hash para verificación

### Tabla: `sync_logs`
- Registro de cada sincronización
- Estadísticas de ejecución
- Tiempos de duración

### Tabla: `sync_errores`
- Errores detallados por sincronización
- Facilita debugging

## 🔐 Seguridad

### ✅ Implementado
- Variables de entorno para credenciales
- `.gitignore` para archivos sensibles
- Validación de extensiones
- Validación de tamaño
- Transacciones para integridad

### ⚠️ Recomendaciones
1. **Nunca** commitear el archivo `.env`
2. Usar tokens personales con permisos limitados
3. Implementar SSL/TLS en la conexión MySQL
4. Usar contraseñas fuertes
5. Ejecutar desde un servidor seguro

## 🐛 Solución de Problemas

### Error: "GITHUB_TOKEN no definido"
```
❌ Error de conexión a BD: GITHUB_TOKEN no definido
```
**Solución:** Verifica que `.env` existe y tiene `GITHUB_TOKEN`

### Error: "Error de conexión a BD"
```
❌ Error de conexión a BD: connect ECONNREFUSED
```
**Solución:** 
- Verifica que MySQL está corriendo
- Revisa credenciales en `.env`
- Confirma que la BD existe

### Error: "API rate limit exceeded"
```
❌ GitHub API error: 403
```
**Solución:**
- Espera una hora (GitHub limita sin token)
- O usa un token válido
- Aumenta delay entre requests

## 📝 Logs

Los logs se guardan automáticamente en:
- Base de datos: tabla `sync_logs`
- Base de datos: tabla `sync_errores`
- Consola: salida en tiempo real

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:
1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📧 Contacto

**Autor:** juanlucifer  
**GitHub:** [@juanlucifer](https://github.com/juanlucifer)

## 🙏 Agradecimientos

- GitHub API
- MySQL
- Node.js Community

---

**Hecho con ❤️ por juanlucifer**
