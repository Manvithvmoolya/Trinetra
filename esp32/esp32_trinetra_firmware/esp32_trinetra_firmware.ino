
#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// Wi-Fi credentials
const char* WIFI_SSID = "Galaxy S23";
const char* WIFI_PASSWORD = "Galaxy s23";

// Laptop backend address
const char* SERVER_URL =
  "http://10.118.18.69:8000/api/location";

// GPS pins
#define GPS_RX 16
#define GPS_TX 17

HardwareSerial gpsSerial(2);

// GPS data
String nmeaSentence = "";
double latitude = 0.0;
double longitude = 0.0;
double altitude = 0.0;
double accuracy = 0.0;

bool gpsFix = false;

unsigned long lastSend = 0;
unsigned long lastPrint = 0;

// Convert NMEA coordinates into decimal degrees
double convertToDecimal(String coordinate, String direction) {
  if (coordinate.length() == 0) return 0.0;

  double raw = coordinate.toDouble();
  int degrees = (int)(raw / 100);
  double minutes = raw - (degrees * 100);

  double decimal = degrees + minutes / 60.0;

  if (direction == "S" || direction == "W") {
    decimal = -decimal;
  }

  return decimal;
}

// Parse GPS GGA sentence
void parseGPS(String sentence) {
  if (!sentence.startsWith("$GPGGA") &&
      !sentence.startsWith("$GNGGA")) {
    return;
  }

  String fields[15];
  int fieldIndex = 0;
  int start = 0;

  for (int i = 0; i <= sentence.length(); i++) {
    if (sentence[i] == ',' || i == sentence.length()) {
      if (fieldIndex < 15) {
        fields[fieldIndex] = sentence.substring(start, i);
        fieldIndex++;
      }
      start = i + 1;
    }
  }

  if (fieldIndex < 10) return;

  int fixQuality = fields[6].toInt();

  if (fixQuality > 0 &&
      fields[2].length() > 0 &&
      fields[4].length() > 0) {

    latitude = convertToDecimal(fields[2], fields[3]);
    longitude = convertToDecimal(fields[4], fields[5]);
    accuracy = fields[8].toFloat();
    altitude = fields[9].toFloat();

    gpsFix = true;
  } else {
    gpsFix = false;
  }
}

// Connect to Wi-Fi
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected!");

  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// Send GPS data to FastAPI
void sendGPSData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected. Reconnecting...");
    WiFi.reconnect();
    return;
  }

  if (!gpsFix) {
    Serial.println("No valid GPS fix. Not sending coordinates.");
    return;
  }

  HTTPClient http;

  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"latitude\":" + String(latitude, 6) + ",";
  json += "\"longitude\":" + String(longitude, 6) + ",";
  json += "\"altitude\":" + String(altitude, 2) + ",";
  json += "\"accuracy\":" + String(accuracy, 2) + ",";
  json += "\"is_simulated\":false,";
  json += "\"source\":\"esp32\"";
  json += "}";

  Serial.println("Sending GPS data:");
  Serial.println(json);

  int httpResponseCode = http.POST(json);

  Serial.print("HTTP response code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println("HTTP request failed.");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  Serial.println("TRINETRA GPS + Wi-Fi STARTED");

  connectWiFi();
}

void loop() {
  // Read GPS data
  while (gpsSerial.available()) {
    char c = gpsSerial.read();

    if (c == '\n') {
      parseGPS(nmeaSentence);
      nmeaSentence = "";
    } else if (c != '\r') {
      if (nmeaSentence.length() < 120) {
        nmeaSentence += c;
      } else {
        nmeaSentence = "";
      }
    }
  }

  // Print current coordinates
  if (millis() - lastPrint >= 2000) {
    lastPrint = millis();

    if (gpsFix) {
      Serial.print("Latitude: ");
      Serial.println(latitude, 6);

      Serial.print("Longitude: ");
      Serial.println(longitude, 6);
    } else {
      Serial.println("Waiting for GPS fix...");
    }
  }

  // Send GPS data every 2 seconds
  if (millis() - lastSend >= 2000) {
    lastSend = millis();
    sendGPSData();
  }
}
