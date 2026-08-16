"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fullRange, shouldWindow, windowRange, type WindowRange } from "../lib/windowing";

/**
 * Keep a long fixed-height list to the rows that are actually on screen.
 *
 * The scroll container is found rather than passed: the list is nested a few
 * levels inside whichever ancestor scrolls (`.records-page` today), and making
 * every caller thread a ref down to it is the kind of coupling that goes stale
 * the first time the shell changes. The row height is measured from a real row
 * for the same reason — a number hard-coded here would silently drift the moment
 * the row's padding changed in CSS, and the list would misplace its spacers.
 *
 * Scroll fires far more often than a frame, so the range is recomputed inside
 * one rAF and only committed when the slice actually moves; a scroll within the
 * overscan does no React work at all.
 */
export function useWindowedRows(
  count: number,
  opts: {
    /** The element the rows are rendered into. */
    listRef: React.RefObject<HTMLElement | null>;
    /** Row height before a real row exists to measure. */
    estimatedRowHeight: number;
    /** Rows kept either side of the viewport. */
    overscan?: number;
    /** Below this many rows, render the lot. */
    threshold?: number;
  }
): WindowRange & { windowed: boolean; rowHeight: number } {
  const { listRef, estimatedRowHeight, overscan = 6, threshold } = opts;
  const windowed = shouldWindow(count, threshold);

  const [rowHeight, setRowHeight] = useState(estimatedRowHeight);
  const [range, setRange] = useState<WindowRange>(() => fullRange(count, estimatedRowHeight));
  const scrollerRef = useRef<HTMLElement | null>(null);
  const frame = useRef(0);

  const recompute = useCallback(() => {
    const list = listRef.current;
    const scroller = scrollerRef.current;
    if (!list || !scroller || !windowed) return;

    // The list's top in the scroller's content coordinates. offsetTop chains
    // only through offsetParents, so measure both rects against each other and
    // add back how far the scroller has already scrolled.
    const listTop =
      list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

    const next = windowRange({
      scrollTop: scroller.scrollTop,
      viewportHeight: scroller.clientHeight,
      listTop,
      rowHeight,
      count,
      overscan,
    });
    setRange((prev) =>
      prev.start === next.start && prev.end === next.end && prev.padTop === next.padTop
        ? prev
        : next
    );
  }, [listRef, windowed, rowHeight, count, overscan]);

  const onScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      recompute();
    });
  }, [recompute]);

  // Measure a real row before the browser paints, so the spacers are right on
  // the first frame instead of after a visible jump.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !windowed) return;
    const row = list.querySelector<HTMLElement>("[data-row]");
    if (!row) return;
    const h = row.getBoundingClientRect().height;
    if (h > 0 && Math.abs(h - rowHeight) > 0.5) setRowHeight(h);
  }, [listRef, windowed, rowHeight, count]);

  useEffect(() => {
    if (!windowed) return undefined;
    const scroller = findScrollParent(listRef.current);
    scrollerRef.current = scroller;
    if (!scroller) return undefined;

    recompute();
    const target: EventTarget = scroller === document.scrollingElement ? window : scroller;
    target.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(scroller);
    return () => {
      target.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [listRef, windowed, count, rowHeight, onScroll, recompute]);

  // A short list is answered without the state ever being consulted, so nothing
  // has to reset it when the list shrinks back under the threshold.
  return { ...(windowed ? range : fullRange(count, rowHeight)), windowed, rowHeight };
}

/**
 * The nearest ancestor declared scrollable, or the document scroller.
 *
 * Declared, not currently overflowing: on the first render the rows aren't laid
 * out yet, so the page doesn't overflow yet, and a check for real overflow would
 * walk straight past the right element and measure against the document instead.
 */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}
