import os
import time
import cv2
import numpy as np
import base64
import sys
import traceback
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.pipeline import SARPipeline

router = APIRouter()

# The pipeline is initialized globally so the model is loaded once on startup
pipeline = SARPipeline()


@router.post("/detect")
async def detect_ships(
    file: UploadFile = File(...),
    confidence: float = Form(0.25)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file format")

        # Dynamically override the detector confidence threshold from the slider
        pipeline.detector.confidence = confidence

        # Reset all tracking / analytics state so each upload is treated as a fresh image
        pipeline.reset()

        # Also reset YOLO's internal tracker state to avoid ghost tracks
        # by using detect() instead of detect_with_tracking() for single images
        # We'll temporarily monkey-patch the detector method
        original_detect = pipeline.detector.detect_with_tracking

        def single_image_detect(img, **kwargs):
            """Use plain detect() for single-image mode (no tracker persistence)."""
            return pipeline.detector.detect(img, confidence=confidence)

        pipeline.detector.detect_with_tracking = single_image_detect

        try:
            result = pipeline.process_frame(image, apply_filter=False)
        finally:
            # Restore original method
            pipeline.detector.detect_with_tracking = original_detect

        # Convert detections to a JSON-serializable format
        detections = []
        for d in result.get("detections", []):
            detections.append({
                "track_id": d.get("track_id", -1),
                "bbox": [float(x) for x in d.get("bbox", [0, 0, 0, 0])],
                "confidence": float(d.get("confidence", 0)),
                "threat_score": float(d.get("threat_score", 0)),
                "threat_level": d.get("threat_level", "LOW"),
                "is_dark_vessel": d.get("is_dark_vessel", False),
                "ship_type": d.get("ship_type", "Unknown")
            })

        height, width = image.shape[:2]

        alerts_list = [
            {
                "level": a.get("alert_level"),
                "message": a.get("message"),
                "time_str": a.get("time_str")
            }
            for a in result.get("alert_log", [])
        ]

        fleets_list = []
        for f in result.get("fleets", []):
            try:
                fleets_list.append({
                    "fleet_id": f.fleet_id,
                    "num_ships": f.num_ships,
                    "radius": float(f.radius),
                    "centroid": [float(f.centroid[0]), float(f.centroid[1])],
                    "ship_track_ids": f.ship_track_ids
                })
            except Exception:
                pass

        # Save to global state for Dashboard/Analytics/Map pages
        from backend.state import app_state
        app_state.last_image_size = {"width": width, "height": height}
        app_state.add_detection_run(detections, alerts_list, fleets_list)

        # Encode the rendered image (with bounding boxes drawn by OpenCV) to base64
        # OpenCV imencode handles BGR internally for JPEG output correctly
        rendered = result.get("rendered_image")
        rendered_b64 = None
        if rendered is not None:
            _, buffer = cv2.imencode('.jpg', rendered, [cv2.IMWRITE_JPEG_QUALITY, 92])
            rendered_b64 = base64.b64encode(buffer).decode('utf-8')

        return JSONResponse({
            "status": "success",
            "image_size": {"width": width, "height": height},
            "num_detections": len(detections),
            "detections": detections,
            "alerts": alerts_list,
            "fleets": fleets_list,
            "rendered_image_b64": rendered_b64
        })
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
