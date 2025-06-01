from pathlib import Path

# Paths
base_path = Path(r"C:\Projects\SolarSpotting-App\storage")
labels_val = base_path / "labels" / "val"
train_txt = base_path / "train.txt"
val_txt = base_path / "val.txt"

# Get all validation label file names (without .txt extension)
val_label_names = [f.stem for f in labels_val.glob("*.txt")]
print(f"Found {len(val_label_names)} files in labels/val")

# Read train.txt
with open(train_txt, 'r') as f:
    train_lines = [line.strip() for line in f.readlines() if line.strip()]

print(f"train.txt currently has {len(train_lines)} lines")

# Find lines to move from train to val
lines_to_remove = []
lines_for_val = []

for line in train_lines:
    # Extract image name from path (e.g., "data/images/train/image.jpg" -> "image")
    img_name = Path(line).stem

    if img_name in val_label_names:
        lines_to_remove.append(line)
        # Convert train path to val path
        val_line = line.replace("data/images/train/", "data/images/val/")
        lines_for_val.append(val_line)
        print(f"Found: {img_name}")

print(f"Moving {len(lines_to_remove)} entries from train.txt to val.txt")

# Remove lines from train.txt
remaining_train_lines = [line for line in train_lines if line not in lines_to_remove]

# Write updated train.txt
with open(train_txt, 'w') as f:
    for line in remaining_train_lines:
        f.write(line + '\n')

# Write val.txt
with open(val_txt, 'w') as f:
    for line in lines_for_val:
        f.write(line + '\n')

print(f"Updated train.txt: {len(remaining_train_lines)} lines")
print(f"Created val.txt: {len(lines_for_val)} lines")
print("Done!")