/**
 * Windowing math for the records list — which slice of a long, fixed-height list
 * is worth putting in the DOM.
 *
 * A browser pays for every element it keeps: layout and paint walk the tree,
 * `querySelector` and accessibility snapshots walk the tree, and React's diff
 * walks its shadow of the tree. Rendering 2,000 rows to show 12 costs all of
 * that on every keystroke. So the list renders the visible slice plus a small
 * overscan, and reserves the rest of the height with two spacers — the scrollbar
 * and every scroll offset stay exactly what they would have been, because the
 * total height is unchanged. Nothing here touches the DOM: it is arithmetic, so
 * the awkward cases (list scrolled past, list not reached yet, a count that
 * shrinks under the viewport) can be tested rather than eyeballed.
 */

export interface WindowInput {
  /** How far the scroll container has scrolled. */
  scrollTop: number;
  /** The scroll container's visible height. */
  viewportHeight: number;
  /** The list's offset from the top of the scroll container's content. */
  listTop: number;
  /** Height of one row, including its border. */
  rowHeight: number;
  /** Total number of rows in the data. */
  count: number;
  /** Extra rows to keep either side of the viewport, so a scroll doesn't flash. */
  overscan?: number;
}

export interface WindowRange {
  /** First row index to render. */
  start: number;
  /** One past the last row index to render. */
  end: number;
  /** Height to reserve above the rendered slice. */
  padTop: number;
  /** Height to reserve below it. */
  padBottom: number;
}

/** The whole list, unwindowed — the answer whenever windowing can't help. */
export function fullRange(count: number, rowHeight: number): WindowRange {
  void rowHeight;
  return { start: 0, end: count, padTop: 0, padBottom: 0 };
}

/**
 * The slice to render, and the spacer heights that keep the list its full size.
 *
 * `listTop` is measured from the top of the scroll container's *content*, so
 * `scrollTop - listTop` is how far into the list the viewport has reached:
 * negative while the list is still below the fold, growing past the end once it
 * has scrolled by. Both extremes clamp to an empty-but-valid range rather than
 * a negative index.
 */
export function windowRange({
  scrollTop,
  viewportHeight,
  listTop,
  rowHeight,
  count,
  overscan = 6,
}: WindowInput): WindowRange {
  // A row must have height for any of this to mean anything; a zero or negative
  // height would divide the list into infinitely many rows.
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0, padTop: 0, padBottom: 0 };

  const into = scrollTop - listTop;
  const firstVisible = Math.floor(into / rowHeight);
  const visibleRows = Math.ceil(viewportHeight / rowHeight);

  const start = clamp(firstVisible - overscan, 0, count);
  const end = clamp(firstVisible + visibleRows + overscan, start, count);

  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: (count - end) * rowHeight,
  };
}

/**
 * Whether windowing is worth its own cost. Below the threshold the spacers and
 * the scroll listener buy nothing, and rendering the lot keeps find-in-page and
 * "scroll to my row" working the way people expect.
 */
export function shouldWindow(count: number, threshold = 60): boolean {
  return count > threshold;
}

/** The range that must be rendered for `index` to exist in the DOM. */
export function rangeContaining(range: WindowRange, index: number): boolean {
  return index >= range.start && index < range.end;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
