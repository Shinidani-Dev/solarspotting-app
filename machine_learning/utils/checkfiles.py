from pathlib import Path

# Check label files
labels_train = Path(r"C:\Projects\SolarSpotting-App\storage\labels\train")
images_train = Path(r"C:\Projects\SolarSpotting-App\storage\images\train")

print("=== CHECKING LABEL FILES ===")

# Check a few label files
label_files = list(labels_train.glob("*.txt"))
print(f"Found {len(label_files)} label files")

# Check first 5 labels
for i, label_file in enumerate(label_files[:5]):
    print(f"\n--- {label_file.name} ---")

    # Check if corresponding image exists
    img_file = images_train / (label_file.stem + ".jpg")
    print(f"Image exists: {img_file.exists()}")

    # Read label content
    try:
        with open(label_file, 'r') as f:
            lines = f.readlines()

        if not lines:
            print("EMPTY FILE")
        else:
            print(f"Lines: {len(lines)}")
            for j, line in enumerate(lines[:3]):  # Show first 3 lines
                parts = line.strip().split()
                print(f"  Line {j + 1}: {line.strip()}")

                # Check format
                if len(parts) == 5:
                    try:
                        class_id = int(parts[0])
                        x, y, w, h = map(float, parts[1:5])
                        print(f"    Class: {class_id}, Box: ({x:.3f}, {y:.3f}, {w:.3f}, {h:.3f})")

                        # Check if values are in valid range (0-1)
                        if not (0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                            print(f"    ERROR: Coordinates out of range (0-1)")
                        if class_id < 0 or class_id > 6:
                            print(f"    ERROR: Invalid class ID {class_id} (should be 0-6)")
                    except ValueError as e:
                        print(f"    ERROR: Cannot parse numbers - {e}")
                else:
                    print(f"    ERROR: Wrong format - expected 5 values, got {len(parts)}")

    except Exception as e:
        print(f"ERROR reading file: {e}")

# Check class distribution
print(f"\n=== CLASS DISTRIBUTION ===")
class_counts = {i: 0 for i in range(7)}  # Classes 0-6
total_boxes = 0

for label_file in label_files:
    try:
        with open(label_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    parts = line.split()
                    if len(parts) == 5:
                        class_id = int(parts[0])
                        if 0 <= class_id <= 6:
                            class_counts[class_id] += 1
                            total_boxes += 1
    except:
        pass

class_names = {0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'H'}
for class_id, count in class_counts.items():
    print(f"Class {class_id} ({class_names[class_id]}): {count} boxes")

print(f"Total boxes: {total_boxes}")

# Delete cache files to force refresh
cache_files = [
    Path(r"C:\Projects\SolarSpotting-App\storage\labels\train.cache"),
    Path(r"C:\Projects\SolarSpotting-App\storage\labels\val.cache")
]

print(f"\n=== DELETING CACHE FILES ===")
for cache_file in cache_files:
    if cache_file.exists():
        cache_file.unlink()
        print(f"Deleted: {cache_file}")
    else:
        print(f"Not found: {cache_file}")

print("\nDone! Try training again now.")