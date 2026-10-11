"""
TRINETRA - Indigenous Landmine Detection System
Main FastAPI Application Entrypoint
"""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import health, status, location, sensors, camera, telemetry

# Initialize FastAPI application
app = FastAPI(
    title="TRINETRA - Indigenous Landmine Detection System",
    description="Interactive Robot Monitoring & Control Dashboard API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS for local development and ESP32 hardware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router)
app.include_router(status.router)
app.include_router(location.router)
app.include_router(sensors.router)
app.include_router(camera.router)
app.include_router(telemetry.router)

# Resolve static directory path relative to main.py
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# Ensure static directories exist
STATIC_DIR.mkdir(exist_ok=True)
(STATIC_DIR / "css").mkdir(exist_ok=True)
(STATIC_DIR / "js").mkdir(exist_ok=True)
(STATIC_DIR / "images").mkdir(exist_ok=True)

# Mount Static Files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# HTML Page Routes for clean, intuitive browser URLs
@app.get("/", include_in_schema=False)
async def serve_home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/robot", include_in_schema=False)
async def serve_robot_explorer():
    return FileResponse(STATIC_DIR / "robot.html")


@app.get("/camera", include_in_schema=False)
async def serve_camera():
    return FileResponse(STATIC_DIR / "camera.html")


@app.get("/gps", include_in_schema=False)
async def serve_gps():
    return FileResponse(STATIC_DIR / "gps.html")


@app.get("/map", include_in_schema=False)
async def serve_map():
    return FileResponse(STATIC_DIR / "gps.html")


@app.get("/sensors", include_in_schema=False)
async def serve_sensors():
    return FileResponse(STATIC_DIR / "sensors.html")


@app.get("/system", include_in_schema=False)
async def serve_system():
    return FileResponse(STATIC_DIR / "system.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
