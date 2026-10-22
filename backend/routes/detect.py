import base64
import binascii
import logging
from typing import Optional

import cv2
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from config import CONF_THRESHOLD, MAX_IMAGE_SIDE, MAX_UPLOAD_MB
from models import record
from utils.inference import detect_people
from utils.overlay import draw_overlay
from utils.preprocessing import InvalidImageError, UnsupportedFormatError, decode_image

logger = logging.getLogger("detecto")
router = APIRouter()


@router.post("/detect")
async def detect(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    conf: float = Form(CONF_THRESHOLD),
    enhance: bool = Form(False),
    overlay: bool = Form(True),
    save: bool = Form(True),
):
    if not 0.0 < conf <= 1.0:
        raise HTTPException(400, "conf must be greater than 0 and at most 1")

    if file is not None:
        data = await file.read()
    elif image_base64:
        payload = image_base64.split(",", 1)[-1]
        try:
            data = base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(422, "image_base64 is not valid base64")
    else:
        raise HTTPException(400, "No image provided. Send a file or image_base64")

    if not data:
        raise HTTPException(400, "The uploaded file is empty")
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"The file is larger than {MAX_UPLOAD_MB} MB")

    try:
        img = decode_image(data, max_side=MAX_IMAGE_SIDE, enhance=enhance)
    except UnsupportedFormatError as e:
        raise HTTPException(415, str(e))
    except InvalidImageError as e:
        raise HTTPException(422, str(e))

    people, inference_time = detect_people(img, conf)
    count = len(people)
    avg_conf = round(sum(p["confidence"] for p in people) / count, 3) if count else 0.0

    if save:
        record.save_record(count, avg_conf, inference_time)
    logger.info("detect count=%d avg_conf=%.3f time=%.3fs conf=%.2f", count, avg_conf, inference_time, conf)

    h, w = img.shape[:2]
    response = {
        "count": count,
        "avg_confidence": avg_conf,
        "processing_time": inference_time,
        "conf_threshold": conf,
        "image_size": {"width": w, "height": h},
        "people": people,
        "image": None,
    }

    if overlay:
        ok, buf = cv2.imencode(".jpg", draw_overlay(img, people), [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            raise HTTPException(500, "Could not encode the result image")
        response["image"] = base64.b64encode(buf).decode()

    return response
