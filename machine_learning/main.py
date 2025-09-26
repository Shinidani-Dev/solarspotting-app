import cv2
import numpy as np
from utils.image_processor import ImageProcessor


def main():
    img = ImageProcessor.read_normal_image("machine_learning/data/img/normal/2k/20140405_103000_SDO_2048_00.jpg")
    circles = [ImageProcessor.detect_sun_disk(img)]

    ImageProcessor.show_image(img, "RGB Image")

    gray = img
    if img.ndim == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    ImageProcessor.show_image(gray, "Grayscale Image")

    ImageProcessor.show_image(img, "RGB with circle", circles)
    ImageProcessor.show_image(gray, "Gray with circle", circles)


if __name__ == "__main__":
    main()
