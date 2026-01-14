# machine_learning/training/config.py

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class TrainingConfig:
    dataset_path: Path
    model_arch: str = "yolov8n.pt"
    epochs: int = 50
    batch_size: int = 32
    img_size: int = 512
    workers: int = 4
    device: str = "auto"
    project: str = "solarspotting"
    run_name: str = "train_run"
    save_path: Path = Path("machine_learning/models/active")

    # Master-Schalter
    augment: bool = True                            # default: False

    # ===== Layout / Mixing =====
    # mosaic: float = 1.0                             # default: 1.0
    # mixup: float = 0.0                              # default: 0.0
    # copy_paste: float = 0.0                         # default: 0.0

    # ===== Geometrie =====
    # degrees: float = 0.0                            # default: 0.0
    # translate: float = 0.1                          # default: 0.1
    # scale: float = 0.5                              # default: 0.5
    # shear: float = 0.0                              # default: 0.0
    # perspective: float = 0.0                        # default: 0.0

    # ===== Farbe (HSV) =====
    # hsv_h: float = 0.015                            # default: 0.015
    # hsv_s: float = 0.7                              # default: 0.7
    # hsv_v: float = 0.4                              # default: 0.4

    # ===== Flip =====
    # fliplr: float = 0.5                             # default: 0.5
    # flipud: float = 0.0                             # default: 0.0

    # ===== Regularisierung =====
    # erasing: float = 0.4                            # default: 0.4
    # auto_augment: Optional[str] = "randaugment"     # default: "randaugment"
