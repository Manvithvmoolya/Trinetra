from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_sensor_data():
    response = client.get("/api/sensors")
    assert response.status_code == 200
    data = response.json()
    assert "device_id" in data
    assert "metal_detected" in data


def test_post_sensor_telemetry():
    payload = {
        "device_id": "trinetra-01",
        "metal_detected": False,
        "signal_strength": 8.5,
        "battery_voltage": 12.35,
        "battery_percentage": 87.0,
        "motor_status": "nominal",
        "is_simulated": False
    }
    response = client.post("/api/sensors", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["battery_voltage"] == 12.35
    assert data["signal_strength"] == 8.5


def test_detection_event_logging():
    # Post sensor data with metal_detected = True
    payload = {
        "device_id": "trinetra-01",
        "metal_detected": True,
        "signal_strength": 94.2,
        "battery_voltage": 12.2,
        "is_simulated": False
    }
    res_post = client.post("/api/sensors", json=payload)
    assert res_post.status_code == 201

    # Check detection log
    res_log = client.get("/api/detections")
    assert res_log.status_code == 200
    events = res_log.json()
    assert len(events) > 0
    latest = events[0]
    assert latest["signal_strength"] == 94.2
    assert latest["status"] == "DETECTED"
