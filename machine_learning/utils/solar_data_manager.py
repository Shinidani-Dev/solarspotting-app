from pathlib import Path
from sunpy.net import Fido, attrs as a
from datetime import datetime, timedelta

ML_FOLDER = Path(__file__).resolve().parent.parent
RAW_FOLDER = ML_FOLDER.joinpath("data", "img", "normal", "raw")


class SolarDataManager:
    """Utility-Klasse zum Laden und abspeichern von FITS-Bildern von SDO/SOHO etc."""

    @staticmethod
    def fetch_hmi_continuum(date: str, time: str, output_folder: Path = RAW_FOLDER) -> list[Path]:
        """
        Lädt HMI Continuum FITS-Dateien von SDO herunter und speichert sie im angegebenen Ordner
        Args:
            date: Datum im Format 'YYYY-MM-DD'
            time: Uhrzeit im Format HH:MM
            output_folder: Speicherordner

        Returns:
            Liste der gespeicherten FITS-Dateien als Path Objekte
        """
        import astropy.units as u

        start = datetime.fromisoformat(f"{date} {time}")
        end = start + timedelta(minutes=1)

        result = Fido.search(
            a.Time(start, end),
            a.Instrument("AIA"),
            a.Wavelength(171*u.angstrom)
        )

        if len(result) == 0:
            print("Keine Dateien gefunden")
            return []

        output_folder.mkdir(parents=True, exist_ok=True)

        files = Fido.fetch(result, path=str(output_folder / "{file}.fits"))

        return [Path(f) for f in files]
