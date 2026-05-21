const SensorData = require('../models/SensorData');

// Estado de conexión en memoria
let ultimoDato = null;
let ultimoTimestamp = null;

const TIMEOUT_DESCONEXION = 15000; // 15 segundos

// =====================================================
// POST /api/sensor-data
// Recibe datos desde el ESP32
// =====================================================
const recibirDatos = async (req, res) => {
  try {

    console.log('📥 BODY RECIBIDO:', req.body);

    const {
      temperatura,
      humedad,
      co2,
      ph,
      timestamp,
      dispositivo
    } = req.body;

    // =========================================
    // VALIDACIÓN BÁSICA
    // =========================================
    if (
      temperatura === undefined ||
      co2 === undefined ||
      ph === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        requeridos: ['temperatura', 'co2', 'ph']
      });
    }

    // =========================================
    // LIMPIEZA Y CONVERSIÓN SEGURA
    // =========================================
    const temperaturaNum = Number(temperatura);
    const humedadNum     = Number(humedad ?? 0);
    const co2Num         = Number(co2);
    const phNum          = Number(ph);

    // Validar números
    if (
      isNaN(temperaturaNum) ||
      isNaN(humedadNum) ||
      isNaN(co2Num) ||
      isNaN(phNum)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valores inválidos'
      });
    }

    // =========================================
    // TIMESTAMP SEGURO
    // =========================================
    let fecha;

    if (timestamp && !isNaN(new Date(timestamp).getTime())) {
      fecha = new Date(timestamp);
    } else {
      fecha = new Date();
    }

    // =========================================
    // CREAR DOCUMENTO
    // =========================================
    const nuevoDato = new SensorData({
      temperatura: temperaturaNum,
      humedad: humedadNum,
      co2: co2Num,
      ph: phNum,
      timestamp: fecha,
      dispositivo: dispositivo || 'ESP32-001'
    });

    // =========================================
    // GUARDAR EN MONGO
    // =========================================
    await nuevoDato.save();

    // =========================================
    // ACTUALIZAR ESTADO
    // =========================================
    ultimoDato = nuevoDato;
    ultimoTimestamp = Date.now();

    console.log(
      `📡 Datos guardados | T=${temperaturaNum}°C | CO2=${co2Num} | pH=${phNum}`
    );

    // =========================================
    // RESPUESTA
    // =========================================
    return res.status(201).json({
      success: true,
      message: 'Datos guardados correctamente',
      data: nuevoDato
    });

  } catch (error) {

    console.error('❌ ERROR AL GUARDAR DATOS:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
};

// =====================================================
// GET /api/sensor-data/latest
// Último dato recibido
// =====================================================
const obtenerUltimo = async (req, res) => {
  try {

    const ahora = Date.now();

    const conectado =
      ultimoTimestamp &&
      (ahora - ultimoTimestamp < TIMEOUT_DESCONEXION);

    if (!conectado) {
      return res.json({
        conectado: false,
        mensaje: 'Sensores desconectados',
        ultimoContacto: ultimoTimestamp,
        datos: null
      });
    }

    const dato = await SensorData
      .findOne()
      .sort({ timestamp: -1 })
      .lean();

    return res.json({
      conectado: true,
      datos: dato,
      ultimoContacto: ultimoTimestamp
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};

// =====================================================
// GET /api/sensor-data/history
// Historial de datos
// =====================================================
const obtenerHistorial = async (req, res) => {
  try {

    const limite = parseInt(req.query.limit) || 50;

    const desde = req.query.desde
      ? new Date(req.query.desde)
      : null;

    const filtro = desde
      ? { timestamp: { $gte: desde } }
      : {};

    const datos = await SensorData
      .find(filtro)
      .sort({ timestamp: -1 })
      .limit(Math.min(limite, 500))
      .lean();

    return res.json({
      total: datos.length,
      datos: datos.reverse()
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};

// =====================================================
// GET /api/sensor-data/stats
// Estadísticas últimas 24h
// =====================================================
const obtenerStats = async (req, res) => {
  try {

    const hace24h = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const stats = await SensorData.aggregate([
      {
        $match: {
          timestamp: { $gte: hace24h }
        }
      },
      {
        $group: {
          _id: null,

          tempMin: { $min: '$temperatura' },
          tempMax: { $max: '$temperatura' },
          tempProm: { $avg: '$temperatura' },

          humMin: { $min: '$humedad' },
          humMax: { $max: '$humedad' },
          humProm: { $avg: '$humedad' },

          co2Min: { $min: '$co2' },
          co2Max: { $max: '$co2' },
          co2Prom: { $avg: '$co2' },

          phMin: { $min: '$ph' },
          phMax: { $max: '$ph' },
          phProm: { $avg: '$ph' },

          totalRegistros: { $sum: 1 }
        }
      }
    ]);

    return res.json(
      stats[0] || {
        mensaje: 'Sin datos en las últimas 24 horas'
      }
    );

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};

// =====================================================
// GET /api/status
// Estado del sistema
// =====================================================
const obtenerEstado = (req, res) => {

  const ahora = Date.now();

  const conectado =
    ultimoTimestamp &&
    (ahora - ultimoTimestamp < TIMEOUT_DESCONEXION);

  return res.json({
    servidor: 'online',
    sensores: conectado ? 'conectado' : 'desconectado',
    ultimoContacto: ultimoTimestamp,
    tiempoDesdeUltimoDato: ultimoTimestamp
      ? Math.floor((ahora - ultimoTimestamp) / 1000) + 's'
      : null
  });
};

module.exports = {
  recibirDatos,
  obtenerUltimo,
  obtenerHistorial,
  obtenerStats,
  obtenerEstado
};
