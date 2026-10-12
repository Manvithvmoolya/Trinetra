from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_camera_config():
    response = client.get("/api/camera/config")
    assert response.status_code == 200
    data = response.json()
    assert "protocol" in data


def test_update_camera_config_and_sanitization():
    # URL containing basic auth credentials
    secret_url = "http://admin:topsecretpass@192.168.1.100:8080/video.mjpg"
    response = client.post("/api/camera/config", json={
        "stream_url": secret_url,
        "protocol": "mjpeg"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is True
    # Verify password was stripped from public response
    assert "topsecretpass" not in data["stream_url"]
    assert "***:***" in data["stream_url"]
    assert data["auth_configured"] is True


def test_mediamtx_endpoints():
    # Test status endpoint
    response = client.get("/api/camera/mediamtx/status")
    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert "webrtc_url" in data
    assert "hls_url" in data
    assert "8889" in data["webrtc_url"]

