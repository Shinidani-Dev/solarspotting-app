import os
import shutil
from pathlib import Path
import random

# Paths
base_path = Path(r"C:\Projects\SolarSpotting-App\storage")
images_train = base_path / "images" / "train"
labels_train = base_path / "labels" / "train"
images_val = base_path / "images" / "val"
labels_val = base_path / "labels" / "val"

# Create val directories
images_val.mkdir(exist_ok=True)
labels_val.mkdir(exist_ok=True)

# Get all image files and shuffle randomly
image_files = list(images_train.glob("*.jpg"))
random.shuffle(image_files)

# Select 20% for validation
val_count = int(len(image_files) * 0.2)
val_images = image_files[:val_count]

print(f"Total images: {len(image_files)}")
print(f"Moving {len(val_images)} images (20%) to validation")

# Move images and corresponding labels
moved_images = []
for img_file in val_images:
    img_name = img_file.name
    label_name = img_file.stem + ".txt"

    # Move image
    shutil.move(str(img_file), str(images_val / img_name))

    # Move corresponding label
    label_file = labels_train / label_name
    if label_file.exists():
        shutil.move(str(label_file), str(labels_val / label_name))
        moved_images.append(img_name)
        print(f"Moved: {img_name}")

print(f"\nSuccessfully moved {len(moved_images)} image-label pairs to validation set")
print(f"Remaining in train: {len(list(images_train.glob('*.jpg')))} images")
print(f"In validation: {len(list(images_val.glob('*.jpg')))} images")

print(f"\nFiles moved to validation:")
for img_name in moved_images:
    print(f"  data/images/val/{img_name}")