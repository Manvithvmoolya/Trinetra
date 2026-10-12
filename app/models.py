"""
Pydantic Schemas for TRINETRA Landmine Detection System
"""
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class GPSLocation(BaseModel):
    latitude: float = Field(..., description="Latitude coordinate between -90 and 90")
    longitude: float = Field(..., description="Longitude coordinate between -180 and 180")
    altitude: Optional[float] = Field(None, description="Altitude in meters")
    speed: Optional[float] = Field(None, description="Speed in km/h or m/s")
    heading: Optional[float] = Field(None, description="Heading in degrees 0-360")
    accuracy: Optional[float] = Field(None, description="Accuracy or HDOP in meters")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_simulated: bool = Field(False, description="Flag indicating if coordinate is simulated")
    source: str = Field("hardware", description="Data source: hardware, esp32, simulation, or manual")

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if v < -90.0 or v > 90.0:
            raise ValueError("Latitude must be between -90.0 and 90.0 degrees")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if v < -180.0 or v > 180.0:
            raise ValueError("Longitude must be between -180.0 and 180.0 degrees")
        return v


class WaypointPin(BaseModel):
    id: str = Field(..., description="Unique pin identifier")
    latitude: float = Field(..., description="Pinned latitude")
    longitude: float = Field(..., description="Pinned longitude")
    label: str = Field("Target Point", description="Label or note for the pinned point")
    pin_type: str = Field("waypoint", description="Type: suspected_mine, waypoint, rendezvous, obstacle")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WaypointPinCreate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    label: Optional[str] = Field("Tactical Pin", description="Name or note for pinned location")
    pin_type: Optional[str] = Field("waypoint", description="Type: suspected_mine, waypoint, rendezvous, obstacle")


class SensorData(BaseModel):
    device_id: str = Field("trinetra-01", description="Identifier of the transmitting robot unit")
    metal_detected: bool = Field(False, description="True when induction search coil registers anomaly")
    signal_strength: Optional[float] = Field(None, ge=0.0, le=100.0, description="Analog signal amplitude 0-100%")
    battery_voltage: Optional[float] = Field(None, description="Current battery voltage reading (e.g. 11.1V - 12.6V)")
    battery_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Estimated battery percentage 0-100%")
    motor_status: Optional[str] = Field("nominal", description="Motor system state: nominal, warning, idle, offline")
    motor_speed: Optional[float] = Field(None, description="Drive velocity or PWM percent")
    temperature: Optional[float] = Field(None, description="Internal MCU / electronics temperature in Celsius")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_simulated: bool = Field(False, description="Flag indicating if reading is simulated")


class DetectionEvent(BaseModel):
    id: str = Field(..., description="Unique detection event ID")
    timestamp: str = Field(..., description="ISO timestamp of detection")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    signal_strength: float = Field(..., ge=0.0, le=100.0)
    depth_estimate_cm: Optional[float] = Field(None, description="Estimated depth based on induction frequency curve")
    status: str = Field("DETECTED", description="Event state: DETECTED, CONFIRMED, CLEARED, FALSE_POSITIVE")


class CameraConfig(BaseModel):
    stream_url: Optional[str] = Field(None, description="Sanitized stream URL (credentials hidden)")
    is_active: bool = Field(False, description="Whether camera feed is actively streaming")
    protocol: str = Field("mjpeg", description="Stream format: mjpeg, hls, webrtc, rtsp_gateway")
    fps: Optional[int] = Field(30, description="Target frame rate")
    resolution: Optional[str] = Field("1280x720", description="Stream resolution")
    auth_configured: bool = Field(False, description="Whether stream authentication is active")


class CameraConfigUpdate(BaseModel):
    stream_url: Optional[str] = Field(None, description="Direct HTTP, MJPEG, or HLS stream URL")
    protocol: Optional[str] = Field("mjpeg", description="Stream protocol")


class MediaMTXStatus(BaseModel):
    running: bool = False
    pid: Optional[int] = None
    webrtc_url: str = "http://localhost:8889/trinetra_cam/"
    hls_url: str = "http://localhost:8888/trinetra_cam/"
    rtsp_url: str = "rtsp://localhost:8554/trinetra_cam"
    api_url: str = "http://localhost:9997"
    paths: list = []
    message: Optional[str] = None


class SystemStatus(BaseModel):
    backend_online: bool = True
    esp32_connected: bool = False
    last_heartbeat: Optional[str] = None
    seconds_since_heartbeat: Optional[float] = None
    simulation_active: bool = False
    uptime_seconds: float = 0.0
    total_detections: int = 0
    server_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SimulationToggle(BaseModel):
    enabled: bool = Field(..., description="Enable or disable autonomous simulation")
    mode: Optional[str] = Field("patrol", description="Simulation mode: patrol, stationary, minefield")
    trigger_detection: Optional[bool] = Field(False, description="Force a landmine detection event immediately")
