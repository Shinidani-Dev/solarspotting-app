import base64

import matplotlib.pyplot as plt
import numpy as np

from pathlib import Path
from astropy.utils.data import get_pkg_data_filename
from astropy.io import fits

import cv2
from utils.image_processor import ImageProcessor
from utils.solar_data_manager import SolarDataManager
from utils.processing_pipeline import ProcessingPipeline
from utils.solar_reprojector import SolarReprojector
from machine_learning.enums.morpholog_operations import MorphologyOperation
from utils.solar_grid_generator import SolarGridGenerator
from utils.dataset_info import DatasetInfo
from machine_learning.training.config import TrainingConfig
from machine_learning.training.trainer import TrainingPipeline
from machine_learning.settings import DATASET_OUTPUT_DIR, PROJECT_ROOT, ML_MODELS_DIR

ML_FOLDER = Path(__file__).resolve().parent

img_list = ["storage/20140209_101500_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20140209_101500_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20140417_093000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20230714_153000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250306_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250308_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250407_080000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/4k/20140607_073000_Ic_flat_4k.jpg"]

TESTING = False
TESTING_SOLAR = False
TESTING_FOR_LOOP = False
TESTING_DATASET_INFO = False
Training = True

CENTER_X = 117
CENTER_Y = 1210


def main():
    print(ML_MODELS_DIR.resolve())
    if Training:
        print(DATASET_OUTPUT_DIR.resolve())
        cfg = TrainingConfig(dataset_path=DATASET_OUTPUT_DIR, device="cpu")
        TrainingPipeline.train_model(cfg)

    # ProcessingPipeline.process_dataset("storage", "machine_learning/data/output")
    # img = ImageProcessor.read_normal_image(img_list[3])
    # ImageProcessor.show_image(img)
    # morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(img, False)
    # dt = ImageProcessor.parse_sdo_filename(img_list[3])
    # grid = SolarGridGenerator.generate_global_grid_15deg(dt, cx, cy, r)
    # img_with_grid = ImageProcessor.draw_global_grid(img, grid)
    # ImageProcessor.show_image(img_with_grid)
    # patches = ProcessingPipeline.process_single_image(img, dt)

    # for patch in patches["patches"]:
    #     # 1. Rectified Patch decodieren
    #     b64data = patch["image_base64"]
    #     img_bytes = base64.b64decode(b64data)
    #     np_array = np.frombuffer(img_bytes, dtype=np.uint8)
    #     patch_img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    #
    #     # 2. Patch-Grid extrahieren (lat/lon Linien im Patch)
    #     patch_grid = patch["grid"]
    #
    #     # 3. Patch-Grid über Patch zeichnen
    #     patch_with_grid = ImageProcessor.draw_patch_grid(patch_img, patch_grid)
    #
    #     # 4. Anzeigen
    #     ImageProcessor.show_image(patch_with_grid)


    # res = ProcessingPipeline.process_image_from_path(img_list[1], dt, 512)
    # ProcessingPipeline.show_patches_with_metadata(res)

    if TESTING_DATASET_INFO:
        ds_output_path = Path("storage/datasets/output")
        info = DatasetInfo.analyze_full_dataset(ds_output_path)
        print(info["train"])

        ds_output_path = Path("storage/datasets/output_backup")
        info = DatasetInfo.analyze_full_dataset(ds_output_path)
        print(info["train"])

    if TESTING_SOLAR:
        img = ImageProcessor.read_normal_image(img_list[1])
        dt = ImageProcessor.parse_sdo_filename(img_list[1])

        morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(img, True)

        candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
        ImageProcessor.show_candidates(img, candidates)

        merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)
        ImageProcessor.show_candidates(img, merged_candidates)

        scaled = ImageProcessor.resize_to_2k(img)

        gray = ImageProcessor.convert_to_grayscale(scaled)
        ImageProcessor.show_image(gray)

        px = CENTER_X
        py = CENTER_Y

        rectified = SolarReprojector.rectify_patch_from_solar_orientation(gray, int(px), int(py), 512, cx, cy, r, dt)

        ImageProcessor.show_image(rectified, "Solar rectified")

    if TESTING:
        img = ImageProcessor.read_normal_image(img_list[0])

        morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(img, False)
        print(f"center sundisk ({cx}, {cy}) with radius {r}")

        candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
        ImageProcessor.show_candidates(img, candidates)

        merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)
        ImageProcessor.show_candidates(img, merged_candidates)

        #ImageProcessor.show_image(disk_mask, "Disk maske")

        scaled = ImageProcessor.resize_to_2k(img)

        gray = ImageProcessor.convert_to_grayscale(scaled)
        ImageProcessor.show_image(gray)

        px = CENTER_X
        py = CENTER_Y

        #px, py = ImageProcessor.adjust_candidate_center_axiswise(px, py, cx, cy, r, 512, 0.85)

        print(f"new px {px}, new py {py}")

        rectified = SolarReprojector.rectify_patch(gray, int(px), int(py), 512, cx, cy, r)
        ImageProcessor.show_image(rectified)

        if TESTING_FOR_LOOP:
            for cand in merged_candidates:
                px = cand["cx"]
                py = cand["cy"]
                # px, py = ImageProcessor.adjust_candidate_center_axiswise(px, py, cx, cy, r, 512, 0.85)
                rectified = SolarReprojector.rectify_patch_from_solar_orientation(gray, int(px), int(py), 512, cx, cy, r)
                print(f"candidate px: {px}")
                print(f"candidate py: {py}")

                ImageProcessor.show_image(rectified, title="Rectified Patch")


if __name__ == "__main__":
    main()
