const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME // Usa proxymenu_bd automáticamente
});

// Ruta para que tu aplicación de Android descargue los archivos
app.get('/api/archivos', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT nombre, contenido, ruta FROM archivos WHERE estado = "activo"');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${port}`);
});
