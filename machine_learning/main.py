import matplotlib.pyplot as plt

from pathlib import Path
from astropy.utils.data import get_pkg_data_filename
from astropy.io import fits

import cv2
from utils.image_processor import ImageProcessor
from utils.solar_data_manager import SolarDataManager
from utils.processing_pipeline import ProcessingPipeline

ML_FOLDER = Path(__file__).resolve().parent

img_list = ["machine_learning/data/img/normal/2k/20140209_101500_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20140417_093000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20230714_153000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250306_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250308_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250407_080000_SDO_2048_00.jpg"]


def main():
    img = ImageProcessor.read_normal_image(img_list[1])

    save_path = ML_FOLDER.joinpath("data", "img", "normal", "2k", "test_v2")
    # ImageProcessor.save_image(img, save_path, "original.jpg")

    cx, cy, r = ImageProcessor.detect_sun_disk(img)
    gray = ImageProcessor.convert_to_grayscale(img)

    bilateral = ImageProcessor.bilateral_filter(gray)
    ImageProcessor.save_image(bilateral, save_path, "bilateral.jpg")

    multi_otsu_segmented = ImageProcessor.segment_multi_levels_otsu(bilateral, classes=3)

    masks = ImageProcessor.segment_sunspots(multi_otsu_segmented, cx, cy, r)
    overlay = ImageProcessor.overlay_masks(img, masks)
    ImageProcessor.save_image(overlay, save_path, "overlay_masks.jpg")

    for imgp in img_list:
        img = ImageProcessor.read_normal_image(imgp)
        masks, overlay = ProcessingPipeline.process_image_through_segmentation_pipeline_v2(img, False)
        ImageProcessor.show_image(overlay, "Overlay segments")


if __name__ == "__main__":
    main()
