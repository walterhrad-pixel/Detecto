import sqlite3
from datetime import datetime
from typing import Optional

from config import DB_PATH


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                count INTEGER NOT NULL,
                avg_confidence REAL NOT NULL,
                inference_time REAL NOT NULL
            )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_records_ts ON records(timestamp)")


def save_record(count: int, avg_confidence: float, inference_time: float) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO records (timestamp, count, avg_confidence, inference_time) VALUES (?, ?, ?, ?)",
            (datetime.now().isoformat(timespec="seconds"), count, avg_confidence, inference_time),
        )
        return cur.lastrowid


def _where(min_confidence: float, start: Optional[str], end: Optional[str]):
    clause = "WHERE avg_confidence >= ?"
    args: list = [min_confidence]
    if start:
        clause += " AND timestamp >= ?"
        args.append(start)
    if end:
        clause += " AND timestamp <= ?"
        args.append(end)
    return clause, args


def fetch_records(
    min_confidence: float = 0.0,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 1000,
) -> list[dict]:
    clause, args = _where(min_confidence, start, end)
    query = f"SELECT * FROM records {clause} ORDER BY timestamp DESC, id DESC LIMIT ?"
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(query, [*args, limit])]


def fetch_stats(
    min_confidence: float = 0.0,
    start: Optional[str] = None,
    end: Optional[str] = None,
) -> dict:
    clause, args = _where(min_confidence, start, end)
    with get_conn() as conn:
        total = conn.execute(
            f"""SELECT COUNT(*) AS detections,
                       COALESCE(AVG(count), 0) AS avg_count,
                       COALESCE(MAX(count), 0) AS peak_count,
                       COALESCE(AVG(CASE WHEN count > 0 THEN avg_confidence END), 0) AS avg_confidence,
                       COALESCE(AVG(inference_time), 0) AS avg_inference_time
                FROM records {clause}""",
            args,
        ).fetchone()
        hourly = conn.execute(
            f"""SELECT strftime('%Y-%m-%dT%H:00', timestamp) AS hour,
                       COUNT(*) AS detections,
                       AVG(count) AS avg_count
                FROM records {clause}
                GROUP BY hour ORDER BY hour""",
            args,
        ).fetchall()
    return {
        "detections": total["detections"],
        "avg_count": round(total["avg_count"], 2),
        "peak_count": total["peak_count"],
        "avg_confidence": round(total["avg_confidence"], 3),
        "avg_inference_time": round(total["avg_inference_time"], 3),
        "hourly": [
            {"hour": r["hour"], "detections": r["detections"], "avg_count": round(r["avg_count"], 2)}
            for r in hourly
        ],
    }


def clear_records() -> int:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM records")
        return cur.rowcount
