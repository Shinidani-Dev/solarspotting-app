import platform
import matplotlib


def configure_matplotlib_backend():
    if platform.system() == "Darwin":
        try:
            matplotlib.use("MacOSX")
        except Exception:
            matplotlib.use("Agg")
    else:
        matplotlib.use("Agg")


configure_matplotlib_backend()
