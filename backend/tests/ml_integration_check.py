from machine_learning.utils.image_processor import ImageProcessor

TEST_IMG_PATH = "storage/test/20140405_103000_SDO_2048_00.jpg"


def main():
    img = ImageProcessor.read_normal_image(TEST_IMG_PATH)
    ImageProcessor.show_image(img)


if __name__ == "__main__":
    main()
