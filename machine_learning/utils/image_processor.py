import cv2
import numpy as np
from astropy.io import fits
from pathlib import Path


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
        path = Path(path)
        print(path)
        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden: {path}")

        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Bild konnte nicht geladen werden: {path}")
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
                raise ValueError(f"FITS-Datei enthält keine Bilddaten: {path}")
            return np.array(data, dtype=np.float32)

