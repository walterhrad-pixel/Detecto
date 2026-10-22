import io

import cv2
import numpy as np
from PIL import Image, ImageOps

ALLOWED_FORMATS = {"JPEG", "PNG"}


class InvalidImageError(ValueError):
    pass


class UnsupportedFormatError(ValueError):
    pass


def decode_image(data: bytes, max_side: int = 1280, enhance: bool = False) -> np.ndarray:
    try:
        pil = Image.open(io.BytesIO(data))
        fmt = pil.format
        pil.load()
    except Exception:
        raise InvalidImageError("The file could not be read as an image")

    if fmt not in ALLOWED_FORMATS:
        raise UnsupportedFormatError("Only JPEG and PNG images are supported")

    pil = ImageOps.exif_transpose(pil).convert("RGB")
    img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)

    img = limit_size(img, max_side)
    if enhance:
        img = adjust_contrast(img)
    return img


def limit_size(img: np.ndarray, max_side: int) -> np.ndarray:
    h, w = img.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return img
    scale = max_side / longest
    return cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)


def adjust_contrast(img: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return cv2.cvtColor(cv2.merge((clahe.apply(l), a, b)), cv2.COLOR_LAB2BGR)
