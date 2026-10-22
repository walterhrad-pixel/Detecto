import time

import numpy as np
from ultralytics import YOLO

from config import MODEL_PATH

PERSON_CLASS = 0

model = YOLO(MODEL_PATH)
model(np.zeros((64, 64, 3), dtype=np.uint8), verbose=False)


def detect_people(img: np.ndarray, conf: float):
    start = time.perf_counter()
    result = model(img, classes=[PERSON_CLASS], conf=conf, verbose=False)[0]
    elapsed = round(time.perf_counter() - start, 3)

    people = []
    for box in result.boxes:
        x1, y1, x2, y2 = (int(v) for v in box.xyxy[0].tolist())
        people.append({"box": [x1, y1, x2, y2], "confidence": round(float(box.conf[0]), 3)})
    return people, elapsed
