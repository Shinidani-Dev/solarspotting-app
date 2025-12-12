"""
Demo Router - Öffentliche Demo-Seite ohne Authentifizierung

Diese Endpoints erlauben es Besuchern, das SolarSpotting System zu testen,
OHNE sich einloggen zu müssen und OHNE Daten zu speichern.

Ordnerstruktur:
- storage/demo/raw/  → Vordefinierte SDO Bilder (max. 50)

Wichtig:
- KEINE Authentifizierung erforderlich
- Patches werden NICHT gespeichert (nur im Browser-Cache)
- Annotations werden NICHT gespeichert
- Nur lesender Zugriff + Inference
"""

import base64
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.config import settings
from machine_learning.utils.processing_pipeline import ProcessingPipeline
from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.utils.mapper import to_native
from machine_learning.training.model_manager import ModelManager

router = APIRouter(
    prefix="/demo",
    tags=["demo"]
)

# ===================================================================
# Directory structure
# ===================================================================

DEMO_DIR = Path(settings.STORAGE_PATH) / "demo" / "raw"

# Create directory if not exists
DEMO_DIR.mkdir(parents=True, exist_ok=True)

# Log the path for debugging
print(f"[DEMO] Demo images directory: {DEMO_DIR.absolute()}")
print(f"[DEMO] Directory exists: {DEMO_DIR.exists()}")

# ===================================================================
# PYDANTIC MODELS
# ===================================================================

class DemoDetectRequest(BaseModel):
    """Request body for demo /detect endpoint"""
    patch_image_base64: str
    confidence_threshold: Optional[float] = 0.25


# ===================================================================
# LIST DEMO IMAGES (Öffentlich)
# ===================================================================

@router.get("/images", status_code=200)
async def list_demo_images():
    """
    Lists all available demo SDO images.
    Maximum 50 images are returned.

    NO AUTHENTICATION REQUIRED
    """
    try:
        if not DEMO_DIR.exists():
            print(f"[DEMO] Warning: Directory does not exist: {DEMO_DIR}")
            return {
                "total": 0,
                "files": [],
                "note": "Demo images directory not found",
                "path": str(DEMO_DIR)
            }

        image_files = sorted([
            f.name for f in DEMO_DIR.iterdir()
            if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png"]
        ])[:50]  # Max 50 Bilder

        print(f"[DEMO] Found {len(image_files)} demo images")

        return {
            "total": len(image_files),
            "files": image_files,
            "note": "Demo images for testing the SolarSpotting system"
        }
    except Exception as e:
        print(f"[DEMO] Error listing images: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing demo images: {str(e)}"
        )


# ===================================================================
# GET DEMO IMAGE (Öffentlich)
# ===================================================================

@router.get("/image/{filename}", status_code=200)
async def get_demo_image(filename: str):
    """
    Returns a demo SDO image.

    NO AUTHENTICATION REQUIRED
    """
    image_path = DEMO_DIR / filename

    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo image '{filename}' not found at {image_path}"
        )

    # Security check - prevent path traversal
    try:
        image_path.resolve().relative_to(DEMO_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return FileResponse(
        image_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}  # Cache for 1 hour
    )


# ===================================================================
# PROCESS DEMO IMAGE (Öffentlich, OHNE Speichern)
# ===================================================================

@router.post("/process/{filename}", status_code=200)
async def process_demo_image(filename: str):
    """
    Processes a demo SDO image through the segmentation pipeline.
    Returns patches with metadata (base64 encoded).

    WICHTIG: Patches werden NICHT gespeichert!
    Sie existieren nur im Browser-Cache des Benutzers.

    NO AUTHENTICATION REQUIRED
    """
    image_path = DEMO_DIR / filename

    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo image '{filename}' not found"
        )

    try:
        # Parse datetime from SDO filename
        dt = ImageProcessor.parse_sdo_filename(str(image_path))

        # Read image
        img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not read image: {filename}")

        # Process through pipeline
        gray = ImageProcessor.convert_to_grayscale(img)
        morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
        candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
        merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)

        # Generate global grid
        from machine_learning.utils.solar_grid_generator import SolarGridGenerator
        from machine_learning.utils.solar_reprojector import SolarReprojector

        global_grid = SolarGridGenerator.generate_global_grid_15deg(dt, cx, cy, r)

        # Generate patches
        patch_size = 512
        date_string = dt.isoformat().replace(":", "")
        patch_results = []

        for cand in merged_candidates:
            px, py = int(cand["cx"]), int(cand["cy"])

            # Rectify patch
            rectified = SolarReprojector.rectify_patch_from_solar_orientation(
                gray, px, py, patch_size, cx, cy, r, dt
            )

            # Encode to base64
            success, buffer = cv2.imencode(".jpg", rectified)
            if not success:
                continue
            b64_patch = base64.b64encode(buffer).decode("utf-8")

            # Patch coordinates
            patch_x = px - patch_size // 2
            patch_y = py - patch_size // 2

            # Patch grid
            patch_grid = SolarGridGenerator.generate_patch_grid(
                patch_x=patch_x,
                patch_y=patch_y,
                patch_size=patch_size,
                cx=cx,
                cy=cy,
                r=r,
                dt=dt,
                global_grid=global_grid
            )

            patch_filename = f"demo_{date_string}_patch_px{px}_py{py}.jpg"

            patch_results.append({
                "original_image_file": filename,
                "patch_file": patch_filename,
                "px": int(px),
                "py": int(py),
                "datetime": date_string,
                "center_x": int(cx),
                "center_y": int(cy),
                "radius": float(r),
                "grid": patch_grid,
                "image_base64": b64_patch
            })

        result = {
            "filename": filename,
            "datetime": date_string,
            "total_patches": len(patch_results),
            "sun_center": {"x": int(cx), "y": int(cy)},
            "sun_radius": float(r),
            "global_grid": global_grid,
            "patches": patch_results,
            "demo_mode": True,
            "note": "Patches are NOT saved - they exist only in your browser"
        }

        return to_native(result)

    except Exception as e:
        import traceback
        print(f"[DEMO] Error processing image: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing demo image: {str(e)}"
        )


# ===================================================================
# DETECT ON DEMO PATCH (Öffentlich, OHNE Speichern)
# ===================================================================

@router.post("/detect", status_code=200)
async def detect_on_demo_patch(request: DemoDetectRequest):
    """
    Runs the trained YOLO model on a demo patch image.

    WICHTIG:
    - Predictions werden NICHT gespeichert!
    - Nur zur Demonstration des ML-Modells

    NO AUTHENTICATION REQUIRED

    Input: Base64 encoded patch image
    Output: List of predicted bounding boxes with class and confidence
    """
    try:
        # Check if model exists
        model_path = ModelManager.get_active_model_path()

        if not model_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trained model available for demo."
            )

        # Decode base64 image
        try:
            img_bytes = base64.b64decode(request.patch_image_base64)
            np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                raise ValueError("Failed to decode image")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image: {str(e)}"
            )

        # Load YOLO model and run inference
        from ultralytics import YOLO
        model = YOLO(str(model_path))

        # Get class names from model
        class_names = model.names if hasattr(model, 'names') else {}

        # Run prediction
        results = model.predict(
            img,
            conf=request.confidence_threshold,
            verbose=False
        )

        # Parse results
        predictions = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes

            for i in range(len(boxes)):
                # Get box coordinates (xyxy format)
                xyxy = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = xyxy

                # Convert to [x, y, width, height] format
                x = float(x1)
                y = float(y1)
                w = float(x2 - x1)
                h = float(y2 - y1)

                # Get class and confidence
                cls_id = int(boxes.cls[i].cpu().numpy())
                conf = float(boxes.conf[i].cpu().numpy())

                # Map class ID to class name
                class_name = class_names.get(cls_id, f"Unknown_{cls_id}")

                predictions.append({
                    "bbox": [x, y, w, h],
                    "class": class_name,
                    "confidence": round(conf, 4)
                })

        return {
            "predictions": predictions,
            "total_detections": len(predictions),
            "demo_mode": True,
            "note": "Predictions are NOT saved - this is demo mode only"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[DEMO] Detection error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo detection error: {str(e)}"
        )


# ===================================================================
# GET MODEL INFO (Öffentlich - nur Basis-Infos)
# ===================================================================

@router.get("/model/info", status_code=200)
async def get_demo_model_info():
    """
    Returns basic information about the trained model.
    Used to show visitors that a model is available.

    NO AUTHENTICATION REQUIRED
    """
    model_path = ModelManager.get_active_model_path()

    if not model_path.exists():
        return {
            "model_available": False,
            "message": "No trained model available for demo"
        }

    return {
        "model_available": True,
        "message": "Sunspot detection model is ready for demo",
        "classes": ["A", "B", "C", "D", "E", "F", "H"],
        "description": "McIntosh Classification System for Sunspot Groups"
    }