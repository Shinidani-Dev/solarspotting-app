import matplotlib.pyplot as plt

from pathlib import Path
from astropy.utils.data import get_pkg_data_filename
from astropy.io import fits

import cv2
from utils.image_processor import ImageProcessor
from utils.solar_data_manager import SolarDataManager

ML_FOLDER = Path(__file__).resolve().parent


def main():
    # ==============================================
    # = Example read jpg and find disk             =
    # ==============================================
    img = ImageProcessor.read_normal_image("machine_learning/data/img/normal/2k/20250407_080000_SDO_2048_00.jpg")
    circles = [ImageProcessor.detect_sun_disk(img)]

    ImageProcessor.show_image(img, "RGB Image")

    gray = img
    if img.ndim == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ImageProcessor.show_image(gray, "Grayscale Image")
    # ImageProcessor.show_image(img, "RGB with circle", circles)
    # ImageProcessor.show_image(gray, "Gray with circle", circles)

    gray_blurred = ImageProcessor.gaussian_blur(gray)

    # ==============================================
    # = Read Grayscalimage and segment spots       =
    # ==============================================
    circle = circles[0]
    disk_mask = ImageProcessor.create_disk_mask(gray_blurred, circle[0], circle[1], circle[2])
    masks = ImageProcessor.segment_sunspots(gray_blurred, circle[0], circle[1], circle[2])


    overlay = ImageProcessor.overlay_masks(img, masks)
    ImageProcessor.show_image(overlay, "Masked Spots")

    save_img_path = ML_FOLDER.joinpath("data", "img", "normal", "2k", "gray")
    ImageProcessor.save_image(gray_blurred, save_img_path, "gray_blurred_test.jpg")

    # ==============================================
    # = Example resizing 4k to 2k and saving jpg   =
    # ==============================================
    # img = ImageProcessor.read_normal_image("machine_learning/data/img/normal/4k/20250308_083000_Ic_flat_4k.jpg")
    # img_resized = ImageProcessor.resize_to_2k(img)
    # save_path = ML_FOLDER.joinpath("data", "img", "normal", "2k")
    # path_saved_img = ImageProcessor.save_image(img_resized, save_path, "20250308_083000_SDO_2048_00.jpg")
    # ImageProcessor.print_img_stats(img)
    # ImageProcessor.print_img_stats(img_resized)

    # ==============================================
    # = Example Fits Image reading                 =
    # ==============================================
    # filename = get_pkg_data_filename("tutorials/FITS-images/HorseHead.fits")
    # hdul = fits.open(filename)
    # hdul.info()
    #
    # image_data = hdul[0].data
    #
    # hdul.close()
    #
    # plt.figure(figsize=(8, 8))
    # plt.imshow(image_data, cmap="gray", origin="lower")
    # plt.colorbar(label="Pixelwert")
    # plt.title("Horsehead Nebula (FITS Beispiel)")
    # plt.show()

    # ==============================================
    # = Example Fits Image fetching (NASA-SDO)     =
    # ==============================================
    # fits_files = SolarDataManager.fetch_hmi_continuum("2023-06-15", "12:30")
    #
    # if fits_files:
    #     img = ImageProcessor.read_fits_image(str(fits_files[0]))
    #     ImageProcessor.show_image(img, title="Sonne HMI Continuum Fits Bild")

    # ==============================================
    # = Example process images in given folder     =
    # ==============================================
    # Process all images in folder data/img/normal/2k
    #
    # circles = []
    #
    # img_folder = ML_FOLDER.joinpath("data", "img", "normal", "2k")
    # for img_path in img_folder.iterdir():
    #     img = ImageProcessor.read_normal_image(img_folder.joinpath(img_path))
    #     circles.append(ImageProcessor.detect_sun_disk(img))


if __name__ == "__main__":
    main()
