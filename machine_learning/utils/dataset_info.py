# machine_learning/utils/ml_data_info.py

import json
from pathlib import Path
from typing import Dict, Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class DatasetInfo:
    """
    Utility class for extracting statistics from COCO-style datasets.
    Expected dataset structure:
    dataset_root/
        train/
            images/
            annotations.json
        val/
            images/
            annotations.json
    """

    @staticmethod
    def _load_coco_json(path: Path) -> Dict[str, Any]:
        path = Path(PROJECT_ROOT/path)
        if not path.exists():
            raise FileNotFoundError(f"COCO annotation file not found: {path}")

        with open(path, "r") as f:
            return json.load(f)

    @staticmethod
    def analyze_train_split(dataset_root: str | Path) -> Dict[str, Any]:
        """
        Analyze the TRAIN split of a COCO-style dataset.

        Args:
            dataset_root: Path to dataset folder containing /train and /val.

        Returns:
            Dictionary with dataset statistics.
        """
        dataset_root = Path(dataset_root)
        ann_path = dataset_root / "train" / "annotations.json"

        coco = DatasetInfo._load_coco_json(ann_path)

        images = coco.get("images", [])
        annotations = coco.get("annotations", [])
        categories = coco.get("categories", [])

        # Prepare category mapping
        id_to_class = {cat["id"]: cat["name"] for cat in categories}
        class_to_count = {cat["name"]: 0 for cat in categories}

        # Count annotations
        for ann in annotations:
            cls_name = id_to_class.get(ann["category_id"], "UNKNOWN")
            class_to_count[cls_name] += 1

        total_annotations = len(annotations)

        class_percent = {
            cls: (cnt / total_annotations * 100 if total_annotations > 0 else 0.0)
            for cls, cnt in class_to_count.items()
        }

        return {
            "num_images": len(images),
            "num_annotations": len(annotations),
            "num_classes": len(categories),
            "classes": list(class_to_count.keys()),
            "class_distribution": class_to_count,
            "class_distribution_percent": class_percent,
        }

    @staticmethod
    def analyze_val_split(dataset_root: str | Path) -> Dict[str, Any]:
        """
        Same as analyze_train_split, but for validation set.
        """
        dataset_root = Path(dataset_root)
        ann_path = dataset_root / "val" / "annotations.json"

        coco = DatasetInfo._load_coco_json(ann_path)

        images = coco.get("images", [])
        annotations = coco.get("annotations", [])
        categories = coco.get("categories", [])

        id_to_class = {cat["id"]: cat["name"] for cat in categories}
        class_to_count = {cat["name"]: 0 for cat in categories}

        for ann in annotations:
            cls_name = id_to_class.get(ann["category_id"], "UNKNOWN")
            class_to_count[cls_name] += 1

        total_annotations = len(annotations)

        class_percent = {
            cls: (cnt / total_annotations * 100 if total_annotations > 0 else 0.0)
            for cls, cnt in class_to_count.items()
        }

        return {
            "num_images": len(images),
            "num_annotations": len(annotations),
            "num_classes": len(categories),
            "classes": list(class_to_count.keys()),
            "class_distribution": class_to_count,
            "class_distribution_percent": class_percent,
        }

    @staticmethod
    def analyze_full_dataset(dataset_root: str | Path) -> Dict[str, Any]:
        """
        Combine train + val statistics into a single summary.
        """

        train_stats = DatasetInfo.analyze_train_split(dataset_root)
        val_stats = DatasetInfo.analyze_val_split(dataset_root)

        combined_counts = {
            cls: train_stats["class_distribution"].get(cls, 0) +
                 val_stats["class_distribution"].get(cls, 0)
            for cls in train_stats["classes"]
        }

        total_ann = sum(combined_counts.values())

        combined_percent = {
            cls: (cnt / total_ann * 100 if total_ann > 0 else 0.0)
            for cls, cnt in combined_counts.items()
        }

        return {
            "train": train_stats,
            "val": val_stats,
            "combined": {
                "total_images": train_stats["num_images"] + val_stats["num_images"],
                "total_annotations": total_ann,
                "class_distribution": combined_counts,
                "class_distribution_percent": combined_percent,
            }
        }
