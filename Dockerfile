# SolarSpotting Backend - SLIM (Inference only)
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# PyTorch CPU-only (viel kleiner als mit CUDA)
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Numpy (stabile 1.x Version) und Ultralytics
RUN pip install --no-cache-dir "numpy>=1.26.0,<2.0.0" ultralytics==8.3.233

# ML Modul OHNE [train] extras - nur Basis-Dependencies
COPY machine_learning/ ./machine_learning/
RUN pip install --no-cache-dir -e "./machine_learning"

# Backend Code
COPY backend/ ./backend/

# PYTHONPATH setzen damit machine_learning als Modul importierbar ist
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Storage-Verzeichnisse
RUN mkdir -p /app/storage/models/active \
             /app/storage/datasets/images_raw \
             /app/storage/datasets/output \
             /app/storage/demo/raw

# Demo-Bilder kopieren
COPY storage/demo/raw/ /app/storage/demo/raw/

# Trainiertes Modell ist bereits in machine_learning/models/active/best.pt
# (wird mit COPY machine_learning/ oben mitkopiert)

WORKDIR /app

EXPOSE 8000

CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}