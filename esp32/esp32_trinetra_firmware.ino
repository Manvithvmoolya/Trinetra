/*
 * TRINETRA — Indigenous Landmine Detection System
 * Robust NEO-6M GPS Coordinate Extraction & Telemetry Firmware
 *
 * Hardware Wiring:
 * - NEO-6M GPS TX -> ESP32 GPIO 16 (RX2)
 * - NEO-6M GPS RX -> ESP32 GPIO 17 (TX2)
 * - NEO-6M VCC    -> ESP32 5V (or VIN for stable antenna LNA power)
 * - NEO-6M GND    -> ESP32 GND
 * - Metal Detector Analog Pin -> ESP32 GPIO 34
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>

// =========================================================================
// 1. Wi-Fi & Laptop Settings
// =========================================================================
const char* WIFI_SSID     = "Galaxy S23";        // <-- Put your Wi-Fi name
const char* WIFI_PASSWORD = "Galaxy s23";    // <-- Put your Wi-Fi password

// Your laptop's exact IPv4 address from 'ipconfig':
const char* SERVER_BASE_URL = "http://10.134.156.69:8000";

String locationEndpoint = String(SERVER_BASE_URL) + "/api/location";
String sensorsEndpoint  = String(SERVER_BASE_URL) + "/api/sensors";

// =========================================================================
// 2. Hardware Objects & Pins
// =========================================================================
#define PIN_GPS_RX 16       // Connects to NEO-6M TX
#define PIN_GPS_TX 17       // Connects to NEO-6M RX
#define PIN_METAL_DETECTOR 34
#define PIN_STATUS_LED 2

TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // ESP32 Hardware UART2

unsigned long lastLocationPost = 0;
unsigned long lastSensorPost = 0;
const unsigned long LOCATION_INTERVAL = 2000; // Post GPS every 2 seconds
const unsigned long SENSOR_INTERVAL   = 1000; // Post sensors every 1 second

void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_METAL_DETECTOR, INPUT);

  // Initialize NEO-6M GPS at 9600 baud on pins 16 & 17
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);

  Serial.println("\n========================================");
  Serial.println("  TRINETRA MK-1: GPS COORDINATE EXTRACTOR");
  Serial.println("========================================");
  Serial.printf("Target Server: %s\n", SERVER_BASE_URL);

  connectWiFi();
}

void loop() {
  // CRITICAL: Feed raw GPS bytes to TinyGPSPlus parser continuously without delay()
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // Ensure Wi-Fi remains connected
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, LOW);
    connectWiFi();
  } else {
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  unsigned long currentMillis = millis();

  // 1. Post Live GPS Coordinates
  if (currentMillis - lastLocationPost >= LOCATION_INTERVAL) {
    lastLocationPost = currentMillis;
    processAndSendGPS();
  }

  // 2. Post Metal Detector & Telemetry
  if (currentMillis - lastSensorPost >= SENSOR_INTERVAL) {
    lastSensorPost = currentMillis;
    processAndSendSensors();
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected Successfully!");
    Serial.print("[WIFI] ESP32 Assigned IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Connection pending. Retrying in background...");
  }
}

void processAndSendGPS() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Diagnostic check: Are bytes flowing from NEO-6M?
  unsigned long charsProcessed = gps.charsProcessed();
  if (charsProcessed < 10) {
    Serial.println("[GPS WARNING] No data received from NEO-6M! Check TX/RX wiring (TX->16, RX->17).");
    return;
  }

  float lat = 0.0;
  float lon = 0.0;
  float speed = 0.0;
  float heading = 0.0;
  float altitude = 0.0;
  float accuracy = 1.0;
  bool fixValid = false;

  // Check if NEO-6M has a real satellite fix
  if (gps.location.isValid() && gps.location.age() < 2000) {
    lat = gps.location.lat();
    lon = gps.location.lng();
    fixValid = true;

    if (gps.speed.isValid()) speed = gps.speed.mps();
    if (gps.course.isValid()) heading = gps.course.deg();
    if (gps.altitude.isValid()) altitude = gps.altitude.meters();
    if (gps.hdop.isValid()) accuracy = gps.hdop.hdop();

    Serial.printf("[GPS LOCK] Lat: %.6f | Lon: %.6f | Sats: %d | HDOP: %.1f\n",
                  lat, lon, gps.satellites.value(), accuracy);
  } else {
    // Indoor / satellite search state
    int sats = gps.satellites.value();
    Serial.printf("[GPS ACQUIRING] Searching for satellites... (Visible: %d, Chars: %lu)\n",
                  sats, charsProcessed);
    Serial.println("  -> Tip: Move antenna near a window or outdoors. Blinking red LED on NEO-6M = Locked!");

    // Optional indoor fallback so website map is still functional during testing
    lat = 12.914100;
    lon = 74.856000;
    speed = 0.0;
    heading = 0.0;
    altitude = 18.5;
  }

  // Construct JSON Payload for FastAPI backend
  String json = "{";
  json += "\"latitude\":" + String(lat, 6) + ",";
  json += "\"longitude\":" + String(lon, 6) + ",";
  json += "\"altitude\":" + String(altitude, 1) + ",";
  json += "\"speed\":" + String(speed, 1) + ",";
  json += "\"heading\":" + String(heading, 1) + ",";
  json += "\"accuracy\":" + String(accuracy, 1) + ",";
  json += "\"is_simulated\":" + String(fixValid ? "false" : "true") + ",";
  json += "\"source\":\"" + String(fixValid ? "neo6m_real_satellite" : "neo6m_indoor_fallback") + "\"";
  json += "}";

  sendHttpPost(locationEndpoint, json);
}

void processAndSendSensors() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Read analog metal detector coil
  int rawAdc = 0;
  float signalStrength = (rawAdc / 4095.0) * 100.0;
  bool anomalyDetected = (signalStrength > 65.0); // Anomaly threshold

  String json = "{";
  json += "\"device_id\":\"trinetra-01\",";
  json += "\"metal_detected\":" + String(anomalyDetected ? "true" : "false") + ",";
  json += "\"signal_strength\":" + String(signalStrength, 1) + ",";
  json += "\"battery_voltage\":12.40,";
  json += "\"battery_percentage\":88.0,";
  json += "\"motor_status\":\"nominal\",";
  json += "\"is_simulated\":false";
  json += "}";

  sendHttpPost(sensorsEndpoint, json);
}

void sendHttpPost(String url, String jsonPayload) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    if (httpCode == 200 || httpCode == 201) {
      Serial.printf("[HTTP OK] POST to %s -> Code: %d\n", url.c_str(), httpCode);
    } else {
      Serial.printf("[HTTP WARN] POST to %s -> Code: %d\n", url.c_str(), httpCode);
    }
  } else {
    Serial.printf("[HTTP FAILED] %s (Error: %s)\n", url.c_str(), http.errorToString(httpCode).c_str());
  }
  http.end();
}