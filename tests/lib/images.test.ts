import { describe, expect, it } from "vitest";
import { DISPLAY_MAX, THUMB_MAX, fitWithin, needsResize } from "@/lib/images";

/**
 * The sizing rules behind stored photographs. The canvas work itself is
 * browser-only; this is the arithmetic that decides what gets stored, including
 * the shapes that break naive scaling (panoramas, portraits, tiny images).
 */
describe("fitWithin", () => {
  it("scales a large photograph down to the longest edge", () => {
    expect(fitWithin({ width: 4032, height: 3024 }, DISPLAY_MAX)).toEqual({
      width: 1024,
      height: 768,
    });
    expect(fitWithin({ width: 3024, height: 4032 }, THUMB_MAX)).toEqual({
      width: 144,
      height: 192,
    });
  });

  it("never scales up — a small photograph is stored as it is", () => {
    expect(fitWithin({ width: 120, height: 90 }, DISPLAY_MAX)).toEqual({ width: 120, height: 90 });
    expect(fitWithin({ width: 192, height: 192 }, THUMB_MAX)).toEqual({ width: 192, height: 192 });
  });

  it("keeps a very wide image at least one pixel tall", () => {
    const out = fitWithin({ width: 8000, height: 12 }, THUMB_MAX);
    expect(out.width).toBe(192);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });

  it("holds the aspect ratio", () => {
    const src = { width: 1600, height: 900 };
    const out = fitWithin(src, DISPLAY_MAX);
    expect(out.width / out.height).toBeCloseTo(src.width / src.height, 2);
  });

  it("is empty rather than negative for a degenerate size", () => {
    expect(fitWithin({ width: 0, height: 0 }, DISPLAY_MAX)).toEqual({ width: 0, height: 0 });
    expect(fitWithin({ width: -5, height: 10 }, DISPLAY_MAX)).toEqual({ width: 0, height: 0 });
  });
});

describe("needsResize", () => {
  it("is true only when an edge exceeds the target", () => {
    expect(needsResize({ width: 4032, height: 3024 }, DISPLAY_MAX)).toBe(true);
    expect(needsResize({ width: 800, height: 600 }, DISPLAY_MAX)).toBe(false);
    expect(needsResize({ width: 800, height: 600 }, THUMB_MAX)).toBe(true);
  });
});

describe("the stored sizes", () => {
  it("keeps the thumbnail big enough for the largest avatar on a 2× screen", () => {
    // The record panel's portrait is the biggest at 72px.
    expect(THUMB_MAX).toBeGreaterThanOrEqual(72 * 2);
    expect(DISPLAY_MAX).toBeGreaterThan(THUMB_MAX);
  });
});
