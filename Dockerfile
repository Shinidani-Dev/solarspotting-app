# SolarSpotting Backend + ML Dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies für OpenCV, psycopg2 build, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Backend dependencies zuerst (für besseres Caching)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Machine Learning Modul installieren (mit train extras für torch/ultralytics)
COPY machine_learning/ ./machine_learning/
RUN pip install --no-cache-dir -e "./machine_learning[train]"

# Backend Code kopieren
COPY backend/ ./backend/

# Storage-Verzeichnisse erstellen
RUN mkdir -p /app/storage/models/active \
             /app/storage/datasets/images_raw \
             /app/storage/datasets/output

WORKDIR /app/backend

# Port wird von Railway als $PORT übergeben
EXPOSE 8000

# Uvicorn mit dynamischem Port
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}