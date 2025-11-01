from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from datetime import datetime
from pathlib import Path
import shutil
from backend.core.config import settings
from backend.core.dependencies import CURRENT_ACTIVE_USER
from machine_learning.utils.processing_pipeline import ProcessingPipeline

router = APIRouter(
    prefix="/classifier",
    tags=["classifier"]
)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
        user: CURRENT_ACTIVE_USER,
        file: UploadFile = File(...),
        observation_date: str = Form(...)
):
    """
    Uploads an image for image processing and classification.
    Saves the image in "storage/uploads"
    """
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )

    try:
        if 'T' in observation_date or ' ' in observation_date:
            observation_date = observation_date.replace(' ', 'T')
            parsed_date = datetime.fromisoformat(observation_date)
        else:
            parsed_date = datetime.fromisoformat(observation_date + "T00:00:00")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS). Error: {str(e)}"
        )

    uploads_dir = Path(settings.STORAGE_PATH) / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    filename = file.filename
    file_path = uploads_dir / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

    return {
        "message": "File uploaded successfully",
        "filename": filename,
        "original_filename": file.filename,
        "observation_datetime": parsed_date.isoformat(),
        "observation_date": parsed_date.date().isoformat(),
        "observation_time": parsed_date.time().isoformat(),
        "file_path": str(file_path),
        "uploaded_by": user.username
    }


@router.get("/image/{filename}", status_code=status.HTTP_200_OK)
async def get_image(
        filename: str,
        user: CURRENT_ACTIVE_USER
):
    """
    Get an uploaded image from the "uploads" folder inside "storage"
    """
    uploads_dir = Path(settings.STORAGE_PATH) / "uploads"
    file_path = uploads_dir / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image {filename} not found"
        )

    try:
        file_path.resolve().relative_to(uploads_dir.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return FileResponse(file_path)


@router.post("/process/{filename}", status_code=status.HTTP_200_OK)
async def process_image(
        filename: str,
        user: CURRENT_ACTIVE_USER,
        observation_date: str = Form(...),
        patch_size: int = Form(512)
):
    """
    Process an uploaded image to detect and extract sunspot patches.

    Args:
        filename: Name of the uploaded image file
        observation_date: Date and time of the observation (ISO format)
        patch_size: Size of the extracted patches (default: 512)

    Returns:
        JSON with detected patches including:
        - filename: Generated filename for the patch
        - px, py: Pixel coordinates in the original image
        - center_x, center_y: Center of the sun disk
        - radius: Radius of the sun disk
        - image_base64: Base64-encoded patch image
    """
    uploads_dir = Path(settings.STORAGE_PATH) / "uploads"
    file_path = uploads_dir / filename

    # Check if file exists
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image {filename} not found"
        )

    # Validate file path (prevent directory traversal)
    try:
        file_path.resolve().relative_to(uploads_dir.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Parse observation date
    try:
        if 'T' in observation_date or ' ' in observation_date:
            observation_date = observation_date.replace(' ', 'T')
            parsed_date = datetime.fromisoformat(observation_date)
        else:
            parsed_date = datetime.fromisoformat(observation_date + "T00:00:00")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS). Error: {str(e)}"
        )

    # Validate patch size
    if patch_size < 64 or patch_size > 2048:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patch size must be between 64 and 2048"
        )

    try:
        # Process the image
        result = ProcessingPipeline.process_image_from_path(
            str(file_path),
            parsed_date,
            patch_size
        )

        # Convert numpy types to Python native types for JSON serialization
        patches = result.get("patches", [])
        serializable_patches = []

        for patch in patches:
            serializable_patch = {
                "filename": str(patch["filename"]),
                "px": int(patch["px"]),
                "py": int(patch["py"]),
                "datetime": str(patch["datetime"]),
                "center_x": int(patch["center_x"]),
                "center_y": int(patch["center_y"]),
                "radius": float(patch["radius"]),
                "image_base64": str(patch["image_base64"])
            }
            serializable_patches.append(serializable_patch)

        return {
            "message": "Image processed successfully",
            "filename": filename,
            "observation_datetime": parsed_date.isoformat(),
            "patch_size": patch_size,
            "patches_count": len(serializable_patches),
            "patches": serializable_patches,
            "processed_by": user.username
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )
