"""
Test-Script für das trainierte YOLO Sunspot Detection Model
============================================================

Verwendung:
    python test_model.py <pfad_zum_bild>

Beispiel:
    python test_model.py storage/datasets/patches/20240809_154500_patch_px221_py606.jpg

Das Script:
1. Lädt das trainierte Model
2. Führt Inference auf dem Bild aus
3. Zeigt die Ergebnisse in der Konsole
4. Speichert optional ein Bild mit eingezeichneten Bounding Boxes
"""

import sys
import time
from pathlib import Path

# Füge den Projekt-Root zum Path hinzu
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def check_model(image_path: str, confidence: float = 0.25, save_result: bool = True):
    """
    Testet das trainierte Model auf einem einzelnen Bild.

    Args:
        image_path: Pfad zum Testbild
        confidence: Confidence Threshold (default 0.25)
        save_result: Ob ein Bild mit Bounding Boxes gespeichert werden soll
    """
    import cv2
    import numpy as np

    print("=" * 60)
    print("YOLO Sunspot Detection Test")
    print("=" * 60)

    # 1. Check image exists
    img_path = Path(image_path)
    if not img_path.exists():
        print(f"❌ Bild nicht gefunden: {image_path}")
        return

    print(f"📷 Bild: {img_path}")

    # 2. Load image
    print("\n[1/4] Lade Bild...")
    start = time.time()
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"❌ Konnte Bild nicht laden: {image_path}")
        return
    print(f"      Bildgrösse: {img.shape[1]}x{img.shape[0]} px")
    print(f"      Zeit: {time.time() - start:.2f}s")

    # 3. Find model
    print("\n[2/4] Suche Model...")
    model_path = project_root / "machine_learning" / "models" / "active" / "best.pt"

    if not model_path.exists():
        print(f"❌ Kein trainiertes Model gefunden!")
        print(f"   Erwartet: {model_path}")
        return

    print(f"      Model: {model_path}")
    print(f"      Grösse: {model_path.stat().st_size / (1024 * 1024):.2f} MB")

    # 4. Load model
    print("\n[3/4] Lade YOLO Model...")
    start = time.time()

    try:
        from ultralytics import YOLO
        model = YOLO(str(model_path))
        load_time = time.time() - start
        print(f"      ✅ Model geladen in {load_time:.2f}s")
    except Exception as e:
        print(f"❌ Fehler beim Laden des Models: {e}")
        return

    # 5. Run inference
    print("\n[4/4] Führe Inference aus...")
    print(f"      Confidence Threshold: {confidence}")
    start = time.time()

    try:
        results = model.predict(
            img,
            conf=confidence,
            verbose=False
        )
        inference_time = time.time() - start
        print(f"      ✅ Inference in {inference_time:.2f}s")
    except Exception as e:
        print(f"❌ Fehler bei Inference: {e}")
        import traceback
        traceback.print_exc()
        return

    # 6. Parse results
    print("\n" + "=" * 60)
    print("ERGEBNISSE")
    print("=" * 60)

    SUNSPOT_CLASSES = ["A", "B", "C", "D", "E", "F", "H"]
    predictions = []

    if len(results) > 0 and results[0].boxes is not None:
        boxes = results[0].boxes

        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].cpu().numpy()
            x1, y1, x2, y2 = xyxy

            cls_id = int(boxes.cls[i].cpu().numpy())
            conf = float(boxes.conf[i].cpu().numpy())

            class_name = SUNSPOT_CLASSES[cls_id] if cls_id < len(SUNSPOT_CLASSES) else f"Unknown_{cls_id}"

            predictions.append({
                "class": class_name,
                "confidence": conf,
                "bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                "xyxy": [float(x1), float(y1), float(x2), float(y2)]
            })

    if predictions:
        print(f"\n🎯 {len(predictions)} Sunspot(s) gefunden:\n")

        for i, pred in enumerate(predictions, 1):
            print(f"  [{i}] Klasse: {pred['class']}")
            print(f"      Confidence: {pred['confidence'] * 100:.1f}%")
            print(
                f"      BBox (x,y,w,h): [{pred['bbox'][0]:.0f}, {pred['bbox'][1]:.0f}, {pred['bbox'][2]:.0f}, {pred['bbox'][3]:.0f}]")
            print()
    else:
        print("\n⚠️  Keine Sunspots erkannt (bei diesem Confidence Threshold)")

    # 7. Save result image (optional)
    if save_result and predictions:
        print("\n" + "-" * 60)
        print("Speichere Ergebnis-Bild...")

        # Class colors
        CLASS_COLORS = {
            "A": (34, 197, 94),  # green
            "B": (59, 130, 246),  # blue
            "C": (234, 179, 8),  # yellow
            "D": (249, 115, 22),  # orange
            "E": (239, 68, 68),  # red
            "F": (168, 85, 247),  # purple
            "H": (6, 182, 212),  # cyan
        }

        result_img = img.copy()

        for pred in predictions:
            x1, y1, x2, y2 = [int(v) for v in pred["xyxy"]]
            color = CLASS_COLORS.get(pred["class"], (128, 128, 128))
            # BGR for OpenCV
            color_bgr = (color[2], color[1], color[0])

            # Draw box
            cv2.rectangle(result_img, (x1, y1), (x2, y2), color_bgr, 2)

            # Draw label
            label = f"{pred['class']} {pred['confidence'] * 100:.0f}%"
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(result_img, (x1, y1 - h - 10), (x1 + w + 10, y1), color_bgr, -1)
            cv2.putText(result_img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        output_path = img_path.parent / f"{img_path.stem}_detected{img_path.suffix}"
        cv2.imwrite(str(output_path), result_img)
        print(f"✅ Gespeichert: {output_path}")

    # Summary
    print("\n" + "=" * 60)
    print("ZUSAMMENFASSUNG")
    print("=" * 60)
    print(f"  Model laden:  {load_time:.2f}s")
    print(f"  Inference:    {inference_time:.2f}s")
    print(f"  Detektionen:  {len(predictions)}")
    print("=" * 60)

    return predictions


def check_on_base64(base64_string: str, confidence: float = 0.25):
    """
    Testet das Model auf einem Base64-kodierten Bild.
    Nützlich um genau den gleichen Input wie das Backend zu testen.
    """
    import base64
    import cv2
    import numpy as np

    print("Dekodiere Base64...")
    img_bytes = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        print("❌ Konnte Base64 nicht dekodieren!")
        return

    # Save temp file and run test
    temp_path = Path("temp_test_image.jpg")
    cv2.imwrite(str(temp_path), img)

    result = check_model(str(temp_path), confidence, save_result=True)

    # Cleanup
    temp_path.unlink()

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nVerfügbare Patches zum Testen:")
        patches_dir = project_root / "storage" / "datasets" / "patches"
        print(patches_dir)
        if patches_dir.exists():
            patches = list(patches_dir.glob("*.jpg"))[:5]
            for p in patches:
                print(f"  - {p}")
            if not patches:
                print("  (keine Patches gefunden)")
        else:
            print(f"  Patches-Ordner existiert nicht: {patches_dir}")

        sys.exit(1)

    image_path = sys.argv[1]
    confidence = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25

    check_model(image_path, confidence)