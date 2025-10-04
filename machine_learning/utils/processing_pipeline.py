import numpy as np
import warnings

from machine_learning.utils.image_processor import ImageProcessor


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

        cx, cy, r = ImageProcessor.detect_sun_disk(image)

        if debug_mode:
            print(f"cx: {cx}, cy: {cy}, r: {r}")

        gray = ImageProcessor.convert_to_grayscale(image)
        if debug_mode:
            ImageProcessor.show_image(gray, "Graustufenbild")

        bilateral_filtered = ImageProcessor.bilateral_filter(gray)
        if debug_mode:
            ImageProcessor.show_image(bilateral_filtered, "Nach Bilateraler Filterung")

        multi_otsu_segmented = ImageProcessor.segment_multi_levels_otsu(bilateral_filtered, classes=3)
        if debug_mode:
            ImageProcessor.show_image(multi_otsu_segmented, "3-Klassen nach Multi-Level Otsu")

        masks = ImageProcessor.segment_sunspots(multi_otsu_segmented, cx, cy, r)
        overlay = ImageProcessor.overlay_masks(image, masks)
        if debug_mode:
            ImageProcessor.show_image(overlay, "Masken als Overlay über dem Originalbild")

        return masks, overlay
