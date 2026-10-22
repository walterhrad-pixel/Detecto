import os
import tempfile
from pathlib import Path

import pytest

os.environ["DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from models.record import clear_records  # noqa: E402

SAMPLES = Path(__file__).resolve().parent.parent / "samples"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_db():
    clear_records()
    yield


@pytest.fixture()
def two_people():
    return (SAMPLES / "frame02.jpg").read_bytes()


@pytest.fixture()
def no_people():
    return (SAMPLES / "frame10.jpg").read_bytes()
