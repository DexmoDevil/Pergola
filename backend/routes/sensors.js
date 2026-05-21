const express = require('express');
const router = express.Router();
const {
  recibirDatos,
  obtenerUltimo,
  obtenerHistorial,
  obtenerStats,
  obtenerEstado
} = require('../controllers/sensorController');

// Recibir datos del ESP32
router.post('/sensor-data', recibirDatos);

// Consultar último dato
router.get('/sensor-data/latest', obtenerUltimo);

// Historial de datos
router.get('/sensor-data/history', obtenerHistorial);

// Estadísticas del día
router.get('/sensor-data/stats', obtenerStats);

// Estado del sistema
router.get('/status', obtenerEstado);

module.exports = router;
