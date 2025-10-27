import cv2
import numpy as np
import matplotlib.pyplot as plt
from astropy.io import fits
from pathlib import Path
from skimage.filters import threshold_multiotsu
from machine_learning.enums.morpholog_operations import MorphologyOperation

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class ImageProcessor:
    """Utility-Klasse zum Einlesen und Bearbeiten von Bildern in verschiedenen Formaten"""

    @staticmethod
    def read_normal_image(path: str) -> np.ndarray:
        """
        Liest ein JPG/PNG Bild ein und gibt es als Numpy-Arry zurück
        Args:
            path: Pfad zur Bilddatei

        Returns: Eingelesenes Bild im BGR-Format (OpenCV-Standard)

        """
        path = Path(PROJECT_ROOT/path)
        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden {path}")

        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Bild konnte nicht geladen werden {path}")
        return image

    @staticmethod
    def read_fits_image(path: str) -> np.ndarray:
        """
        Liest ein rohes FITS-Bild (Flexible Image Transport System) mithilfe von astropy ein
        und gibt es als Numpy-Array zurück.
        Args:
            path: Pfad der Fits Bilddatei

        Returns: Bilddatei als Numpy-Array (dtype=float32)

        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden {path}")
        with fits.open(path) as hdul:
            data = hdul[0].data
            if data is None:
                raise ValueError(f"FITS-Datei enthält keine Bilddaten {path}")
            return np.array(data, dtype=np.float32)

    @staticmethod
    def print_img_stats(image: np.ndarray) -> None:
        """
        Gibt Metadaten zu einem Bild aus
        Args:
            image: Das Bild dessen Metadaten ausgegeben werden sollen
        """
        h, w = image.shape[:2]
        channels = 1 if image.ndim == 2 else image.shape[2]

        print("Bild Informationen:")
        print(f"    Auflösung: {w} x {h} Pixel")
        print(f"    Kanäle: {channels} ({'Graustufe' if channels == 1 else 'Farbe'})")

    @staticmethod
    def show_image(image: np.ndarray,
                   title: str = "Image",
                   circles: list | np.ndarray = None,
                   rectangles: list | np.ndarray = None
                   ) -> None:
        """
        Zeigt ein Bild mit matplotlib an und zeichnet, falls mitgegeben, auch circles und rechtecke ein.
        Beispiel Circle: Zum einkreisen der Sonnenscheibe
        Beispiel Rectangles: Zum einzeichnen interessanter Regionen
        Args:
            image: Das Bild als np.ndarray entweder RGB/BGR oder Graustufe
            title: Titel für das Fenster
            circles: Liste mit Kreisen die eingezeichnet werden sollen
            rectangles: Liste mit Rechtecken die eingezeichnet werden sollen
        """
        plt.figure(figsize=(8, 8))

        if image.ndim == 2:
            plt.imshow(image, cmap="gray")
        elif image.ndim == 3 and image.shape[2] == 3:
            plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        else:
            raise ValueError("Bildformat nicht unterstützt für show_image")

        ax = plt.gca()

        # Kreise einzeichnen
        if circles is not None:
            if isinstance(circles, np.ndarray):
                circles = circles.tolist()
            for (x, y, r) in circles:
                circle = plt.Circle((x, y), r, color='red', fill=False, linewidth=2)
                ax.add_patch(circle)
                plt.plot(x, y, "bo", markersize=4)  # Mittelpunkt

        # Rechtecke einzeichnen
        if rectangles is not None:
            if isinstance(rectangles, np.ndarray):
                rectangles = rectangles.tolist()
            for (x, y, w, h) in rectangles:
                rect = plt.Rectangle((x, y), w, h, color='lime', fill=False, linewidth=2)
                ax.add_patch(rect)

        plt.title(title)
        plt.axis("off")
        plt.show()

    @staticmethod
    def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
        """
        Stellt sicher, dass das mitgegebene Bild ein graustufenbild ist oder wandelt es in ein Graustufenbild um.
        Args:
            image: Eingabebild

        Returns:
            Graustufenbild des Eingabebildes
        """
        gray = image
        if image.ndim == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        return gray

    @staticmethod
    def overlay_masks(image: np.ndarray,
                      masks: dict,
                      colors: dict = None,
                      alpha: dict = None) -> np.ndarray:
        """
        Legt definierte masken halbtransparent über das mitgegeben Bild und gibt eine
        Kopie des Bildes samt des Overlays zurück.
        Args:
            image: Das Originalbild (Graustufen oder RGB)
            masks: Dict mit Masken z.B. Umbra, Penumbra und Photosphäre
            colors: Dict mit RGB-Farben pro Klasse
            alpha: Dict mit Opazität pro Klasse

        Returns:
            Gibt eine Kopie des Bildes mit den eingezeichneten Masken zurück.
        """
        # Standardfarben (BGR für OpenCV!)
        if colors is None:
            colors = {
                "umbra": (255, 0, 0),
                "penumbra": (0, 255, 0),
                "photosphere": (200, 200, 200)
            }

        if alpha is None:
            alpha = {
                "umbra": 0.6,
                "penumbra": 0.4,
                "photosphere": 0.8
            }

        # Falls Graustufenbild -> Konvertierung zu BGR, da für die Einzeichnung der Farbigen Masken mehr kanäle
        # notwendig sind.
        if len(image.shape) == 2 or image.shape[2] == 1:
            overlay = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            overlay = image.copy()

        overlay = overlay.astype(np.float32)

        # Masken anwenden
        for key, mask in masks.items():
            if key not in colors or key not in alpha:
                continue
            if alpha[key] <= 0:
                continue

            color = np.zeros_like(overlay, dtype=np.float32)
            color[:] = colors[key]

            mask3 = np.stack([mask.astype(np.float32)] * 3, axis=-1)
            overlay = overlay * (1 - alpha[key] * mask3) + color * (alpha[key] * mask3)

        return overlay.astype(np.uint8)

    @staticmethod
    def overlay_disk_mask(image: np.ndarray,
                          mask: np.ndarray,
                          color: tuple = (0, 255, 0),
                          alpha: float = 0.3) -> np.ndarray:
        """
        Legt die Disk-Maske der Sonne halbtransparent über das mitgegebene Bild
        Args:
            image: Eingabebild
            mask: Die Maske die über das Eingabebild gelegt wird (Maske der Scheibe)
            color: Die Farbe mit welcher die Maske eingefärbt wird
            alpha: Die Opazität der Farbe

        Returns:
            Gibt das mitgegbene Bild mit der drübergelegten Maske als Farbbild mit Overlay zurück
        """
        if len(image.shape) == 2:
            overlay = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            overlay = image.copy()

        overlay = overlay.astype(np.float32)
        color_layer = np.zeros_like(overlay, dtype=np.float32)
        color_layer[:] = color

        mask3 = np.stack([mask.astype(np.float32)] * 3, axis=-1)

        blended = overlay * (1 - alpha * mask3) + color_layer * (alpha * mask3)
        return blended.astype(np.uint8)

    @staticmethod
    def save_image(image: np.ndarray, output_folder: Path, filename: str) -> Path:
        """
        Speichert ein Bild (np.ndarray) in dem mitgegebenen ordner ab
        Args:
            image: Das Bild als np.ndarray das abgespeichert werden soll
            output_folder: Der Speicherort
            filename: Der neue Name der Datei

        Returns: Gibt den Pfad zurück unter welchem das Bild abgespeichert wurde

        """
        output_folder = Path(output_folder)
        output_folder.mkdir(parents=True, exist_ok=True)
        output_path = output_folder / filename

        success = cv2.imwrite(str(output_path), image)
        if not success:
            raise IOError(f"Fehler beim Speichern von {output_path}")

        print(f"Bild gespeichert: {output_path}")
        return output_path

    @staticmethod
    def resize_to_2k(image: np.ndarray) -> np.ndarray:
        """
        Skaliert ein Bild auf 2k x 2k hoch oder runter
        Args:
            image: Das Bild das resized werden muss

        Returns: gibt das Bild in 2k als np.ndarray zurück

        """
        target_size = (2048, 2048)
        resized = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
        return resized

    @staticmethod
    def detect_sun_disk(image: np.ndarray):
        """
        Nutzt die Hough Transformation (Hough Circles) um die Sonnenscheibe zu finden
        ACHTUNG diese funktion ist für 2k Bilder geschrieben und nicht verallgemeinert.
        Wieso?
        Weil die parameter so bestummen sind, dass der Rechenaufwand möglichst minimal bleibt auf einem 2kx2k Bild
        Args:
            image: Das Bild das eingelesen wird

        Returns: Den ersten gefundenen Kreis (array mit 3 Werten)
                    X Position des Mittelpunktes
                    Y Position des Mittelpunktes
                    Radius
        """
        # 1. Bild in Graustufen Umwandeln falls nicht schon grau ist.
        gray = image
        if image.ndim == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 2. Bild glätten (reduziert Rauschen)
        gray_blurred = cv2.medianBlur(gray, 5)

        # 3. Hough Circle Transform
        circles = cv2.HoughCircles(
            gray_blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,  # Inverser Verhältnis der Auflösung (1.0 = genau, >1 = schneller, gröber)
            minDist=1000,  # Mindestabstand zwischen Kreisen (Wir suchen auch nur 1 Kreis)
            param1=50,  # Canny edge high threshold (Da rand klar erkenntlich ist)
            param2=30,  # Accumulator threshold → kleinere Werte = mehr Sensitivität
            minRadius=800,  # erwartete minimaler Radius der Sonnenscheibe
            maxRadius=1150  # erwartete maximaler Radius
        )

        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            print("Gefundene Kreise:", circles)
            return circles[0]
        else:
            print("Keine Kreise gefunden.")
            return None

    @staticmethod
    def create_disk_mask(image: np.ndarray, cx: int, cy: int, r: int) -> np.ndarray:
        """
        Erstellt eine Maske für die Sonnenscheibe
        Args:
            image: Das Referenzbild
            cx: x-Koordinate des Mittelpunktes des Kreises
            cy: y-Koordinate des Mittelpunktes des Kreises
            r: radius des Kreises

        Returns:
            Gibt eine Binäre Maske als np.ndarray zurück das die Sonnenscheibe abdeckt.
        """
        h, w = image.shape[:2]
        y, x = np.ogrid[:h, :w]
        # set the mask minimally smaller, so that no circle artifacts apply when adding the mask to the binarized image
        r = r * 0.975
        mask_disk = (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2
        return mask_disk

    @staticmethod
    def segment_sunspots(image: np.ndarray, cx: int, cy: int, r: int) -> dict:
        """
        Methode zur 3-Stufigen Segmentierung der Sonne (Umbra, Penumbra und Photosphäre)
        Der Threshold wird mithilfe der Otsu Methode definiert.
        Damit der Schwarze hintergrund des Bildes hier nicht interferiert,
        wirdn die Sonnenscheibe maskiert und nur auf den Pixeln der Sonnenscheibe der Threshhold gesucht.
        Args:
            image: Graustufenbild als ndarray
            cx: X-Koordinate des Zentrums der Scheibe
            cy: Y-Koordinate des Zentrums der Scheibe
            r: Radius der Sonnenscheibe

        Returns:
            Ein dict mit binären Masken:
            umbra, penumbra, photosphere und disk
        """
        # 1. Die Disk Maskieren (Disk Maske erstellen)
        y, x = np.ogrid[:image.shape[0], :image.shape[1]]
        mask_disk = (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2  # <-- Kreisgleichung

        # 2. Nur Diskpixel für das Histogramm verwenden
        disk_pixels = image[mask_disk]

        # 3. Multi-Otsu Threshold (3 Klassen, 2 Schwellenwerte)
        thresholds = threshold_multiotsu(disk_pixels, classes=3)
        t1, t2 = thresholds
        print(thresholds)

        # 4. Klassifikation
        umbra_mask = (image <= t1) & mask_disk
        penumbra_mask = (image > t1) & (image <= t2) & mask_disk
        photosphere_mask = (image > t2) & mask_disk

        return {
            "umbra": umbra_mask.astype(bool),
            "penumbra": penumbra_mask.astype(bool),
            "photosphere": photosphere_mask.astype(bool),
            "disk": mask_disk.astype(bool)
        }

    @staticmethod
    def gaussian_blur(image: np.ndarray, ksize: int = 5, sigma: float = 2.0) -> np.ndarray:
        """
        Wendet einen Gauss-Filter an um Rauschen zu unterdrücken resp. "glätten"
        Args:
            image: Das Eingabebild
            ksize: Die Grösse des Gaussfilters (also der Matrix) -> Ungerade Zahl (3,5,7 ...)
            sigma: Standardabweichung des Gauss Kerns

        Returns: Gibt ein geglättetes Bild als np.ndarray zurück
        """
        return cv2.GaussianBlur(image, (ksize, ksize), sigma)

    @staticmethod
    def bilateral_filter(image: np.ndarray,
                         d: int = 5,
                         sigma_color: float = 150,
                         sigma_space: float = 150) -> np.ndarray:
        """
        Wendet einen bilateralen Filter an, um Rauschen zu reduzieren, ohne
        Wichtige Kanten, wie z.B. Penumbraränder zu verwischen.
        Args:
            image: Eingabebild (Graustufen oder BGR)
            d: Durchmesser des Pixel-Nachbarschaftsfensters (typ. 5-15)
            sigma_color: Fillerstärke im Farbraum (je höher, desto stärker)
            sigma_space: Fillerstärke im Raum (je höher, desto weiter Umgebung)

        Returns:
            Gefiltertes Bild als np.ndarray
        """
        return cv2.bilateralFilter(image, d, sigma_color, sigma_space)

    @staticmethod
    def contrast_stretch(image: np.ndarray, mask: np.ndarray = None) -> np.ndarray:
        """
        Lineare Kontrastspreizung auf [0, 255]
        Args:
            image: Das Graustufenbild das gespreizt wird
            mask: Optional, definiert Bildbereich für Spreizung
        Returns: Bild als np.ndarray mit gespreiztem Histogramm
        """
        if mask is not None:
            pixels = image[mask]
            min_val, max_val = np.min(pixels), np.max(pixels)
        else:
            min_val, max_val = np.min(image), np.max(image)

        if max_val == min_val:
            return image.copy()

        stretched = (image.astype(np.float32) - min_val) * (255 / (max_val - min_val))
        return np.clip(stretched, 0, 255).astype(np.uint8)

    @staticmethod
    def apply_clahe(image: np.ndarray, clip_limit: float = 2.0, tile_grid_size: tuple = (8, 8)) -> np.ndarray:
        """
        Wendet CLAHE (Contrast Limited Adaptive Histogram Equalization) an,
        um lokale Kontraste – besonders in mittleren Graubereichen wie der Penumbra –
        hervorzuheben.

        Args:
            image: Graustufenbild als np.ndarray
            clip_limit: Kontrastlimit (je höher, desto stärker der Effekt, typ. 2.0–4.0)
            tile_grid_size: Größe der Unterbereiche (z.B. (8,8) oder (16,16))

        Returns:
            np.ndarray: Bild nach CLAHE-Anwendung
        """
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        return clahe.apply(image)

    @staticmethod
    def gamma_correction(image: np.ndarray, gamma: float = 1.6) -> np.ndarray:
        """
        Wendet die Gammakorrektur auf das Eingabebild an
        Ein Gamm von > 1 verstärkt den Kontrast der dunkleren Regionen
        Args:
            image: Eingabebild
            gamma: exponent

        Returns:
            Gibt das Gamma Korrigierte Bild als np.ndarray zurück
        """
        norm = image.astype(np.float32) / 255
        corrected = np.power(norm, gamma) * 255
        return np.clip(corrected, 0, 255).astype(np.uint8)

    @staticmethod
    def segment_multi_levels_otsu(image: np.ndarray, mask: np.ndarray = None, classes: int = 4) -> np.ndarray:
        """
        Segmentiert ein Bild in anzahl Klassen mit multi-otsu
        Args:
            image: Eingabebild
            mask: Maske auf welchem Pixelbereich Multi-Otsu angewendet wird
            classes: aanzahl Segmentationsklassen

        Returns:
            Bild als np.ndarray in Anzahl Klassen = Anzahl Farbstufen
        """
        if mask is not None:
            pixels = image[mask]
        else:
            pixels = image

        # Multi-Otsu Thresholds
        thresholds = threshold_multiotsu(pixels, classes=classes)

        # Klassenzuweisung 0..(classes-1)
        regions = np.digitize(image, bins=thresholds)

        # Palette dynamisch erstellen (gleichmäßig über 0–255)
        palette = np.linspace(0, 255, classes, dtype=np.uint8)

        segmented = palette[regions]

        # Falls Maske gesetzt -> alles außerhalb schwarz
        if mask is not None:
            segmented[~mask] = 0

        return segmented

    @staticmethod
    def binarize_with_otsu(image: np.ndarray, invert: bool = True) -> np.ndarray:
        """
        Makes a simple otsu binarization on a grayscale image
        Args:
            image: Input image which is a Grayscale image
            invert: if true, dark spots will be 1 and white spots 0

        Returns:
            bin_mask: Binarized mask (0,1)
        """
        if image.dtype != np.uint8:
            image = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

        threshold_type = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY
        _, mask = cv2.threshold(image, 0, 255, threshold_type + cv2.THRESH_OTSU)

        bin_mask = (mask > 0).astype(np.uint8)
        return bin_mask

    @staticmethod
    def binarize_from_multiotsu_output(segmented: np.ndarray,
                                       background_value: int = 255,
                                       inverted: bool = True) -> np.ndarray:
        """
        Creates a binarized mask based on the output of a multilevel 3 class segmentation
            segmented: 3-class segmented multi otsu maks
            background_value: value of the photosphere
            inverted: specify if white and black pixels should be inverted
        Returns:
            bin_mask: binary mask (0,1)
        """
        # Alles, was nicht weiss (Photosphäre), ist interessant
        if inverted:
            bin_mask = np.where(segmented < background_value, 1, 0).astype(np.uint8)
        else:
            bin_mask = np.where(segmented < background_value, 0, 1).astype(np.uint8)
        return bin_mask

    @staticmethod
    def apply_morphology(mask: np.ndarray,
                         steps: list[tuple[MorphologyOperation, int]],
                         kernel_size: int = 7,
                         debug_mode: bool = False) -> np.ndarray:
        """
        Applies a sequence of morphology operations based on the provided steps
        Args:
            mask: The binarized mask on which to apply morphology
            steps: the sqeuence of morphologies to be applied with the number of iterations
            kernel_size: the size of morph filter
            debug_mode: specify if each step should be displayed in an image separately

        Returns:
            the new mask after applied morphology
        """
        morph = mask.copy().astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))

        for op, it in steps:
            if op == MorphologyOperation.ERODE:
                morph = cv2.erode(morph, kernel, iterations=it)
            elif op == MorphologyOperation.DILATE:
                morph = cv2.dilate(morph, kernel, iterations=it)
            elif op == MorphologyOperation.OPEN:
                morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel, iterations=it)
            elif op == MorphologyOperation.CLOSE:
                morph = cv2.morphologyEx(morph, cv2.MORPH_CLOSE, kernel, iterations=it)
            else:
                continue

            if debug_mode:
                ImageProcessor.show_image(morph * 255, f"{op.name} iter={it}")

        return morph

    @staticmethod
    def detect_candidates(mask: np.ndarray,
                          disk_mask: np.ndarray) -> list[dict]:
        """
        Detects connected regions in a binary mask and returns its center and bounding rectangle.
        The return value are so called candidates for the rectifying process and then for the cnn
        Args:
            mask: The binary image of the sun
            disk_mask: the maks, where to detect the candidates (only in the center)

        Returns:
        Eine Liste of dictionaries, per region:
            {
                "cx": float, "cy": float,
                "min_x": int, "min_y": int,
                "max_x": int, "max_y": int,
                "area": int
            }
        """
        mask = (mask > 0).astype(np.uint8)
        disk_mask = (disk_mask > 0).astype(np.uint8)

        mask_in_disk = cv2.bitwise_and(mask, disk_mask)

        ImageProcessor.show_image(mask_in_disk)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_in_disk, connectivity=8)

        regions = []

        for i in range(1, num_labels):
            x, y, w, h = stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_TOP], \
                         stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
            cx, cy = centroids[i]

            if not disk_mask[int(cy), int(cx)]:
                continue

            regions.append({
                "cx": float(cx),
                "cy": float(cy),
                "min_x": int(x),
                "min_y": int(y),
                "max_x": int(x + w),
                "max_y": int(y + h)
            })

        return regions

    @staticmethod
    def merge_nearby_candidates(regions: list[dict],
                                max_dist: int = 300,
                                max_size: int = 512
                                ) -> list[dict]:
        merged = []
        used = set()

        for i, r1 in enumerate(regions):
            if i in used:
                continue

            group = [r1]
            for j, r2 in enumerate(regions):
                if j in used or i == j:
                    continue
                dist = np.hypot(r1["cx"] - r2["cx"], r1["cy"] - r2["cy"])
                if dist < max_dist:
                    group.append(r2)
                    used.add(j)
            used.add(i)

            min_x = min(g["min_x"] for g in group)
            min_y = min(g["min_y"] for g in group)
            max_x = max(g["max_x"] for g in group)
            max_y = max(g["max_y"] for g in group)

            width = max_x - min_x
            height = max_y - min_y

            if width > max_size or height > max_size:
                for g in group:
                    merged.append(g)
                continue

            cx = np.mean([g["cx"] for g in group])
            cy = np.mean([g["cy"] for g in group])

            merged.append({
                "cx": float(cx),
                "cy": float(cy),
                "min_x": int(min_x),
                "min_y": int(min_y),
                "max_x": int(max_x),
                "max_y": int(max_y)
            })

        return merged

    @staticmethod
    def adjust_candidate_center(can_cx: float,
                                can_cy: float,
                                sun_cx: float,
                                sun_cy: float,
                                sun_r: float,
                                scale: int,
                                margin_factor: float = 0.98) -> tuple[float, float]:
        """
        Moves the candidate center coordinates slightly towards the center if it is too near from edge
        Args:
            can_cx: candidate center x
            can_cy: candidate center y
            sun_cx: sundisk center x
            sun_cy: sundisk center y
            sun_r: sundisk radius
            scale: scale of the desired patch
            margin_factor: add margin so that it is not too near from edge

        Returns:
            the new center coordinate of the candidate
        """
        dx, dy = can_cx - sun_cx, can_cy - sun_cy
        dist = np.sqrt(dx**2 + dy**2)
        max_dist = sun_r * margin_factor - (scale / 2)

        if dist <= max_dist:
            return can_cx, can_cy

        if dist < 1e-6:
            return can_cx, can_cy

        scalefactor = max_dist / dist
        new_can_x = sun_cx + dx * scalefactor
        new_can_y = sun_cy + dy * scalefactor

        return new_can_x, new_can_y

    @staticmethod
    def adjust_candidate_center_axiswise(can_cx: float,
                                         can_cy: float,
                                         sun_cx: float,
                                         sun_cy: float,
                                         sun_r: float,
                                         scale: int,
                                         margin_factor: float = 0.98) -> tuple[float, float]:
        """
        Adjusts the candidate center position if it is too close to the sun's edge.
        The shift is done axis-wise (x or y), depending on which axis exceeds the margin.

        Args:
            can_cx: candidate center x
            can_cy: candidate center y
            sun_cx: sun center x
            sun_cy: sun center y
            sun_r: sun disk radius
            scale: patch size (width or height in px)
            margin_factor: allowed relative margin from the disk edge (0.98 = 2% margin)

        Returns:
            (new_can_cx, new_can_cy)
        """
        dx, dy = can_cx - sun_cx, can_cy - sun_cy
        dist = np.sqrt(dx ** 2 + dy ** 2)

        max_r = sun_r * margin_factor - scale / 2

        if dist <= max_r:
            return can_cx, can_cy

        new_x, new_y = can_cx, can_cy

        x_min = sun_cx - max_r
        x_max = sun_cx + max_r
        y_min = sun_cy - max_r
        y_max = sun_cy + max_r

        if can_cx < x_min:
            new_x = x_min
        elif can_cx > x_max:
            new_x = x_max

        if can_cy < y_min:
            new_y = y_min
        elif can_cy > y_max:
            new_y = y_max

        return new_x, new_y


    @staticmethod
    def show_candidates(image: np.ndarray,
                        candidates: list[dict],
                        title: str = "Detected Candidates",
                        box_color: tuple = (0, 255, 0),
                        center_color: tuple = (255, 0, 0),
                        thickness: int = 2) -> None:
        """
        shows the image and draws the detected candidates in that passed image (as bounding rectangles)
        Args:
            image: Original image (gray or bgr)
            candidates: list of detected candidates
            title: title of display window
            box_color: color of the boxes
            center_color: color of the centers
            thickness: line thickness
        """
        if len(image.shape) == 2 or image.shape[2] == 1:
            img_out = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            img_out = image.copy()

        for c in candidates:
            cx = c["cx"]
            cy = c["cy"]
            min_x = c["min_x"]
            min_y = c["min_y"]
            max_x = c["max_x"]
            max_y = c["max_y"]

            cv2.rectangle(
                img_out,
                (min_x, min_y),
                (max_x, max_y),
                box_color,
                thickness
            )

            cv2.circle(
                img_out,
                (int(c["cx"]), int(c["cy"])),
                radius=5,
                color=center_color,
                thickness=-1
            )

            text = f"center: ({int(cx)}, {int(cy)})"
            text_pos = (min_x - 100, max_y + 20)
            cv2.putText(
                img_out,
                text,
                text_pos,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                center_color,
                1,
                cv2.LINE_AA
            )

        ImageProcessor.show_image(img_out, title)

    @staticmethod
    def bitwise_masking_sundisk(mask: np.ndarray,
                                disk_mask: np.ndarray) -> np.ndarray:
        mask = (mask > 0).astype(np.uint8)
        disk_mask = (disk_mask > 0).astype(np.uint8)

        mask_in_disk = cv2.bitwise_and(mask, disk_mask)

        ImageProcessor.show_image(mask_in_disk)

        return mask_in_disk
