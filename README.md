# SolarSpotting

A web application for recording and analyzing sunspots with automatic detection and classification using CNN (YOLOv8).

## Project Structure

```
SolarSpotting/
├── backend/                    # FastAPI Backend
├── frontend/                   # Next.js Frontend
├── machine_learning/           # ML models and training
│   ├── models/
│   │   ├── active/             # Current active model (best.pt, model_metrics.json)
│   │   └── archive/            # Archived models (timestamped)
└── storage/                    # Data storage
    └── datasets/
        ├── annotations/        # JSON annotation files
        ├── archive/            # Archived datasets
        ├── images_raw/         # Uploaded SDO images
        ├── output/             # YOLO training data (train/val split)
        └── patches/            # Generated image patches
```

> **Note:** The `storage/datasets/` folder structure must be created manually before first use. The subfolders are populated automatically by the application.

> **Model Management:** When a new model is trained, the current active model is automatically moved to `archive/` with a timestamp, and the new model replaces it in `active/`.

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL database
- Git
- NVIDIA GPU with CUDA (optional, for faster training and also results with cpu may differ and not be suitable)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SolarSpotting
```

### 2. Backend Setup

#### 2.1 Create Python Virtual Environment

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

#### 2.2 Install Dependencies

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Install machine learning module with training dependencies
pip install -e ./machine_learning[train]
```

#### 2.3 Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database Connection (PostgreSQL / Neon DB)
DATABASE_URL=postgresql://username:password@hostname:5432/database_name

# Admin User (created on first startup)
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_FIRSTNAME=Admin
ADMIN_LASTNAME=User

# JWT Authentication
SECRET_KEY=your-secret-key-generate-with-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
DEBUG=True

# Server Settings
HOST=0.0.0.0
PORT=8000

# CORS Origins (add your frontend URL)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000

# Storage Settings
STORAGE_TYPE=local
STORAGE_PATH=./storage

# ML Configuration
MODEL_PATH=./storage/models
USE_GPU=False

# API Rate Limiting
USE_RATE_LIMITER=False
RATE_LIMIT_PER_MINUTE=60

# Redis Cache (optional)
REDIS_URL=redis://localhost:6379/0
CACHE_TIMEOUT=300

# Logging
LOG_FORMAT=json
ENABLE_ACCESS_LOG=True
```

> **Note:** Generate a secure SECRET_KEY with: `openssl rand -hex 32`

#### 2.4 Initialize Database

```bash
cd backend
python scripts/db_init.py
```

Alternatively, execute the SQL statements from `scripts/postgres_script.sql` manually.

#### 2.5 Start Backend

```bash
python run_backend.py
```

The backend is now available at `http://localhost:8000`.  
API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend is now available at `http://localhost:3000`.

## Usage

1. Open `http://localhost:3000` in your browser
2. Log in with the admin account or register a new user
3. **Labeling Workflow:**
   - Upload SDO images on the Detector page (official jsoc HMI images can be found here: http://jsoc.stanford.edu/HMI/hmiimage.html)
   - Process images to generate patches
   - Label sunspot groups with bounding boxes (McIntosh classification: A, B, C, D, E, F, H)
   - Finalize dataset to create train/val split
4. **Training:**
   - Navigate to CNN Training page (Admin only)
   - Configure epochs, batch size, and model architecture
   - Start training and monitor progress
5. **Detection:**
   - Use the trained model for automatic sunspot detection
   - Review and correct predictions

## Architecture

### Backend (FastAPI)
- REST API with automatic OpenAPI documentation
- JWT-based authentication
- PostgreSQL database with SQLAlchemy ORM
- Role-based access control (User, Admin, Labeler)
- Async image processing pipeline

### Frontend (Next.js)
- React-based user interface
- Tailwind CSS styling
- Real-time training progress updates

### Machine Learning
- YOLOv8 object detection
- McIntosh sunspot classification (7 classes)
- Solar image rectification for accurate detection near limb
- Automatic patch generation and annotation

### Model Metrics
After training, the following metrics are available:
- **mAP@50:** Mean Average Precision at IoU ≥ 0.5
- **mAP@50-95:** Mean Average Precision averaged over IoU 0.50 to 0.95
- **AP per class:** Average Precision for each McIntosh class

## Development

- **Backend API Docs:** `http://localhost:8000/docs`
- **Frontend:** `http://localhost:3000`
- **Backend Logs:** Displayed in console

## Troubleshooting

- Ensure PostgreSQL is running and the connection string is correct
- Verify all environment variables are set in `.env`
- For frontend issues: `rm -rf node_modules package-lock.json && npm install`
- For GPU/CUDA issues: Check PyTorch CUDA compatibility with your driver version

## License

This project was developed as part of a bachelor thesis at BFH (Bern University of Applied Sciences).