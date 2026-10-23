export function normalizeRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

export function footPoint(box) {
  return { x: (box[0] + box[2]) / 2, y: box[3] };
}

export function insideZone(box, zone, size) {
  if (!zone || !size) return false;
  const p = footPoint(box);
  const nx = p.x / size.width;
  const ny = p.y / size.height;
  return nx >= zone.x && nx <= zone.x + zone.w && ny >= zone.y && ny <= zone.y + zone.h;
}

export function countInZone(people, zone, size) {
  return people.filter((p) => insideZone(p.box, zone, size)).length;
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
