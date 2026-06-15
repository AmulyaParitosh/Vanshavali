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
 * Pure D3 layout: given the raw GraphNode hierarchy, compute laid-out positions
 * and edges. No DOM, no React state — just math.
 */
export function useTreeLayout(data: GraphNode | null): TreeLayout {
  return useMemo(() => {
    if (!data) {
      return {
        root: null,
        nodes: [],
        links: [],
        linkPath: () => null,
      };
    }
    const hierarchy = d3.hierarchy<GraphNode>(data);
    const treeLayout = d3
      .tree<GraphNode>()
      .nodeSize([TREE_CONFIG.NODE_WIDTH, TREE_CONFIG.NODE_HEIGHT]);
    const root = treeLayout(hierarchy);
    const linkGen = d3
      .linkVertical<LaidOutLink, LaidOutNode>()
      .x((d) => d.x)
      .y((d) => d.y);
    return {
      root,
      nodes: root.descendants(),
      links: root.links(),
      linkPath: (link: LaidOutLink) => linkGen(link),
    };
  }, [data]);
}
