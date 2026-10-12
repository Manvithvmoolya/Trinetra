"""
Camera Configuration and MediaMTX Gateway Endpoints
"""
from fastapi import APIRouter
from app.models import CameraConfig, CameraConfigUpdate, MediaMTXStatus
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


@router.get("/mediamtx/status", response_model=MediaMTXStatus)
def get_mediamtx_status():
    """
    Query whether MediaMTX RTSP-to-WebRTC gateway is currently active,
    including bound ports and configured path list.
    """
    return camera_service.get_mediamtx_status()


@router.post("/mediamtx/start", response_model=MediaMTXStatus)
def start_mediamtx():
    """
    Launch the local MediaMTX gateway executable in the background.
    """
    return camera_service.start_mediamtx()


@router.post("/mediamtx/stop", response_model=MediaMTXStatus)
def stop_mediamtx():
    """
    Stop the local MediaMTX gateway process.
    """
    return camera_service.stop_mediamtx()
