const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  temperatura: {
    type: Number,
    required: true,
    min: -50,
    max: 100
  },
  humedad: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  co2: {
    type: Number,
    required: true,
    min: 0,
    max: 10000
  },
  ph: {
    type: Number,
    required: true,
    min: 0,
    max: 14
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  dispositivo: {
    type: String,
    default: 'ESP32-001'
  }
}, {
  timestamps: true
});

// Index para consultas de historial
sensorDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
