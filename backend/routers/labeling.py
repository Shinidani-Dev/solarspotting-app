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
from fastapi import APIRouter, HTTPException, status, Form, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.config import settings
from backend.core.dependencies import (
    CURRENT_ACTIVE_USER,
    CURRENT_LABELER_USER,
    CURRENT_ADMIN_USER
)
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
# Directory structure
# ===================================================================

DATASET_ROOT = Path(settings.STORAGE_PATH) / "datasets"
IMAGES_DIR = DATASET_ROOT / "images_raw"
PATCHES_DIR = DATASET_ROOT / "patches"
ANNOTATIONS_DIR = DATASET_ROOT / "annotations"
OUTPUT_DIR = DATASET_ROOT / "output"
ARCHIVE_DIR = DATASET_ROOT / "archive"

# Create required directories
for p in [DATASET_ROOT, IMAGES_DIR, PATCHES_DIR, ANNOTATIONS_DIR, OUTPUT_DIR, ARCHIVE_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# ===================================================================
# SUNSPOT CLASSES (McIntosh Classification)
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
# MODEL CACHE (für schnelle Inference)
# ===================================================================

_model_cache = {
    "model": None,
    "model_path": None,
    "class_names": None
}
_model_lock = threading.Lock()


def get_cached_model():
    """
    Lädt das Modell einmalig und cached es für schnelle Inference.
    Returns: (model, model_path, class_names) oder (None, None, None)
    """
    global _model_cache

    model_path = ModelManager.get_active_model_path()

    if not model_path.exists():
        return None, None, None

    with _model_lock:
        # Prüfen ob Modell bereits geladen und aktuell ist
        if (_model_cache["model"] is not None and
                _model_cache["model_path"] == str(model_path)):
            return _model_cache["model"], _model_cache["model_path"], _model_cache["class_names"]

        # Modell neu laden
        try:
            from ultralytics import YOLO
            model = YOLO(str(model_path))

            # Klassennamen extrahieren
            class_names = model.names if hasattr(model, 'names') else {
                i: name for i, name in enumerate(SUNSPOT_CLASSES)
            }

            _model_cache["model"] = model
            _model_cache["model_path"] = str(model_path)
            _model_cache["class_names"] = class_names

            return model, str(model_path), class_names

        except Exception as e:
            print(f"[MODEL CACHE] Error loading model: {e}")
            return None, None, None


def invalidate_model_cache():
    """Invalidiert den Model-Cache (z.B. nach neuem Training)"""
    global _model_cache
    with _model_lock:
        _model_cache["model"] = None
        _model_cache["model_path"] = None
        _model_cache["class_names"] = None


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


# ===================================================================
# GET CLASSES (Alle User)
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
# UPLOAD IMAGE (Nur Labeler + Admin)
# ===================================================================

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
        user: CURRENT_LABELER_USER,  # Nur Labeler + Admin
        file: UploadFile = File(...)
):
    """
    Uploads an SDO image to /storage/datasets/images_raw.
    Accepts JPG, JPEG, PNG files.

    Requires: Labeler or Admin role
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
# UPLOAD MULTIPLE IMAGES (Nur Labeler + Admin)
# ===================================================================

@router.post("/upload/multiple", status_code=status.HTTP_201_CREATED)
async def upload_multiple_images(
        user: CURRENT_LABELER_USER,  # Nur Labeler + Admin
        files: List[UploadFile] = File(...)
):
    """
    Uploads multiple SDO images at once.
    Accepts JPG, JPEG, PNG files.

    Requires: Labeler or Admin role
    """
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    errors = []

    for file in files:
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_extensions:
            errors.append({
                "filename": file.filename,
                "error": f"File type {file_extension} not allowed"
            })
            continue

        file_path = IMAGES_DIR / file.filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            results.append({
                "filename": file.filename,
                "success": True
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {
        "message": f"Uploaded {len(results)} of {len(files)} images",
        "uploaded": results,
        "errors": errors,
        "uploaded_by": user.username
    }


# ===================================================================
# PROCESS IMAGE → Generate Patches (Alle User)
# ===================================================================

@router.post("/process/{filename}", status_code=200)
async def process_image_to_patches(
        filename: str,
        user: CURRENT_ACTIVE_USER  # Alle User
):
    """
    Processes an uploaded image through the segmentation pipeline.
    Returns patches with metadata (base64 encoded) WITHOUT saving them.

    The patches are returned to the frontend for display and annotation.
    Saving happens via POST /label endpoint (requires Labeler/Admin).
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
# DETECT → Run ML Model on a Patch (Alle User, OHNE Speichern!)
# ===================================================================

@router.post("/detect", status_code=200)
async def detect_sunspots_on_patch(
        user: CURRENT_ACTIVE_USER,  # Alle User können detecten
        request: DetectRequest
):
    """
    Runs the trained YOLO model on a single patch image.

    WICHTIG: Diese Funktion SPEICHERT NICHTS!
    Die Predictions werden nur zurückgegeben zur Anzeige.
    Zum Speichern muss POST /label verwendet werden (Labeler/Admin only).

    Input: Base64 encoded patch image
    Output: List of predicted bounding boxes with class and confidence
    """
    try:
        # Get cached model
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

        # Run prediction (CPU oder GPU je nach Verfügbarkeit)
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
            "model_path": model_path,
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
# LIST DATASET IMAGES (Alle User) - mit Paging und Filter
# ===================================================================

@router.get("/dataset/list", status_code=200)
async def list_dataset_images(
        user: CURRENT_ACTIVE_USER,
        year: Optional[int] = None,
        month: Optional[int] = None,
        skip: int = 0,
        limit: int = 32
):
    """
    Lists raw images available for labeling with optional filtering and pagination.

    Parameters:
    - year: Filter by year (e.g., 2024)
    - month: Filter by month (1-12)
    - skip: Page number (0-indexed). Skips skip * limit images
    - limit: Number of images per page (default 32, max 100)
    """
    limit = min(limit, 100)

    all_files = sorted([
        f.name for f in IMAGES_DIR.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])

    # Filter by year/month (SDO filename: YYYYMMDD_HHMMSS_...)
    filtered_files = []
    for filename in all_files:
        try:
            date_part = filename[:8]
            file_year = int(date_part[:4])
            file_month = int(date_part[4:6])

            if year is not None and file_year != year:
                continue
            if month is not None and file_month != month:
                continue

            filtered_files.append(filename)
        except (ValueError, IndexError):
            if year is None and month is None:
                filtered_files.append(filename)

    # Pagination
    total_filtered = len(filtered_files)
    start_idx = skip * limit
    end_idx = start_idx + limit
    page_files = filtered_files[start_idx:end_idx]

    # Available years/months for filter UI
    available_years = set()
    available_months = set()
    for filename in all_files:
        try:
            date_part = filename[:8]
            available_years.add(int(date_part[:4]))
            available_months.add(int(date_part[4:6]))
        except (ValueError, IndexError):
            pass

    return {
        "total": total_filtered,
        "total_all": len(all_files),
        "page": skip,
        "limit": limit,
        "total_pages": (total_filtered + limit - 1) // limit if limit > 0 else 0,
        "files": page_files,
        "available_years": sorted(available_years, reverse=True),
        "available_months": sorted(available_months)
    }


# ===================================================================
# GET NEIGHBOR IMAGES (für Next/Previous Navigation)
# ===================================================================

@router.get("/dataset/neighbors/{filename}", status_code=200)
async def get_neighbor_images(
        filename: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Returns the previous and next image filenames for navigation.
    """
    all_files = sorted([
        f.name for f in IMAGES_DIR.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])

    try:
        current_idx = all_files.index(filename)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{filename}' not found"
        )

    return {
        "current": filename,
        "current_index": current_idx,
        "total": len(all_files),
        "previous": all_files[current_idx - 1] if current_idx > 0 else None,
        "next": all_files[current_idx + 1] if current_idx < len(all_files) - 1 else None
    }


# ===================================================================
# LOAD IMAGE BY INDEX (Alle User)
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
# SAVE PATCH ANNOTATIONS (Nur Labeler + Admin)
# ===================================================================

@router.post("/label", status_code=200)
async def save_patch_annotation(
        user: CURRENT_LABELER_USER,  # Nur Labeler + Admin
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

    Requires: Labeler or Admin role
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

    # 1. Save annotation
    ann_dir = Path(settings.STORAGE_PATH) / "datasets" / "annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)

    ann_path = ann_dir / f"{patch_file}.json"

    annotation_payload = {
        "original_image": image_file,
        "patch_file": patch_file,
        "px": px,
        "py": py,
        "annotations": ann_list,
        "saved_by": user.username,
        "saved_at": datetime.now().isoformat()
    }

    with open(ann_path, "w") as f:
        json.dump(annotation_payload, f, indent=2)

    # 2. Save patch image (base64)
    patch_dir = Path(settings.STORAGE_PATH) / "datasets" / "patches"
    patch_dir.mkdir(parents=True, exist_ok=True)

    patch_image_path = patch_dir / patch_file

    try:
        img_bytes = base64.b64decode(patch_image_base64)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode patch image")

        cv2.imwrite(str(patch_image_path), img)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to save patch image: {e}"
        )

    return {
        "message": "Patch and annotation saved",
        "patch_file": patch_file,
        "annotation_file": ann_path.name,
        "saved_by": user.username
    }


# ===================================================================
# DELETE PATCH (Nur Labeler + Admin)
# ===================================================================

@router.delete("/patch/{patch_file}", status_code=200)
async def delete_patch_from_dataset(
        patch_file: str,
        user: CURRENT_LABELER_USER  # Nur Labeler + Admin
):
    """
    Löscht einen Patch + die zugehörige Annotation aus dem Dataset.

    Requires: Labeler or Admin role
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
        "annotation_deleted": annotation_deleted,
        "deleted_by": user.username
    }


# ===================================================================
# FINISH DATASET → CREATE TRAIN/VAL SPLIT + ARCHIVE (Nur Labeler + Admin)
# ===================================================================
def write_yolo_label(txt_path: Path, annotations: list, class_to_id: dict, img_size: int = 512):
    """
    Writes YOLO-format label file.
    """
    lines = []

    for ann in annotations:
        cls_name = ann["class"]
        if cls_name not in class_to_id:
            continue

        cls_id = class_to_id[cls_name]

        x, y, w, h = ann["bbox"]

        # convert to YOLO format (center-based, normalized)
        x_c = (x + w / 2) / img_size
        y_c = (y + h / 2) / img_size
        w_n = w / img_size
        h_n = h / img_size

        lines.append(f"{cls_id} {x_c:.6f} {y_c:.6f} {w_n:.6f} {h_n:.6f}")

    if lines:
        txt_path.write_text("\n".join(lines))


@router.post("/dataset/finish", status_code=200)
async def finalize_dataset(user: CURRENT_LABELER_USER):
    """
    Finalisiert das Dataset:
    - erstellt YOLO train/val Struktur
    - erzeugt TXT Labels aus annotations.json
    - 80/20 Split
    """

    # --------------------------------------------------
    # Archive existing dataset
    # --------------------------------------------------
    existing_zip = OUTPUT_DIR / "dataset.zip"
    if existing_zip.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy(existing_zip, ARCHIVE_DIR / f"dataset_{ts}.zip")

    # --------------------------------------------------
    # Clean output
    # --------------------------------------------------
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    train_dir = OUTPUT_DIR / "train"
    val_dir = OUTPUT_DIR / "val"

    (train_dir / "images").mkdir(parents=True, exist_ok=True)
    (train_dir / "labels").mkdir(parents=True, exist_ok=True)
    (val_dir / "images").mkdir(parents=True, exist_ok=True)
    (val_dir / "labels").mkdir(parents=True, exist_ok=True)

    # --------------------------------------------------
    # Load annotations
    # --------------------------------------------------
    annotation_files = sorted(ANNOTATIONS_DIR.glob("*.json"))
    if not annotation_files:
        raise HTTPException(status_code=400, detail="No annotations found.")

    parsed = []
    class_to_id = {}
    next_id = 0

    for ann_file in annotation_files:
        with open(ann_file, "r") as f:
            data = json.load(f)

        for ann in data.get("annotations", []):
            cls = ann["class"]
            if cls not in class_to_id:
                class_to_id[cls] = next_id
                next_id += 1

        parsed.append(data)

    # --------------------------------------------------
    # Shuffle & split
    # --------------------------------------------------
    np.random.shuffle(parsed)
    split = int(len(parsed) * 0.8)
    train_data = parsed[:split]
    val_data = parsed[split:]

    # --------------------------------------------------
    # Build YOLO datasets
    # --------------------------------------------------
    def build_yolo(data_list, images_dir, labels_dir):
        img_count = 0
        box_count = 0

        for data in data_list:
            patch_file = data["patch_file"]
            anns = data.get("annotations", [])

            src_img = PATCHES_DIR / patch_file
            if not src_img.exists():
                continue

            shutil.copy(src_img, images_dir / patch_file)

            label_path = labels_dir / f"{Path(patch_file).stem}.txt"
            write_yolo_label(label_path, anns, class_to_id)

            img_count += 1
            box_count += len(anns)

        return img_count, box_count

    train_images, train_boxes = build_yolo(
        train_data, train_dir / "images", train_dir / "labels"
    )

    val_images, val_boxes = build_yolo(
        val_data, val_dir / "images", val_dir / "labels"
    )

    # --------------------------------------------------
    # dataset.yaml (YOLO-native)
    # --------------------------------------------------
    names = [k for k, _ in sorted(class_to_id.items(), key=lambda x: x[1])]

    dataset_yaml = {
        "path": str(OUTPUT_DIR.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "val/images",
        "names": names,
        "nc": len(names),
    }

    with open(OUTPUT_DIR / "dataset.yaml", "w") as f:
        import yaml
        yaml.dump(dataset_yaml, f)

    # --------------------------------------------------
    # ZIP export
    # --------------------------------------------------
    zip_path = OUTPUT_DIR / "dataset.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for split_name in ["train", "val"]:
            for sub in ["images", "labels"]:
                folder = OUTPUT_DIR / split_name / sub
                for file in folder.iterdir():
                    zipf.write(
                        file,
                        arcname=f"{split_name}/{sub}/{file.name}"
                    )

    return {
        "message": "YOLO dataset created successfully",
        "train_images": train_images,
        "train_boxes": train_boxes,
        "val_images": val_images,
        "val_boxes": val_boxes,
        "classes": class_to_id,
        "created_by": user.username
    }


# ===================================================================
# RESET DATASET (Nur Labeler + Admin)
# ===================================================================

@router.post("/dataset/reset", status_code=200)
async def reset_labeling_dataset(user: CURRENT_LABELER_USER):  # Nur Labeler + Admin
    """
    Remove all annotations + output; keep raw images.

    Requires: Labeler or Admin role
    """
    for folder in [PATCHES_DIR, ANNOTATIONS_DIR, OUTPUT_DIR]:
        shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True, exist_ok=True)
    return {
        "message": "Dataset reset completed.",
        "reset_by": user.username
    }


# ===================================================================
# GET RAW IMAGE (Alle User)
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
# GET ANNOTATION FOR PATCH (Alle User)
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
# DATASET STATS (Nur Admin - für ML Page)
# ===================================================================
# ===================================================================
# DATASET STATS (Nur Admin - für ML Page)
# ===================================================================

@router.get("/dataset/stats", status_code=200)
async def get_dataset_stats(user: CURRENT_ADMIN_USER):
    """
    Returns statistics about the current dataset (YOLO format).
    Used on the ML Training page.

    Requires: Admin role
    """

    # --------------------------------------------------
    # Raw images
    # --------------------------------------------------
    raw_images = len([
        f for f in IMAGES_DIR.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])

    # --------------------------------------------------
    # Patches & annotations (source data)
    # --------------------------------------------------
    patches = len(list(PATCHES_DIR.glob("*.jpg")))
    annotations = len(list(ANNOTATIONS_DIR.glob("*.json")))

    # --------------------------------------------------
    # YOLO output dataset existence
    # --------------------------------------------------
    train_labels_dir = OUTPUT_DIR / "train" / "labels"
    val_labels_dir = OUTPUT_DIR / "val" / "labels"

    output_exists = (
            train_labels_dir.exists()
            and val_labels_dir.exists()
            and any(train_labels_dir.glob("*.txt"))
    )

    # --------------------------------------------------
    # Class distribution (from SOURCE annotations)
    # --------------------------------------------------
    class_counts = {cls: 0 for cls in SUNSPOT_CLASSES}
    total_bboxes = 0

    for ann_file in ANNOTATIONS_DIR.glob("*.json"):
        try:
            with open(ann_file, "r") as f:
                data = json.load(f)
        except Exception:
            continue

        for ann in data.get("annotations", []):
            cls = ann.get("class")
            if cls in class_counts:
                class_counts[cls] += 1
            total_bboxes += 1

    # --------------------------------------------------
    # Archived datasets
    # --------------------------------------------------
    archived_datasets = []
    for archive_file in ARCHIVE_DIR.glob("dataset_*.zip"):
        archived_datasets.append({
            "filename": archive_file.name,
            "size_mb": round(archive_file.stat().st_size / (1024 * 1024), 2),
            "created": datetime.fromtimestamp(
                archive_file.stat().st_mtime
            ).isoformat()
        })

    archived_datasets.sort(key=lambda x: x["created"], reverse=True)

    return {
        "raw_images": raw_images,
        "patches": patches,
        "annotations": annotations,
        "total_bboxes": total_bboxes,
        "class_distribution": class_counts,
        "output_dataset_ready": output_exists,
        "archived_datasets": archived_datasets
    }


# ===================================================================
# MODEL INFO (Nur Admin - für ML Page)
# ===================================================================

@router.get("/model/info", status_code=200)
async def get_model_info(user: CURRENT_ADMIN_USER):  # Nur Admin
    """
    Returns information about the currently active model.
    Used on the ML Training page.

    Requires: Admin role
    """
    model_path = ModelManager.get_active_model_path()

    if not model_path.exists():
        return {
            "model_available": False,
            "message": "No trained model available"
        }

    # Get file stats
    stat = model_path.stat()

    return {
        "model_available": True,
        "model_path": str(model_path),
        "model_size_mb": round(stat.st_size / (1024 * 1024), 2),
        "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "classes": SUNSPOT_CLASSES
    }


# ===================================================================
# TRAINING (Nur Admin)
# ===================================================================
def _run_training(config: TrainingConfig, job_id: str):
    """Background training function with progress tracking via YOLO callbacks"""
    global training_status

    from ultralytics import YOLO
    import yaml

    def on_train_epoch_end(trainer):
        with training_lock:
            current = trainer.epoch + 1
            total = trainer.epochs
            training_status["current_epoch"] = current
            training_status["total_epochs"] = total
            training_status["progress_percent"] = round((current / total) * 100, 1)
            training_status["message"] = f"Training... Epoch {current}/{total}"

            if hasattr(trainer, "loss_items"):
                training_status["metrics"] = {
                    "box_loss": round(float(trainer.loss_items[0]), 4),
                    "cls_loss": round(float(trainer.loss_items[1]), 4)
                }

    def on_train_start(trainer):
        with training_lock:
            training_status["total_epochs"] = trainer.epochs
            training_status["message"] = f"Training gestartet... 0/{trainer.epochs}"

    try:
        # --------------------------------------------------
        # Dataset sanity check (YOLO format!)
        # --------------------------------------------------
        train_labels = list((config.dataset_path / "train" / "labels").glob("*.txt"))
        if not train_labels:
            raise RuntimeError(
                "YOLO dataset invalid: no train/labels/*.txt found"
            )

        # --------------------------------------------------
        # dataset.yaml (must exist!)
        # --------------------------------------------------
        dataset_yaml = config.dataset_path / "dataset.yaml"
        if not dataset_yaml.exists():
            raise RuntimeError("dataset.yaml not found. Run /dataset/finish first.")

        # --------------------------------------------------
        # Archive old model
        # --------------------------------------------------
        ModelManager.archive_active_model()

        # --------------------------------------------------
        # Load base model
        # --------------------------------------------------
        with training_lock:
            training_status["message"] = "Lade Modell..."

        model = YOLO(config.model_arch)

        model.add_callback("on_train_start", on_train_start)
        model.add_callback("on_train_epoch_end", on_train_epoch_end)

        # --------------------------------------------------
        # Train
        # --------------------------------------------------
        with training_lock:
            training_status["message"] = "Starte Training..."
            training_status["total_epochs"] = config.epochs

        results = model.train(
            data=str(dataset_yaml),
            epochs=config.epochs,
            batch=config.batch_size,
            imgsz=config.img_size,
            device=config.device,  # auto / cuda
            project=str(config.dataset_path.parent),
            name=f"train_{job_id}",
            pretrained=True,
            verbose=True
        )

        # --------------------------------------------------
        # Save best model
        # --------------------------------------------------
        best_model_path = Path(results.save_dir) / "weights" / "best.pt"
        if not best_model_path.exists():
            raise RuntimeError("Training finished but best.pt not found")

        ModelManager.save_active_model(best_model_path)
        invalidate_model_cache()

        with training_lock:
            training_status["is_running"] = False
            training_status["finished_at"] = datetime.now().isoformat()
            training_status["status"] = "completed"
            training_status["progress_percent"] = 100
            training_status["message"] = "Training erfolgreich abgeschlossen!"
            training_status["result"] = {
                "active_model": str(ModelManager.get_active_model_path()),
                "run_dir": str(results.save_dir),
                "epochs_trained": config.epochs
            }

    except Exception as e:
        import traceback
        print("[TRAINING ERROR]", traceback.format_exc())

        with training_lock:
            training_status["is_running"] = False
            training_status["finished_at"] = datetime.now().isoformat()
            training_status["status"] = "failed"
            training_status["message"] = str(e)
            training_status["result"] = None


@router.post("/train", status_code=202)
async def start_training(
        user: CURRENT_ADMIN_USER,  # Nur Admin
        request: TrainRequest = None
):
    """
    Starts model training asynchronously (YOLO format).
    The training runs in the background. Use GET /train/status to check progress.

    Prerequisites:
    - Dataset must be finalized via POST /dataset/finish
      Expected structure:
        output/
          dataset.yaml
          train/images/*.jpg
          train/labels/*.txt
          val/images/*.jpg
          val/labels/*.txt
    """
    global training_status

    # --------------------------------------------------
    # Check if training is already running
    # --------------------------------------------------
    with training_lock:
        if training_status["is_running"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Training is already in progress. Check /train/status for details."
            )

    # --------------------------------------------------
    # Validate YOLO dataset exists
    # --------------------------------------------------
    dataset_yaml = OUTPUT_DIR / "dataset.yaml"

    train_dir = OUTPUT_DIR / "train"
    val_dir = OUTPUT_DIR / "val"

    train_images_dir = train_dir / "images"
    train_labels_dir = train_dir / "labels"

    val_images_dir = val_dir / "images"
    val_labels_dir = val_dir / "labels"

    if not dataset_yaml.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dataset.yaml not found. Please finalize dataset first via POST /dataset/finish"
        )

    if not train_images_dir.exists() or not any(train_images_dir.glob("*.jpg")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No training images found in output/train/images. Please finalize dataset first."
        )

    if not train_labels_dir.exists() or not any(train_labels_dir.glob("*.txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No YOLO label files found in output/train/labels. Please finalize dataset first."
        )

    if not val_images_dir.exists() or not any(val_images_dir.glob("*.jpg")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No validation images found in output/val/images. Please finalize dataset first."
        )

    if not val_labels_dir.exists() or not any(val_labels_dir.glob("*.txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No YOLO label files found in output/val/labels. Please finalize dataset first."
        )

    # --------------------------------------------------
    # Prepare training config (GPU auto)
    # --------------------------------------------------
    def resolve_device(preferred: str | None = None) -> str:
        """
        Resolve training device deterministically.
        preferred:
          - None or "auto": choose cuda:0 if available else cpu
          - explicit string like "cuda:0" or "cpu": return as-is
        """
        if preferred and preferred != "auto":
            return preferred

        try:
            import torch
            return "cuda:0" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    config = TrainingConfig(
        dataset_path=OUTPUT_DIR,
        epochs=request.epochs if request else 50,
        batch_size=request.batch_size if request else 16,
        model_arch=request.model_arch if request else "yolov8n.pt",
        img_size=512,
        device=resolve_device("auto")
    )

    print("DEVICE ", config.device)

    # --------------------------------------------------
    # Generate job ID
    # --------------------------------------------------
    job_id = str(uuid.uuid4())[:8]

    # --------------------------------------------------
    # Update status
    # --------------------------------------------------
    with training_lock:
        training_status["is_running"] = True
        training_status["job_id"] = job_id
        training_status["started_at"] = datetime.now().isoformat()
        training_status["finished_at"] = None
        training_status["status"] = "running"
        training_status["message"] = "Training wird vorbereitet..."
        training_status["result"] = None
        training_status["current_epoch"] = 0
        training_status["total_epochs"] = config.epochs
        training_status["progress_percent"] = 0
        training_status["metrics"] = {}

    # --------------------------------------------------
    # Start training in background thread
    # --------------------------------------------------
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
        "started_by": user.username,
        "config": {
            "epochs": config.epochs,
            "batch_size": config.batch_size,
            "model_arch": config.model_arch,
            "img_size": config.img_size,
            "device": config.device
        }
    }


@router.get("/train/status", status_code=200)
async def get_training_status(user: CURRENT_ADMIN_USER):  # Nur Admin
    """
    Returns the current training status with progress information.

    Possible statuses:
    - idle: No training has been started
    - running: Training is in progress
    - completed: Training finished successfully
    - failed: Training failed with an error

    Requires: Admin role
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
            "current_epoch": training_status["current_epoch"],
            "total_epochs": training_status["total_epochs"],
            "progress_percent": training_status["progress_percent"],
            "metrics": training_status["metrics"]
        }


# ===================================================================
# LIST DATASET PATCHES (für Dataset Page - Labeler + Admin) - mit Paging
# ===================================================================

@router.get("/dataset/patches", status_code=200)
async def list_dataset_patches(
        user: CURRENT_LABELER_USER,
        skip: int = 0,
        limit: int = 42
):
    """
    Lists patches in the dataset with pagination.

    Parameters:
    - skip: Page number (0-indexed)
    - limit: Patches per page (default 42, max 100)
    """
    limit = min(limit, 100)

    all_patch_files = sorted(PATCHES_DIR.glob("*.jpg"))
    total_all = len(all_patch_files)

    # Pagination
    start_idx = skip * limit
    end_idx = start_idx + limit
    page_files = all_patch_files[start_idx:end_idx]

    patches = []
    for patch_file in page_files:
        ann_file = ANNOTATIONS_DIR / f"{patch_file.name}.json"
        annotation = None
        annotation_count = 0

        if ann_file.exists():
            try:
                with open(ann_file, "r") as f:
                    annotation = json.load(f)
                    annotation_count = len(annotation.get("annotations", []))
            except:
                pass

        patches.append({
            "filename": patch_file.name,
            "has_annotation": ann_file.exists(),
            "annotation_count": annotation_count,
            "annotation": annotation
        })

    # Count labeled/unlabeled (scan all)
    labeled_count = 0
    for patch_file in all_patch_files:
        if (ANNOTATIONS_DIR / f"{patch_file.name}.json").exists():
            labeled_count += 1

    return {
        "total": total_all,
        "page": skip,
        "limit": limit,
        "total_pages": (total_all + limit - 1) // limit if limit > 0 else 0,
        "labeled_count": labeled_count,
        "unlabeled_count": total_all - labeled_count,
        "patches": patches
    }


@router.get("/dataset/patch/{patch_filename}/image", status_code=200)
async def get_patch_image(
        patch_filename: str,
        user: CURRENT_LABELER_USER  # Nur Labeler + Admin
):
    """
    Returns a patch image from the dataset.
    Used on the Dataset management page.

    Requires: Labeler or Admin role
    """
    patch_path = PATCHES_DIR / patch_filename

    if not patch_path.exists() or not patch_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patch '{patch_filename}' not found"
        )

    # Security check
    try:
        patch_path.resolve().relative_to(PATCHES_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return FileResponse(patch_path)


# ===================================================================
# DELETE RAW IMAGE (Labeler or Admin)
# ===================================================================
# Add this endpoint to labeling.py

@router.delete("/image/{filename}", status_code=200)
async def delete_raw_image(
        filename: str,
        user: CURRENT_LABELER_USER
):
    """
    Deletes a raw SDO image from storage/datasets/images_raw.

    Required role: Labeler or Admin

    WARNING: This permanently deletes the image file!
    Associated patches in storage/datasets/patches are NOT automatically deleted.
    """
    image_path = IMAGES_DIR / filename

    if not image_path.exists() or not image_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{filename}' not found"
        )

    # Security check - prevent path traversal
    try:
        image_path.resolve().relative_to(IMAGES_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    try:
        image_path.unlink()
        return {
            "success": True,
            "message": f"Image '{filename}' deleted successfully",
            "deleted_file": filename
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting image: {str(e)}"
        )