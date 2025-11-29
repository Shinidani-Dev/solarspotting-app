from pathlib import Path
from collections import defaultdict
import numpy as np


class AnnotationBalancer:
    """
    Balances a dataset by MAKING ANNOTATIONS balanced,
    not patches.

    TRAIN will have EXACTLY the same number of annotations per class.
    VAL will have all remaining annotations.
    """

    @staticmethod
    def balance_by_annotation(parsed_annotations):
        """
        Args:
            parsed_annotations: list[(ann_file: Path, data: dict)]

        Returns:
            train_annots: list[(patch_file, annotation_dict)]
            val_annots:   list[(patch_file, annotation_dict)]
            class_stats: dict with counts
        """

        # 1) Extract ALL annotation objects
        class_to_annots = defaultdict(list)

        for ann_file, data in parsed_annotations:
            patch_file = data["patch_file"]
            anns = data.get("annotations", [])

            for ann in anns:
                cls = ann["class"]

                # FULL annotation entry
                class_to_annots[cls].append({
                    "patch_file": patch_file,
                    "bbox": ann["bbox"],
                    "class": cls
                })

        # 2) Determine smallest annotation count
        class_sizes = {cls: len(v) for cls, v in class_to_annots.items()}
        min_count = min(class_sizes.values())

        print("[BALANCE ANNOTATIONS] class sizes:", class_sizes)
        print("[BALANCE ANNOTATIONS] min count =", min_count)

        # 3) Create TRAIN and VAL annotation-level splits
        train_annots = []
        val_annots = []

        for cls, annots in class_to_annots.items():
            np.random.shuffle(annots)

            train_annots.extend(annots[:min_count])
            val_annots.extend(annots[min_count:])

        np.random.shuffle(train_annots)
        np.random.shuffle(val_annots)

        stats = {
            "min_annotation_count": min_count,
            "annotation_class_sizes": class_sizes,
            "train_annotations": len(train_annots),
            "val_annotations": len(val_annots),
        }

        return train_annots, val_annots, stats
