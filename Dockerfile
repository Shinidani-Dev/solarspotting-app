# SolarSpotting Backend - CPU Inference
FROM python:3.10-slim

WORKDIR /app

# System dependencies (OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# -------------------------------------------------------------------
# 1️⃣ NumPy FIRST (stabile Version)
# -------------------------------------------------------------------
RUN pip install --no-cache-dir numpy==1.26.4

# -------------------------------------------------------------------
# 2️⃣ PyTorch CPU-only
# -------------------------------------------------------------------
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# -------------------------------------------------------------------
# 3️⃣ Backend dependencies (ohne numpy/torch)
# -------------------------------------------------------------------
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# -------------------------------------------------------------------
# 4️⃣ Ultralytics (YOLO)
# -------------------------------------------------------------------
RUN pip install --no-cache-dir ultralytics==8.3.233

# -------------------------------------------------------------------
# 5️⃣ ML Module (editable)
# -------------------------------------------------------------------
COPY machine_learning/ ./machine_learning/
RUN pip install --no-cache-dir -e ./machine_learning

# -------------------------------------------------------------------
# 6️⃣ Backend code
# -------------------------------------------------------------------
COPY backend/ ./backend/

# PYTHONPATH
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Storage dirs
RUN mkdir -p /app/storage/models/active \
             /app/storage/datasets/images_raw \
             /app/storage/datasets/output \
             /app/storage/demo/raw

# Demo images
COPY storage/demo/raw/ /app/storage/demo/raw/

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
