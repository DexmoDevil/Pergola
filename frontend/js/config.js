// ─── CONFIGURACIÓN FRONTEND ─────────────────────────────────────
// ⚠️ Cambia API_BASE_URL a la URL de tu backend en producción (Render)
window.PERGOLA_CONFIG = {
  API_BASE_URL: 'https://pergola-s7bh.onrender.com', // Vacío = mismo servidor; en prod: 'https://tu-backend.onrender.com'
  POLL_INTERVAL_MS: 3000,
  HISTORY_POINTS: 30,
  DISCONNECTED_TIMEOUT_MS: 15000,

  // Coordenadas de la pérgola (modifica según tu ubicación real)
  PERGOLA_LAT:  8.098683,
  PERGOLA_LNG: -76.708912,
  PERGOLA_NOMBRE: 'Pérgola Inteligente',

  // Rangos normales de sensores
  RANGOS: {
    temperatura: { min: 15, max: 35, unidad: '°C',  etiqueta: 'Temperatura' },
    humedad:     { min: 30, max: 80, unidad: '%',   etiqueta: 'Humedad'     },
    co2:         { min:  0, max:1000,unidad: 'ppm', etiqueta: 'CO₂'         },
    ph:          { min: 5.5,max: 8,  unidad: 'pH',  etiqueta: 'pH'          }
  }
};
