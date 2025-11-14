import platform
import matplotlib
import os

def configure_matplotlib_backend():
    import matplotlib
    import platform
    import os

    system = platform.system()

    if system == "Darwin":  # macOS
        try:
            matplotlib.use("MacOSX")
        except Exception:
            matplotlib.use("TkAgg")  # fallback, sollte immer funktionieren
        return

    # Linux headless mode
    if system == "Linux":
        if os.environ.get("DISPLAY"):
            matplotlib.use("TkAgg")
        else:
            matplotlib.use("Agg")
        return

    # Windows default
    if system == "Windows":
        matplotlib.use("TkAgg")
        return

