import { describe, expect, it } from "vitest";
import { clamp01, countInZone, footPoint, insideZone, normalizeRect } from "./geometry";

const size = { width: 100, height: 100 };
const zone = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };

describe("normalizeRect", () => {
  it("handles dragging in any direction", () => {
    const rect = normalizeRect({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.4 });
    expect(rect.x).toBe(0.2);
    expect(rect.y).toBe(0.4);
    expect(rect.w).toBeCloseTo(0.6);
    expect(rect.h).toBeCloseTo(0.5);
  });
});

describe("footPoint", () => {
  it("uses the bottom centre of the box", () => {
    expect(footPoint([10, 20, 30, 80])).toEqual({ x: 20, y: 80 });
  });
});

describe("insideZone", () => {
  it("is true when the feet are inside the zone", () => {
    expect(insideZone([60, 20, 80, 90], zone, size)).toBe(true);
  });

  it("is false when the head is inside but the feet are outside", () => {
    expect(insideZone([60, 30, 80, 90], { x: 0.5, y: 0.2, w: 0.5, h: 0.3 }, size)).toBe(false);
  });

  it("is false without a zone", () => {
    expect(insideZone([60, 20, 80, 90], null, size)).toBe(false);
  });
});

describe("countInZone", () => {
  it("counts only people standing in the zone", () => {
    const people = [{ box: [60, 20, 80, 90] }, { box: [0, 0, 20, 40] }, { box: [70, 50, 90, 95] }];
    expect(countInZone(people, zone, size)).toBe(2);
  });
});

describe("clamp01", () => {
  it("keeps values between 0 and 1", () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});
