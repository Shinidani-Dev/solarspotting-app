from setuptools import setup, find_packages

setup(
    name="solarspotting-ml",
    version="0.2.0",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "numpy>=1.26.3",
        "opencv-python>=4.8.1.78",
        "pillow>=10.1.0",
        "scikit-image>=0.22.0",
        "matplotlib>=3.8.2",
        "tqdm>=4.66.1",
        "astropy>=6.1.4",
        "reproject>=0.14.0",
        "imageio>=2.36.0",
        "albumentations>=1.4.18",
        "requests>=2.32.3",
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "train": [
            "torch>=2.2.2",
            "torchvision>=0.17.2",
            "ultralytics>=8.0.196",
            "scikit-learn>=1.3.2",
            "tensorboard>=2.15.1",
            "seaborn>=0.13.1",
            "plotly>=5.17.0",
            "h5py>=3.10.0",
            "PyYAML>=6.0.1",
            "joblib>=1.3.2",
            "pandas>=2.1.4",
        ]
    },
)
