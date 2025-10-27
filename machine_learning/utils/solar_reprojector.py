import numpy as np
import cv2

from datetime import datetime
from machine_learning.utils.solar_orientation import SolarOrientation


"""
Konstanten
"""
SOLAR_RADIUS_KM = 696_340.0
EPSILON = 1e-12



class SolarReprojector:
    """
    Sammlung von statischen Methoden zur Geometrischen enzerrung und physikalischen Skalierung von Sonnenflckenregionen
    """

    @staticmethod
    def km_per_pixel(r_pix: int) -> float:
        """
        Berechnet das km/px Verhältnis für das Bild
        Args:
            r_pix: radius des der Sonnescheibe auf dem Bild
            (Mithilfe von Hough Transform kann dies festgestellt werden)
        Returns:
            Gibt das Verhältnis zwischen dem Radius der sonne und der Pixel zurück
        """
        return SOLAR_RADIUS_KM / r_pix

    @staticmethod
    def cartesian_to_spherical(x: np.ndarray, y: np.ndarray, cx: int, cy: int, r: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Wandelt Bildkoordinaten (x, y) -> in sphörische Koordinaten (X, Y, Z) um
        Args:
            x: X-Pixelkoordinaten
            y: Y-Pixelkoordinaten
            cx: X-Koordinate des zentrums der Scheibe
            cy: Y-Koordinate des zentrums der Scheibe
            r: radius der Sonnenscheibe (in Pixel)

        Returns:
            X, Y, Z -> Normierte 3D-Koordinaten auf der Kugel
        """
        nx = (x - cx) / r
        ny = (y - cy) / r
        mask = nx ** 2 + ny ** 2 <= 1
        nz = np.zeros_like(nx)
        nz[mask] = np.sqrt(1 - (nx[mask] ** 2 + ny[mask] ** 2))
        return nx, ny, nz

    @staticmethod
    def generate_patch_grid(px: int, py: int, scale: int) -> tuple[np.ndarray, np.ndarray]:
        """
        Erzeugt ein lokales Koordinatengitter (x, y) um den Punkt (px, py) auf dem bild
        Args:
            px: X-Koordinate des Patchmittelpunkts
            py: py: Y-Koordinate des Patchmittelpunkts
            scale: Kantenlänge des Patchs in Pixel (z.B. 128)

        Returns:
            Tupel mit 2D-Arrays für die X und Y Koordinaten
        """
        half = scale // 2
        xs = np.linspace(px - half, px + half - 1, scale)
        ys = np.linspace(py - half, py + half - 1, scale)
        grid_x, grid_y = np.meshgrid(xs, ys)
        return grid_x, grid_y

    @staticmethod
    def generate_patch_with_mask(image: np.ndarray,
                                 px: int, py: int, scale: int,
                                 cx: int, cy: int, r: int) -> tuple[np.ndarray, np.ndarray]:
        grid_x, grid_y = SolarReprojector.generate_patch_grid(px, py, scale)
        h, w = image.shape[:2]

        mask = (grid_x - cx) ** 2 + (grid_y - cy) ** 2 <= r ** 2

        patch = cv2.remap(
            image,
            grid_x.astype(np.float32),
            grid_y.astype(np.float32),
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=[-1.0]
        )

        patch[~mask] = -1
        return patch, mask

    @staticmethod
    def rectify_patch(image: np.ndarray,
                      px: int, py: int, scale: int,
                      cx: int, cy: int, r: int) -> np.ndarray:
        """
        Führt eine lokale orthografische Reprojektion (Rektifizierung) auf der Sonnenkugel durch.
        """
        nx, ny, nz = SolarReprojector.cartesian_to_spherical(
            np.array([px]), np.array([py]), cx, cy, r
        )
        n = np.array([nx[0], ny[0], nz[0]], dtype=np.float64)
        n /= np.linalg.norm(n)

        z_axis = n

        ref = np.array([0.0, 1.0, 0.0]) if abs(z_axis[2]) > 0.9 else np.array([0.0, 0.0, 1.0])

        x_axis = np.cross(ref, z_axis)
        x_axis /= np.linalg.norm(x_axis)
        y_axis = np.cross(z_axis, x_axis)
        y_axis /= np.linalg.norm(y_axis)

        R = np.stack((x_axis, y_axis, z_axis), axis=1)

        gx, gy = np.meshgrid(np.linspace(-1, 1, scale), np.linspace(-1, 1, scale))
        gx *= (scale / (2 * r))
        gy *= (scale / (2 * r))

        points_local = np.stack((gx, gy, np.ones_like(gx)), axis=-1)
        points_global = points_local @ R.T

        X_new = (points_global[..., 0] * r + cx).astype(np.float32)
        Y_new = (points_global[..., 1] * r + cy).astype(np.float32)

        rectified = cv2.remap(
            image.astype(np.float32),
            X_new, Y_new,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=[0.0]
        )
        if px > cx:
            rectified = cv2.rotate(rectified, cv2.ROTATE_90_CLOCKWISE)
        else:
            rectified = cv2.rotate(rectified, cv2.ROTATE_90_COUNTERCLOCKWISE)

        return rectified

    @staticmethod
    def rectify_patch_from_solar_orientation(image: np.ndarray,
                      px: int, py: int, scale: int,
                      cx: int, cy: int, r: int,
                      observation_time: datetime) -> np.ndarray:
        """
        Führt eine lokale orthografische Reprojektion mit korrekter Orientierung durch.

        Args:
            P0: Positionswinkel der Sonnenachse (in Grad)
            B0: Heliographische Breite des Scheibenmittelpunkts (in Grad)
        """
        B0, P0, L0 = SolarOrientation.from_datetime(observation_time)

        nx, ny, nz = SolarReprojector.cartesian_to_spherical(
            np.array([px]), np.array([py]), cx, cy, r
        )
        n = np.array([nx[0], ny[0], nz[0]], dtype=np.float64)
        n /= np.linalg.norm(n)

        # 2. Heliographische "Nord"-Richtung im Bildkoordinatensystem
        P0_rad = np.deg2rad(P0)
        north_2d = np.array([-np.sin(P0_rad), -np.cos(P0_rad), 0.0])

        # 3. Projiziere "Nord" in die Tangentialebene am Punkt n
        north_tangent = north_2d - np.dot(north_2d, n) * n
        north_tangent /= np.linalg.norm(north_tangent)

        # 4. Lokales Koordinatensystem mit Nord = y-Achse
        y_axis = -north_tangent  # Nord zeigt "nach oben" im rektifizierten Bild
        z_axis = n  # Normal zur Sonnenoberfläche
        x_axis = np.cross(y_axis, z_axis)  # Ost-West-Richtung
        x_axis /= np.linalg.norm(x_axis)

        # 5. Rotationsmatrix (Spalten = Basisvektoren)
        R = np.stack((x_axis, y_axis, z_axis), axis=1)

        # 6. Grid im lokalen System erstellen
        gx, gy = np.meshgrid(np.linspace(-1, 1, scale), np.linspace(-1, 1, scale))
        gx *= (scale / (2 * r))
        gy *= (scale / (2 * r))

        points_local = np.stack((gx, gy, np.ones_like(gx)), axis=-1)
        points_global = points_local @ R.T

        # 7. Zurück in Bildkoordinaten
        X_new = (points_global[..., 0] * r + cx).astype(np.float32)
        Y_new = (points_global[..., 1] * r + cy).astype(np.float32)

        # 8. Remap OHNE zusätzliche Rotation
        rectified = cv2.remap(
            image.astype(np.float32),
            X_new, Y_new,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=[0.0]
        )

        return rectified
