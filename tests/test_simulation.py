from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_simulation_toggle():
    # 1. Enable simulation
    res_on = client.post("/api/simulation/toggle", json={"enabled": True})
    assert res_on.status_code == 200
    assert res_on.json()["simulation_active"] is True

    # 2. Check telemetry reflects simulation
    res_telemetry = client.get("/api/telemetry")
    assert res_telemetry.status_code == 200
    data = res_telemetry.json()
    assert data["status"]["simulation_active"] is True

    # 3. Disable simulation
    res_off = client.post("/api/simulation/toggle", json={"enabled": False})
    assert res_off.status_code == 200
    assert res_off.json()["simulation_active"] is False


def test_trigger_simulated_detection():
    res = client.post("/api/simulation/toggle", json={
        "enabled": True,
        "trigger_detection": True
    })
    assert res.status_code == 200

    # Verify detection logged
    detections = client.get("/api/detections").json()
    assert len(detections) > 0
    latest = detections[0]
    assert latest["signal_strength"] >= 90.0

    # Turn off simulation
    client.post("/api/simulation/toggle", json={"enabled": False})
