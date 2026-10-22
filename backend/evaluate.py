import argparse
import json
import statistics
import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import CONF_THRESHOLD, MAX_IMAGE_SIDE  # noqa: E402
from utils.inference import detect_people  # noqa: E402
from utils.overlay import draw_overlay  # noqa: E402
from utils.preprocessing import decode_image  # noqa: E402

HERE = Path(__file__).resolve().parent
SAMPLES = HERE / "samples"
RESULTS = HERE / "results"
TARGETS = {"accuracy": 85.0, "false_positives": 10.0, "time": 1.5, "confidence": 0.7, "reliability": 100.0}


def run_image(path: Path, conf: float, repeats: int):
    img = decode_image(path.read_bytes(), max_side=MAX_IMAGE_SIDE)
    times = []
    people = []
    for _ in range(repeats):
        people, elapsed = detect_people(img, conf)
        times.append(elapsed)
    return img, people, statistics.mean(times)


def evaluate(conf: float, truth: dict, repeats: int, save_overlays: bool):
    rows = []
    failures = 0
    out_dir = RESULTS / f"conf_{conf:.2f}"
    if save_overlays:
        out_dir.mkdir(parents=True, exist_ok=True)

    for name, gt in sorted(truth.items()):
        path = SAMPLES / name
        try:
            img, people, elapsed = run_image(path, conf, repeats)
        except Exception as exc:
            failures += 1
            rows.append({"image": name, "error": str(exc)})
            continue

        detected = len(people)
        visible = gt["visible"]
        reviewed = gt.get("false_positives", {}).get(f"{conf:.2f}")
        if reviewed is None:
            false_pos = max(detected - visible, 0)
            correct = min(detected, visible)
            method = "estimated"
        else:
            false_pos = reviewed
            correct = min(detected - reviewed, visible)
            method = "reviewed"

        if save_overlays:
            cv2.imwrite(str(out_dir / name), draw_overlay(img, people))

        rows.append(
            {
                "image": name,
                "visible": visible,
                "detected": detected,
                "correct": correct,
                "false_positives": false_pos,
                "time": elapsed,
                "confidences": [p["confidence"] for p in people],
                "method": method,
                "note": gt.get("note", ""),
            }
        )

    ok = [r for r in rows if "error" not in r]
    visible_total = sum(r["visible"] for r in ok)
    detected_total = sum(r["detected"] for r in ok)
    confs = [c for r in ok for c in r["confidences"]]
    summary = {
        "conf": conf,
        "images": len(rows),
        "visible_total": visible_total,
        "detected_total": detected_total,
        "correct_total": sum(r["correct"] for r in ok),
        "false_positive_total": sum(r["false_positives"] for r in ok),
        "accuracy": round(100 * sum(r["correct"] for r in ok) / visible_total, 1) if visible_total else 0.0,
        "false_positive_rate": round(100 * sum(r["false_positives"] for r in ok) / detected_total, 1) if detected_total else 0.0,
        "avg_time": round(statistics.mean(r["time"] for r in ok), 3) if ok else 0.0,
        "avg_confidence": round(statistics.mean(confs), 3) if confs else 0.0,
        "reliability": round(100 * (len(rows) - failures) / len(rows), 1) if rows else 0.0,
        "method": "reviewed" if ok and all(r["method"] == "reviewed" for r in ok) else "estimated",
    }
    return rows, summary


def verdict(ok: bool) -> str:
    return "pass" if ok else "fail"


def print_report(rows, summary):
    print(f"\nPer-image results at confidence {summary['conf']:.2f}\n")
    print("| Image | Visible | Detected | Correct | False pos. | Time (s) | Note |")
    print("|---|---|---|---|---|---|---|")
    for r in rows:
        if "error" in r:
            print(f"| {r['image']} | - | - | - | - | - | ERROR: {r['error']} |")
            continue
        print(f"| {r['image']} | {r['visible']} | {r['detected']} | {r['correct']} | {r['false_positives']} | {r['time']:.3f} | {r['note']} |")

    s = summary
    print("\n| Metric | Result | Target | Status |")
    print("|---|---|---|---|")
    print(f"| Detection accuracy | {s['accuracy']}% ({s['correct_total']}/{s['visible_total']}) | >= 85% | {verdict(s['accuracy'] >= 85)} |")
    print(f"| False positives | {s['false_positive_rate']}% ({s['false_positive_total']}/{s['detected_total']}) | <= 10% | {verdict(s['false_positive_rate'] <= 10)} |")
    print(f"| Average inference time | {s['avg_time']} s | <= 1.5 s | {verdict(s['avg_time'] <= 1.5)} |")
    print(f"| Average confidence | {s['avg_confidence']} | >= 0.7 | {verdict(s['avg_confidence'] >= 0.7)} |")
    print(f"| System reliability | {s['reliability']}% | 100% | {verdict(s['reliability'] >= 100)} |")
    print(f"\nFalse positives and correct counts are {s['method']} ({'checked by eye on the overlay images' if s['method'] == 'reviewed' else 'derived from counts only'}).")


def main():
    parser = argparse.ArgumentParser(description="Evaluate Detecto on the sample images")
    parser.add_argument("--conf", type=float, default=CONF_THRESHOLD)
    parser.add_argument("--sweep", action="store_true", help="also compare several confidence thresholds")
    parser.add_argument("--repeats", type=int, default=3)
    args = parser.parse_args()

    truth = json.loads((SAMPLES / "ground_truth.json").read_text())
    RESULTS.mkdir(exist_ok=True)

    rows, summary = evaluate(args.conf, truth, args.repeats, save_overlays=True)
    print_report(rows, summary)
    (RESULTS / "summary.json").write_text(json.dumps({"summary": summary, "rows": rows}, indent=2))

    if args.sweep:
        print("\nThreshold comparison (count-based estimate, no manual review)\n")
        print("| Confidence | Detected | Est. accuracy | Est. false pos. | Avg confidence | Avg time (s) |")
        print("|---|---|---|---|---|---|")
        sweep_truth = {k: {**v, "false_positives": {}} for k, v in truth.items()}
        for conf in (0.25, 0.3, 0.4, 0.5, 0.6, 0.7):
            _, s = evaluate(conf, sweep_truth, args.repeats, save_overlays=False)
            print(f"| {conf:.2f} | {s['detected_total']} | {s['accuracy']}% | {s['false_positive_rate']}% | {s['avg_confidence']} | {s['avg_time']} |")


if __name__ == "__main__":
    main()
