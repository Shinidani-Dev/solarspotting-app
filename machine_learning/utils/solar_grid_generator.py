import numpy as np
from typing import Dict, List
from datetime import datetime
from .solar_orientation import SolarOrientation
from .solar_reprojector import SolarReprojector


class SolarGridGenerator:
    """
    Erzeugt ein 15°-Sonnenraster für das 2000x2000 Masterbild.
    Die Linien bestehen jeweils aus 90 interpolierten Punkten.
    """

    @staticmethod
    def generate_global_grid_15deg(
        dt: datetime,
        cx: int,
        cy: int,
        r: int,
        num_points: int = 90
    ) -> Dict[str, List[Dict]]:
        """
        Erzeugt das 15° Raster als Linien (Breiten/Längenlinien)
        Args:
            dt: Beobachtungszeitpunkt
            reprojector: SolarReprojector Instanz
            num_points: Anzahl Punkte pro Linie

        Returns:
            {
              "lat_lines": [
                {"lat": -75, "points": [{"px":..., "py":...}, ...]},
                ...
              ],
              "lon_lines": [
                {"lon": 0, "points": [{"px":..., "py":...}, ...]},
                ...
              ]
            }
        """

        B0, P0, L0 = SolarOrientation.from_datetime(dt)

        # 15° Raster
        lat_values = np.arange(-75, 90, 15)   # -75 … +75
        lon_values = np.arange(-180, 195, 15) # -180 … +180

        lat_lines = []
        lon_lines = []

        # ---- Breitenlinien (lat fix, lon var) ----
        for lat in lat_values:
            points = []
            # 90 Punkte: lon von -180 bis +180
            lon_samples = np.linspace(-180, 180, num_points)

            for lon in lon_samples:
                px, py, valid = SolarReprojector.heliographic_to_image(
                    lat=lat,
                    lon=lon,
                    B0=B0,
                    P0=P0,
                    L0=L0,
                    cx=cx,
                    cy=cy,
                    r=r
                )
                if valid:
                    points.append({"px": float(px), "py": float(py)})

            if points:
                lat_lines.append({"lat": float(lat), "points": points})

        # ---- Längslinien (lon fix, lat var) ----
        for lon in lon_values:
            points = []
            # 90 Punkte: lat von -90 bis +90
            lat_samples = np.linspace(-90, 90, num_points)

            for lat in lat_samples:
                px, py, valid = SolarReprojector.heliographic_to_image(
                    lat=lat,
                    lon=lon,
                    B0=B0,
                    P0=P0,
                    L0=L0,
                    cx=cx,
                    cy=cy,
                    r=r
                )
                if valid:
                    points.append({"px": float(px), "py": float(py)})

            if points:
                lon_lines.append({"lon": float(lon), "points": points})

        return {
            "lat_lines": lat_lines,
            "lon_lines": lon_lines
        }

    @staticmethod
    def generate_patch_grid(
        patch_x: int, patch_y: int,
        patch_size: int,
        cx: int, cy: int, r: int,
        dt,
        global_grid: dict
    ) -> Dict[str, List[Dict]]:
        """
        Erzeugt ein Patch-spezifisches Raster im RECTIFIED Patch.

        Args:
            patch_x, patch_y: Top-left pixel of patch (in 2k coords)
            patch_size: typically 512
            cx, cy, r: center/radius of the 2k sun image
            dt: timestamp for B0, P0, L0
            global_grid: output of generate_global_grid_15deg()

        Returns:
            {
              "patch_lat_lines": [...],
              "patch_lon_lines": [...]
            }
        """

        B0, P0, L0 = SolarOrientation.from_datetime(dt)

        patch_lat_lines = []
        patch_lon_lines = []

        # Helper to process BOTH lat and lon lines in same way
        def process_lines(lines):
            out = []

            for line in lines:
                new_line_pts = []

                for pt in line["points"]:
                    gx = pt["px"]
                    gy = pt["py"]

                    # check if global pixel lies inside patch region
                    if not (patch_x <= gx < patch_x + patch_size and
                            patch_y <= gy < patch_y + patch_size):
                        continue

                    # convert to patch local coordinates
                    local_x = gx - patch_x
                    local_y = gy - patch_y

                    # ENTZERRUNG: transform pixel through rectifier
                    rx, ry = SolarGridGenerator._rectify_point(
                        local_x, local_y,
                        patch_x, patch_y,
                        cx, cy, r,
                        B0, P0, L0,
                        patch_size
                    )

                    new_line_pts.append({"x": rx, "y": ry})

                if new_line_pts:
                    line_dict = {
                        "points": new_line_pts
                    }

                    # Check ob dies eine lat- oder lon-Linie ist
                    if "lat" in line:
                        line_dict["lat"] = line["lat"]
                    elif "lon" in line:
                        line_dict["lon"] = line["lon"]

                    out.append(line_dict)

            return out

        patch_lat_lines = process_lines(global_grid["lat_lines"])
        patch_lon_lines = process_lines(global_grid["lon_lines"])

        return {
            "patch_lat_lines": patch_lat_lines,
            "patch_lon_lines": patch_lon_lines
        }

    @staticmethod
    def _rectify_point(px_local, py_local,
                       patch_x, patch_y,
                       cx, cy, r,
                       B0, P0, L0,
                       patch_size):

        # Global 2k Koordinaten
        gx = patch_x + px_local
        gy = patch_y + py_local

        # Surface normal at grid point
        nx, ny, nz = SolarReprojector.cartesian_to_spherical(
            np.array([gx]), np.array([gy]), cx, cy, r
        )
        n = np.array([nx[0], ny[0], nz[0]], dtype=np.float64)
        n /= np.linalg.norm(n)

        # Surface normal at patch-center (reference normal)
        center_x = patch_x + patch_size // 2
        center_y = patch_y + patch_size // 2
        ncx, ncy, ncz = SolarReprojector.cartesian_to_spherical(
            np.array([center_x]), np.array([center_y]), cx, cy, r
        )
        n0 = np.array([ncx[0], ncy[0], ncz[0]], dtype=np.float64)
        n0 /= np.linalg.norm(n0)

        # Compute orientation axes (identical to rectify_patch_from_solar_orientation)
        P0_rad = np.deg2rad(P0)
        north_2d = np.array([-np.sin(P0_rad), -np.cos(P0_rad), 0.0])

        north_tangent = north_2d - np.dot(north_2d, n0) * n0
        north_tangent /= np.linalg.norm(north_tangent)

        y_axis = -north_tangent
        z_axis = n0
        x_axis = np.cross(y_axis, z_axis)
        x_axis /= np.linalg.norm(x_axis)

        R = np.stack((x_axis, y_axis, z_axis), axis=1)

        # Global normal → Koordinaten im tangent-frame
        local = R.T @ n

        # Implement SAME scaling as rectified image remap:
        rx = (local[0] * r + patch_size / 2)
        ry = (local[1] * r + patch_size / 2)

        return float(rx), float(ry)


