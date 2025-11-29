# machine_learning/training/model_manager.py

from pathlib import Path
import shutil
from datetime import datetime
from machine_learning.settings import ML_MODELS_ACTIVE, ML_MODELS_ARCHIVE


class ModelManager:

    @staticmethod
    def archive_active_model():
        """
        If an active model exists, archive it with a timestamp.
        """
        src = ML_MODELS_ACTIVE / "best.pt"
        if not src.exists():
            print("[ModelManager] No active model to archive.")
            return None

        ML_MODELS_ARCHIVE.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        dst = ML_MODELS_ARCHIVE / f"model_{timestamp}.pt"

        shutil.copy(src, dst)
        print(f"[ModelManager] Archived model → {dst}")

        return dst

    @staticmethod
    def save_active_model(best_model_path: Path):
        """
        Saves the new model as the active model.
        """
        ML_MODELS_ACTIVE.mkdir(parents=True, exist_ok=True)
        dst = ML_MODELS_ACTIVE / "best.pt"
        shutil.copy(best_model_path, dst)
        print(f"[ModelManager] Active model updated → {dst}")

    @staticmethod
    def get_active_model_path() -> Path:
        return ML_MODELS_ACTIVE / "best.pt"
