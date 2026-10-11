"""
GPS Location and Map Pinning Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from app.models import GPSLocation, WaypointPin, WaypointPinCreate
from app.services.telemetry import telemetry_service

router = APIRouter(prefix="/api/location", tags=["Location"])


@router.get("", response_model=Optional[GPSLocation])
def get_current_location():
    """Retrieve the latest robot coordinates and fix telemetry"""
    loc = telemetry_service.get_current_location()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No GPS coordinates available yet"
        )
    return loc


@router.post("", response_model=GPSLocation, status_code=status.HTTP_201_CREATED)
async def post_location(location: GPSLocation):
    """
    Receive GPS coordinates from ESP32/Arduino or external navigation module.
    Automatically resets ESP32 offline timer on arrival.
    """
    return await telemetry_service.update_location(location)


@router.get("/history", response_model=List[GPSLocation])
def get_location_history():
    """Retrieve recent breadcrumb path history for map plotting"""
    return telemetry_service.get_location_history()


# --- Map Location Pinning Endpoints ---

@router.get("/pins", response_model=List[WaypointPin])
def get_pinned_locations():
    """Retrieve all user-pinned tactical locations and waypoints on the map"""
    return telemetry_service.get_pins()


@router.post("/pins", response_model=WaypointPin, status_code=status.HTTP_201_CREATED)
async def pin_location(pin: WaypointPinCreate):
    """
    Pin a custom location or current robot position on the tactical map.
    Allows annotating suspected landmine zones, waypoints, or rendezvous points.
    """
    return await telemetry_service.add_pin(pin)


@router.delete("/pins/{pin_id}")
async def delete_pinned_location(pin_id: str):
    """Delete a specific pinned location by ID"""
    success = await telemetry_service.delete_pin(pin_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pin '{pin_id}' not found"
        )
    return {"message": f"Pin {pin_id} removed successfully"}


@router.delete("/pins")
async def clear_all_pins():
    """Clear all pinned locations from the map"""
    await telemetry_service.clear_pins()
    return {"message": "All pinned locations cleared"}
