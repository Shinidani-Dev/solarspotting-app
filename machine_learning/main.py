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

ML_FOLDER = Path(__file__).resolve().parent

img_list = ["machine_learning/data/img/normal/2k/20140209_101500_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20140417_093000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20230714_153000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250306_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250308_083000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/2k/20250407_080000_SDO_2048_00.jpg",
            "machine_learning/data/img/normal/4k/20240804_084500_Ic_flat_4k.jpg"]


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
    img = ImageProcessor.read_normal_image(img_list[6])
    masks, overlay = ProcessingPipeline.process_image_through_segmentation_pipeline_v2(img, True)
    scaled = ImageProcessor.resize_to_2k(img)

    gray = ImageProcessor.convert_to_grayscale(scaled)

    cx, cy, r = ImageProcessor.detect_sun_disk(gray)

    px, py = cx-600, cy+180
    scale = 512

    rectified = SolarReprojector.rectify_patch(gray, px, py, scale, cx, cy, r)

    print(f"Patchgrösse: {rectified.shape[1]}x{rectified.shape[0]} Pixel")

    ImageProcessor.show_image(gray, title="Original Image")
    ImageProcessor.show_image(rectified, title="Rectified Patch")

    plt.imshow(rectified, cmap='gray', vmin=0, vmax=255)
    plt.title("Rectified Patch (echte Werte)")
    plt.colorbar()
    plt.show()


if __name__ == "__main__":
    main()
