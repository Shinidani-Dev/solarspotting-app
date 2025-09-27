import cv2
import numpy as np
import matplotlib.pyplot as plt
from astropy.io import fits
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


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
