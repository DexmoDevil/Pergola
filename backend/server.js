require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: '*', // En producción: especifica tu dominio de Vercel
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático desde /frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Logging básico
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// Rutas API
app.use('/api', require('./routes/sensors'));

// Catch-all: servir el frontend para rutas no-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Pérgola IoT corriendo en puerto ${PORT}`);
  console.log(`📡 Endpoint ESP32: POST http://localhost:${PORT}/api/sensor-data`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
