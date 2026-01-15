# SolarSpotting Backend - ULTRALYTICS BASE IMAGE
# Garantiert kompatible numpy/torch/ultralytics Versionen
FROM ultralytics/ultralytics:latest-cpu

WORKDIR /app

# -------------------------------------------------------------------
# 1 Backend dependencies
# -------------------------------------------------------------------
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# -------------------------------------------------------------------
# 2 ML Module
# -------------------------------------------------------------------
COPY machine_learning/ ./machine_learning/
RUN pip install --no-cache-dir -e ./machine_learning

# -------------------------------------------------------------------
# 3 Backend code
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