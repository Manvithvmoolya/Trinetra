# TRINETRA Hardware Setup & Microcontroller Integration Guide

This guide details how to connect your **ESP32**, **GPS Module**, **Pulse Induction Metal Detector**, and **Battery Voltage Divider** to the Trinetra Mission Control dashboard over local Wi-Fi.

---

## 1. Electrical Wiring Schematics

### A. ESP32 to NEO-6M / NEO-8M GPS Module
The GPS module communicates via UART (Serial 2) at 9600 baud:
| NEO-6M Pin | ESP32 Pin | Function |
|---|---|---|
| `VCC` | `3.3V` or `5V` | Power supply |
| `GND` | `GND` | Common ground |
| `TX` | `GPIO 16` | ESP32 RX2 (Incoming NMEA sentences) |
| `RX` | `GPIO 17` | ESP32 TX2 |

### B. Pulse Induction Metal Detector Search Coil
The output of your pulse induction detector circuit or analog comparator connects to an ADC input:
| Detector Pin | ESP32 Pin | Function |
|---|---|---|
| `VCC` | `5V` (Regulated) | Detector power |
| `GND` | `GND` | Common ground |
| `SIGNAL OUT` | `GPIO 34` | ADC1_CH6 Analog signal (0 - 3.3V) |

### C. 3S LiPo Battery Voltage Divider (12.6V Max)
ESP32 ADC pins accept a maximum of 3.3V. To measure a 3S 11.1V - 12.6V LiPo pack, use a two-resistor voltage divider:
- `R1 = 100 kΩ` (Connected between Battery Positive `+` and `GPIO 36`)
- `R2 = 22 kΩ` (Connected between `GPIO 36` and `GND`)

**Formula:**
$$V_{out} = V_{batt} \times \frac{22}{100 + 22} = V_{batt} \times 0.1803$$
At full charge ($12.6\text{ V}$):
$$V_{out} = 12.6 \times 0.1803 \approx 2.27\text{ V}$$ *(Safe for ESP32 3.3V limit)*

---

## 2. Local Wi-Fi & Network Configuration

> [!WARNING]
> **Do NOT use `127.0.0.1` or `localhost` on the ESP32!**
> `127.0.0.1` is the loopback address. If the ESP32 calls `http://127.0.0.1:8000`, it tries to send requests to itself rather than your computer.

### Step 1: Find your computer's LAN IP Address
Open Windows PowerShell or Command Prompt and run:
```powershell
ipconfig
```
Look for your active Wi-Fi or Ethernet adapter:
```text
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.150
```
In this example, your server LAN IP is `192.168.1.150`.

### Step 2: Configure the ESP32 Firmware
In `esp32/esp32_trinetra_firmware.ino`, update:
```cpp
const char* WIFI_SSID     = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";
const char* SERVER_BASE_URL = "http://192.168.1.150:8000";
```

### Step 3: Windows Defender Firewall Rules
Ensure Windows allows incoming connections on port 8000:
1. Open Windows PowerShell as Administrator.
2. Run:
```powershell
New-NetFirewallRule -DisplayName "Trinetra Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

## 3. Verifying Hardware Telemetry Without an ESP32

You can test the endpoints manually using `curl` or Postman:

### Test GPS Ingestion:
```bash
curl -X POST http://localhost:8000/api/location \
  -H "Content-Type: application/json" \
  -d '{"latitude": 12.9141, "longitude": 74.8560, "altitude": 18.5, "speed": 1.2, "is_simulated": false}'
```

### Test Landmine Detection Event Trigger:
```bash
curl -X POST http://localhost:8000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"device_id": "trinetra-01", "metal_detected": true, "signal_strength": 91.5, "battery_voltage": 12.35, "is_simulated": false}'
```
Open `http://localhost:8000/` and observe the live alarm banner and marker update immediately!
