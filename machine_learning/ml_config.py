import platform
import matplotlib
import os


def configure_matplotlib_backend():
    if os.environ.get("DISPLAY") is None and platform.system() != "Windows":
        matplotlib.use("Agg")  # headless
    else:
        matplotlib.use("TkAgg")


configure_matplotlib_backend()
