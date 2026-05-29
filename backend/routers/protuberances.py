import base64
import cv2
import numpy as np
from typing import Optional
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


def draw_compass_marks(
    img: np.ndarray,
    cx: float, cy: float,
    rx: float, ry: float,
    rx_out: float, ry_out: float,
) -> np.ndarray:
    """
    Draw N/W/S/E tick lines and labels on the image.
    N = top (−Y), W = left (−X), S = bottom (+Y), E = right (+X).
    Tick lines run from the inner ellipse to the outer ellipse.
    """
    out = img.copy() if img.ndim == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    cxi, cyi = int(round(cx)), int(round(cy))

    r_ref = (rx_out + ry_out) / 2
    font       = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = max(0.65, r_ref / 950)
    thickness  = max(1, int(r_ref) // 460)
    color      = (255, 255, 255)
    gap        = max(28, int(r_ref) // 22)

    # Solar convention: N=top(−Y), W=right(+X), S=bottom(+Y), E=left(−X)
    # (label, inner_x, inner_y, outer_x, outer_y, label_cx, label_cy)
    marks = [
        ('N', cxi,                     cyi - int(round(ry)),
              cxi,                     cyi - int(round(ry_out)),
              cxi,                     cyi - int(round(ry_out)) - gap),
        ('W', cxi + int(round(rx)),   cyi,                          # right side
              cxi + int(round(rx_out)), cyi,
              cxi + int(round(rx_out)) + gap, cyi),
        ('S', cxi,                     cyi + int(round(ry)),
              cxi,                     cyi + int(round(ry_out)),
              cxi,                     cyi + int(round(ry_out)) + gap),
        ('E', cxi - int(round(rx)),   cyi,                          # left side
              cxi - int(round(rx_out)), cyi,
              cxi - int(round(rx_out)) - gap, cyi),
    ]

    for lbl, x1, y1, x2, y2, lx, ly in marks:
        cv2.line(out, (x1, y1), (x2, y2), color, thickness, cv2.LINE_AA)
        (tw, th), _ = cv2.getTextSize(lbl, font, font_scale, thickness)
        cv2.putText(out, lbl, (lx - tw // 2, ly + th // 2),
                    font, font_scale, color, thickness, cv2.LINE_AA)
    return out


def draw_disk_annotation(
    img: np.ndarray,
    cx: float, cy: float,
    rx: float, ry: float,
    rx_out: float, ry_out: float,
) -> np.ndarray:
    out = img.copy()
    cxi, cyi = int(round(cx)), int(round(cy))

    cv2.ellipse(out, (cxi, cyi),
                (max(1, int(round(rx))), max(1, int(round(ry)))),
                0, 0, 360, (0, 255, 100), 3)
    cv2.ellipse(out, (cxi, cyi),
                (max(1, int(round(rx_out))), max(1, int(round(ry_out)))),
                0, 0, 360, (0, 180, 255), 2)

    arm = max(25, int((rx + ry) / 2) // 20)
    cv2.line(out, (cxi - arm, cyi), (cxi + arm, cyi), (0, 220, 255), 2)
    cv2.line(out, (cxi, cyi - arm), (cxi, cyi + arm), (0, 220, 255), 2)
    cv2.circle(out, (cxi, cyi), 5, (0, 220, 255), -1)

    return draw_compass_marks(out, cx, cy, rx, ry, rx_out, ry_out)


def compute_degree_profile(
    binary: np.ndarray,
    cx: float, cy: float,
    rx: float, ry: float,
    rx_out: float, ry_out: float,
) -> list:
    """
    Count white pixels per 1° wedge in the elliptical annulus.

    Solar PA convention (clockwise from North):
      0° = North (top, −Y)   90° = West (left, −X)
      180° = South (+Y)      270° = East (right, +X)
    """
    h, w = binary.shape[:2]
    Y, X = np.mgrid[0:h, 0:w]
    dx = X.astype(np.float32) - cx
    dy = Y.astype(np.float32) - cy

    inner = (dx / rx) ** 2 + (dy / ry) ** 2
    outer = (dx / rx_out) ** 2 + (dy / ry_out) ** 2
    annular = (inner >= 1.0) & (outer <= 1.0)

    # Solar PA clockwise from North:
    #   0=N(top)  90=W(right in image)  180=S(bottom)  270=E(left in image)
    #   arctan2(dx, −dy): N→0°  right/W→90°  S→180°  left/E→270°
    angle      = (np.degrees(np.arctan2(dx, -dy)) % 360).astype(np.float32)
    deg_bucket = np.floor(angle).astype(np.int32)

    white_annular = annular & (binary > 0)
    counts = np.bincount(deg_bucket[white_annular], minlength=360)
    return counts.tolist()


@router.post("/detect-circle")
async def detect_circle(file: UploadFile = File(...)):
    """Fast circle detection — returns cx, cy, r in 2048×2048 space."""
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    gray  = ImageProcessor.convert_to_grayscale(image)
    _, _, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
    return JSONResponse({"cx": int(cx), "cy": int(cy), "r": float(r)})


@router.post("/profile")
async def compute_profile(
    file:        UploadFile      = File(...),
    r_extension: int             = Form(80),
    cx:          Optional[float] = Form(None),
    cy:          Optional[float] = Form(None),
    rx:          Optional[float] = Form(None),
    ry:          Optional[float] = Form(None),
):
    """
    Full protuberance-profile pipeline.

    cx / cy / rx / ry override auto-detection (pass manually adjusted values).
    rx and ry are the semi-axes of the elliptical disk boundary — use rx=ry for a circle.

    Steps:
      1. Detect (or use provided) ellipse  → cx, cy, rx, ry
      2. Bilateral filter
      3. Multi-Otsu 3-class on full image  → colour visualisation
      4. Multi-Otsu 3-class on annular pixels only → binary (middle class = protuberances)
      5. Count white pixels per 1° solar-PA wedge in the elliptical annulus
    """
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    gray  = ImageProcessor.convert_to_grayscale(image)

    if cx is None or cy is None or rx is None or ry is None:
        _, _, a_cx, a_cy, a_r = (
            ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
        )
        cx = float(a_cx) if cx is None else cx
        cy = float(a_cy) if cy is None else cy
        rx = float(a_r)  if rx is None else rx
        ry = float(a_r)  if ry is None else ry

    rx_out = rx + float(r_extension)
    ry_out = ry + float(r_extension)

    filtered = ImageProcessor.bilateral_filter(gray)

    h, w = filtered.shape[:2]
    Y, X   = np.mgrid[0:h, 0:w]
    dx_g   = X.astype(np.float32) - cx
    dy_g   = Y.astype(np.float32) - cy
    inner  = (dx_g / rx) ** 2 + (dy_g / ry) ** 2
    outer  = (dx_g / rx_out) ** 2 + (dy_g / ry_out) ** 2
    annular_mask = (inner >= 1.0) & (outer <= 1.0)

    # Full-image Multi-Otsu (visualisation)
    t_full       = threshold_multiotsu(filtered, classes=3)
    r_full       = np.digitize(filtered, bins=t_full)
    multi_vis    = np.zeros((h, w, 3), dtype=np.uint8)
    multi_vis[r_full == 0] = ( 60,  60,  60)
    multi_vis[r_full == 1] = (  0, 170, 255)
    multi_vis[r_full == 2] = (220, 220, 220)
    multi_vis = draw_disk_annotation(multi_vis, cx, cy, rx, ry, rx_out, ry_out)

    # Annular-local Multi-Otsu → binary (middle class = protuberances)
    ann_px    = filtered[annular_mask]
    t_local   = threshold_multiotsu(ann_px, classes=3)
    r_local   = np.digitize(filtered, bins=t_local)
    binary    = np.zeros(filtered.shape, dtype=np.uint8)
    binary[annular_mask & (r_local == 1)] = 255

    counts = compute_degree_profile(binary, cx, cy, rx, ry, rx_out, ry_out)

    annotated   = draw_disk_annotation(image.copy(), cx, cy, rx, ry, rx_out, ry_out)
    binary_bgr  = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    binary_bgr  = draw_disk_annotation(binary_bgr, cx, cy, rx, ry, rx_out, ry_out)

    profile = [{"degree": d + 1, "count": int(counts[d])} for d in range(360)]

    return JSONResponse({
        "cx": cx, "cy": cy, "rx": rx, "ry": ry,
        "rx_out": rx_out, "ry_out": ry_out,
        "annotated":  encode_png_b64(annotated),
        "multi_otsu": encode_png_b64(multi_vis),
        "binarized":  encode_png_b64(binary_bgr),
        "profile":    profile,
    })
