"""
Combined Telemetry and WebSocket Live Streaming Endpoints
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.telemetry import telemetry_service

router = APIRouter(tags=["Telemetry"])


@router.get("/api/telemetry")
def get_combined_telemetry():
    """Retrieve full combined mission control snapshot (status, location, sensors, detections, pins)"""
    return telemetry_service.get_full_telemetry()


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming to dashboard interfaces.
    Broadcasts at high frequency whenever new sensor, GPS, or simulation data arrives.
    """
    await telemetry_service.register_client(websocket)
    try:
        while True:
            # Keep alive and receive incoming client commands if any
            data = await websocket.receive_text()
            # If client sends ping, respond with pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        telemetry_service.unregister_client(websocket)
    except Exception:
        telemetry_service.unregister_client(websocket)
