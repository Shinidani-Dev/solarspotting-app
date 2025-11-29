# machine_learning/training/config.py

from dataclasses import dataclass
from pathlib import Path

@dataclass
class TrainingConfig:
    """
    Configuration object for YOLO model training.
    """

    dataset_path: Path               # Path to dataset/output
    model_arch: str = "yolov8n.pt"   # initial model to finetune
    epochs: int = 50
    batch_size: int = 16
    img_size: int = 512
    workers: int = 4
    device: str = "auto"             # auto / cpu / cuda
    project: str = "solarspotting"
    run_name: str = "train_run"
    save_path: Path = Path("machine_learning/models/active")
