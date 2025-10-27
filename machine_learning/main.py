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

ML_FOLDER = Path(__file__).resolve().parent

img_list = ["data/img/normal/2k/20140209_101500_SDO_2048_00.jpg",
            "data/img/normal/2k/20140417_093000_SDO_2048_00.jpg",
            "data/img/normal/2k/20230714_153000_SDO_2048_00.jpg",
            "data/img/normal/2k/20250306_083000_SDO_2048_00.jpg",
            "data/img/normal/2k/20250308_083000_SDO_2048_00.jpg",
            "data/img/normal/2k/20250407_080000_SDO_2048_00.jpg",
            "data/img/normal/4k/20140607_073000_Ic_flat_4k.jpg"]

TESTING = True


def main():
    # img = ImageProcessor.read_normal_image(img_list[1])
    #
    # save_path = ML_FOLDER.joinpath("data", "img", "normal", "2k", "test_v2")
    # # ImageProcessor.save_image(img, save_path, "original.jpg")
    #
    # cx, cy, r = ImageProcessor.detect_sun_disk(img)
    # gray = ImageProcessor.convert_to_grayscale(img)
    #
    # bilateral = ImageProcessor.bilateral_filter(gray)
    # ImageProcessor.save_image(bilateral, save_path, "bilateral.jpg")
    #
    # multi_otsu_segmented = ImageProcessor.segment_multi_levels_otsu(bilateral, classes=3)
    #
    # masks = ImageProcessor.segment_sunspots(multi_otsu_segmented, cx, cy, r)
    # overlay = ImageProcessor.overlay_masks(img, masks)
    # ImageProcessor.save_image(overlay, save_path, "overlay_masks.jpg")

    # for imgp in img_list:
    #     img = ImageProcessor.read_normal_image(imgp)
    #     masks, overlay = ProcessingPipeline.process_image_through_segmentation_pipeline_v2(img, True)
    #     ImageProcessor.show_image(overlay, "Overlay segments")
    #     break

    # ===================================
    # Rektifizierung Testing            =
    # ===================================
    #ProcessingPipeline.process_dataset("data/input", "data/output")

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

        px = 407
        py = 864

        #px, py = ImageProcessor.adjust_candidate_center_axiswise(px, py, cx, cy, r, 512, 0.85)

        print(f"new px {px}, new py {py}")

        rectified = SolarReprojector.rectify_patch(gray, int(px), int(py), 256, cx, cy, r)
        ImageProcessor.show_image(rectified)

        if not TESTING:
            for cand in merged_candidates:
                px = cand["cx"]
                py = cand["cy"]
                px, py = ImageProcessor.adjust_candidate_center_axiswise(px, py, cx, cy, r, 512, 0.85)

                rectified = SolarReprojector.rectify_patch(gray, int(px), int(py), 512, cx, cy, r)
                print(f"candidate px: {px}")
                print(f"candidate py: {py}")

                ImageProcessor.show_image(rectified, title="Rectified Patch")


if __name__ == "__main__":
    main()
