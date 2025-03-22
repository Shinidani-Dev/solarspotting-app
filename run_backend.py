import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "true").lower() == "true"

    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
