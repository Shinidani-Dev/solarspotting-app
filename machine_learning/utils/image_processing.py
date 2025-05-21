from pathlib import Path
from urllib.parse import urlparse

import requests
import cv2


def download_and_save_image(url, output_dir="storage/raw", filename=None, overwrite=False):
    """
    Download image from URL and save to local directory

    Args:
        url: URL of the image to download
        output_dir: Directory to save the image (default: storage/raw)
        filename: Optional filename. If None, extracts from URL
        overwrite: If False, skip download if file already exists

    Returns:
        Path to the downloaded (or existing) file
    """
    # Ensure output directory exists
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine filename
    if filename is None:
        # Extract filename from URL
        parsed_url = urlparse(url)
        filename = Path(parsed_url.path).name

        # Ensure we have a valid filename
        if not filename or filename == '/':
            filename = "downloaded_image.jpg"

    output_path = output_dir / filename

    # Check if file already exists
    if output_path.exists() and not overwrite:
        file_size = output_path.stat().st_size
        print(f"File already exists: {output_path} ({file_size / 1024:.1f} KB)")
        return output_path

    try:
        # Download the image using requests
        print(f"Downloading from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Save to file
        with open(output_path, 'wb') as f:

            f.write(response.content)

        file_size = output_path.stat().st_size
        print(f"Downloaded successfully to: {output_path} ({file_size / 1024:.1f} KB)")
        return output_path

    except requests.exceptions.RequestException as e:
        raise ValueError(f"Error downloading image: {e}")
    except Exception as e:
        raise ValueError(f"Error saving image: {e}")


def download_multiple_images(urls, output_dir="storage/raw", overwrite=False):
    """
    Download multiple images from a list of URLs

    Args:
        urls: List of URLs or dict with {filename: url} pairs
        output_dir: Directory to save the images
        overwrite: If False, skip download if file already exists

    Returns:
        Dictionary of {filename: Path} for successful downloads
    """
    downloaded = {}

    if isinstance(urls, list):
        # Convert list to dict with auto-generated filenames
        urls = {None: url for url in urls}

    for filename, url in urls.items():
        try:
            path = download_and_save_image(url, output_dir, filename, overwrite)
            downloaded[path.name] = path
        except Exception as e:
            print(f"Failed to download {url}: {e}")

    return downloaded


def load_image(image_path):
    """Load image using OpenCV"""
    img = cv2.imread(str(image_path))
    # Convert BGR to RGB for display
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img_rgb
