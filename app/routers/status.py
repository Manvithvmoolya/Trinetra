"""
System Status and Simulation Control endpoints
"""
from fastapi import APIRouter
from app.models import SystemStatus, SimulationToggle
from app.services.telemetry import telemetry_service

router = APIRouter(prefix="/api", tags=["Status"])


@router.get("/status", response_model=SystemStatus)
def get_system_status():
    """Returns overall server status, ESP32 device connectivity, and telemetry metrics"""
    return telemetry_service.get_system_status()


@router.post("/simulation/toggle", response_model=SystemStatus)
async def toggle_simulation(toggle: SimulationToggle):
    """Enable or disable safe autonomous patrol simulation mode or trigger test detection"""
    return await telemetry_service.set_simulation(toggle)
