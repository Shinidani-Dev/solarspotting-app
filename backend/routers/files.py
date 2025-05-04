from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from backend.core.dependencies import CURRENT_ACTIVE_USER
from backend.core.config import settings
import os
import uuid
from pathlib import Path
from backend.helpers.LoggingHelper import LoggingHelper as logger

router = APIRouter(
    prefix="/files",
    tags=["files"]
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif"}
ALLOWED_PDF_TYPES = {"application/pdf"}


# Initialize storage directories
def ensure_storage_directories():
    """Ensure storage directories exist"""
    # Create directories if they don't exist
    storage_path = Path(settings.STORAGE_PATH)
    sdo_dir = storage_path / "sdo_images"
    protocols_dir = storage_path / "daily_protocols"

    os.makedirs(sdo_dir, exist_ok=True)
    os.makedirs(protocols_dir, exist_ok=True)

    logger.info(f"Storage directories initialized: {storage_path}", module="files")


# Call this function when the app starts
ensure_storage_directories()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
        file: UploadFile = File(...),
        file_type: str = Form(...),  # 'sdo' or 'protocol'
        user=CURRENT_ACTIVE_USER,
):
    """Upload file endpoint for SDO images and daily protocols"""

    # Validate file type
    if file_type == 'sdo' and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SDO image must be one of the following formats: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    if file_type == 'protocol' and file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily protocol must be a PDF file"
        )

    # Determine storage path based on type
    directory = "sdo_images" if file_type == 'sdo' else "daily_protocols"

    # Create full storage path
    storage_path = Path(settings.STORAGE_PATH) / directory

    # Create directory if it doesn't exist
    os.makedirs(storage_path, exist_ok=True)

    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    # Full file path
    file_path = storage_path / unique_filename

    # Write file to storage
    logger.info(f"Saving file to {file_path}", module="files.upload")
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Return relative path for storage in the database
    relative_path = f"/storage/{directory}/{unique_filename}"

    return {"filePath": relative_path}
