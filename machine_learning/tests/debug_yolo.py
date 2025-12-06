"""
Debug-Script: Warum hängt YOLO Inference?
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def debug_model():
    print("=" * 60)
    print("YOLO DEBUG")
    print("=" * 60)

    # 1. Check ultralytics version
    print("\n[1] Ultralytics Version:")
    try:
        import ultralytics
        print(f"    Version: {ultralytics.__version__}")
    except Exception as e:
        print(f"    ❌ Error: {e}")

    # 2. Check torch
    print("\n[2] PyTorch Info:")
    try:
        import torch
        print(f"    Version: {torch.__version__}")
        print(f"    CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"    CUDA device: {torch.cuda.get_device_name(0)}")
        print(f"    CPU threads: {torch.get_num_threads()}")
    except Exception as e:
        print(f"    ❌ Error: {e}")

    # 3. Check model file
    print("\n[3] Model File:")
    model_path = project_root / "machine_learning" / "models" / "active" / "best.pt"
    print(f"    Path: {model_path}")
    print(f"    Exists: {model_path.exists()}")
    if model_path.exists():
        print(f"    Size: {model_path.stat().st_size / (1024 * 1024):.2f} MB")

    # 4. Try to load model info without full load
    print("\n[4] Model Info (ohne vollständiges Laden):")
    try:
        import torch
        checkpoint = torch.load(str(model_path), map_location='cpu')
        if isinstance(checkpoint, dict):
            print(f"    Keys: {list(checkpoint.keys())[:10]}")
            if 'model' in checkpoint:
                print(f"    Has 'model' key: Yes")
            if 'train_args' in checkpoint:
                print(f"    Train args: {checkpoint.get('train_args', {})}")
        else:
            print(f"    Type: {type(checkpoint)}")
    except Exception as e:
        print(f"    ❌ Error: {e}")

    # 5. Try minimal YOLO load
    print("\n[5] YOLO Model laden:")
    try:
        from ultralytics import YOLO
        print("    Loading...")
        model = YOLO(str(model_path))
        print(f"    ✅ Loaded!")
        print(f"    Model type: {type(model)}")
        print(f"    Task: {model.task}")
        print(f"    Names: {model.names}")
    except Exception as e:
        print(f"    ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return

    # 6. Try inference on a tiny dummy image
    print("\n[6] Test Inference auf Dummy-Bild (10x10 px):")
    try:
        import numpy as np
        dummy = np.zeros((10, 10, 3), dtype=np.uint8)
        print("    Running predict on 10x10 image...")

        # Set a short timeout via signal (Unix only) or just try
        import threading
        result_container = [None]
        error_container = [None]

        def run_predict():
            try:
                result_container[0] = model.predict(dummy, verbose=False)
            except Exception as e:
                error_container[0] = e

        thread = threading.Thread(target=run_predict)
        thread.start()
        thread.join(timeout=30)  # 30 second timeout

        if thread.is_alive():
            print("    ❌ TIMEOUT nach 30 Sekunden!")
            print("    --> Inference hängt!")
        elif error_container[0]:
            print(f"    ❌ Error: {error_container[0]}")
        else:
            print(f"    ✅ Success! Result: {result_container[0]}")

    except Exception as e:
        print(f"    ❌ Error: {e}")
        import traceback
        traceback.print_exc()

    # 7. Try with different settings
    print("\n[7] Test mit expliziten Settings:")
    try:
        import numpy as np
        dummy = np.zeros((64, 64, 3), dtype=np.uint8)
        print("    Running with device='cpu', half=False...")

        def run_predict_v2():
            try:
                result_container[0] = model.predict(
                    dummy,
                    verbose=True,  # Mehr Output
                    device='cpu',
                    half=False,
                    imgsz=64
                )
            except Exception as e:
                error_container[0] = e

        result_container = [None]
        error_container = [None]

        thread = threading.Thread(target=run_predict_v2)
        thread.start()
        thread.join(timeout=30)

        if thread.is_alive():
            print("    ❌ TIMEOUT!")
        elif error_container[0]:
            print(f"    ❌ Error: {error_container[0]}")
        else:
            print(f"    ✅ Success!")

    except Exception as e:
        print(f"    ❌ Error: {e}")

    print("\n" + "=" * 60)
    print("DIAGNOSE:")
    print("=" * 60)
    print("""
Mögliche Ursachen wenn Inference hängt:

1. MODEL KORRUPT
   - Training wurde abgebrochen
   - Model-Datei ist unvollständig
   --> Lösung: Model neu trainieren

2. YOLO VERSION MISMATCH
   - Model wurde mit anderer ultralytics Version trainiert
   --> Lösung: pip install ultralytics==<version>

3. TORCH PROBLEM
   - CPU Inference hat threading issues
   --> Lösung: torch.set_num_threads(1) vor dem Laden

4. MEMORY PROBLEM  
   - Nicht genug RAM
   --> Lösung: Kleineres Model oder mehr RAM
""")


if __name__ == "__main__":
    debug_model()
