"""
Camera Configuration Endpoints
"""
from fastapi import APIRouter
from app.models import CameraConfig, CameraConfigUpdate
from app.services.camera import camera_service

router = APIRouter(prefix="/api/camera", tags=["Camera"])


@router.get("/config", response_model=CameraConfig)
def get_camera_config():
    """Retrieve camera connection status and sanitized stream URL without exposing credentials"""
    return camera_service.get_config()


@router.post("/config", response_model=CameraConfig)
def update_camera_config(config_update: CameraConfigUpdate):
    """
    Update target video stream URL (supports browser-compatible HTTP/MJPEG, HLS, or WebRTC).
    Credentials are encrypted/sanitized before public delivery.
    """
    return camera_service.update_config(config_update)
