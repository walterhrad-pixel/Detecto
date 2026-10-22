import csv
import io
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from models import record

router = APIRouter()


@router.get("/history")
def history(
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=10000),
):
    return record.fetch_records(min_confidence, start, end, limit)


@router.get("/stats")
def stats(
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    return record.fetch_stats(min_confidence, start, end)


@router.get("/history/export")
def export_history(
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    rows = record.fetch_records(min_confidence, start, end, limit=10000)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["id", "timestamp", "count", "avg_confidence", "inference_time"])
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=detecto_history.csv"},
    )


@router.delete("/reset")
def reset():
    try:
        removed = record.clear_records()
    except Exception:
        raise HTTPException(500, "Could not clear history")
    return {"message": "History cleared", "removed": removed}
