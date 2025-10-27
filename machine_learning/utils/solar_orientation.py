import numpy as np
from datetime import datetime


class SolarOrientation:
    """
    Berechnet heliographische Orientierungsparameter B₀, P₀, L₀
    basierend auf dem Beobachtungszeitpunkt.
    """

    @staticmethod
    def datetime_to_jde(dt: datetime, delta_t: float = 66.0) -> float:
        """
        Konvertiert datetime zu Julianischem Datum (JDE).

        Args:
            dt: Beobachtungszeitpunkt
            delta_t: TD - UT in Sekunden (Standard: 66s für ~2025)

        Returns:
            Julianisches Datum (JDE)
        """
        Y = dt.year
        M = dt.month
        D = dt.day
        H = dt.hour
        h = dt.minute
        s = dt.second

        # Spezialfall für Januar/Februar
        if M <= 2:
            Y = Y - 1
            M = M + 12

        A = int(Y / 100)
        B = 2 - A + int(A / 4)

        # Tagesbruchteil
        d = (H + (h / 60.0) + (s / 3600.0)) / 24.0

        JDE = (int(365.25 * (Y + 4716)) +
               int(30.6001 * (M + 1)) +
               D + d + B - 1524.5 +
               delta_t / 86400.0)

        return JDE

    @staticmethod
    def calculate_sun_position(jde: float) -> tuple[float, float, float]:
        """
        Berechnet scheinbare ekliptikale Länge der Sonne.

        Returns:
            (SL, R, Epsilon) - Scheinbare Länge, Distanz, Ekliptikschiefe
        """
        T = (jde - 2451545.0) / 36525.0

        # Mittlere geometrische Länge
        L = 280.46645 + 36000.76983 * T + 0.0003032 * T ** 2

        # Mittlere Anomalie
        MA = 357.52910 + 35999.05030 * T - 0.0001559 * T ** 2 - 0.00000048 * T ** 3
        MA = np.deg2rad(MA % 360.0)

        # Exzentrizität
        e = 0.016708617 - 0.000042037 * T - 0.0000001236 * T ** 2

        # Mittelpunktsgleichung
        C = ((1.914600 - 0.004817 * T - 0.000014 * T ** 2) * np.sin(MA) +
             (0.019993 - 0.000101 * T) * np.sin(2 * MA) +
             0.000290 * np.sin(3 * MA))

        # Wahre Länge und Anomalie
        WL = L + C
        v = MA + np.deg2rad(C)

        # Distanz Erde-Sonne (AU)
        R = (1.000001018 * (1 - e ** 2)) / (1 + e * np.cos(v))

        # Nutation in Länge
        Omega = np.deg2rad(125.04452 - 1934.136261 * T)
        LS = np.deg2rad(280.4665 + 36000.7698 * T)
        LM = np.deg2rad(218.3165 + 481267.8813 * T)

        Delta_psi = (-17.20 * np.sin(Omega) -
                     1.32 * np.sin(2 * LS) -
                     0.23 * np.sin(2 * LM) +
                     0.21 * np.sin(2 * Omega)) / 3600.0  # Bogensekunden -> Grad

        Delta_epsilon = (9.20 * np.cos(Omega) +
                         0.57 * np.cos(2 * LS) +
                         0.10 * np.cos(2 * LM) -
                         0.09 * np.cos(2 * Omega)) / 3600.0

        # Schiefe der Ekliptik
        Epsilon = (84381.448 - 46.8150 * T - 0.00059 * T ** 2 + 0.001813 * T ** 3) / 3600.0
        Epsilon += Delta_epsilon

        # Scheinbare Länge
        SL = WL + Delta_psi

        return SL % 360.0, R, Epsilon

    @staticmethod
    def calculate_B0_P0_L0(jde: float) -> tuple[float, float, float]:
        """
        Berechnet heliographische Orientierungsparameter.

        Args:
            jde: Julianisches Datum

        Returns:
            (B0, P0, L0) in Grad
            - B0: Heliographische Breite des Scheibenmittelpunkts
            - P0: Positionswinkel der Sonnenachse
            - L0: Heliographische Länge des Zentralmeridians
        """
        T = (jde - 2451545.0) / 36525.0

        # Scheinbare Länge der Sonne
        SL, R, Epsilon = SolarOrientation.calculate_sun_position(jde)
        SL_rad = np.deg2rad(SL)
        Epsilon_rad = np.deg2rad(Epsilon)

        # Rotationsparameter
        Theta = ((jde - 2398220.0) * 360.0 / 25.38) % 360.0

        I = 7.25  # Inklination des Sonnenäquators
        I_rad = np.deg2rad(I)

        K = 73.6667 + 1.3958333 * (jde - 2396758.0) / 36525.0
        K_rad = np.deg2rad(K)

        # Berechnung von P0
        x = np.arctan(-np.cos(SL_rad) * np.tan(Epsilon_rad))
        y = np.arctan(-np.cos(SL_rad - K_rad) * np.tan(I_rad))

        P0 = np.rad2deg(x + y)

        # Berechnung von B0
        sin_B0 = np.sin(SL_rad - K_rad) * np.sin(I_rad)
        B0 = np.rad2deg(np.arcsin(sin_B0))

        # Berechnung von L0
        tan_Eta = np.tan(SL_rad - K_rad) * np.cos(I_rad)
        Eta = np.arctan(tan_Eta)

        # Eta muss im selben Quadranten sein wie (SL - K)
        SL_K_diff = (SL - K) % 360.0
        if SL_K_diff > 180:
            SL_K_diff -= 360

        Eta_deg = np.rad2deg(Eta)

        # Quadrant-Korrektur
        if 90 < SL_K_diff <= 270:
            if Eta_deg > 0:
                Eta_deg -= 180
            else:
                Eta_deg += 180

        L0 = (Eta_deg - Theta) % 360.0

        return B0, P0, L0

    @staticmethod
    def from_datetime(dt: datetime) -> tuple[float, float, float]:
        """
        Convenience-Methode: Berechnet B0, P0, L0 direkt aus datetime.

        Args:
            dt: Beobachtungszeitpunkt (UTC)

        Returns:
            (B0, P0, L0) in Grad
        """
        jde = SolarOrientation.datetime_to_jde(dt)
        return SolarOrientation.calculate_B0_P0_L0(jde)
