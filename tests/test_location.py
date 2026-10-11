from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_current_location():
    response = client.get("/api/location")
    assert response.status_code == 200
    data = response.json()
    assert "latitude" in data
    assert "longitude" in data


def test_post_valid_location():
    payload = {
        "latitude": 13.0012,
        "longitude": 74.9045,
        "altitude": 22.0,
        "speed": 1.5,
        "heading": 120.0,
        "accuracy": 0.8,
        "is_simulated": False,
        "source": "esp32"
    }
    response = client.post("/api/location", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["latitude"] == 13.0012
    assert data["longitude"] == 74.9045

    # Verify updated
    get_res = client.get("/api/location")
    assert get_res.json()["latitude"] == 13.0012


def test_post_invalid_latitude():
    payload = {
        "latitude": 95.5,  # Invalid: out of -90 to 90 range
        "longitude": 74.9045
    }
    response = client.post("/api/location", json=payload)
    assert response.status_code == 422


def test_post_invalid_longitude():
    payload = {
        "latitude": 12.5,
        "longitude": 195.0  # Invalid: out of -180 to 180 range
    }
    response = client.post("/api/location", json=payload)
    assert response.status_code == 422


def test_pinned_locations_lifecycle():
    # 1. Add pin
    pin_payload = {
        "latitude": 12.9150,
        "longitude": 74.8570,
        "label": "Suspected Landmine Alpha",
        "pin_type": "suspected_mine"
    }
    res_add = client.post("/api/location/pins", json=pin_payload)
    assert res_add.status_code == 201
    created_pin = res_add.json()
    assert "id" in created_pin
    assert created_pin["label"] == "Suspected Landmine Alpha"

    # 2. Retrieve pins
    res_list = client.get("/api/location/pins")
    assert res_list.status_code == 200
    pins = res_list.json()
    assert any(p["id"] == created_pin["id"] for p in pins)

    # 3. Delete pin
    res_del = client.delete(f"/api/location/pins/{created_pin['id']}")
    assert res_del.status_code == 200

    # 4. Confirm deleted
    res_list_after = client.get("/api/location/pins")
    assert not any(p["id"] == created_pin["id"] for p in res_list_after.json())
