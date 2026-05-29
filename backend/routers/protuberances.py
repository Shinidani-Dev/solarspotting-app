import base64
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from skimage.filters import threshold_multiotsu

from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.utils.processing_pipeline import ProcessingPipeline

router = APIRouter(
    prefix="/protuberances",
    tags=["protuberances"],
)


def decode_upload(file: UploadFile) -> np.ndarray:
    data = np.frombuffer(file.file.read(), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")
    return image


def encode_png_b64(image: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise HTTPException(status_code=500, detail="Could not encode image.")
    return base64.b64encode(buffer.tobytes()).decode()


def draw_disk_annotation(image: np.ndarray, cx: int, cy: int, r: float, r_outer: float) -> np.ndarray:
    """Draw disk circle, outer search boundary, and center cross on the image."""
    out = image.copy()
    ri = int(round(r))
    ro = int(round(r_outer))

    cv2.circle(out, (cx, cy), ri, (0, 255, 100), 3)
    cv2.circle(out, (cx, cy), ro, (0, 180, 255), 2)

    arm = max(30, ri // 20)
    cv2.line(out, (cx - arm, cy), (cx + arm, cy), (0, 220, 255), 2)
    cv2.line(out, (cx, cy - arm), (cx, cy + arm), (0, 220, 255), 2)
    cv2.circle(out, (cx, cy), 5, (0, 220, 255), -1)

    return out


def compute_degree_profile(
    binary: np.ndarray,
    cx: int,
    cy: int,
    r_inner: float,
    r_outer: float,
) -> list[int]:
    """
    Count white pixels in the annular region [r_inner, r_outer] around (cx, cy)
    for each 1-degree wedge (degree 1 = angle [0°,1°), …, degree 360 = angle [359°,360°)).

    Returns a list of 360 integers indexed 0..359 (degree d+1 → index d).
    """
    h, w = binary.shape[:2]
    Y, X = np.mgrid[0:h, 0:w]

    dx = X.astype(np.float32) - cx
    dy = Y.astype(np.float32) - cy
    dist = np.sqrt(dx * dx + dy * dy)

    # Annular mask
    annular = (dist >= r_inner) & (dist <= r_outer)

    # Angle in [0, 360)
    angle = (np.degrees(np.arctan2(dy, dx)) % 360).astype(np.float32)

    # Discretise to degree buckets 0..359 (bucket d covers [d, d+1))
    deg_bucket = np.floor(angle).astype(np.int32)

    # White pixels (255) inside the annulus
    white_annular = annular & (binary > 0)

    # Count per-degree using bincount — O(pixels), no Python loop
    counts = np.bincount(deg_bucket[white_annular], minlength=360)

    return counts.tolist()


@router.post("/detect-circle")
async def detect_circle(file: UploadFile = File(...)):
    """Detect sun disk circle and return cx, cy, r plus annotated image."""
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)

    gray = ImageProcessor.convert_to_grayscale(image)
    _, _, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)

    annotated = draw_disk_annotation(image, cx, cy, r, r + 80)

    return JSONResponse({
        "cx": int(cx),
        "cy": int(cy),
        "r": float(r),
        "annotated": encode_png_b64(annotated),
    })


@router.post("/profile")
async def compute_profile(
    file: UploadFile = File(...),
    r_extension: int = Form(80),
):
    """
    Full protuberance profile pipeline:
      1. Detect sun disk (cx, cy, r)
      2. Bilateral filter
      3. Multi-Otsu 3 classes on full image  → visualisation only
      4. Multi-Otsu 3 classes on annular pixels only → binary (middle class = protuberances)
      5. Count white pixels per 1° wedge in annulus [r, r + r_extension]
    """
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)

    # --- Circle detection ---
    gray = ImageProcessor.convert_to_grayscale(image)
    _, _, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)

    # --- Preprocessing ---
    filtered = ImageProcessor.bilateral_filter(gray)

    # --- Annular region geometry ---
    r_inner = float(r)
    r_outer = r_inner + float(r_extension)
    h, w = filtered.shape[:2]
    Y, X = np.mgrid[0:h, 0:w]
    dist = np.sqrt((X.astype(np.float32) - cx) ** 2 + (Y.astype(np.float32) - cy) ** 2)
    annular_mask = (dist >= r_inner) & (dist <= r_outer)

    # --- Multi-Otsu on FULL image (for visualisation) ---
    thresholds_full = threshold_multiotsu(filtered, classes=3)
    regions_full = np.digitize(filtered, bins=thresholds_full)
    # Color: class 0 = dark gray, class 1 = amber, class 2 = light gray
    multi_otsu_vis = np.zeros((h, w, 3), dtype=np.uint8)
    multi_otsu_vis[regions_full == 0] = (60,  60,  60)    # dark  (BGR)
    multi_otsu_vis[regions_full == 1] = (0,  170, 255)    # amber (BGR)
    multi_otsu_vis[regions_full == 2] = (220, 220, 220)   # light (BGR)
    cv2.circle(multi_otsu_vis, (cx, cy), int(round(r_inner)), (0, 255, 100), 2)
    cv2.circle(multi_otsu_vis, (cx, cy), int(round(r_outer)), (0, 180, 255), 2)

    # --- Binary: Multi-Otsu on ANNULAR pixels only → keep middle class (protuberances) ---
    # Within the annulus the three classes are:
    #   0 = darkest in the band  (disk edge or shadowed limb)
    #   1 = middle               (protuberances – the target)
    #   2 = brightest in the band (sky background or scattered light)
    # Applying the threshold on annular pixels only ensures the split is
    # relative to the local contrast around the limb, not the whole image.
    annular_pixels = filtered[annular_mask]
    thresholds_local = threshold_multiotsu(annular_pixels, classes=3)
    regions_local = np.digitize(filtered, bins=thresholds_local)
    binary = np.zeros(filtered.shape, dtype=np.uint8)
    binary[annular_mask & (regions_local == 1)] = 255

    # --- Per-degree profile ---
    counts = compute_degree_profile(binary, cx, cy, r_inner, r_outer)

    # --- Annotated original ---
    annotated = draw_disk_annotation(image, cx, cy, r, r_outer)

    # --- Binarized visualisation (black bg, white = protuberance candidates) ---
    binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    cv2.circle(binary_bgr, (cx, cy), int(round(r_inner)), (0, 255, 100), 2)
    cv2.circle(binary_bgr, (cx, cy), int(round(r_outer)), (0, 180, 255), 2)

    profile = [{"degree": d + 1, "count": int(counts[d])} for d in range(360)]

    return JSONResponse({
        "cx": int(cx),
        "cy": int(cy),
        "r": float(r),
        "r_inner": r_inner,
        "r_outer": r_outer,
        "annotated":   encode_png_b64(annotated),
        "multi_otsu":  encode_png_b64(multi_otsu_vis),
        "binarized":   encode_png_b64(binary_bgr),
        "profile": profile,
    })
