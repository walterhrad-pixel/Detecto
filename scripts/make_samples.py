import shutil
import sys
from pathlib import Path

import matplotlib
import numpy as np
import skimage
import ultralytics
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "backend" / "samples"
OUT.mkdir(parents=True, exist_ok=True)

assets = Path(ultralytics.__file__).parent / "assets"
sk = Path(skimage.__file__).parent / "data"
mpl = Path(matplotlib.get_data_path()) / "sample_data"


def load(path):
    return Image.open(path).convert("RGB")


def darken(img, factor=0.3):
    arr = np.asarray(img).astype(np.float32) / 255.0
    return Image.fromarray((np.power(arr, 1.8) * factor * 255).astype(np.uint8))


def shrink(img, scale):
    w, h = img.size
    return img.resize((max(int(w * scale), 1), max(int(h * scale), 1)), Image.LANCZOS)


def crop(img, box):
    w, h = img.size
    l, t, r, b = box
    return img.crop((int(w * l), int(h * t), int(w * r), int(h * b)))


bus = load(assets / "bus.jpg")
zidane = load(assets / "zidane.jpg")

samples = [
    ("frame01.jpg", bus),
    ("frame02.jpg", zidane),
    ("frame03.jpg", load(sk / "astronaut.png")),
    ("frame04.jpg", load(mpl / "grace_hopper.jpg")),
    ("frame05.jpg", darken(bus)),
    ("frame06.jpg", darken(zidane)),
    ("frame07.jpg", shrink(bus, 0.22)),
    ("frame08.jpg", crop(zidane, (0.0, 0.0, 0.62, 1.0))),
    ("frame09.jpg", crop(bus, (0.0, 0.0, 0.55, 1.0))),
    ("frame10.jpg", load(sk / "chelsea.png")),
    ("frame11.jpg", load(sk / "coffee.png")),
    ("frame12.jpg", load(sk / "motorcycle_left.png")),
]

for name, img in samples:
    img.save(OUT / name, quality=92)
    print(name, img.size)
