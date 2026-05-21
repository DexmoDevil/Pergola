/*
 * ============================================
 * PÉRGOLA INTELIGENTE - ESP32 Firmware
 * ============================================
 * Sensores:
 *   - DHT22 (Temperatura y Humedad) → Pin 4
 *   - MH-Z19B (CO2) → UART Serial2
 *   - Sensor pH analógico → Pin 34 (ADC)
 * 
 * Dependencias (instalar en Arduino IDE):
 *   - DHT sensor library (Adafruit)
 *   - ArduinoJson
 *   - WiFi (incluida en ESP32)
 *   - HTTPClient (incluida en ESP32)
 * ============================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

// ─── CONFIGURACIÓN ────────────────────────
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASS     = "TU_PASSWORD";
const char* SERVER_URL    = "http://TU_BACKEND_URL/api/sensor-data";
// Si backend en Render: "https://tu-app.onrender.com/api/sensor-data"

// ─── PINES ────────────────────────────────
#define DHT_PIN     4
#define DHT_TYPE    DHT22
#define PH_PIN      34   // Pin ADC para sensor pH

// ─── OBJETOS ──────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);

// ─── INTERVALO DE ENVÍO ───────────────────
const int INTERVALO_MS = 5000; // 5 segundos
unsigned long ultimoEnvio = 0;

// ─── NTP PARA TIMESTAMP ───────────────────
const char* NTP_SERVER = "pool.ntp.org";
const long  UTC_OFFSET = -18000; // UTC-5 (Colombia)

// ═══════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 16, 17); // MH-Z19B CO2
  dht.begin();

  Serial.println("\n🌿 Pérgola Inteligente - Iniciando...");
  conectarWiFi();
  configurarNTP();
}

// ═══════════════════════════════════════════
void loop() {
  unsigned long ahora = millis();
  
  if (ahora - ultimoEnvio >= INTERVALO_MS) {
    ultimoEnvio = ahora;
    
    // Leer sensores
    float temperatura = leerTemperatura();
    float humedad     = leerHumedad();
    int   co2         = leerCO2();
    float ph          = leerPH();
    String timestamp  = obtenerTimestamp();

    // Validar lecturas
    if (isnan(temperatura) || isnan(humedad)) {
      Serial.println("⚠️ Error: DHT22 sin datos");
      return;
    }

    // Enviar al backend
    enviarDatos(temperatura, humedad, co2, ph, timestamp);
  }
}

// ─── CONEXIÓN WIFI ────────────────────────
void conectarWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(1000);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ Error WiFi. Reiniciando...");
    ESP.restart();
  }
}

// ─── NTP ──────────────────────────────────
void configurarNTP() {
  configTime(UTC_OFFSET, 0, NTP_SERVER);
  Serial.println("⏰ NTP configurado");
}

String obtenerTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2026-01-01T00:00:00";
  }
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

// ─── LECTURAS ─────────────────────────────
float leerTemperatura() {
  return dht.readTemperature();
}

float leerHumedad() {
  return dht.readHumidity();
}

int leerCO2() {
  // Protocolo MH-Z19B
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte resp[9];
  Serial2.write(cmd, 9);
  delay(100);
  if (Serial2.available() >= 9) {
    Serial2.readBytes(resp, 9);
    if (resp[0] == 0xFF && resp[1] == 0x86) {
      return (resp[2] << 8) | resp[3];
    }
  }
  return -1; // Error
}

float leerPH() {
  // Sensor pH analógico (calibración necesaria según tu sensor)
  int lectura = analogRead(PH_PIN);
  float voltaje = lectura * (3.3 / 4095.0);
  // Ecuación de calibración aproximada (ajustar con buffer pH 4 y pH 7)
  float ph = 3.3 * voltaje + 0.0;
  return constrain(ph, 0.0, 14.0);
}

// ─── ENVÍO HTTP ───────────────────────────
void enviarDatos(float temp, float hum, int co2, float ph, String timestamp) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    conectarWiFi();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // Construir JSON
  StaticJsonDocument<256> doc;
  doc["temperatura"] = temp;
  doc["humedad"]     = hum;
  doc["co2"]         = co2;
  doc["ph"]          = ph;
  doc["timestamp"]   = timestamp;
  doc["dispositivo"] = "ESP32-001";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("✅ Enviado: T=%.1f°C H=%.1f%% CO2=%dppm pH=%.2f\n", temp, hum, co2, ph);
  } else {
    Serial.printf("❌ Error HTTP: %d | %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
}
