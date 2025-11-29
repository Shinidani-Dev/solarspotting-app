from pathlib import Path


# ---------------------------------------------------------
# PROJECT ROOT
# ---------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
print(f"[SETTINGS] PROJECT_ROOT = {PROJECT_ROOT}")

# ---------------------------------------------------------
# STORAGE PATHS
# ---------------------------------------------------------
STORAGE_DIR = PROJECT_ROOT / "storage"
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
# ML MODEL PATHS
# ---------------------------------------------------------
ML_MODELS_DIR = PROJECT_ROOT / "machine_learning" / "models"
ML_MODELS_ACTIVE = ML_MODELS_DIR / "active"
ML_MODELS_ARCHIVE = ML_MODELS_DIR / "archive"

ACTIVE_MODEL_PATH = ML_MODELS_ACTIVE / "best.pt"


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
