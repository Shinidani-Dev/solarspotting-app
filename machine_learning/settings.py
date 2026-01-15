import os
from pathlib import Path


# ---------------------------------------------------------
# PROJECT ROOT
# ---------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
print(f"[SETTINGS] PROJECT_ROOT = {PROJECT_ROOT}")

# ---------------------------------------------------------
# STORAGE PATHS (from ENV or default)
# ---------------------------------------------------------
STORAGE_DIR = Path(os.getenv("STORAGE_PATH", PROJECT_ROOT / "storage"))
DATASETS_DIR = STORAGE_DIR / "datasets"
RAW_PATCHES_DIR = STORAGE_DIR / "patches"
RAW_ANNOTATIONS_DIR = STORAGE_DIR / "annotations"

# Output from /dataset/finish
DATASET_OUTPUT_DIR = DATASETS_DIR / "output"

TRAIN_IMAGES_DIR = DATASET_OUTPUT_DIR / "train" / "images"
VAL_IMAGES_DIR = DATASET_OUTPUT_DIR / "val" / "images"

TRAIN_ANN_FILE = DATASET_OUTPUT_DIR / "train" / "annotations.json"
VAL_ANN_FILE = DATASET_OUTPUT_DIR / "val" / "annotations.json"


# ---------------------------------------------------------
# ML MODEL PATHS (from ENV or default)
# ---------------------------------------------------------
_default_models_dir = PROJECT_ROOT / "machine_learning" / "models"
ML_MODELS_DIR = Path(os.getenv("ML_MODELS_DIR", _default_models_dir))
ML_MODELS_ACTIVE = ML_MODELS_DIR / "active"
ML_MODELS_ARCHIVE = ML_MODELS_DIR / "archive"

# Model path: check ENV first, then default
ACTIVE_MODEL_PATH = Path(os.getenv("MODEL_PATH", ML_MODELS_ACTIVE / "best.pt"))

print(f"[SETTINGS] STORAGE_DIR = {STORAGE_DIR}")
print(f"[SETTINGS] ACTIVE_MODEL_PATH = {ACTIVE_MODEL_PATH}")


# ---------------------------------------------------------
# PATCH & ANNOTATION INPUT (user labeling)
# ---------------------------------------------------------
INPUT_ANNOTATIONS_DIR = DATASETS_DIR / "annotations"
INPUT_PATCHES_DIR = DATASETS_DIR / "patches"


# ---------------------------------------------------------
# ENSURE DIRECTORIES EXIST
# ---------------------------------------------------------
def ensure_dirs():
    for d in [
        STORAGE_DIR, DATASETS_DIR,
        DATASET_OUTPUT_DIR,
        ML_MODELS_DIR, ML_MODELS_ACTIVE, ML_MODELS_ARCHIVE,
        INPUT_ANNOTATIONS_DIR, INPUT_PATCHES_DIR,
    ]:
        d.mkdir(parents=True, exist_ok=True)

ensure_dirs()