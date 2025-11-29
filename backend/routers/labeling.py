import base64
import json
import shutil
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import List

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, status, Form
from fastapi.responses import FileResponse

from backend.core.config import settings
from backend.core.dependencies import CURRENT_ACTIVE_USER
from machine_learning.utils.processing_pipeline import ProcessingPipeline
from machine_learning.utils.mapper import to_native
from machine_learning.utils.annotation_balancer import AnnotationBalancer

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

# Create required directories
for p in [DATASET_ROOT, IMAGES_DIR, PATCHES_DIR, ANNOTATIONS_DIR, OUTPUT_DIR]:
    p.mkdir(parents=True, exist_ok=True)


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
# SAVE PATCH ANNOTATIONS
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
        "annotation_file": ann_path.name
    }

# ===================================================================
# FINISH DATASET → CREATE TRAIN/VAL SPLIT (70/30)
# ===================================================================
@router.post("/dataset/finish", status_code=200)
async def finalize_dataset(user: CURRENT_ACTIVE_USER):

    # 1. Clean output dir
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    train_dir = OUTPUT_DIR / "train"
    val_dir   = OUTPUT_DIR / "val"

    (train_dir / "images").mkdir(parents=True, exist_ok=True)
    (val_dir / "images").mkdir(parents=True, exist_ok=True)

    # 2. Load annotation files
    annotation_files = sorted(ANNOTATIONS_DIR.glob("*.json"))
    if not annotation_files:
        raise HTTPException(status_code=400, detail="No annotations found.")

    # 3. Parse all annotations and collect classes
    global_categories = {}
    next_cat_id = 1
    parsed_annotations = []

    for ann_file in annotation_files:
        with open(ann_file, "r") as f:
            data = json.load(f)

        for ann in data.get("annotations", []):
            cls = ann["class"]
            if cls not in global_categories:
                global_categories[cls] = next_cat_id
                next_cat_id += 1

        parsed_annotations.append((ann_file, data))

    # 4. BALANCE BY ANNOTATIONS
    train_annots, val_annots, stats = AnnotationBalancer.balance_by_annotation(parsed_annotations)

    print("[BALANCE-ANNOTATION INFO]", stats)

    # 5. Build COCO structure per split
    def build_coco_for_annotations(annots, images_dir, output_json):

        images_coco = []
        annotations_coco = []
        ann_id = 1
        img_id = 1

        # Group annotations by patch file
        patch_to_annots = defaultdict(list)
        for ann in annots:
            patch_to_annots[ann["patch_file"]].append(ann)

        for patch_file, annotations in patch_to_annots.items():

            src_patch_path = PATCHES_DIR / patch_file
            if not src_patch_path.exists():
                print("[WARN] Missing patch:", patch_file)
                continue

            dst_path = images_dir / patch_file
            shutil.copy(src_patch_path, dst_path)

            images_coco.append({
                "id": img_id,
                "file_name": patch_file,
                "width": 512,
                "height": 512
            })

            for ann in annotations:
                cls = ann["class"]
                cat_id = global_categories[cls]

                x, y, w, h = ann["bbox"]
                area = float(w * h)

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

        # Categories
        categories_list = [
            {"id": cid, "name": cname}
            for cname, cid in global_categories.items()
        ]

        coco = {
            "info": {
                "description": "SolarSpotting Dataset",
                "version": "1.0",
                "year": datetime.now().year,
            },
            "licenses": [],
            "images": images_coco,
            "annotations": annotations_coco,
            "categories": categories_list
        }

        with open(output_json, "w") as f:
            json.dump(coco, f, indent=4)

        return len(images_coco), len(annotations_coco)

    # Build both sets
    train_images, train_ann = build_coco_for_annotations(
        train_annots, train_dir / "images", train_dir / "annotations.json"
    )

    val_images, val_ann = build_coco_for_annotations(
        val_annots, val_dir / "images", val_dir / "annotations.json"
    )

    # ZIP result
    zip_path = OUTPUT_DIR / "dataset.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(train_dir / "annotations.json", arcname="train/annotations.json")
        for f in (train_dir / "images").iterdir():
            zipf.write(f, arcname=f"train/images/{f.name}")

        zipf.write(val_dir / "annotations.json", arcname="val/annotations.json")
        for f in (val_dir / "images").iterdir():
            zipf.write(f, arcname=f"val/images/{f.name}")

    return {
        "message": "Dataset created successfully",
        "zip_file": str(zip_path),
        "train_annotations": train_ann,
        "val_annotations": val_ann,
        "balance_stats": stats
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

    Args:
        patch_file: Dateiname des Patches (z.B. "20240809_154500_patch_px221_py606.jpg")

    Returns:
        {
          "patch_deleted": true/false,
          "annotation_deleted": true/false
        }
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

