"""
Demo Router - Öffentliche Demo-Seite ohne Authentifizierung
"""

import base64
import io
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.config import settings
from machine_learning.utils.processing_pipeline import ProcessingPipeline
from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.utils.mapper import to_native
from machine_learning.training.model_manager import ModelManager

router = APIRouter(prefix="/demo", tags=["demo"])

# ===================================================================
# Directory structure
# ===================================================================

DEMO_DIR = Path(settings.STORAGE_PATH) / "demo" / "raw"
DEMO_DIR.mkdir(parents=True, exist_ok=True)

print(f"[DEMO] Demo images directory: {DEMO_DIR.absolute()}")

# ===================================================================
# PYDANTIC MODELS
# ===================================================================

class DemoDetectRequest(BaseModel):
    patch_image_base64: str
    confidence_threshold: Optional[float] = 0.25

# ===================================================================
# LIST DEMO IMAGES
# ===================================================================

@router.get("/images", status_code=200)
async def list_demo_images():
    try:
        files = sorted([
            f.name for f in DEMO_DIR.iterdir()
            if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png"}
        ])[:50]

        return {
            "total": len(files),
            "files": files,
            "demo_mode": True
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing demo images: {str(e)}"
        )

# ===================================================================
# GET DEMO IMAGE
# ===================================================================

@router.get("/image/{filename}", status_code=200)
async def get_demo_image(filename: str):
    image_path = DEMO_DIR / filename

    if not image_path.exists():
        raise HTTPException(404, "Demo image not found")

    return FileResponse(image_path, media_type="image/jpeg")

# ===================================================================
# PROCESS DEMO IMAGE
# ===================================================================

@router.post("/process/{filename}", status_code=200)
async def process_demo_image(filename: str):
    image_path = DEMO_DIR / filename
    if not image_path.exists():
        raise HTTPException(404, "Demo image not found")

    try:
        dt = ImageProcessor.parse_sdo_filename(str(image_path))
        img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)

        gray = ImageProcessor.convert_to_grayscale(img)
        morphed, disk_mask, cx, cy, r = (
            ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
        )

        candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
        merged = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)

        from machine_learning.utils.solar_grid_generator import SolarGridGenerator
        from machine_learning.utils.solar_reprojector import SolarReprojector

        global_grid = SolarGridGenerator.generate_global_grid_15deg(dt, cx, cy, r)

        patches = []
        patch_size = 512

        for c in merged:
            px, py = int(c["cx"]), int(c["cy"])

            patch = SolarReprojector.rectify_patch_from_solar_orientation(
                gray, px, py, patch_size, cx, cy, r, dt
            )

            ok, buf = cv2.imencode(".jpg", patch)
            if not ok:
                continue

            patches.append({
                "px": px,
                "py": py,
                "image_base64": base64.b64encode(buf).decode(),
            })

        return to_native({
            "filename": filename,
            "total_patches": len(patches),
            "patches": patches,
            "demo_mode": True
        })

    except Exception as e:
        raise HTTPException(500, f"Error processing demo image: {str(e)}")

# ===================================================================
# DETECT ON DEMO PATCH  ✅ FIXED
# ===================================================================

@router.post("/detect", status_code=200)
async def detect_on_demo_patch(request: DemoDetectRequest):
    try:
        model_path = ModelManager.get_active_model_path()
        if not model_path.exists():
            raise HTTPException(404, "No trained model available")

        # -------------------------------
        # 🔥 PIL → NumPy (EXPLIZIT & STABIL)
        # -------------------------------
        img_bytes = base64.b64decode(request.patch_image_base64)

        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        img_np = np.array(pil_img, dtype=np.uint8)
        img_np = np.ascontiguousarray(img_np)

        import torch
        from ultralytics import YOLO

        img_tensor = torch.from_numpy(img_np)
        img_tensor = img_tensor.permute(2, 0, 1).float() / 255.0
        img_tensor = img_tensor.unsqueeze(0)

        model = YOLO(str(model_path))

        results = model.predict(
            source=img_tensor,
            conf=request.confidence_threshold,
            verbose=False
        )

        preds = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            names = model.names

            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].cpu().tolist()
                preds.append({
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                    "class": names[int(boxes.cls[i])],
                    "confidence": round(float(boxes.conf[i]), 4)
                })

        return {
            "predictions": preds,
            "total_detections": len(preds),
            "demo_mode": True
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Demo detection error: {str(e)}"
        )

# ===================================================================
# MODEL INFO
# ===================================================================

@router.get("/model/info", status_code=200)
async def get_demo_model_info():
    model_path = ModelManager.get_active_model_path()

    return {
        "model_available": model_path.exists(),
        "classes": ["A", "B", "C", "D", "E", "F", "H"],
        "description": "McIntosh Sunspot Classification",
    }
