"""
Health check endpoints
"""
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
def get_health():
    """Returns backend operational status and current timestamp"""
    return {
        "status": "healthy",
        "service": "TRINETRA Mission Control Backend",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
