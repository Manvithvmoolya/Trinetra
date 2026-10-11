"""
Camera Configuration and Management Service for TRINETRA
Handles stream endpoint registration and sanitizes credentials to prevent leaks.
"""
import re
from typing import Optional
from app.models import CameraConfig, CameraConfigUpdate


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


# Singleton instance
camera_service = CameraService()
