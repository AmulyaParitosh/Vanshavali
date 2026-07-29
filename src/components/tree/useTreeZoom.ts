import { useEffect, useRef, type RefObject } from "react";
import * as d3 from "d3";
import { TREE_CONFIG } from "../../constants";

interface UseTreeZoomOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  gRef: RefObject<SVGGElement | null>;
  /** The household to frame on first data (Spec 05 a4) — the viewer's own, in
   *  layout coordinates. Null until the layout is ready. */
  initialCenter: { x: number; y: number } | null;
}

export interface TreeZoomApi {
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
export function useTreeZoom({ svgRef, gRef, initialCenter }: UseTreeZoomOptions): TreeZoomApi {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const isFirstCenterRef = useRef(true);
  const { MIN, MAX, FIT_PAD, LOD_NAME_ONLY, LOD_NO_LABELS } = TREE_CONFIG.ZOOM;

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl) return;

    const svg = d3.select(svgEl);
    const g = d3.select(gEl);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN, MAX])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        const k = event.transform.k;
        svgEl.classList.toggle("lod-name-only", k < LOD_NAME_ONLY && k >= LOD_NO_LABELS);
        svgEl.classList.toggle("lod-no-labels", k < LOD_NO_LABELS);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

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
  }, [svgRef, gRef, initialCenter, MIN, MAX, LOD_NAME_ONLY, LOD_NO_LABELS]);

  return {
    panTo: (x, y, scale = 1.2) => {
      const svgEl = svgRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !zoom) return;
      const rect = svgEl.getBoundingClientRect();
      const transform = d3.zoomIdentity
        .translate(rect.width / 2, rect.height / 2)
        .scale(scale)
        .translate(-x, -y);
      d3.select(svgEl).transition().duration(750).call(zoom.transform, transform);
    },

    fitToView: () => {
      const svgEl = svgRef.current;
      const gEl = gRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !gEl || !zoom) return;
      const rect = svgEl.getBoundingClientRect();
      const box = gEl.getBBox();
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
