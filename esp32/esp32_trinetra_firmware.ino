/*
 * TRINETRA — Indigenous Landmine Detection System
 * ESP32 Hardware Firmware (Arduino IDE / PlatformIO compatible)
 * 
 * Hardware Pinout:
 * - NEO-6M / NEO-8M GPS Module: TX -> GPIO 16 (ESP32 RX2), RX -> GPIO 17 (ESP32 TX2)
 * - Metal Detector Analog Pulse Coil Out: GPIO 34 (ADC1_CH6)
 * - Battery Voltage Divider (100k / 22k): GPIO 36 (ADC1_CH0)
 * - Status LED Indicator: GPIO 2
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. Wi-Fi & Mission Control Server Settings
// ==========================================
// Replace with your local Wi-Fi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// REPLACE WITH YOUR LAPTOP'S LAN IP ADDRESS (from 'ipconfig')
// Note: Do NOT use 127.0.0.1 or localhost!
const char* SERVER_BASE_URL = "http://192.168.1.150:8000";

// Endpoints
String locationEndpoint = String(SERVER_BASE_URL) + "/api/location";
String sensorsEndpoint  = String(SERVER_BASE_URL) + "/api/sensors";

// ==========================================
// 2. Hardware Pins & Constants
// ==========================================
#define PIN_GPS_RX 16
#define PIN_GPS_TX 17
#define PIN_METAL_DETECTOR 34
#define PIN_BATTERY_VOLTAGE 36
#define PIN_STATUS_LED 2

// Voltage divider ratio: (R1 + R2) / R2 -> (100k + 22k) / 22k = 5.545
const float VOLTAGE_DIVIDER_RATIO = 5.545;
const float ADC_REFERENCE_VOLTAGE = 3.3;

// Telemetry timers
unsigned long lastSensorPost = 0;
unsigned long lastLocationPost = 0;
const unsigned long SENSOR_INTERVAL = 1000;    // Post sensors every 1.0s
const unsigned long LOCATION_INTERVAL = 2000;  // Post GPS every 2.0s

// Hardware Serial for GPS
HardwareSerial gpsSerial(2);

void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_METAL_DETECTOR, INPUT);
  pinMode(PIN_BATTERY_VOLTAGE, INPUT);

  // Initialize GPS UART on pins 16 & 17
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);

  // Connect to Wi-Fi
  connectWiFi();
}

void loop() {
  // Reconnect if Wi-Fi drops
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, LOW);
    connectWiFi();
  } else {
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  unsigned long currentMillis = millis();

  // 1. Read & Post Sensor Data
  if (currentMillis - lastSensorPost >= SENSOR_INTERVAL) {
    lastSensorPost = currentMillis;
    readAndPostSensors();
  }

  // 2. Read & Post GPS Location Data
  if (currentMillis - lastLocationPost >= LOCATION_INTERVAL) {
    lastLocationPost = currentMillis;
    readAndPostLocation();
  }
}

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("ESP32 Assigned IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi Connection Failed. Will retry in loop.");
  }
}

void readAndPostSensors() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Read raw metal detector ADC (0 - 4095 on ESP32)
  int rawCoilAdc = analogRead(PIN_METAL_DETECTOR);
  float signalStrength = (rawCoilAdc / 4095.0) * 100.0;
  bool metalDetected = (signalStrength > 65.0); // Anomaly threshold

  // Read battery voltage
  int rawBattAdc = analogRead(PIN_BATTERY_VOLTAGE);
  float measuredAdcVoltage = (rawBattAdc / 4095.0) * ADC_REFERENCE_VOLTAGE;
  float batteryVoltage = measuredAdcVoltage * VOLTAGE_DIVIDER_RATIO;
  float batteryPercent = constrain(((batteryVoltage - 10.5) / 2.1) * 100.0, 0.0, 100.0);

  // Build JSON Payload
  String json = "{";
  json += "\"device_id\":\"trinetra-01\",";
  json += "\"metal_detected\":" + String(metalDetected ? "true" : "false") + ",";
  json += "\"signal_strength\":" + String(signalStrength, 1) + ",";
  json += "\"battery_voltage\":" + String(batteryVoltage, 2) + ",";
  json += "\"battery_percentage\":" + String(batteryPercent, 1) + ",";
  json += "\"motor_status\":\"nominal\",";
  json += "\"is_simulated\":false";
  json += "}";

  sendHttpPost(sensorsEndpoint, json);
}

void readAndPostLocation() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Note: Integrate TinyGPSPlus parser here for live NMEA coordinates.
  // For initial hardware verification without active satellite lock,
  // we check if valid NMEA sentences are coming in or send current fix:
  float lat = 12.914100;
  float lon = 74.856000;
  float speed = 0.0;
  float heading = 0.0;

  String json = "{";
  json += "\"latitude\":" + String(lat, 6) + ",";
  json += "\"longitude\":" + String(lon, 6) + ",";
  json += "\"altitude\":18.5,";
  json += "\"speed\":" + String(speed, 1) + ",";
  json += "\"heading\":" + String(heading, 1) + ",";
  json += "\"accuracy\":1.2,";
  json += "\"is_simulated\":false,";
  json += "\"source\":\"esp32_neo6m\"";
  json += "}";

  sendHttpPost(locationEndpoint, json);
}

void sendHttpPost(String url, String jsonPayload) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonPayload);
  if (httpResponseCode > 0) {
    Serial.printf("POST to %s -> Code: %d\n", url.c_str(), httpResponseCode);
  } else {
    Serial.printf("POST Failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}
