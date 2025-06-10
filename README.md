# SolarSpotting-App

Eine Webanwendung zur Erfassung und Analyse von Sonnenflecken mit automatischer Detektion und Klassifizierung mittels CNN.

## Projektstruktur

```
SolarSpotting-App/
├── backend/          # FastAPI Backend
├── frontend/         # Next.js Frontend
└── machine_learning/ # ML-Modelle und Training
```

## Installation und Setup

### 1. Repository klonen

```bash
git clone <repository-url>
cd SolarSpotting-App
```

### 2. Backend einrichten

#### 2.1 Datenbank und Umgebungsvariablen

Erstellen Sie eine `.env` Datei im `backend/` Ordner mit folgenden Konfigurationen:

```env
# Datenbank
DATABASE_URL=postgresql://username:password@localhost:5432/solarspotting

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Settings
HOST=0.0.0.0
PORT=8000

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000

# Admin User (wird beim ersten Start erstellt)
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
ADMIN_FIRSTNAME=Admin
ADMIN_LASTNAME=User

# Weitere erforderliche Einstellungen
ENVIRONMENT=development
DEBUG=true
STORAGE_TYPE=local
STORAGE_PATH=/tmp/solarspotting
MODEL_PATH=/tmp/models
USE_GPU=false
USE_RATE_LIMITER=false
RATE_LIMIT_PER_MINUTE=100
REDIS_URL=redis://localhost:6379
CACHE_TIMEOUT=3600
LOG_FORMAT=json
ENABLE_ACCESS_LOG=true
```

#### 2.2 Virtual Environment erstellen

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

#### 2.3 Python-Pakete installieren

```bash
pip install -r requirements.txt
```

#### 2.4 Datenbank initialisieren

```bash
python scripts/db_init.py
```

*Alternativ können Sie die SQL-Blöcke aus `scripts/postgres_script.sql` auch manuell in Ihrer Datenbank ausführen.*

#### 2.5 Backend starten

```bash
python run_backend.py
```

Das Backend ist nun unter `http://localhost:8000` erreichbar. Die API-Dokumentation finden Sie unter `http://localhost:8000/docs`.

### 3. Frontend einrichten

#### 3.1 Dependencies installieren

```bash
cd frontend
npm install
```

#### 3.2 Frontend starten

```bash
npm run dev
```

Das Frontend ist nun unter `http://localhost:3000` erreichbar.

## Verwendung

1. Öffnen Sie `http://localhost:3000` in Ihrem Browser
2. Registrieren Sie sich als neuer Benutzer oder melden Sie sich mit dem Admin-Account an
3. Erstellen Sie Ihre ersten Instrumente und Beobachtungen

## Entwicklung

- **Backend API:** `http://localhost:8000/docs` (Swagger UI)
- **Frontend:** `http://localhost:3000`
- **Backend Logs:** Werden in der Konsole angezeigt

## Voraussetzungen

- Python 3.8+
- Node.js 16+
- PostgreSQL Datenbank
- Git

## Troubleshooting

- Stellen Sie sicher, dass PostgreSQL läuft und die Datenbankverbindung korrekt konfiguriert ist
- Überprüfen Sie, dass alle Umgebungsvariablen in der `.env` Datei gesetzt sind
- Bei Problemen mit dem Frontend: `rm -rf node_modules package-lock.json && npm install`

## Architektur

### Backend (FastAPI)
- REST API mit automatischer OpenAPI-Dokumentation
- JWT-basierte Authentifizierung
- PostgreSQL Datenbankanbindung mit SQLAlchemy
- Rollenbasierte Zugriffskontrolle (User, Admin, Labeler)

### Frontend (Next.js)
- React-basierte Benutzeroberfläche
- Tailwind CSS für Styling

### Datenbank
- PostgreSQL mit strukturierten Tabellen für:
  - Benutzer und Beobachter
  - Instrumente
  - Beobachtungen
  - Tagesdaten
  - Gruppendaten

## Lizenz

Dieses Projekt wurde im Rahmen einer Projektarbeit an der BFH entwickelt.