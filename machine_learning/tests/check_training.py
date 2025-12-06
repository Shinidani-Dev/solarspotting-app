"""
Minimaler YOLO Training Test
=============================

Testet ob Training auf GPU funktioniert mit nur 1 Epoch.
"""

import sys
from pathlib import Path

# Project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def check_training():
    print("=" * 60)
    print("YOLO Training Test (1 Epoch)")
    print("=" * 60)

    import torch
    print(f"\nPyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA device: {torch.cuda.get_device_name(0)}")
        print(f"CUDA memory: {torch.cuda.get_device_properties(0).total_memory / 1024 ** 3:.1f} GB")

    # Dataset path
    dataset_yaml = PROJECT_ROOT / "storage" / "datasets" / "output" / "dataset.yaml"
    print(f"\nDataset: {dataset_yaml}")
    print(f"Exists: {dataset_yaml.exists()}")

    if not dataset_yaml.exists():
        print("❌ Dataset YAML nicht gefunden!")
        return

    # Show YAML content
    print("\nDataset YAML Inhalt:")
    print("-" * 40)
    print(dataset_yaml.read_text())
    print("-" * 40)

    # Check labels exist
    labels_dir = PROJECT_ROOT / "storage" / "datasets" / "output" / "train" / "labels"
    label_files = list(labels_dir.glob("*.txt"))
    print(f"\nLabel-Dateien: {len(label_files)}")
    if label_files:
        print(f"Beispiel: {label_files[0].name}")
        print(f"Inhalt:\n{label_files[0].read_text()[:200]}")

    # Load YOLO
    print("\n" + "=" * 60)
    print("Starte Training Test...")
    print("=" * 60)

    from ultralytics import YOLO

    model = YOLO("yolov8n.pt")
    print("✅ Model geladen")

    # Train with minimal settings
    print("\nStarte Training mit:")
    print("  - epochs: 1")
    print("  - batch: 4 (klein für Test)")
    print("  - device: cuda:0")
    print("  - workers: 0")
    print("  - amp: True (für bessere GPU Nutzung)")
    print("\n")

    try:
        results = model.train(
            data=str(dataset_yaml),
            epochs=1,  # Nur 1 Epoch für Test
            batch=4,  # Kleine Batch für Test
            imgsz=512,
            device='cuda:0',
            workers=0,
            project=str(PROJECT_ROOT / "storage" / "datasets"),
            name="test_train",
            pretrained=True,
            verbose=True,
            amp=False,  # Mixed Precision für bessere GPU Nutzung
            exist_ok=True  # Überschreibe falls existiert
        )

        print("\n" + "=" * 60)
        print("✅ TRAINING ERFOLGREICH!")
        print("=" * 60)
        print(f"Results dir: {results.save_dir}")

    except Exception as e:
        print(f"\n❌ TRAINING FEHLER: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    check_training()
