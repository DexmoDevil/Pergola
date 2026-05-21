# 🌿 Pérgola Inteligente — Plataforma IoT

Sistema completo de monitoreo ambiental en tiempo real para pérgola inteligente con ESP32.

## 🏗️ Estructura
```
pergola/
├── backend/          ← Node.js + Express + MongoDB
│   ├── config/db.js
│   ├── controllers/sensorController.js
│   ├── models/SensorData.js
│   ├── routes/sensors.js
│   ├── server.js
│   └── package.json
├── frontend/         ← Dashboard web
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── config.js       ← Configura API_BASE_URL aquí
│       ├── api.js
│       ├── charts.js
│       ├── three-scene.js
│       ├── calculator.js
│       ├── map.js
│       └── app.js
├── esp32/
│   └── pergola_esp32.ino   ← Código Arduino
└── README.md
```

## ⚙️ Instalación y Configuración

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tu MONGODB_URI de Atlas
npm install
npm start
```

### 2. MongoDB Atlas

1. Crea cuenta en https://cloud.mongodb.com
2. Crea cluster gratuito M0
3. Crea usuario de BD
4. En "Network Access" → Allow from anywhere (0.0.0.0/0)
5. Copia el connection string a `MONGODB_URI` en `.env`

### 3. Frontend

Abre `frontend/index.html` en el navegador **o** déjalo que lo sirva el backend (ya configurado).

Si backend y frontend están en servidores separados, edita `frontend/js/config.js`:
```js
API_BASE_URL: 'https://tu-backend.onrender.com'
```

### 4. ESP32

1. Instala librerías en Arduino IDE:
   - `DHT sensor library` (Adafruit)
   - `ArduinoJson`
2. Edita `esp32/pergola_esp32.ino`:
   ```cpp
   const char* WIFI_SSID  = "TU_WIFI";
   const char* WIFI_PASS  = "TU_PASSWORD";
   const char* SERVER_URL = "http://IP_LOCAL:3000/api/sensor-data";
   ```
3. Sube el código al ESP32

## 🚀 Despliegue en Producción

### Backend → Render
1. Push a GitHub
2. En render.com → New Web Service → conecta repo
3. Root: `backend/`
4. Start Command: `npm start`
5. Agrega variables de entorno: `MONGODB_URI`, `PORT`

### Frontend → Vercel
1. En vercel.com → New Project → conecta repo
2. Root: `frontend/`
3. No build command necesario (HTML estático)
4. En `config.js` pon la URL de Render

### ESP32 en producción
```cpp
const char* SERVER_URL = "https://tu-app.onrender.com/api/sensor-data";
```

## 📡 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sensor-data` | Recibir datos del ESP32 |
| GET | `/api/sensor-data/latest` | Último dato + estado conexión |
| GET | `/api/sensor-data/history?limit=50` | Historial |
| GET | `/api/sensor-data/stats` | Estadísticas 24h |
| GET | `/api/status` | Health check |

## 🧪 Prueba sin ESP32 (curl)

```bash
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "temperatura": 25.3,
    "humedad": 65.1,
    "co2": 480,
    "ph": 6.8
  }'
```

## 🛠️ Sensores Soportados

| Sensor | Modelo | Pin ESP32 |
|--------|--------|-----------|
| Temperatura + Humedad | DHT22 | GPIO 4 |
| CO₂ | MH-Z19B | UART (GPIO 16/17) |
| pH | Analógico | GPIO 34 (ADC) |

## ⚡ Características

- ✅ Datos reales del ESP32 (sin simulación)
- ✅ Estado de conexión en tiempo real
- ✅ Gráficas dinámicas (Chart.js) actualizadas cada 3s
- ✅ Vista 3D interactiva (Three.js)
- ✅ Calculadora ambiental (manual/automática)
- ✅ Mapa de ubicación (Leaflet.js)
- ✅ Historial en MongoDB
- ✅ Estadísticas 24h
- ✅ Responsive y mobile-friendly
- ✅ Sin login/autenticación
