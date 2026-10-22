import base64
import io

from PIL import Image


def post_image(client, data, name="photo.jpg", mime="image/jpeg", **fields):
    return client.post("/detect", files={"file": (name, data, mime)}, data=fields)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_detect_counts_people(client, two_people):
    res = post_image(client, two_people)
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 2
    assert len(body["people"]) == 2
    assert all(0 < p["confidence"] <= 1 for p in body["people"])
    assert all(len(p["box"]) == 4 for p in body["people"])
    assert body["processing_time"] > 0
    assert base64.b64decode(body["image"])[:2] == b"\xff\xd8"


def test_detect_no_people(client, no_people):
    body = post_image(client, no_people).json()
    assert body["count"] == 0
    assert body["avg_confidence"] == 0


def test_detect_base64(client, two_people):
    res = client.post("/detect", data={"image_base64": base64.b64encode(two_people).decode()})
    assert res.status_code == 200
    assert res.json()["count"] == 2


def test_overlay_can_be_skipped(client, two_people):
    body = post_image(client, two_people, overlay="false").json()
    assert body["image"] is None


def test_contrast_boost_still_detects(client, two_people):
    body = post_image(client, two_people, enhance="true").json()
    assert body["count"] == 2


def test_higher_threshold_never_adds_people(client, two_people):
    low = post_image(client, two_people, conf="0.2").json()["count"]
    high = post_image(client, two_people, conf="0.9").json()["count"]
    assert high <= low


def test_empty_file(client):
    assert post_image(client, b"").status_code == 400


def test_missing_file(client):
    assert client.post("/detect").status_code == 400


def test_text_file_renamed_to_jpg(client):
    res = post_image(client, b"definitely not an image")
    assert res.status_code == 422


def test_unsupported_format(client):
    buf = io.BytesIO()
    Image.new("RGB", (20, 20)).save(buf, format="GIF")
    res = post_image(client, buf.getvalue(), "a.gif", "image/gif")
    assert res.status_code == 415


def test_invalid_base64(client):
    res = client.post("/detect", data={"image_base64": "%%%not base64%%%"})
    assert res.status_code == 422


def test_invalid_threshold(client, two_people):
    assert post_image(client, two_people, conf="0").status_code == 400
    assert post_image(client, two_people, conf="1.5").status_code == 400


def test_detection_is_saved_and_listed(client, two_people):
    post_image(client, two_people)
    rows = client.get("/history").json()
    assert len(rows) == 1
    assert rows[0]["count"] == 2
    assert set(rows[0]) == {"id", "timestamp", "count", "avg_confidence", "inference_time"}


def test_save_false_skips_history(client, two_people):
    post_image(client, two_people, save="false")
    assert client.get("/history").json() == []


def test_history_confidence_filter(client, two_people):
    post_image(client, two_people)
    assert len(client.get("/history", params={"min_confidence": 0.1}).json()) == 1
    assert client.get("/history", params={"min_confidence": 0.99}).json() == []


def test_history_date_filter(client, two_people):
    post_image(client, two_people)
    assert client.get("/history", params={"start": "2999-01-01T00:00:00"}).json() == []
    assert len(client.get("/history", params={"end": "2999-01-01T00:00:00"}).json()) == 1


def test_history_rejects_bad_confidence(client):
    assert client.get("/history", params={"min_confidence": 2}).status_code == 422


def test_stats(client, two_people, no_people):
    post_image(client, two_people)
    post_image(client, no_people)
    stats = client.get("/stats").json()
    assert stats["detections"] == 2
    assert stats["peak_count"] == 2
    assert stats["avg_count"] == 1.0
    assert stats["avg_confidence"] > 0.6
    assert len(stats["hourly"]) == 1
    assert stats["hourly"][0]["detections"] == 2


def test_stats_empty(client):
    stats = client.get("/stats").json()
    assert stats["detections"] == 0
    assert stats["hourly"] == []


def test_csv_export(client, two_people):
    post_image(client, two_people)
    res = client.get("/history/export")
    assert res.headers["content-type"].startswith("text/csv")
    lines = res.text.strip().splitlines()
    assert lines[0] == "id,timestamp,count,avg_confidence,inference_time"
    assert len(lines) == 2


def test_reset_clears_history(client, two_people):
    post_image(client, two_people)
    res = client.delete("/reset")
    assert res.status_code == 200
    assert res.json()["removed"] == 1
    assert client.get("/history").json() == []
