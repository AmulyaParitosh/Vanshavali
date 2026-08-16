import { useEffect, useRef, type RefObject } from "react";
import * as d3 from "d3";
import { TREE_CONFIG } from "../../constants";

/** A rectangle in layout (world) coordinates. */
export interface WorldRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface UseTreeZoomOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  gRef: RefObject<SVGGElement | null>;
  /** The household to frame on first data (Spec 05 a4) — the viewer's own, in
   *  layout coordinates. Null until the layout is ready. */
  initialCenter: { x: number; y: number } | null;
  /**
   * The whole drawing's extent in layout coordinates. Fit measures this rather
   * than the rendered SVG, because the canvas only renders the cards near the
   * viewport — a `getBBox()` of what happens to be on screen would "fit" to a
   * fraction of the tree.
   */
  contentBounds?: WorldRect | null;
  /**
   * Called with the visible world rect whenever it moves appreciably. Panning
   * itself never re-renders React (the <g> transform is mutated directly); this
   * exists so the canvas can decide which cards are worth rendering at all.
   */
  onViewport?: (rect: WorldRect) => void;
}

/**
 * How far the viewport must move on SCREEN before it's worth telling React.
 * Measured in screen pixels, not world units: the same world distance is a whole
 * screen when zoomed out and a few pixels when zoomed in, so a world-space
 * threshold would either re-render constantly or never.
 */
const VIEWPORT_QUANTUM_PX = 220;

export interface TreeZoomApi {
  /** Centre (x, y) in the canvas. Keeps the current zoom unless `scale` is given. */
  panTo: (x: number, y: number, scale?: number) => void;
  /** Fit the whole tree in view with padding (Spec 05 a9). */
  fitToView: () => void;
  /** Step the zoom in/out by the fixed factor, about the viewport centre. */
  zoomBy: (factor: number) => void;
}

/**
 * Wires D3 zoom to the <svg>/<g> refs. The <g>'s transform is mutated directly
 * during zoom (no React re-render while panning). Zoom is clamped to the spec's
 * 0.35–2.4× (a9); the first data frames the viewer's own household at 1× (a4); and
 * a level-of-detail class on the <svg> drops labels as the user zooms out (f7).
 */
export function useTreeZoom({
  svgRef,
  gRef,
  initialCenter,
  contentBounds,
  onViewport,
}: UseTreeZoomOptions): TreeZoomApi {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const isFirstCenterRef = useRef(true);
  // Both are held in refs, and kept current in an effect that is declared before
  // the zoom setup below so it runs first: a changed callback identity or new
  // bounds must not tear down and rebuild the zoom behaviour mid-gesture.
  const boundsRef = useRef(contentBounds);
  const onViewportRef = useRef(onViewport);
  const lastReported = useRef<WorldRect | null>(null);
  const { MIN, MAX, FIT_PAD, LOD_COMPACT, LOD_GLYPH } = TREE_CONFIG.ZOOM;

  useEffect(() => {
    boundsRef.current = contentBounds;
    onViewportRef.current = onViewport;
  }, [contentBounds, onViewport]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl) return;

    const svg = d3.select(svgEl);
    const g = d3.select(gEl);

    /** Screen viewport → world rect, reported only when it has really moved. */
    const reportViewport = (t: d3.ZoomTransform) => {
      const report = onViewportRef.current;
      if (!report) return;
      const rect = svgEl.getBoundingClientRect();
      const next: WorldRect = {
        minX: (0 - t.x) / t.k,
        minY: (0 - t.y) / t.k,
        maxX: (rect.width - t.x) / t.k,
        maxY: (rect.height - t.y) / t.k,
      };
      const prev = lastReported.current;
      const movedPx = (a: number, b: number) => Math.abs(a - b) * t.k;
      const moved =
        !prev ||
        movedPx(next.minX, prev.minX) > VIEWPORT_QUANTUM_PX ||
        movedPx(next.minY, prev.minY) > VIEWPORT_QUANTUM_PX ||
        movedPx(next.maxX, prev.maxX) > VIEWPORT_QUANTUM_PX ||
        movedPx(next.maxY, prev.maxY) > VIEWPORT_QUANTUM_PX;
      if (!moved) return;
      lastReported.current = next;
      report(next);
    };

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN, MAX])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        // Level of detail follows zoom alone (spec): full ≥ 0.72, compact in
        // 0.42–0.72, glyph below 0.42. The classes drive the card geometry swap.
        const k = event.transform.k;
        svgEl.classList.toggle("lod-compact", k < LOD_COMPACT && k >= LOD_GLYPH);
        svgEl.classList.toggle("lod-glyph", k < LOD_GLYPH);
        reportViewport(event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    // The first frame has had no zoom event, so nothing would be on screen.
    reportViewport(d3.zoomTransform(svgEl));

    // Frame the viewer's own household the first time we have data at 1×; keep any
    // prior transform on later data changes so a re-fetch doesn't yank the view.
    if (isFirstCenterRef.current && initialCenter) {
      isFirstCenterRef.current = false;
      const rect = svgEl.getBoundingClientRect();
      const t = d3.zoomIdentity.translate(
        rect.width / 2 - initialCenter.x,
        rect.height / 2 - initialCenter.y
      );
      svg.call(zoom.transform, t);
    }

    return () => {
      svg.on(".zoom", null);
    };
  }, [svgRef, gRef, initialCenter, MIN, MAX, LOD_COMPACT, LOD_GLYPH]);

  return {
    panTo: (x, y, scale) => {
      const svgEl = svgRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !zoom) return;
      const rect = svgEl.getBoundingClientRect();
      // Centre (x, y) in the current viewport. Keep the current zoom unless a
      // scale is asked for, so focusing a person doesn't yank the zoom level.
      const k = scale ?? d3.zoomTransform(svgEl).k;
      const transform = d3.zoomIdentity
        .translate(rect.width / 2, rect.height / 2)
        .scale(k)
        .translate(-x, -y);
      d3.select(svgEl).transition().duration(600).call(zoom.transform, transform);
    },

    fitToView: () => {
      const svgEl = svgRef.current;
      const gEl = gRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !gEl || !zoom) return;
      const rect = svgEl.getBoundingClientRect();
      // Frame the households, not the decoration: the generation bands are drawn
      // thousands of px wider than the tree so they run off-canvas, and measuring
      // them would zoom the whole tree down to nothing. Prefer the layout's own
      // extent — the SVG only holds the cards near the viewport.
      const bounds = boundsRef.current;
      const box = bounds
        ? {
            x: bounds.minX,
            y: bounds.minY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
          }
        : (gEl.querySelector<SVGGElement>("g.nodes") ?? gEl).getBBox();
      if (box.width === 0 || box.height === 0) return;
      const scale = Math.max(
        MIN,
        Math.min(
          MAX,
          (rect.width - 2 * FIT_PAD) / box.width,
          (rect.height - 2 * FIT_PAD) / box.height
        )
      );
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const transform = d3.zoomIdentity
        .translate(rect.width / 2, rect.height / 2)
        .scale(scale)
        .translate(-cx, -cy);
      d3.select(svgEl).transition().duration(500).call(zoom.transform, transform);
    },

    zoomBy: (factor) => {
      const svgEl = svgRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !zoom) return;
      d3.select(svgEl).transition().duration(200).call(zoom.scaleBy, factor);
    },
  };
}
