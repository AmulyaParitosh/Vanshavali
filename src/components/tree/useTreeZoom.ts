import { useEffect, useRef, type RefObject } from "react";
import * as d3 from "d3";

interface UseTreeZoomOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  gRef: RefObject<SVGGElement | null>;
  /** Re-bind zoom + re-center when this changes (typically the laid-out root.x). */
  centerOnDataChange: number | null;
  /** Horizontal offset to apply when centering (the root x in layout coordinates). */
  initialRootX: number;
  /** Vertical offset when centering (typically NODE_HEIGHT / 2). */
  initialOffsetY: number;
}

export interface TreeZoomApi {
  panTo: (x: number, y: number, scale?: number) => void;
}

/**
 * Wires D3 zoom behavior to the given <svg>/<g> refs. The <g>'s transform
 * attribute is mutated directly during zoom for perf — React never re-renders
 * the SVG just because the user is panning.
 *
 * Initial transform centers the root horizontally. On data change, if the user
 * had already panned, their existing transform is preserved.
 */
export function useTreeZoom({
  svgRef,
  gRef,
  centerOnDataChange,
  initialRootX,
  initialOffsetY,
}: UseTreeZoomOptions): TreeZoomApi {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const isFirstCenterRef = useRef(true);

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl) return;

    const svg = d3.select(svgEl);
    const g = d3.select(gEl);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Center on the root the first time we have data; preserve any prior
    // transform on subsequent data changes so a polling tick doesn't yank the
    // user back to center.
    if (isFirstCenterRef.current && centerOnDataChange !== null) {
      isFirstCenterRef.current = false;
      const width = svgEl.getBoundingClientRect().width;
      const initialX = width / 2 - initialRootX;
      svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialOffsetY));
    }

    return () => {
      svg.on(".zoom", null);
    };
  }, [svgRef, gRef, centerOnDataChange, initialRootX, initialOffsetY]);

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
      d3.select(svgEl)
        .transition()
        .duration(750)
        .call(zoom.transform, transform);
    },
  };
}
