"""
Telemetry and State Management Service for TRINETRA
Provides thread-safe in-memory storage, device heartbeat monitoring,
safe simulation generation, and WebSocket broadcast functionality.
"""
import time
import math
import uuid
import asyncio
from typing import Optional, List, Set, Dict, Any
from datetime import datetime, timezone
from fastapi import WebSocket

from app.models import (
    GPSLocation,
    WaypointPin,
    WaypointPinCreate,
    SensorData,
    DetectionEvent,
    SystemStatus,
    SimulationToggle
)


class TelemetryService:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._start_time = time.time()
        self._last_heartbeat: Optional[float] = None
        self._heartbeat_timeout = 10.0  # seconds before ESP32 is considered offline

        # In-memory telemetry state
        self._current_location: Optional[GPSLocation] = GPSLocation(
            latitude=12.9141,
            longitude=74.8560,
            altitude=18.5,
            speed=0.0,
            heading=45.0,
            accuracy=1.2,
            is_simulated=True,
            source="demo_initial",
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        self._location_history: List[GPSLocation] = [self._current_location]
        
        self._current_sensors: SensorData = SensorData(
            device_id="trinetra-01",
            metal_detected=False,
            signal_strength=4.2,
            battery_voltage=12.4,
            battery_percentage=88.0,
            motor_status="nominal",
            motor_speed=0.0,
            temperature=32.4,
            is_simulated=True,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        self._detection_events: List[DetectionEvent] = [
            DetectionEvent(
                id="DET-INIT-001",
                timestamp=datetime.now(timezone.utc).isoformat(),
                latitude=12.91415,
                longitude=74.85608,
                signal_strength=82.5,
                depth_estimate_cm=8.5,
                status="CONFIRMED"
            )
        ]

        # Pinned tactical locations on map
        self._pinned_locations: List[WaypointPin] = []

        # Simulation state
        self._simulation_active: bool = False
        self._simulation_task: Optional[asyncio.Task] = None
        self._sim_step: int = 0
        self._sim_base_lat: float = 12.9141
        self._sim_base_lon: float = 74.8560
        self._sim_battery: float = 12.5

        # Active WebSockets
        self._active_connections: Set[WebSocket] = set()

    # --- Heartbeat & Connection Status ---

    def register_heartbeat(self):
        self._last_heartbeat = time.time()

    def is_esp32_connected(self) -> bool:
        if self._last_heartbeat is None:
            return False
        return (time.time() - self._last_heartbeat) < self._heartbeat_timeout

    def get_system_status(self) -> SystemStatus:
        now = time.time()
        connected = self.is_esp32_connected()
        last_hb_iso = None
        seconds_ago = None
        
        if self._last_heartbeat:
            last_hb_iso = datetime.fromtimestamp(self._last_heartbeat, timezone.utc).isoformat()
            seconds_ago = round(now - self._last_heartbeat, 1)

        return SystemStatus(
            backend_online=True,
            esp32_connected=connected,
            last_heartbeat=last_hb_iso,
            seconds_since_heartbeat=seconds_ago,
            simulation_active=self._simulation_active,
            uptime_seconds=round(now - self._start_time, 1),
            total_detections=len(self._detection_events)
        )

    # --- Location Management ---

    async def update_location(self, loc: GPSLocation) -> GPSLocation:
        async with self._lock:
            # If incoming is from hardware, record real heartbeat
            if not loc.is_simulated:
                self.register_heartbeat()
            self._current_location = loc
            self._location_history.append(loc)
            if len(self._location_history) > 300:
                self._location_history.pop(0)

        await self.broadcast_telemetry()
        return loc

    def get_current_location(self) -> Optional[GPSLocation]:
        return self._current_location

    def get_location_history(self) -> List[GPSLocation]:
        return self._location_history

    # --- Pinned Waypoint Locations ---

    async def add_pin(self, pin_in: WaypointPinCreate) -> WaypointPin:
        async with self._lock:
            pin = WaypointPin(
                id=f"PIN-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}",
                latitude=pin_in.latitude,
                longitude=pin_in.longitude,
                label=pin_in.label or "Tactical Waypoint",
                pin_type=pin_in.pin_type or "waypoint",
                created_at=datetime.now(timezone.utc).isoformat()
            )
            self._pinned_locations.append(pin)
        await self.broadcast_telemetry()
        return pin

    def get_pins(self) -> List[WaypointPin]:
        return self._pinned_locations

    async def delete_pin(self, pin_id: str) -> bool:
        async with self._lock:
            initial_len = len(self._pinned_locations)
            self._pinned_locations = [p for p in self._pinned_locations if p.id != pin_id]
            removed = len(self._pinned_locations) < initial_len
        if removed:
            await self.broadcast_telemetry()
        return removed

    async def clear_pins(self):
        async with self._lock:
            self._pinned_locations.clear()
        await self.broadcast_telemetry()

    # --- Sensor Telemetry Management ---

    async def update_sensors(self, sensors: SensorData) -> SensorData:
        async with self._lock:
            if not sensors.is_simulated:
                self.register_heartbeat()
            self._current_sensors = sensors

            # If metal anomaly detected, log detection event
            if sensors.metal_detected:
                lat = self._current_location.latitude if self._current_location else None
                lon = self._current_location.longitude if self._current_location else None
                event = DetectionEvent(
                    id=f"DET-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}",
                    timestamp=sensors.timestamp or datetime.now(timezone.utc).isoformat(),
                    latitude=lat,
                    longitude=lon,
                    signal_strength=sensors.signal_strength if sensors.signal_strength is not None else 85.0,
                    depth_estimate_cm=round(6.0 + (100.0 - (sensors.signal_strength or 70.0)) * 0.15, 1),
                    status="DETECTED"
                )
                self._detection_events.insert(0, event)
                if len(self._detection_events) > 100:
                    self._detection_events.pop()

        await self.broadcast_telemetry()
        return sensors

    def get_current_sensors(self) -> SensorData:
        return self._current_sensors

    def get_detection_events(self) -> List[DetectionEvent]:
        return self._detection_events

    # --- Full Telemetry Snapshot ---

    def get_full_telemetry(self) -> Dict[str, Any]:
        return {
            "status": self.get_system_status().model_dump(),
            "location": self._current_location.model_dump() if self._current_location else None,
            "sensors": self._current_sensors.model_dump(),
            "recent_detections": [d.model_dump() for d in self._detection_events[:5]],
            "pins": [p.model_dump() for p in self._pinned_locations],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    # --- WebSocket Broadcasting ---

    async def register_client(self, websocket: WebSocket):
        await websocket.accept()
        self._active_connections.add(websocket)
        # Immediately send current state
        try:
            await websocket.send_json(self.get_full_telemetry())
        except Exception:
            pass

    def unregister_client(self, websocket: WebSocket):
        self._active_connections.discard(websocket)

    async def broadcast_telemetry(self):
        if not self._active_connections:
            return
        payload = self.get_full_telemetry()
        stale = set()
        for ws in self._active_connections:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.add(ws)
        for dead_ws in stale:
            self._active_connections.discard(dead_ws)

    # --- Safe Simulation Engine ---

    async def set_simulation(self, toggle: SimulationToggle):
        self._simulation_active = toggle.enabled
        if self._simulation_active:
            if self._simulation_task is None or self._simulation_task.done():
                self._simulation_task = asyncio.create_task(self._run_simulation_loop())
        else:
            if self._simulation_task and not self._simulation_task.done():
                self._simulation_task.cancel()
                self._simulation_task = None

        if toggle.trigger_detection:
            await self._trigger_simulated_detection()

        await self.broadcast_telemetry()
        return self.get_system_status()

    async def _trigger_simulated_detection(self):
        async with self._lock:
            # Inject a high signal burst
            curr = self._current_sensors.model_copy()
            curr.metal_detected = True
            curr.signal_strength = 92.4
            curr.is_simulated = True
            curr.timestamp = datetime.now(timezone.utc).isoformat()
            self._current_sensors = curr

            lat = self._current_location.latitude if self._current_location else 12.9141
            lon = self._current_location.longitude if self._current_location else 74.8560
            event = DetectionEvent(
                id=f"SIM-DET-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}",
                timestamp=curr.timestamp,
                latitude=lat,
                longitude=lon,
                signal_strength=92.4,
                depth_estimate_cm=5.2,
                status="DETECTED"
            )
            self._detection_events.insert(0, event)

    async def _run_simulation_loop(self):
        """Generates realistic autonomous patrol movements and telemetry"""
        try:
            while self._simulation_active:
                await asyncio.sleep(1.0)
                self._sim_step += 1
                
                # Parametric patrol loop path (Lissajous curve around base point)
                t = self._sim_step * 0.05
                delta_lat = 0.00035 * math.sin(t)
                delta_lon = 0.00050 * math.cos(t * 0.7)
                
                # Calculate heading from velocity
                d_lat = 0.00035 * 0.05 * math.cos(t)
                d_lon = -0.00050 * 0.035 * math.sin(t * 0.7)
                heading = (math.degrees(math.atan2(d_lon, d_lat)) + 360) % 360

                sim_loc = GPSLocation(
                    latitude=round(self._sim_base_lat + delta_lat, 6),
                    longitude=round(self._sim_base_lon + delta_lon, 6),
                    altitude=round(18.5 + 0.8 * math.sin(t * 0.3), 1),
                    speed=round(1.2 + 0.3 * math.sin(t * 1.5), 1),
                    heading=round(heading, 1),
                    accuracy=0.8,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    is_simulated=True,
                    source="autonomous_simulation"
                )

                # Slow realistic battery discharge
                self._sim_battery = max(10.8, self._sim_battery - 0.0008)
                batt_pct = round(((self._sim_battery - 10.5) / 2.1) * 100, 1)
                batt_pct = min(100.0, max(0.0, batt_pct))

                # Occasional metal anomaly spike every 25 seconds
                is_anomaly = (self._sim_step % 25 == 0)
                sig_strength = round(88.5 + 7.0 * math.sin(t), 1) if is_anomaly else round(3.5 + 2.0 * math.sin(t * 2), 1)

                sim_sensors = SensorData(
                    device_id="trinetra-01",
                    metal_detected=is_anomaly,
                    signal_strength=sig_strength,
                    battery_voltage=round(self._sim_battery, 2),
                    battery_percentage=batt_pct,
                    motor_status="nominal",
                    motor_speed=1.2,
                    temperature=round(34.2 + 1.5 * math.sin(t * 0.1), 1),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    is_simulated=True
                )

                await self.update_location(sim_loc)
                await self.update_sensors(sim_sensors)

        except asyncio.CancelledError:
            pass


# Singleton instance
telemetry_service = TelemetryService()
