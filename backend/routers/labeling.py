import base64
import json
import shutil
import zipfile
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
import yaml
from fastapi import APIRouter, HTTPException, status, Form, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.config import settings
from backend.core.dependencies import CURRENT_ACTIVE_USER
from machine_learning.utils.processing_pipeline import ProcessingPipeline
from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.utils.mapper import to_native
from machine_learning.training.trainer import TrainingPipeline
from machine_learning.training.config import TrainingConfig
from machine_learning.training.model_manager import ModelManager

router = APIRouter(
    prefix="/labeling",
    tags=["labeling"]
)

# ===================================================================
# MODEL CACHING - Lädt Model einmal und hält es im Speicher
# ===================================================================

_model_cache = {
    "model": None,
    "model_path": None,
    "model_mtime": None,
    "class_names": None,  # Speichert die Klassennamen vom Model
    "lock": threading.Lock()
}


def get_cached_model():
    """
    Returns a cached YOLO model instance.
    The model is loaded once and reused for all subsequent requests.
    If the model file changes (e.g., after retraining), the cache is invalidated.

    Returns:
        tuple: (model, model_path, class_names) or (None, None, None) if no model
    """
    from ultralytics import YOLO

    model_path = ModelManager.get_active_model_path()

    if not model_path.exists():
        return None, None, None

    model_path_str = str(model_path)
    model_mtime = model_path.stat().st_mtime

    with _model_cache["lock"]:
        # Check if we need to reload (first load or model file changed)
        cached_path = _model_cache.get("model_path")
        cached_mtime = _model_cache.get("model_mtime")

        if (_model_cache["model"] is None or
                cached_path != model_path_str or
                cached_mtime != model_mtime):
            print(f"[Model Cache] Loading model from {model_path_str}...")
            model = YOLO(model_path_str)
            _model_cache["model"] = model
            _model_cache["model_path"] = model_path_str
            _model_cache["model_mtime"] = model_mtime
            # Speichere die Klassennamen vom Model (wichtig für korrekte Zuordnung!)
            _model_cache["class_names"] = model.names
            print(f"[Model Cache] Model loaded successfully!")
            print(f"[Model Cache] Classes: {model.names}")

        return _model_cache["model"], model_path, _model_cache["class_names"]


# ===================================================================
# Directory structure
# ===================================================================

DATASET_ROOT = Path(settings.STORAGE_PATH) / "datasets"
IMAGES_DIR = DATASET_ROOT / "images_raw"
PATCHES_DIR = DATASET_ROOT / "patches"
ANNOTATIONS_DIR = DATASET_ROOT / "annotations"
OUTPUT_DIR = DATASET_ROOT / "output"

# Create required directories
for p in [DATASET_ROOT, IMAGES_DIR, PATCHES_DIR, ANNOTATIONS_DIR, OUTPUT_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# ===================================================================
# SUNSPOT CLASSES (McIntosh Classification) - Fallback
# ===================================================================

SUNSPOT_CLASSES = ["A", "B", "C", "D", "E", "F", "H"]

# ===================================================================
# TRAINING STATUS (in-memory store for async training)
# ===================================================================

training_status = {
    "is_running": False,
    "job_id": None,
    "started_at": None,
    "finished_at": None,
    "status": "idle",  # idle, running, completed, failed
    "message": None,
    "result": None,
    # Progress tracking
    "current_epoch": 0,
    "total_epochs": 0,
    "progress_percent": 0,
    "metrics": {}  # Loss, mAP, etc.
}

training_lock = threading.Lock()


# ===================================================================
# PYDANTIC MODELS
# ===================================================================

class DetectRequest(BaseModel):
    """Request body for /detect endpoint"""
    patch_image_base64: str
    confidence_threshold: Optional[float] = 0.25


class DetectResponse(BaseModel):
    """Response from /detect endpoint"""
    predictions: List[dict]
    model_path: str


class TrainRequest(BaseModel):
    """Request body for /train endpoint"""
    epochs: Optional[int] = 50
    batch_size: Optional[int] = 16
    model_arch: Optional[str] = "yolov8n.pt"


class DetectAndSaveRequest(BaseModel):
    """Request body for /detect-and-save endpoint"""
    original_image_file: str
    patch_file: str
    px: int
    py: int
    patch_image_base64: str
    confidence_threshold: Optional[float] = 0.25


# ===================================================================
# GET CLASSES
# ===================================================================

@router.get("/classes", status_code=200)
async def get_sunspot_classes(user: CURRENT_ACTIVE_USER):
    """
    Returns the available sunspot classes (McIntosh Classification).
    """
    return {
        "classes": SUNSPOT_CLASSES,
        "description": "McIntosh Classification System for Sunspot Groups"
    }


# ===================================================================
# UPLOAD IMAGE
# ===================================================================

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
        user: CURRENT_ACTIVE_USER,
        file: UploadFile = File(...)
):
    """
    Uploads an SDO image to /storage/datasets/images_raw.
    Accepts JPG, JPEG, PNG files.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )

    # Ensure directory exists
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    file_path = IMAGES_DIR / file.filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

    return {
        "message": "Image uploaded successfully",
        "filename": file.filename,
        "file_path": str(file_path),
        "uploaded_by": user.username
    }


# ===================================================================
# PROCESS IMAGE → Generate Patches (without saving)
# ===================================================================

@router.post("/process/{filename}", status_code=200)
async def process_image_to_patches(
        filename: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Processes an uploaded image through the segmentation pipeline.
    Returns patches with metadata (base64 encoded) WITHOUT saving them.

    The patches are returned to the frontend for display and annotation.
    Saving happens via POST /label endpoint.
    """
    image_path = IMAGES_DIR / filename

    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{filename}' not found in images_raw folder"
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

            patch_filename = f"{date_string}_patch_px{px}_py{py}.jpg"

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
            "patches": patch_results
        }

        return to_native(result)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )


# ===================================================================
# DETECT → Run ML Model on a Patch (CUDA!)
# ===================================================================

@router.post("/detect", status_code=200)
def detect_sunspots_on_patch(
        user: CURRENT_ACTIVE_USER,
        request: DetectRequest
):
    """
    Runs the trained YOLO model on a single patch image.
    Uses a cached model instance for better performance.
    Uses GPU (CUDA) for inference.

    Input: Base64 encoded patch image
    Output: List of predicted bounding boxes with class and confidence
    """
    try:
        # Get cached model (much faster than loading each time!)
        model, model_path, class_names = get_cached_model()

        if model is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trained model available. Please train a model first."
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

        # Run prediction with CUDA!
        results = model.predict(
            img,
            conf=request.confidence_threshold,
            verbose=False,
            device='cuda:0'  # GPU für schnelle Inference!
        )

        # Parse results
        predictions = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes

            for i in range(len(boxes)):
                xyxy = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = xyxy

                x = float(x1)
                y = float(y1)
                w = float(x2 - x1)
                h = float(y2 - y1)

                cls_id = int(boxes.cls[i].cpu().numpy())
                conf = float(boxes.conf[i].cpu().numpy())

                # Nutze die Klassennamen vom Model (nicht SUNSPOT_CLASSES!)
                class_name = class_names.get(cls_id, f"Unknown_{cls_id}")

                predictions.append({
                    "bbox": [x, y, w, h],
                    "class": class_name,
                    "confidence": round(conf, 4)
                })

        return {
            "predictions": predictions,
            "model_path": str(model_path),
            "total_detections": len(predictions)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection error: {str(e)}"
        )


# ===================================================================
# DETECT AND SAVE → Combined workflow for Auto-Detect
# ===================================================================

@router.post("/detect-and-save", status_code=200)
def detect_and_save_annotation(
        user: CURRENT_ACTIVE_USER,
        request: DetectAndSaveRequest
):
    """
    Combined workflow for Auto-Detect:
    1. Save the patch image to storage/datasets/patches
    2. Run ML detection on the patch (with CUDA!)
    3. Create/update annotation file in storage/datasets/annotations
    4. Return the annotation with predictions

    This is more efficient than separate save + detect calls.
    """
    try:
        # === Step 1: Save the patch image ===
        patch_path = PATCHES_DIR / request.patch_file

        try:
            img_bytes = base64.b64decode(request.patch_image_base64)
            with open(patch_path, "wb") as f:
                f.write(img_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to save patch image: {str(e)}"
            )

        # === Step 2: Run ML Detection with CUDA ===
        predictions = []
        model_path_str = "No model"

        model, model_path, class_names = get_cached_model()

        if model is not None:
            # Decode image for prediction
            np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is not None:
                results = model.predict(
                    img,
                    conf=request.confidence_threshold,
                    verbose=False,
                    device='cuda:0'  # GPU für schnelle Inference!
                )

                if len(results) > 0 and results[0].boxes is not None:
                    boxes = results[0].boxes

                    for i in range(len(boxes)):
                        xyxy = boxes.xyxy[i].cpu().numpy()
                        x1, y1, x2, y2 = xyxy

                        x = float(x1)
                        y = float(y1)
                        w = float(x2 - x1)
                        h = float(y2 - y1)

                        cls_id = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())

                        # Nutze die Klassennamen vom Model!
                        class_name = class_names.get(cls_id, f"Unknown_{cls_id}")

                        predictions.append({
                            "bbox": [x, y, w, h],
                            "class": class_name,
                            "confidence": round(conf, 4)
                        })

                model_path_str = str(model_path)

        # === Step 3: Create/Update Annotation File (JSON für Frontend) ===
        annotation_data = {
            "original_image_file": request.original_image_file,
            "patch_file": request.patch_file,
            "px": request.px,
            "py": request.py,
            "annotations": [
                {"class": p["class"], "bbox": p["bbox"]}
                for p in predictions
            ],
            "auto_detected": True,
            "model_path": model_path_str
        }

        ann_path = ANNOTATIONS_DIR / f"{request.patch_file}.json"
        with open(ann_path, "w") as f:
            json.dump(annotation_data, f, indent=2)

        # === Step 4: Return Result ===
        return {
            "success": True,
            "patch_saved": str(patch_path),
            "annotation_saved": str(ann_path),
            "predictions": predictions,
            "total_detections": len(predictions),
            "model_available": model is not None,
            "annotation": annotation_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detect and save error: {str(e)}"
        )


# ===================================================================
# LIST DATASET IMAGES
# ===================================================================

@router.get("/dataset/list", status_code=200)
async def list_dataset_images(user: CURRENT_ACTIVE_USER):
    """Lists raw images available for labeling."""
    image_files = sorted([
        f.name for f in IMAGES_DIR.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])

    return {
        "total": len(image_files),
        "files": image_files
    }


# ===================================================================
# LOAD IMAGE BY INDEX (with patches + global grid)
# ===================================================================

@router.get("/dataset/image/{index}", status_code=200)
async def load_image_for_labeling(index: int, user: CURRENT_ACTIVE_USER):
    """
    Loads ONE raw image by index.
    Returns:
      - file name
      - total images
      - current index
      - global_grid for the 2k image
      - rectified patches
      - patch grids
    """
    try:
        result = ProcessingPipeline.process_single_image_from_folder(
            folder_path=str(IMAGES_DIR),
            index=index
        )

        result = to_native(result)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image at index {index}: {str(e)}"
        )


# ===================================================================
# SAVE PATCH ANNOTATIONS (JSON Format für Frontend)
# ===================================================================

@router.post("/label", status_code=200)
async def save_patch_annotation(
        user: CURRENT_ACTIVE_USER,
        image_file: str = Form(...),
        patch_file: str = Form(...),
        px: int = Form(...),
        py: int = Form(...),
        annotations: str = Form(...),
        patch_image_base64: str = Form(...),
):
    """
    Speichert Annotation + Patch-Bild.
    Falls bereits vorhanden, wird überschrieben.

    Annotations werden als JSON gespeichert (für Frontend Kompatibilität).
    """

    # Validate annotation JSON
    try:
        ann_list = json.loads(annotations)
        if not isinstance(ann_list, list):
            raise ValueError("Annotations must be a list.")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid annotation JSON format."
        )

    # 1. Save annotation (JSON Format)
    ann_dir = Path(settings.STORAGE_PATH) / "datasets" / "annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)

    ann_data = {
        "original_image_file": image_file,
        "patch_file": patch_file,
        "px": px,
        "py": py,
        "annotations": ann_list
    }

    ann_path = ann_dir / f"{patch_file}.json"
    with open(ann_path, "w") as f:
        json.dump(ann_data, f, indent=2)

    # 2. Save patch image
    patches_dir = Path(settings.STORAGE_PATH) / "datasets" / "patches"
    patches_dir.mkdir(parents=True, exist_ok=True)

    patch_path = patches_dir / patch_file
    try:
        img_bytes = base64.b64decode(patch_image_base64)
        with open(patch_path, "wb") as f:
            f.write(img_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save patch image: {e}"
        )

    return {
        "message": "Annotation saved successfully",
        "annotation_file": str(ann_path),
        "patch_file": str(patch_path),
        "annotations_count": len(ann_list)
    }


# ===================================================================
# TRAINING ENDPOINTS
# ===================================================================

@router.post("/train", status_code=202)
async def start_training(
        user: CURRENT_ACTIVE_USER,
        request: TrainRequest = None
):
    """
    Starts model training asynchronously with CUDA.

    The training runs in the background. Use GET /train/status to check progress.

    Prerequisites:
    - Dataset must be finalized via POST /dataset/finish
    """
    global training_status

    # Check if training is already running
    with training_lock:
        if training_status["is_running"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Training is already in progress. Check /train/status for details."
            )

    # Check if dataset exists
    train_dir = OUTPUT_DIR / "train"
    val_dir = OUTPUT_DIR / "val"

    if not (train_dir / "labels").exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No dataset found. Please finalize dataset first via POST /dataset/finish"
        )

    # Prepare training config - MIT CUDA!
    config = TrainingConfig(
        dataset_path=OUTPUT_DIR,
        epochs=request.epochs if request else 50,
        batch_size=request.batch_size if request else 16,
        model_arch=request.model_arch if request else "yolov8n.pt",
        img_size=512,
        device="cuda:0"
    )

    # Generate job ID
    job_id = str(uuid.uuid4())[:8]

    # Update status
    with training_lock:
        training_status["is_running"] = True
        training_status["job_id"] = job_id
        training_status["started_at"] = datetime.now().isoformat()
        training_status["finished_at"] = None
        training_status["status"] = "running"
        training_status["message"] = "Training wird vorbereitet..."
        training_status["result"] = None
        # Reset progress
        training_status["current_epoch"] = 0
        training_status["total_epochs"] = config.epochs
        training_status["progress_percent"] = 0
        training_status["metrics"] = {}

    # Start training in background thread
    thread = threading.Thread(
        target=_run_training,
        args=(config, job_id),
        daemon=True
    )
    thread.start()

    return {
        "message": "Training started",
        "job_id": job_id,
        "status": "running",
        "config": {
            "epochs": config.epochs,
            "batch_size": config.batch_size,
            "model_arch": config.model_arch,
            "img_size": config.img_size,
            "device": config.device
        }
    }


@router.get("/train/status", status_code=200)
async def get_training_status(user: CURRENT_ACTIVE_USER):
    """
    Returns the current training status with progress information.

    Possible statuses:
    - idle: No training has been started
    - running: Training is in progress
    - completed: Training finished successfully
    - failed: Training failed with an error
    """
    with training_lock:
        return {
            "is_running": training_status["is_running"],
            "job_id": training_status["job_id"],
            "started_at": training_status["started_at"],
            "finished_at": training_status["finished_at"],
            "status": training_status["status"],
            "message": training_status["message"],
            "result": training_status["result"],
            # Progress info
            "current_epoch": training_status["current_epoch"],
            "total_epochs": training_status["total_epochs"],
            "progress_percent": training_status["progress_percent"],
            "metrics": training_status["metrics"]
        }


# ===================================================================
# MODEL INFO
# ===================================================================

@router.get("/model/info", status_code=200)
async def get_model_info(user: CURRENT_ACTIVE_USER):
    """
    Returns information about the currently active model.
    """
    model_path = ModelManager.get_active_model_path()

    if not model_path.exists():
        return {
            "model_available": False,
            "message": "No trained model available"
        }

    # Get file stats
    stat = model_path.stat()

    # Try to get class names from cached model
    _, _, class_names = get_cached_model()

    return {
        "model_available": True,
        "model_path": str(model_path),
        "model_size_mb": round(stat.st_size / (1024 * 1024), 2),
        "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "classes": list(class_names.values()) if class_names else SUNSPOT_CLASSES
    }


@router.post("/model/preload", status_code=200)
async def preload_model(user: CURRENT_ACTIVE_USER):
    """
    Preloads the ML model into cache.
    Call this after login or on app startup for faster first detection.
    """
    model, model_path, class_names = get_cached_model()

    if model is None:
        return {
            "success": False,
            "message": "No model available to preload"
        }

    return {
        "success": True,
        "message": "Model preloaded successfully",
        "model_path": str(model_path),
        "classes": list(class_names.values()) if class_names else []
    }


# ===================================================================
# RESET DATASET
# ===================================================================

@router.post("/dataset/reset", status_code=200)
async def reset_labeling_dataset(user: CURRENT_ACTIVE_USER):
    """Remove all annotations + output; keep raw images."""
    for folder in [PATCHES_DIR, ANNOTATIONS_DIR, OUTPUT_DIR]:
        shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True, exist_ok=True)
    return {"message": "Dataset reset completed."}


@router.delete("/patch/{patch_file}", status_code=200)
async def delete_patch_from_dataset(
        patch_file: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Löscht einen Patch + die zugehörige Annotation aus dem Dataset.
    """
    datasets_dir = Path(settings.STORAGE_PATH) / "datasets"

    patches_dir = datasets_dir / "patches"
    ann_dir = datasets_dir / "annotations"

    patch_path = patches_dir / patch_file
    ann_path = ann_dir / f"{patch_file}.json"

    patch_deleted = False
    annotation_deleted = False

    # Patch löschen
    if patch_path.exists() and patch_path.is_file():
        try:
            patch_path.unlink()
            patch_deleted = True
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete patch image: {e}"
            )

    # Annotation löschen
    if ann_path.exists() and ann_path.is_file():
        try:
            ann_path.unlink()
            annotation_deleted = True
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete annotation: {e}"
            )

    # Falls beides nicht existiert → 404
    if not patch_deleted and not annotation_deleted:
        raise HTTPException(
            status_code=404,
            detail=f"No patch or annotation found for '{patch_file}'."
        )

    return {
        "patch_deleted": patch_deleted,
        "annotation_deleted": annotation_deleted
    }


# ===================================================================
# GET RAW IMAGE
# ===================================================================

@router.get("/image/{filename}", status_code=200)
async def get_raw_image(
        filename: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Returns a raw SDO image from images_raw folder.
    """
    image_path = IMAGES_DIR / filename

    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{filename}' not found"
        )

    # Security check
    try:
        image_path.resolve().relative_to(IMAGES_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return FileResponse(image_path)


# ===================================================================
# GET ANNOTATION FOR PATCH
# ===================================================================

@router.get("/annotation/{patch_filename}", status_code=200)
async def get_annotation_for_patch(
        patch_filename: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Returns the annotation for a specific patch if it exists.
    """
    ann_path = ANNOTATIONS_DIR / f"{patch_filename}.json"

    if not ann_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No annotation found for patch '{patch_filename}'"
        )

    try:
        with open(ann_path, "r") as f:
            data = json.load(f)

        return {
            "exists": True,
            "patch_file": patch_filename,
            "annotation": data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading annotation: {str(e)}"
        )


# ===================================================================
# DATASET STATS
# ===================================================================

@router.get("/dataset/stats", status_code=200)
async def get_dataset_stats(user: CURRENT_ACTIVE_USER):
    """
    Returns statistics about the current dataset.
    """
    # Count raw images
    raw_images = len([f for f in IMAGES_DIR.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])

    # Count patches
    patches = len(list(PATCHES_DIR.glob("*.jpg")))

    # Count annotations
    annotations = len(list(ANNOTATIONS_DIR.glob("*.json")))

    # Check if output dataset exists (look for labels folder, not just labels.json)
    output_exists = (OUTPUT_DIR / "train" / "labels").exists() and len(
        list((OUTPUT_DIR / "train" / "labels").glob("*.txt"))) > 0

    # Count annotations by class
    class_counts = {cls: 0 for cls in SUNSPOT_CLASSES}
    total_bboxes = 0

    for ann_file in ANNOTATIONS_DIR.glob("*.json"):
        with open(ann_file, "r") as f:
            data = json.load(f)
            for ann in data.get("annotations", []):
                cls = ann.get("class", "Unknown")
                if cls in class_counts:
                    class_counts[cls] += 1
                total_bboxes += 1

    return {
        "raw_images": raw_images,
        "patches": patches,
        "annotations": annotations,
        "total_bboxes": total_bboxes,
        "class_distribution": class_counts,
        "output_dataset_ready": output_exists
    }


# ===================================================================
# FINALIZE DATASET - Erstellt YOLO .txt Labels!
# ===================================================================

@router.post("/dataset/finish", status_code=200)
async def finalize_dataset(user: CURRENT_ACTIVE_USER):
    """
    Finalisiert das Dataset für YOLO Training.

    Erstellt:
    - train/images/ und val/images/ mit den Patch-Bildern
    - train/labels/ und val/labels/ mit YOLO .txt Dateien (WICHTIG!)
    - train/labels.json und val/labels.json (COCO Format für Referenz)
    - dataset.yaml für YOLO (OHNE format: coco!)
    """

    # 1. Clean output directory
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    train_dir = OUTPUT_DIR / "train"
    val_dir = OUTPUT_DIR / "val"

    # Erstelle BEIDE: images UND labels Ordner!
    (train_dir / "images").mkdir(parents=True, exist_ok=True)
    (train_dir / "labels").mkdir(parents=True, exist_ok=True)
    (val_dir / "images").mkdir(parents=True, exist_ok=True)
    (val_dir / "labels").mkdir(parents=True, exist_ok=True)

    # 2. Load all annotation files
    annotation_files = sorted(ANNOTATIONS_DIR.glob("*.json"))
    if not annotation_files:
        raise HTTPException(status_code=400, detail="No annotations found.")

    # 3. First pass: collect ALL categories globally
    global_categories = {}  # class_name → new_id
    next_cat_id = 0  # START AT 0 (YOLO REQUIREMENT)

    parsed_annotations = []  # list of (ann_file, data)

    for ann_file in annotation_files:
        with open(ann_file, "r") as f:
            data = json.load(f)

        anns = data.get("annotations", [])

        # assign each class a unique ID 0..N-1
        for ann in anns:
            cls = ann["class"]
            if cls not in global_categories:
                global_categories[cls] = next_cat_id
                next_cat_id += 1

        parsed_annotations.append((ann_file, data))

    # 4. Shuffle & split 80/20
    np.random.shuffle(parsed_annotations)
    split_index = int(len(parsed_annotations) * 0.8)
    train_data = parsed_annotations[:split_index]
    val_data = parsed_annotations[split_index:]

    # 5. Function to build dataset with BOTH COCO JSON and YOLO .txt labels
    def build_dataset(dataset_list, images_dir, labels_dir, output_json):
        """
        Erstellt:
        - Kopiert Bilder nach images_dir
        - Erstellt YOLO .txt Labels in labels_dir
        - Erstellt COCO JSON in output_json (für Referenz)
        """

        images_coco = []
        annotations_coco = []
        ann_id = 1
        img_id = 1

        img_width = 512  # Patch size
        img_height = 512

        for ann_file, data in dataset_list:

            patch_file = data["patch_file"]
            anns = data.get("annotations", [])

            src_patch_path = PATCHES_DIR / patch_file
            if not src_patch_path.exists():
                print(f"[WARN] Missing patch image: {patch_file}")
                continue

            # Copy patch image
            dst_path = images_dir / patch_file
            shutil.copy(src_patch_path, dst_path)

            # ============================================
            # YOLO .txt Label-Datei erstellen
            # ============================================
            # Format: class_id x_center y_center width height
            # Alle Werte normalisiert (0-1)

            label_filename = Path(patch_file).stem + ".txt"
            label_path = labels_dir / label_filename

            yolo_lines = []
            for ann in anns:
                cls = ann["class"]
                cat_id = global_categories[cls]  # 0-indexed class ID

                # bbox: [x, y, width, height] in pixels (top-left corner)
                x, y, w, h = ann["bbox"]

                # Convert to YOLO format: x_center, y_center, width, height (normalized)
                x_center = (x + w / 2) / img_width
                y_center = (y + h / 2) / img_height
                w_norm = w / img_width
                h_norm = h / img_height

                # Clamp values to [0, 1]
                x_center = max(0, min(1, x_center))
                y_center = max(0, min(1, y_center))
                w_norm = max(0, min(1, w_norm))
                h_norm = max(0, min(1, h_norm))

                yolo_lines.append(f"{cat_id} {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}")

            # Schreibe .txt Datei (auch wenn leer - für "background" Bilder)
            with open(label_path, "w") as f:
                f.write("\n".join(yolo_lines))

            # ============================================
            # COCO Format (für Referenz/Export)
            # ============================================
            images_coco.append({
                "id": img_id,
                "file_name": patch_file,
                "width": img_width,
                "height": img_height
            })

            for ann in anns:
                cls = ann["class"]
                cat_id = global_categories[cls]

                x, y, w, h = ann["bbox"]
                area = float(w) * float(h)

                annotations_coco.append({
                    "id": ann_id,
                    "image_id": img_id,
                    "category_id": cat_id,
                    "bbox": [float(x), float(y), float(w), float(h)],
                    "area": area,
                    "iscrowd": 0
                })

                ann_id += 1

            img_id += 1

        # Categories list sorted by ID
        categories_list = [
            {"id": cid, "name": cname}
            for cname, cid in sorted(global_categories.items(), key=lambda x: x[1])
        ]

        # COCO final JSON (für Referenz)
        coco = {
            "info": {
                "description": "SolarSpotting Dataset",
                "version": "1.0",
                "year": datetime.now().year
            },
            "licenses": [],
            "images": images_coco,
            "annotations": annotations_coco,
            "categories": categories_list
        }

        with open(output_json, "w") as f:
            json.dump(coco, f, indent=4)

        return len(images_coco), len(annotations_coco)

    # 6. Build datasets
    train_images, train_ann = build_dataset(
        train_data,
        train_dir / "images",
        train_dir / "labels",
        train_dir / "labels.json"
    )

    val_images, val_ann = build_dataset(
        val_data,
        val_dir / "images",
        val_dir / "labels",
        val_dir / "labels.json"
    )

    # 7. Create dataset.yaml for YOLO - OHNE format: coco!
    names_list = [
        cname for cname, cid in sorted(global_categories.items(), key=lambda x: x[1])
    ]

    yaml_content = {
        "path": str(OUTPUT_DIR.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "val/images",
        # YOLO findet automatisch train/labels und val/labels!
        "names": names_list,
        "nc": len(names_list)
    }

    yaml_path = OUTPUT_DIR / "dataset.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(yaml_content, f, default_flow_style=False)

    # 8. ZIP export
    zip_path = OUTPUT_DIR / "dataset.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Images
        for f in (train_dir / "images").iterdir():
            zipf.write(f, arcname=f"train/images/{f.name}")
        for f in (val_dir / "images").iterdir():
            zipf.write(f, arcname=f"val/images/{f.name}")

        # YOLO Labels (.txt)
        for f in (train_dir / "labels").iterdir():
            zipf.write(f, arcname=f"train/labels/{f.name}")
        for f in (val_dir / "labels").iterdir():
            zipf.write(f, arcname=f"val/labels/{f.name}")

        # COCO JSON (für Referenz)
        zipf.write(train_dir / "labels.json", arcname="train/labels.json")
        zipf.write(val_dir / "labels.json", arcname="val/labels.json")

        # Dataset YAML
        zipf.write(yaml_path, arcname="dataset.yaml")

    return {
        "message": "Dataset created successfully",
        "zip_file": str(zip_path),
        "train_images": train_images,
        "train_annotations": train_ann,
        "val_images": val_images,
        "val_annotations": val_ann,
        "categories": global_categories,
        "dataset_yaml": str(yaml_path)
    }


# ===================================================================
# TRAINING FUNCTION (Background Thread)
# ===================================================================

def _run_training(config: TrainingConfig, job_id: str):
    """Background training function with progress tracking via YOLO callbacks"""
    global training_status

    from ultralytics import YOLO

    def on_train_epoch_end(trainer):
        """Callback called after each training epoch"""
        with training_lock:
            current = trainer.epoch + 1
            total = trainer.epochs
            training_status["current_epoch"] = current
            training_status["total_epochs"] = total
            training_status["progress_percent"] = round((current / total) * 100, 1)
            training_status["message"] = f"Training... Epoch {current}/{total}"

            if hasattr(trainer, 'metrics') and trainer.metrics:
                training_status["metrics"] = {
                    "box_loss": round(float(trainer.loss_items[0]), 4) if hasattr(trainer, 'loss_items') else None,
                    "cls_loss": round(float(trainer.loss_items[1]), 4) if hasattr(trainer, 'loss_items') and len(
                        trainer.loss_items) > 1 else None,
                }

    def on_train_start(trainer):
        """Callback called when training starts"""
        with training_lock:
            training_status["total_epochs"] = trainer.epochs
            training_status["message"] = f"Training gestartet... 0/{trainer.epochs} Epochs"

    try:
        # Dataset YAML sollte bereits existieren von finalize_dataset
        dataset_yaml = config.dataset_path / "dataset.yaml"

        if not dataset_yaml.exists():
            # Fallback: Erstelle YAML falls nicht vorhanden
            with open(config.dataset_path / "train" / "labels.json", "r") as f:
                data = json.load(f)

            categories = data["categories"]
            names_list = [cat["name"] for cat in sorted(categories, key=lambda c: c["id"])]

            # YOLO Format - OHNE format: coco!
            yaml_content = {
                "path": str(config.dataset_path.resolve()).replace("\\", "/"),
                "train": "train/images",
                "val": "val/images",
                "names": names_list,
                "nc": len(names_list)
            }

            with open(dataset_yaml, "w") as f:
                yaml.dump(yaml_content, f, default_flow_style=False)

        # 2) Archive old model
        ModelManager.archive_active_model()

        # 3) Load model
        with training_lock:
            training_status["message"] = "Lade Modell..."

        model = YOLO(config.model_arch)

        # 4) Register callbacks
        model.add_callback("on_train_start", on_train_start)
        model.add_callback("on_train_epoch_end", on_train_epoch_end)

        # 5) Train with CUDA!
        with training_lock:
            training_status["message"] = "Starte Training..."
            training_status["total_epochs"] = config.epochs

        results = model.train(
            data=str(dataset_yaml),
            epochs=config.epochs,
            batch=config.batch_size,
            imgsz=config.img_size,
            device=config.device,  # cuda:0
            workers=0,  # WICHTIG für Windows!
            project=str(config.dataset_path.parent),
            name=f"train_{job_id}",
            pretrained=True,
            verbose=True
        )

        # 6) Save best model
        best_model_path = Path(results.save_dir) / "weights" / "best.pt"

        if best_model_path.exists():
            ModelManager.save_active_model(best_model_path)

            # Invalidate model cache so next detection uses new model
            with _model_cache["lock"]:
                _model_cache["model"] = None
                _model_cache["model_path"] = None
                _model_cache["model_mtime"] = None
                _model_cache["class_names"] = None

            with training_lock:
                training_status["is_running"] = False
                training_status["finished_at"] = datetime.now().isoformat()
                training_status["status"] = "completed"
                training_status["progress_percent"] = 100
                training_status["message"] = "Training erfolgreich abgeschlossen!"
                training_status["result"] = {
                    "message": "Training completed successfully",
                    "active_model": str(ModelManager.get_active_model_path()),
                    "run_dir": str(results.save_dir),
                    "epochs_trained": config.epochs
                }
        else:
            raise Exception(f"Best model not found at {best_model_path}")

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[TRAINING ERROR] {error_details}")

        with training_lock:
            training_status["is_running"] = False
            training_status["finished_at"] = datetime.now().isoformat()
            training_status["status"] = "failed"
            training_status["message"] = str(e)
            training_status["result"] = None