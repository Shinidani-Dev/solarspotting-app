import numpy as np
import warnings
import cv2
import base64

from datetime import datetime
from machine_learning.utils.image_processor import ImageProcessor
from machine_learning.enums.morpholog_operations import MorphologyOperation
from machine_learning.utils.solar_reprojector import SolarReprojector
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

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
    def process_single_image(img: np.ndarray, img_date_time: datetime, patch_size: int = 512):
        """
        Returns a json object with the recitifed patches and metadata to each patch which then can be further
        processed by the backend or by the frontend.
        Args:
            img:
            img_date_time:
            patch_size:

        Returns:

        """
        gray = ImageProcessor.convert_to_grayscale(img)
        morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
        candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
        merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)

        date_string = img_date_time.isoformat()
        patch_results = []

        for cand in merged_candidates:
            px, py = int(cand["cx"]), int(cand["cy"])
            rectified_patch = SolarReprojector.rectify_patch_from_solar_orientation(
                gray, px, py, patch_size, cx, cy, r, img_date_time
            )

            success, buffer = cv2.imencode(".jpg", rectified_patch)
            if not success:
                continue
            b64_patch = base64.b64encode(buffer).decode("utf-8")

            patch_results.append({
                "filename": f"{date_string}_patch_px{px}_py{py}.jpg",
                "px": px,
                "py": py,
                "datetime": date_string,
                "center_x": cx,
                "center_y": cy,
                "radius": r,
                "image_base64": b64_patch
            })

        return {"patches": patch_results}

    @staticmethod
    def process_image_from_path(image_path: str, img_date_time: datetime, patch_size: int = 512):
        """
        Liest ein Bild von Pfad ein und ruft die Low-Level-Verarbeitung auf.
        """
        img = ImageProcessor.read_normal_image(image_path)
        return ProcessingPipeline.process_single_image(img, img_date_time, patch_size)

    @staticmethod
    def process_dataset(input_folder: str, output_folder: str, patch_size: int = 512):
        input_path = Path(PROJECT_ROOT/input_folder)
        output_path = Path(PROJECT_ROOT/output_folder)
        output_path.mkdir(parents=True, exist_ok=True)

        for img_file in input_path.glob("*.jpg"):
            print(f"Processing {img_file.name}")
            print(f"Path: {img_file}")

            img = ImageProcessor.read_normal_image(str(img_file))
            dt = ImageProcessor.parse_sdo_filename(str(img_file))

            gray = ImageProcessor.convert_to_grayscale(img)
            morphed, disk_mask, cx, cy, r = ProcessingPipeline.process_image_through_segmentation_pipeline_v3(gray, False)
            candidates = ImageProcessor.detect_candidates(morphed, disk_mask)
            merged_candidates = ImageProcessor.merge_nearby_candidates(candidates, 200, 300)

            for cand in merged_candidates:
                px = int(cand["cx"])
                py = int(cand["cy"])
                rectified_patch = SolarReprojector.rectify_patch_from_solar_orientation(gray, px, py, patch_size, cx, cy, r, dt)
                patch_out = output_path / f"{img_file.stem}_patch_px{px}_py{py}.jpg"
                cv2.imwrite(str(patch_out), rectified_patch)

    @staticmethod
    def show_patches_with_metadata(res):
        """
        Function for testing the result of the process_single_image function
        """
        font = cv2.FONT_HERSHEY_SIMPLEX

        for i, patch in enumerate(res["patches"], 1):
            b64 = patch["image_base64"]
            img_bytes = base64.b64decode(b64)
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            lines = [
                f"{patch['filename']}",
                f"px={patch['px']}, py={patch['py']}",
                f"center=({patch['center_x']}, {patch['center_y']}), r={patch['radius']:.1f}",
                f"time={patch['datetime']}",
            ]

            y0, dy = 25, 25
            for j, line in enumerate(lines):
                y = y0 + j * dy
                cv2.putText(img, line, (10, y), font, 0.6, (0, 255, 0), 1, cv2.LINE_AA)

            cv2.imshow(f"Patch {i}", img)
            key = cv2.waitKey(0)
            cv2.destroyWindow(f"Patch {i}")

            if key == 27:
                break
