import cv2

BOX_COLOR = (31, 90, 255)


def draw_overlay(img, people):
    out = img.copy()
    longest = max(out.shape[:2])
    thickness = max(2, round(longest / 400))
    scale = max(0.5, longest / 1600)
    for p in people:
        x1, y1, x2, y2 = p["box"]
        label = f"{p['confidence']:.2f}"
        cv2.rectangle(out, (x1, y1), (x2, y2), BOX_COLOR, thickness)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
        top = max(y1 - th - 8, 0)
        cv2.rectangle(out, (x1, top), (x1 + tw + 8, top + th + 8), BOX_COLOR, -1)
        cv2.putText(out, label, (x1 + 4, top + th + 2), cv2.FONT_HERSHEY_SIMPLEX, scale, (255, 255, 255), 1, cv2.LINE_AA)
    return out
