"""
YOLO Fix - Explizit GPU nutzen
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def check_with_gpu():
    print("=" * 60)
    print("YOLO MIT GPU TESTEN")
    print("=" * 60)

    import torch
    print(f"\nCUDA available: {torch.cuda.is_available()}")
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")

    # Model laden
    model_path = project_root / "machine_learning" / "models" / "active" / "best.pt"

    print(f"\n[1] Lade Model...")
    from ultralytics import YOLO
    model = YOLO(str(model_path))
    print(f"    ✅ Geladen!")

    # Dummy Bild
    import numpy as np
    dummy = np.zeros((512, 512, 3), dtype=np.uint8)

    # Test 1: Mit GPU (cuda:0)
    print(f"\n[2] Test mit device='cuda:0' (GPU)...")
    try:
        result = model.predict(
            dummy,
            device='cuda:0',  # Explizit GPU!
            verbose=True,
            conf=0.25
        )
        print(f"    ✅ SUCCESS! Detections: {len(result[0].boxes) if result[0].boxes else 0}")
    except Exception as e:
        print(f"    ❌ Error: {e}")
        import traceback
        traceback.print_exc()

    # Test 2: Mit echtem Bild
    print(f"\n[3] Test mit echtem Patch...")
    patch_dir = project_root / "storage" / "datasets" / "patches"
    patches = list(patch_dir.glob("*.jpg"))[:1]

    if patches:
        import cv2
        img = cv2.imread(str(patches[0]))
        print(f"    Bild: {patches[0].name}")
        print(f"    Größe: {img.shape}")

        try:
            result = model.predict(
                img,
                device='cuda:0',
                verbose=True,
                conf=0.25
            )

            boxes = result[0].boxes
            if boxes is not None and len(boxes) > 0:
                print(f"\n    🎯 {len(boxes)} Detektionen:")
                for i in range(len(boxes)):
                    cls_id = int(boxes.cls[i])
                    conf = float(boxes.conf[i])
                    cls_name = model.names[cls_id]
                    print(f"       - {cls_name}: {conf * 100:.1f}%")
            else:
                print(f"    ⚠️ Keine Detektionen")

            print(f"\n    ✅ INFERENCE FUNKTIONIERT!")

        except Exception as e:
            print(f"    ❌ Error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"    Keine Patches gefunden in {patch_dir}")


if __name__ == "__main__":
    check_with_gpu()
