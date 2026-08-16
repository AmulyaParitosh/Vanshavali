import { describe, expect, it } from "vitest";
import { fullRange, shouldWindow, windowRange } from "@/lib/windowing";

/**
 * The arithmetic behind the records list's windowing. The invariant that matters
 * everywhere: padTop + (rendered rows × rowHeight) + padBottom must equal the
 * full list height, or the scrollbar lies and the page jumps as you scroll.
 */
const H = 61;
const total = (r: { start: number; end: number; padTop: number; padBottom: number }) =>
  r.padTop + (r.end - r.start) * H + r.padBottom;

describe("windowRange", () => {
  const base = { viewportHeight: 900, listTop: 200, rowHeight: H, count: 2000, overscan: 6 };

  it("renders a viewport's worth plus overscan, not the whole list", () => {
    // Unscrolled, the list starts 200px down, so only 700px of the 900px
    // viewport is list: ~11 rows, plus 6 of overscan below.
    const r = windowRange({ ...base, scrollTop: 0 });
    expect(r).toMatchObject({ start: 0, end: 17 });
    expect(r.end - r.start).toBeLessThan(30);
  });

  it("renders more rows when the whole viewport is list", () => {
    const r = windowRange({ ...base, scrollTop: 0, listTop: 0 });
    // 900px / 61px = 15 rows, plus 6 of overscan.
    expect(r).toMatchObject({ start: 0, end: 21 });
  });

  it("always reserves the full list height", () => {
    for (const scrollTop of [0, 500, 5000, 60_000, 121_999]) {
      expect(total(windowRange({ ...base, scrollTop }))).toBe(2000 * H);
    }
  });

  it("moves the window as the list scrolls under the viewport", () => {
    const a = windowRange({ ...base, scrollTop: 200 }); // list top reaches the fold
    const b = windowRange({ ...base, scrollTop: 200 + 100 * H });
    expect(a.start).toBe(0);
    expect(b.start).toBe(94); // 100 down, less 6 of overscan
    expect(b.padTop).toBe(94 * H);
  });

  it("clamps before the list is reached — never a negative index", () => {
    const r = windowRange({ ...base, scrollTop: 0, listTop: 5000 });
    expect(r.start).toBe(0);
    expect(r.end).toBe(0);
    expect(total(r)).toBe(2000 * H);
  });

  it("clamps past the end of the list", () => {
    const r = windowRange({ ...base, scrollTop: 999_999 });
    expect(r.end).toBe(2000);
    expect(r.start).toBeLessThanOrEqual(2000);
    expect(r.padBottom).toBe(0);
    expect(total(r)).toBe(2000 * H);
  });

  it("renders everything when the list is shorter than the viewport", () => {
    const r = windowRange({ ...base, count: 5, scrollTop: 0 });
    expect(r).toEqual({ start: 0, end: 5, padTop: 0, padBottom: 0 });
  });

  it("is empty rather than infinite for a zero row height or an empty list", () => {
    expect(windowRange({ ...base, rowHeight: 0, scrollTop: 0 }).end).toBe(0);
    expect(windowRange({ ...base, count: 0, scrollTop: 0 }).end).toBe(0);
  });
});

describe("shouldWindow", () => {
  it("leaves short lists alone — find-in-page and scroll-to-row still work", () => {
    expect(shouldWindow(0)).toBe(false);
    expect(shouldWindow(60)).toBe(false);
    expect(shouldWindow(61)).toBe(true);
  });
});

describe("fullRange", () => {
  it("is the whole list with no spacers", () => {
    expect(fullRange(12, H)).toEqual({ start: 0, end: 12, padTop: 0, padBottom: 0 });
  });
});
