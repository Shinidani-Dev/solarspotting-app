import numpy as np
import cv2


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
        Args:
            image: Eingabebild der Sonne in Graustufen
            px: X-Koordinate des Patch mittelpunktes
            py: Y-Koordinate des Patch mittelpunktes
            scale: Kantenlänge des quadratischen Patches (z.B. 128 px)
            cx: X-Koordinate des Zentrums der Sonnenscheibe
            cy: Y-Koordinate des Zentrums der sonnenscheibe
            r: radius der Sonnenscheibe (in Pixeln)

        Returns:
            rect: Entzerrtes Bild im Patch
            km_per_px: physikalischer Massstab in km/px
        """
        nx, ny, nz = SolarReprojector.cartesian_to_spherical(np.array(px), np.array(py), cx, cy, r)
        n = np.array([nx, ny, nz], dtype=np.float64)
        n /= np.linalg.norm(n)

        z_axis = np.array([0.0, 0.0, 1.0])
        # gibt den Normalenvektor zwischen der Z-Achse und dem vektor n,
        # also da wo sich der Mittelpunkt unseres patches befindet
        v = np.cross(z_axis, n)
        # sinus des Drehwinkels
        s = np.linalg.norm(v)
        # cosinus des Drehwinkels
        c = np.dot(z_axis, n)

        # wenn sinos nache bei 0 ist oder cosinus nahe bei 1,
        # dann "schauen" wir schon direkt darauf und als "Rotationsmatrix" wird einfach die einheitsmatrix genommen
        if s < EPSILON or np.isclose(c, 1.0):
            R = np.eye(3)
        else:
            # Rodrigues'sche Rotationsformel
            vx = np.array([[0, -v[2], v[1]],
                           [v[2], 0, -v[0]],
                           [-v[1], v[0], 0]])
            R = np.eye(3) + vx + vx @ vx * ((1 - c) / (s ** 2))

        # hier wird ien 2D Raster für den lokalen Patch erstellt
        grid_x, grid_y = SolarReprojector.generate_patch_grid(px, py, scale)
        # hier wird das raster in 3D-Punkte auf der sonnenkugel umgewandelt
        X, Y, Z = SolarReprojector.cartesian_to_spherical(grid_x, grid_y, cx, cy, r)

        points = np.stack((X, Y, Z), axis=-1)
        rotated = points @ R.T

        X_new = (rotated[..., 0] * r + cx).astype(np.float32)
        Y_new = (rotated[..., 1] * r + cy).astype(np.float32)

        # OpenCv funktion um neue Pixelwerte aus dem Originalbild mittels interpolation zu errechnen.
        # "INTER_LINEAR" sorgt für glatte Übergänge
        rectified = cv2.remap(
            image.astype(np.float32),
            X_new, Y_new,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=[0.0]
        )
        return rectified

