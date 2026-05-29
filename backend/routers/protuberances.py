import base64
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

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


def draw_circle_overlay(image: np.ndarray, cx: int, cy: int, r: float) -> np.ndarray:
    """Draw detected sun disk circle and center cross on the image."""
    overlay = image.copy()
    ri = int(round(r))

    # Sun disk circle
    cv2.circle(overlay, (cx, cy), ri, (0, 255, 100), 4)

    # Center crosshair
    arm = max(30, ri // 20)
    cv2.line(overlay, (cx - arm, cy), (cx + arm, cy), (0, 220, 255), 3)
    cv2.line(overlay, (cx, cy - arm), (cx, cy + arm), (0, 220, 255), 3)
    cv2.circle(overlay, (cx, cy), 6, (0, 220, 255), -1)

    return overlay


@router.post("/detect-circle")
async def detect_circle(file: UploadFile = File(...)):
    """
    Accepts a solar image, detects the sun disk circle, and returns
    the center coordinates (cx, cy), radius (r), and an annotated image.
    """
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)

    gray = ImageProcessor.convert_to_grayscale(image)
    _, _, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)

    annotated = draw_circle_overlay(image, cx, cy, r)

    return JSONResponse({
        "cx": int(cx),
        "cy": int(cy),
        "r": float(r),
        "annotated": encode_png_b64(annotated),
    })
