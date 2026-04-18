import io
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from machine_learning.utils.image_processor import ImageProcessor

router = APIRouter(
    prefix="/image-processing",
    tags=["image-processing"],
)


def decode_upload(file: UploadFile) -> np.ndarray:
    data = np.frombuffer(file.file.read(), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")
    return image


def encode_to_streaming_response(image: np.ndarray) -> StreamingResponse:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise HTTPException(status_code=500, detail="Could not encode image.")
    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/png")


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
async def multi_otsu(file: UploadFile = File(...)):
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    gray = ImageProcessor.convert_to_grayscale(image)
    filtered = ImageProcessor.bilateral_filter(gray)
    result = ImageProcessor.segment_multi_levels_otsu(filtered)
    return encode_to_streaming_response(result)


@router.post("/binarized")
async def binarized(file: UploadFile = File(...)):
    image = decode_upload(file)
    image = ImageProcessor.resize_to_2k(image)
    gray = ImageProcessor.convert_to_grayscale(image)
    filtered = ImageProcessor.bilateral_filter(gray)
    segmented = ImageProcessor.segment_multi_levels_otsu(filtered)
    bin_mask = ImageProcessor.binarize_from_multiotsu_output(segmented)
    result = (bin_mask * 255).astype(np.uint8)
    return encode_to_streaming_response(result)
