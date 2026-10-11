"""
Sensor Telemetry and Landmine Detection Endpoints
"""
from typing import List
from fastapi import APIRouter, status
from app.models import SensorData, DetectionEvent
from app.services.telemetry import telemetry_service

router = APIRouter(prefix="/api", tags=["Sensors & Detections"])


@router.get("/sensors", response_model=SensorData)
def get_sensor_data():
    """Retrieve the latest sensor telemetry readings (metal detector, battery, motor, temp)"""
    return telemetry_service.get_current_sensors()


@router.post("/sensors", response_model=SensorData, status_code=status.HTTP_201_CREATED)
async def post_sensor_data(sensors: SensorData):
    """
    Ingest sensor telemetry from ESP32 microcontroller over Wi-Fi.
    If metal_detected is True, automatically records a georeferenced landmine detection event.
    """
    return await telemetry_service.update_sensors(sensors)


@router.get("/detections", response_model=List[DetectionEvent])
def get_detections():
    """Retrieve history of landmine detection events with signal strengths and GPS coordinates"""
    return telemetry_service.get_detection_events()
