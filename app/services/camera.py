"""
Camera Configuration and Management Service for TRINETRA
Handles stream endpoint registration, sanitizes credentials,
and provides native control and health monitoring for the MediaMTX RTSP gateway.
"""
import os
import re
import json
import time
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.models import CameraConfig, CameraConfigUpdate, MediaMTXStatus


class CameraService:
    def __init__(self):
        # Default camera state (unconfigured by default so placeholder displays honestly)
        self._config: CameraConfig = CameraConfig(
            stream_url=None,
            is_active=False,
            protocol="mjpeg",
            fps=30,
            resolution="1280x720",
            auth_configured=False
        )
        self._raw_stream_url: Optional[str] = None
        self._mediamtx_proc: Optional[subprocess.Popen] = None
        self._base_dir = Path(__file__).resolve().parent.parent.parent
        self._mediamtx_dir = self._base_dir / "mediamtx"

    def sanitize_url(self, url: Optional[str]) -> Optional[str]:
        """Removes username:password credentials from URL string for public display"""
        if not url:
            return None
        # Replace http://user:pass@host:port/ with http://***:***@host:port/
        sanitized = re.sub(r'://([^:]+):([^@]+)@', r'://***:***@', url)
        return sanitized

    def get_config(self) -> CameraConfig:
        return self._config

    def update_config(self, update: CameraConfigUpdate) -> CameraConfig:
        if update.stream_url is not None:
            url_str = update.stream_url.strip()
            if url_str == "":
                self._raw_stream_url = None
                self._config.stream_url = None
                self._config.is_active = False
                self._config.auth_configured = False
            else:
                self._raw_stream_url = url_str
                has_auth = "@" in url_str
                # Keep sanitized version in public response
                self._config.stream_url = self.sanitize_url(url_str)
                self._config.is_active = True
                self._config.auth_configured = has_auth

        if update.protocol:
            self._config.protocol = update.protocol

        return self._config

    def get_stream_target(self) -> Optional[str]:
        """Returns the actual operational stream URL for video player or proxy"""
        return self._raw_stream_url

    # =========================================================================
    # MediaMTX Gateway Subsystem Controls & Telemetry
    # =========================================================================

    def get_mediamtx_status(self) -> MediaMTXStatus:
        """
        Polls the MediaMTX control API at http://localhost:9997/v3/paths/list
        to verify if the RTSP-to-Web gateway is actively listening and streaming.
        """
        status = MediaMTXStatus(
            running=False,
            pid=self._mediamtx_proc.pid if (self._mediamtx_proc and self._mediamtx_proc.poll() is None) else None,
            webrtc_url="http://localhost:8889/trinetra_cam/",
            hls_url="http://localhost:8888/trinetra_cam/",
            rtsp_url="rtsp://localhost:8554/trinetra_cam",
            api_url="http://localhost:9997",
            paths=[],
            message="MediaMTX gateway is offline"
        )

        try:
            req = urllib.request.Request("http://localhost:9997/v3/paths/list", headers={"User-Agent": "TRINETRA-Backend"})
            with urllib.request.urlopen(req, timeout=0.8) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    items = data.get("items", [])
                    paths_info = []
                    for item in items:
                        paths_info.append({
                            "name": item.get("name"),
                            "ready": item.get("ready", False),
                            "readers": len(item.get("readers", [])) if item.get("readers") else 0,
                            "tracks": len(item.get("tracks", [])) if item.get("tracks") else 0
                        })
                    status.running = True
                    status.paths = paths_info
                    status.message = f"MediaMTX online with {len(paths_info)} configured path(s)"
        except Exception:
            # Check if process is running even if API has not responded yet
            if self._mediamtx_proc and self._mediamtx_proc.poll() is None:
                status.running = True
                status.message = "MediaMTX process initializing..."

        return status

    def start_mediamtx(self) -> MediaMTXStatus:
        """Starts the MediaMTX executable in the background if not already active"""
        current = self.get_mediamtx_status()
        if current.running:
            current.message = "MediaMTX gateway is already running"
            return current

        exe_path = self._mediamtx_dir / "mediamtx.exe"
        cfg_path = self._mediamtx_dir / "mediamtx.yml"

        if not exe_path.exists():
            return MediaMTXStatus(
                running=False,
                message=f"Executable not found at {exe_path}"
            )

        try:
            self._mediamtx_proc = subprocess.Popen(
                [str(exe_path), str(cfg_path)],
                cwd=str(self._mediamtx_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            # Give process a moment to bind ports
            time.sleep(1.0)
            status = self.get_mediamtx_status()
            status.message = "MediaMTX gateway started successfully"
            return status
        except Exception as e:
            return MediaMTXStatus(
                running=False,
                message=f"Failed to start MediaMTX: {str(e)}"
            )

    def stop_mediamtx(self) -> MediaMTXStatus:
        """Terminates the running MediaMTX subprocess"""
        if self._mediamtx_proc and self._mediamtx_proc.poll() is None:
            try:
                self._mediamtx_proc.terminate()
                self._mediamtx_proc.wait(timeout=2)
            except Exception:
                self._mediamtx_proc.kill()
            self._mediamtx_proc = None

        status = self.get_mediamtx_status()
        status.message = "MediaMTX gateway stopped"
        return status


# Singleton instance
camera_service = CameraService()
