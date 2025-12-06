# machine_learning/training/trainer.py

from ultralytics import YOLO
from pathlib import Path
from .config import TrainingConfig
from .model_manager import ModelManager
import yaml
import json


class TrainingPipeline:

    @staticmethod
    def train_model(config: TrainingConfig):
        # 1) dataset yaml
        dataset_yaml = TrainingPipeline._create_dataset_yaml(config.dataset_path)

        # 2) archive old active model (if any)
        ModelManager.archive_active_model()

        # 3) Load pretrained YOLO model
        print(f"[TRAIN] Loading model: {config.model_arch}")
        model = YOLO(config.model_arch)

        # 4) Train
        print("[TRAIN] Starting training...")
        results = model.train(
            data=str(dataset_yaml),
            epochs=config.epochs,
            batch=config.batch_size,
            imgsz=config.img_size,
            workers=config.workers,
            device=config.device,
            project=str((config.dataset_path.parent).resolve()),
            name=config.run_name,
            pretrained=True,
            amp=False
        )

        # 5) Best model path
        best_model_path = Path(results.save_dir) / "weights" / "best.pt"
        print(f"[TRAIN] Best model produced → {best_model_path}")

        # 6) Save as active model
        ModelManager.save_active_model(best_model_path)

        return {
            "message": "Training completed successfully",
            "active_model": str(ModelManager.get_active_model_path()),
            "run_dir": str(results.save_dir)
        }

    @staticmethod
    def _create_dataset_yaml(dataset_root: Path) -> Path:
        """
        Erstellt dataset.yaml im YOLO-Format.

        YOLO erwartet:
        - train/images/ und val/images/ für Bilder
        - train/labels/ und val/labels/ für .txt Label-Dateien

        YOLO findet die Labels automatisch basierend auf dem Bildpfad!
        """
        yaml_path = dataset_root / "dataset.yaml"

        # Versuche Kategorien aus dem COCO JSON zu lesen (falls vorhanden)
        labels_json = dataset_root / "train" / "labels.json"
        if labels_json.exists():
            with open(labels_json, "r") as f:
                coco_data = json.load(f)
            categories = coco_data.get("categories", [])
            # Sortiere nach ID um die richtige Reihenfolge zu haben
            names_list = [cat["name"] for cat in sorted(categories, key=lambda c: c["id"])]
        else:
            # Fallback: Standard McIntosh Klassen
            names_list = ["A", "B", "C", "D", "E", "F", "H"]

        # YOLO Format - OHNE format, train_labels, val_labels!
        yaml_content = {
            "path": str(dataset_root.resolve()).replace("\\", "/"),
            "train": "train/images",
            "val": "val/images",
            # YOLO findet train/labels und val/labels automatisch!
            "names": names_list,
            "nc": len(names_list)
        }

        with open(yaml_path, "w") as f:
            yaml.dump(yaml_content, f, default_flow_style=False)

        print(f"[TRAIN] Created dataset.yaml with {len(names_list)} classes: {names_list}")

        return yaml_path