import { useMemo } from "react";
import * as d3 from "d3";
import type { GraphNode } from "../../types/graph";
import { TREE_CONFIG } from "../../constants";

export type LaidOutNode = d3.HierarchyPointNode<GraphNode>;
export type LaidOutLink = d3.HierarchyPointLink<GraphNode>;

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
export function computeTreeLayout(data: GraphNode): {
  root: LaidOutNode;
  nodes: LaidOutNode[];
  links: LaidOutLink[];
} {
  const hierarchy = d3.hierarchy<GraphNode>(data);
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
export function useTreeLayout(data: GraphNode | null): TreeLayout {
  return useMemo(() => {
    if (!data) {
      return { root: null, nodes: [], links: [], linkPath: () => null };
    }
    const { root, nodes, links } = computeTreeLayout(data);
    const linkGen = d3
      .linkVertical<LaidOutLink, LaidOutNode>()
      .x((d) => d.x)
      .y((d) => d.y);
    return {
      root,
      nodes,
      links,
      linkPath: (link: LaidOutLink) => linkGen(link),
    };
  }, [data]);
}
