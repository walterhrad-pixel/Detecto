import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env")


def _resolve(value: str) -> str:
    path = Path(value)
    return str(path if path.is_absolute() else ROOT_DIR / path)


MODEL_PATH = _resolve(os.getenv("MODEL_PATH", "weights/yolov8n.pt"))
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.3"))
MAX_IMAGE_SIDE = int(os.getenv("MAX_IMAGE_SIDE", "1280"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "15"))
DB_PATH = _resolve(os.getenv("DB_PATH", "detections.db"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

Path(MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
