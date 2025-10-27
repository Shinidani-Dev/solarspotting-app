import numpy as np
import warnings
import cv2

from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.enums.morpholog_operations import MorphologyOperation
from machine_learning.utils.solar_reprojector import SolarReprojector
from pathlib import Path


class ProcessingPipeline:
    """Utility-Klasse die die Bildverarbeitungspipeline aufbaut"""

    @staticmethod
    def process_image_through_segmentation_pipeline_v1(image: np.ndarray) -> dict:
        """
        Die ganze Bildverarbeitungspipeline, vom Einlesen des Bildes bis zur segmentation der Sonnenflecken.
        Das segmentierte bild wird geplottet und die Masken zurückgegeben
        Args:
            image: Das Bild das segmentiert werden soll

        Returns:
            Dictionary mit den Masken:
            umbra, penumbra, photosphere und disk
        """
        warnings.warn(
            "process_image_through_segmentation_pipeline_v1() ist veraltet und wird in Zukunft entfernt. "
            "Bitte verwende process_image_through_segmentation_pipeline_v2().",
            category=DeprecationWarning,
            stacklevel=2
        )
        circle = ImageProcessor.detect_sun_disk(image)
        gray = ImageProcessor.convert_to_grayscale(image)
        gray_blured = ImageProcessor.gaussian_blur(gray)
        gamma_corrected = ImageProcessor.gamma_correction(gray_blured, 0.3)
        masks = ImageProcessor.segment_sunspots(gamma_corrected, circle[0], circle[1], circle[2])
        overlay = ImageProcessor.overlay_masks(image, masks)
        ImageProcessor.show_image(overlay, "Masked Spots")

        return masks

    @staticmethod
    def process_image_through_segmentation_pipeline_v2(image: np.ndarray, debug_mode: bool = False) -> tuple[dict, np.ndarray]:
        """
        Die ganze Bildverarbeitungspipeline, vom Einlesen des Bildes bis zur segmentation der Sonnenflecken.
        Das segmentierte bild wird geplottet und die Masken zurückgegeben
        Args:
            image: Das Bild das segmentiert werden soll
            debug_mode: Zusätzliche Details in den einzelnen Schritten wie z.B.:
                - plotten der einzelnen Schritte
                - ausgabe der parameter cx, cy und r

        Returns:
            Tupel mit:
                Dictionary mit den Masken:
                    umbra, penumbra, photosphere und disk
                Bild mit overlay der Masken
        """
        if debug_mode:
            ImageProcessor.show_image(image)

        resized = ImageProcessor.resize_to_2k(image)

        cx, cy, r = ImageProcessor.detect_sun_disk(resized)

        if debug_mode:
            print(f"cx: {cx}, cy: {cy}, r: {r}")

        gray = ImageProcessor.convert_to_grayscale(resized)
        if debug_mode:
            ImageProcessor.show_image(gray, "Graustufenbild")

        bilateral_filtered = ImageProcessor.bilateral_filter(gray)
        if debug_mode:
            ImageProcessor.show_image(bilateral_filtered, "Nach Bilateraler Filterung")

        multi_otsu_segmented = ImageProcessor.segment_multi_levels_otsu(bilateral_filtered, classes=3)
        if debug_mode:
            ImageProcessor.show_image(multi_otsu_segmented, "3-Klassen nach Multi-Level Otsu")

        masks = ImageProcessor.segment_sunspots(multi_otsu_segmented, cx, cy, r)
        overlay = ImageProcessor.overlay_masks(resized, masks)
        if debug_mode:
            ImageProcessor.show_image(overlay, "Masken als Overlay über dem Originalbild")

        return masks, overlay

    @staticmethod
    def process_image_through_segmentation_pipeline_v3(image: np.ndarray, debug_mode: bool = False) -> tuple[np.ndarray, np.ndarray, int, int, int]:
        """
        Die ganze Bildverarbeitungspipeline, vom Einlesen des Bildes bis zur segmentation der Sonnenflecken.
        Das segmentierte bild wird geplottet und die Masken zurückgegeben
        Args:
            image: Das Bild das segmentiert werden soll
            debug_mode: Zusätzliche Details in den einzelnen Schritten wie z.B.:
                - plotten der einzelnen Schritte
                - ausgabe der parameter cx, cy und r

        Returns:
            Tupel mit:
                Dictionary mit den Masken:
                    umbra, penumbra, photosphere und disk
                Bild mit overlay der Masken
                cx: x-coordinate of the center of the sun disk
                cy: y-coordinate of the center of the sun disk
                r: radius of the sun disk
        """
        if debug_mode:
            ImageProcessor.show_image(image)

        resized = ImageProcessor.resize_to_2k(image)

        cx, cy, r = ImageProcessor.detect_sun_disk(resized)

        disk_mask = ImageProcessor.create_disk_mask(resized, cx, cy, r)

        if debug_mode:
            print(f"cx: {cx}, cy: {cy}, r: {r}")

        gray = ImageProcessor.convert_to_grayscale(resized)
        if debug_mode:
            ImageProcessor.show_image(gray, "Graustufenbild")

        bilateral_filtered = ImageProcessor.bilateral_filter(gray)
        if debug_mode:
            ImageProcessor.show_image(bilateral_filtered, "Nach Bilateraler Filterung")

        multi_otsu_segmented = ImageProcessor.segment_multi_levels_otsu(bilateral_filtered, classes=3)
        if debug_mode:
            ImageProcessor.show_image(multi_otsu_segmented, "3-Klassen nach Multi-Level Otsu")

        binarized = ImageProcessor.binarize_from_multiotsu_output(multi_otsu_segmented)
        if debug_mode:
            ImageProcessor.show_image(binarized, "Binarisiert")

        morph_steps = [
            (MorphologyOperation.DILATE, 3),
            (MorphologyOperation.CLOSE, 4)
        ]

        morphed = ImageProcessor.apply_morphology(binarized, morph_steps, 12, debug_mode)

        return morphed, disk_mask, cx, cy, r

    @staticmethod
    def process_dataset(input_folder: str, output_folder: str, patch_size: int = 512):
        input_path = Path(input_folder)
        output_path = Path(output_folder)
        output_path.mkdir(parents=True, exist_ok=True)

        for img_file in input_path.glob("*.jpg"):
            print(f"Processing {img_file.name}")
            print(f"Path: {img_file}")

            img = ImageProcessor.read_normal_image(str(img_file))
            gray = ImageProcessor.convert_to_grayscale(img)
            morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, True)
            candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
            merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)

            for cand in merged_candidates:
                px = cand["cx"]
                py = cand["cy"]
                rectified_patch = SolarReprojector.rectify_patch(gray, px, py, 512, cx, cy, r)
                patch_out = output_path / f"{img_file.stem}_patch_px{px}_py{py}.jpg"
                cv2.imwrite(str(patch_out), rectified_patch)

