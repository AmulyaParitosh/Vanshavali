import { useMemo } from "react";
import * as d3 from "d3";
import type { GraphNode } from "../../types/graph";
import { TREE_CONFIG } from "../../constants";
import { orthogonalLinkPath } from "./orthogonalLink";

export type LaidOutNode = d3.HierarchyPointNode<GraphNode>;
export type LaidOutLink = d3.HierarchyPointLink<GraphNode>;

/**
 * Which way the generations run. `vertical` is the classic top-down tree;
 * `horizontal` lays the same hierarchy left→right, which reads far better once a
 * tree is deep, because each generation gets a column instead of a wider band.
 */
export type TreeOrientation = "vertical" | "horizontal";

export interface TreeLayout {
  root: LaidOutNode | null;
  nodes: LaidOutNode[];
  links: LaidOutLink[];
  /** SVG path generator for the parent→child curves; pass a link to get a `d` string. */
  linkPath: (link: LaidOutLink) => string | null;
}

/**
 * Pure D3 layout math (no DOM, no React) — extracted so the generation rhythm
 * (Spec 05 a6/g6) can be unit-tested. d3.tree with a fixed nodeSize puts each
 * generation at `n × NODE_HEIGHT`; we shift the whole tree down by GEN_TOP so the
 * rows land at exactly `24 + n × 222`.
 */
export function computeTreeLayout(
  data: GraphNode,
  orientation: TreeOrientation = "vertical"
): {
  root: LaidOutNode;
  nodes: LaidOutNode[];
  links: LaidOutLink[];
} {
  const hierarchy = d3.hierarchy<GraphNode>(data);

  if (orientation === "horizontal") {
    // d3.tree always spreads siblings along x and depth along y; lay it out with
    // the pitches swapped, then transpose so depth runs across the canvas.
    const root = d3.tree<GraphNode>().nodeSize([TREE_CONFIG.ROW_PITCH, TREE_CONFIG.COL_PITCH])(
      hierarchy
    );
    root.each((n) => {
      const acrossSiblings = n.x;
      const byDepth = n.y;
      n.x = byDepth + TREE_CONFIG.GEN_LEFT;
      n.y = acrossSiblings;
    });
    return { root, nodes: root.descendants(), links: root.links() };
  }

  const root = d3.tree<GraphNode>().nodeSize([TREE_CONFIG.NODE_WIDTH, TREE_CONFIG.NODE_HEIGHT])(
    hierarchy
  );
  root.each((n) => {
    n.y += TREE_CONFIG.GEN_TOP;
  });
  return { root, nodes: root.descendants(), links: root.links() };
}

/**
 * React wrapper over computeTreeLayout: memoizes the layout and supplies the
 * SVG path generator for the parent→child edges.
 */
export function useTreeLayout(
  data: GraphNode | null,
  orientation: TreeOrientation = "vertical"
): TreeLayout {
  return useMemo(() => {
    if (!data) {
      return { root: null, nodes: [], links: [], linkPath: () => null };
    }
    const { root, nodes, links } = computeTreeLayout(data, orientation);
    return {
      root,
      nodes,
      links,
      // Orthogonal thread from the parent pill's centre (Spec 05 g7), not a bezier.
      linkPath: (link: LaidOutLink) => orthogonalLinkPath(link.source, link.target),
    };
  }, [data, orientation]);
}
