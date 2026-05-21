const SensorData = require('../models/SensorData');

// Estado de conexión en memoria
let ultimoDato = null;
let ultimoTimestamp = null;
const TIMEOUT_DESCONEXION = 15000; // 15 segundos

// POST /api/sensor-data — recibe datos del ESP32
const recibirDatos = async (req, res) => {
  try {
    const { temperatura, co2, ph, timestamp, dispositivo } = req.body;

// Validación básica (SIN humedad)
    if (temperatura === undefined || co2 === undefined || ph === undefined) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: temperatura, co2, ph'
      });
    }

    const nuevoDato = new SensorData({
      temperatura: parseFloat(temperatura),
      humedad: 0, // valor por defecto
      co2: parseFloat(co2),
      ph: parseFloat(ph),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      dispositivo: dispositivo || 'ESP32-001'
    });

    await nuevoDato.save();

    // Actualizar estado en memoria
    ultimoDato = nuevoDato;
    ultimoTimestamp = Date.now();

    console.log(`📡 Datos recibidos: T=${temperatura}°C CO2=${co2}ppm pH=${ph}`);

    res.status(201).json({
      success: true,
      message: 'Datos guardados correctamente',
      id: nuevoDato._id
    });

  } catch (error) {
    console.error('Error al guardar datos:', error);
    res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
  }
};

// GET /api/sensor-data/latest — último dato
const obtenerUltimo = async (req, res) => {
  try {
    const ahora = Date.now();
    const conectado = ultimoTimestamp && (ahora - ultimoTimestamp < TIMEOUT_DESCONEXION);

    if (!conectado) {
      return res.json({
        conectado: false,
        mensaje: 'Sensores desconectados',
        ultimoContacto: ultimoTimestamp,
        datos: null
      });
    }

    const dato = await SensorData.findOne().sort({ timestamp: -1 }).lean();

    res.json({
      conectado: true,
      datos: dato,
      ultimoContacto: ultimoTimestamp
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/sensor-data/history?limit=50 — historial
const obtenerHistorial = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 50;
    const desde = req.query.desde ? new Date(req.query.desde) : null;

    const filtro = desde ? { timestamp: { $gte: desde } } : {};

    const datos = await SensorData
      .find(filtro)
      .sort({ timestamp: -1 })
      .limit(Math.min(limite, 500))
      .lean();

    res.json({
      total: datos.length,
      datos: datos.reverse() // cronológico para gráficas
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/sensor-data/stats — estadísticas del día
const obtenerStats = async (req, res) => {
  try {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await SensorData.aggregate([
      { $match: { timestamp: { $gte: hace24h } } },
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

    res.json(stats[0] || { mensaje: 'Sin datos en las últimas 24 horas' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/status — health check
const obtenerEstado = (req, res) => {
  const ahora = Date.now();
  const conectado = ultimoTimestamp && (ahora - ultimoTimestamp < TIMEOUT_DESCONEXION);

  res.json({
    servidor: 'online',
    sensores: conectado ? 'conectado' : 'desconectado',
    ultimoContacto: ultimoTimestamp,
    tiempoDesdeUltimoDato: ultimoTimestamp ? Math.floor((ahora - ultimoTimestamp) / 1000) + 's' : null
  });
};

module.exports = { recibirDatos, obtenerUltimo, obtenerHistorial, obtenerStats, obtenerEstado };
