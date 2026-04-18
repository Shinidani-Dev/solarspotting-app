import io
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional

from machine_learning.utils.image_processor import ImageProcessor

router = APIRouter(
    prefix="/image-processing",
    tags=["image-processing"],
)

DEFAULT_COLORS = [
    (255,   0,   0),  # class 0 — red
    (  0, 255,   0),  # class 1 — green
    (  0,   0, 255),  # class 2 — blue
]


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


def encode_to_streaming_response(image: np.ndarray):
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise HTTPException(status_code=500, detail="Could not encode image.")
    from fastapi.responses import StreamingResponse
    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/png")


def parse_color(raw: Optional[str]) -> Optional[tuple]:
    """Parse 'R,G,B' string into a (R, G, B) tuple, or None if not provided."""
    if not raw:
        return None
    try:
        parts = [int(x.strip()) for x in raw.split(",")]
        if len(parts) != 3:
            raise ValueError
        return tuple(parts)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid color format '{raw}'. Expected 'R,G,B'.")


def apply_mask_overlay(
    original: np.ndarray,
    mask: np.ndarray,
    colors: list[tuple],
    alpha: float,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Build a colored mask image and an alpha-blended overlay on the original.

    mask values:
      - binary (0/1): foreground=1 → colors[0]
      - multi-class (0..N): each unique value maps to colors[index]

    Returns (mask_img, overlay_img) both as BGR uint8.
    """
    if original.ndim == 2:
        base = cv2.cvtColor(original, cv2.COLOR_GRAY2BGR)
    else:
        base = original.copy()

    h, w = base.shape[:2]
    mask_img = np.zeros((h, w, 3), dtype=np.uint8)

    unique_vals = sorted(v for v in np.unique(mask) if v != 0)
    for idx, val in enumerate(unique_vals):
        color_rgb = colors[idx] if idx < len(colors) else DEFAULT_COLORS[idx % len(DEFAULT_COLORS)]
        color_bgr = (color_rgb[2], color_rgb[1], color_rgb[0])
        mask_img[mask == val] = color_bgr

    overlay = base.astype(np.float32)
    color_layer = mask_img.astype(np.float32)
    fg = (mask_img.sum(axis=2) > 0)
    fg3 = np.stack([fg] * 3, axis=-1)
    overlay[fg3] = overlay[fg3] * (1 - alpha) + color_layer[fg3] * alpha
    overlay_img = np.clip(overlay, 0, 255).astype(np.uint8)

    return mask_img, overlay_img


@router.post("/grayscale")
async def grayscale(file: UploadFile = File(...)):
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    result = ImageProcessor.convert_to_grayscale(image)
    return encode_to_streaming_response(result)


@router.post("/bilateral")
async def bilateral(file: UploadFile = File(...)):
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    gray = ImageProcessor.convert_to_grayscale(image)
    result = ImageProcessor.bilateral_filter(gray)
    return encode_to_streaming_response(result)


@router.post("/multi-otsu")
async def multi_otsu(
    file: UploadFile = File(...),
    mask_color_1: Optional[str] = Form(None),
    mask_color_2: Optional[str] = Form(None),
    mask_color_3: Optional[str] = Form(None),
    alpha: float = Form(0.5),
):
    image = decode_upload(file)
    original = ImageProcessor.resize_to_2k(image)
    gray = ImageProcessor.convert_to_grayscale(original)
    filtered = ImageProcessor.bilateral_filter(gray)
    segmented = ImageProcessor.segment_multi_levels_otsu(filtered)

    colors = [
        parse_color(mask_color_1) or DEFAULT_COLORS[0],
        parse_color(mask_color_2) or DEFAULT_COLORS[1],
        parse_color(mask_color_3) or DEFAULT_COLORS[2],
    ]

    mask_img, overlay_img = apply_mask_overlay(original, segmented, colors, alpha)

    return JSONResponse({
        "processed": encode_png_b64(segmented),
        "mask":      encode_png_b64(mask_img),
        "overlay":   encode_png_b64(overlay_img),
    })


@router.post("/binarized")
async def binarized(
    file: UploadFile = File(...),
    mask_color_1: Optional[str] = Form(None),
    alpha: float = Form(0.5),
):
    image = decode_upload(file)
    original = ImageProcessor.resize_to_2k(image)
    gray = ImageProcessor.convert_to_grayscale(original)
    filtered = ImageProcessor.bilateral_filter(gray)
    segmented = ImageProcessor.segment_multi_levels_otsu(filtered)
    bin_mask = ImageProcessor.binarize_from_multiotsu_output(segmented)

    colors = [parse_color(mask_color_1) or DEFAULT_COLORS[0]]

    mask_img, overlay_img = apply_mask_overlay(original, bin_mask, colors, alpha)

    return JSONResponse({
        "processed": encode_png_b64((bin_mask * 255).astype(np.uint8)),
        "mask":      encode_png_b64(mask_img),
        "overlay":   encode_png_b64(overlay_img),
    })
