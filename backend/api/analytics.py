from fastapi import APIRouter
from backend.state import app_state

router = APIRouter()

@router.get("/metrics")
def get_metrics():
    # Return time-series metrics populated across detection events
    if len(app_state.metrics) == 0:
        return [
            { "time": "00:00", "detected": 0, "dark": 0, "high_threat": 0 }
        ]
    return app_state.metrics

@router.get("/alerts")
def get_alerts():
    # The alerts from the latest run, or all accumulated alerts (simplified format for frontend)
    alerts = []
    for i, a in enumerate(app_state.alerts):
        alerts.append({
            "id": i,
            "type": a.get("level", "MEDIUM"),
            "message": a.get("message", ""),
            "time": a.get("time_str", ""),
            "location": "Map Area", # Can extract from bbox centroid if desired
            "track": "Unknown" 
        })
    return alerts

@router.get("/detections")
def get_detections():
    return {
        "image_size": app_state.last_image_size,
        "detections": app_state.detections
    }

@router.get("/dashboard_stats")
def get_dashboard_stats():
    total_detected = len(app_state.detections)
    dark_vessels = sum(1 for d in app_state.detections if d.get("is_dark_vessel"))
    high_threat = sum(1 for d in app_state.detections if d.get("threat_level") == "HIGH")

    return {
        "total": total_detected,
        "dark": dark_vessels,
        "high_threat": high_threat,
        "system_load": "42%" # mock standard
    }
