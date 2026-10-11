# TRINETRA — Indigenous Landmine Detection System
### Interactive Robot Monitoring & Control Dashboard

TRINETRA is a mission-critical robotics web application and FastAPI backend engineered for an autonomous landmine detection ground rover. It delivers real-time 3D telemetry visualization, interactive component disassembly (exploded view), tactical GPS tracking with waypoint pinning, pulse induction metal detection alarms, camera feed integration, and ESP32 hardware Wi-Fi telemetry uplink.

---

## Key Features

1. **Procedural 3D Robot Explorer (Three.js & OrbitControls)**:
   - Faithful 3D reconstruction matching the physical Trinetra robot reference: 4 knobby off-road wheels with vibrant yellow 5-spoke rims, dark chassis rails, front camera with 8-LED ring, raised GNSS mast, and front 8-spoke circular induction search loop.
   - Smooth mouse/touch rotation, pan, zoom, auto-rotation, view reset, and floodlight toggling.
2. **GSAP Exploded-View Disassembly**:
   - Disassembles the robot into its 5 operational sub-modules with animated 3D HUD labels.
   - Interactive part isolation and inspector card with direct routing to dedicated module pages.
3. **Tactical GPS Live Map & Location Pinning (Leaflet & OSM)**:
   - Real-time robot marker with rotating heading indicator and breadcrumb trail.
   - **Interactive Location Pinning**: Click "Pin Current Location" or activate "Drop Pin Mode" to bookmark suspected landmines, waypoints, or rendezvous points.
   - Waypoints drawer to inspect, center on, delete, and export pins as JSON.
   - Real GPS vs. Simulated Coordinates indicator.
4. **Pulse Induction Metal Detector Console**:
   - Continuous 0-100% signal strength meter.
   - Audio/Visual alert banner for high-confidence mine anomalies.
   - Historical detection event table with GPS coordinates and depth estimation.
5. **Optical Video Stream**:
   - Stream connection states (Standby, Connecting, Active, Error).
   - Sanitized credentials security (credentials never leaked in public API responses).
   - RTSP-to-Web gateway setup guide for V380 Pro and IP cameras using MediaMTX.
6. **FastAPI Backend & ESP32 Hardware Integration**:
   - In-memory thread-safe state store with 10s hardware heartbeat monitoring.
   - High-frequency WebSocket telemetry broadcast (`/ws/telemetry`).
   - Autonomous patrol simulation engine for safe testing without physical hardware.
   - Complete Arduino C++ sketch in `esp32/esp32_trinetra_firmware.ino`.

---

## Project Structure

```
trinetra-backend/
├── main.py                          # FastAPI server & route dispatcher
├── requirements.txt                 # Dependencies: fastapi, uvicorn, pydantic, websockets, pytest, httpx
├── .env.example                     # Environment configuration template
├── README.md                        # Documentation
├── HARDWARE_SETUP.md                # ESP32 wiring and LAN configuration guide
├── esp32/
│   └── esp32_trinetra_firmware.ino  # Ready-to-flash Arduino C++ firmware
├── app/
│   ├── models.py                    # Pydantic validation schemas
│   ├── services/
│   │   ├── telemetry.py             # State store, heartbeat monitor, simulation, WebSockets
│   │   └── camera.py                # Camera configuration & credential sanitization
│   └── routers/
│       ├── health.py                # GET /api/health
│       ├── status.py                # GET /api/status, POST /api/simulation/toggle
│       ├── location.py              # GET/POST /api/location, Map Pinning endpoints
│       ├── sensors.py               # GET/POST /api/sensors, GET /api/detections
│       ├── camera.py                # GET/POST /api/camera/config
│       └── telemetry.py             # GET /api/telemetry, WS /ws/telemetry
├── static/
│   ├── index.html                   # Cockpit Mission Dashboard
│   ├── robot.html                   # 3D Robot Explorer & Exploded View
│   ├── camera.html                  # Optical Stream Viewer
│   ├── gps.html                     # Tactical Map & Location Pinning
│   ├── sensors.html                 # Induction Detector Console
│   ├── system.html                  # Diagnostics & Hardware Link
│   ├── css/styles.css               # Dark cyber-robotics styling system
│   ├── js/                          # Modular JavaScript controllers
│   └── images/trinetra-robot.png    # Official prototype reference image
└── tests/                           # Pytest unit tests (14 passing tests)
```

---

## Quick Start Guide

### 1. Requirements
- Python 3.10+ (tested on Python 3.14)
- Modern web browser (Chrome, Edge, Firefox)

### 2. Install Dependencies
In Windows PowerShell, Command Prompt, or VS Code terminal:
```powershell
cd C:\Users\Acer\.gemini\antigravity\scratch\trinetra-backend
pip install -r requirements.txt
```

### 3. Start the Mission Control Server
Run Uvicorn server:
```powershell
python main.py
```
*(Or alternatively: `uvicorn main.py:app --host 0.0.0.0 --port 8000 --reload`)*

### 4. Open the Web Dashboard
Open your browser to:
- **Cockpit Dashboard**: [http://localhost:8000/](http://localhost:8000/)
- **3D Robot Explorer**: [http://localhost:8000/robot](http://localhost:8000/robot)
- **Optical Stream**: [http://localhost:8000/camera](http://localhost:8000/camera)
- **Tactical GPS Map**: [http://localhost:8000/gps](http://localhost:8000/gps)
- **Metal Detector**: [http://localhost:8000/sensors](http://localhost:8000/sensors)
- **System Diagnostics**: [http://localhost:8000/system](http://localhost:8000/system)
- **Interactive API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## Testing

Run the automated backend test suite:
```powershell
pytest -v tests/
```
All 14 tests will execute, validating health endpoints, GPS coordinates, latitude/longitude bounds checking (-90 to 90, -180 to 180), location pinning lifecycle, sensor telemetry ingestion, mine detection logging, camera credential sanitization, and demo simulation toggling.

---

## Hardware Connection
Refer to [HARDWARE_SETUP.md](HARDWARE_SETUP.md) for pinouts, voltage divider formulas, and LAN IP instructions for the ESP32.
