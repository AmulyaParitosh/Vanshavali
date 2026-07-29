import { describe, it, expect } from "vitest";
import { computeTreeLayout } from "@/components/tree/useTreeLayout";
import type { GraphNode } from "@/types/graph";

/**
 * Spec 05 a6/g6 — generation rows sit at exactly 24 + n × 222, regardless of node
 * contents. The layout math is pure, so we can pin the rhythm here without a browser.
 */

// A minimal 3-generation chain; d3.hierarchy reads `children`.
const chain = {
  id: "g0",
  children: [{ id: "g1", children: [{ id: "g2", children: [{ id: "g3" }] }] }],
} as unknown as GraphNode;

describe("computeTreeLayout — generation rhythm", () => {
  it("places each generation at 24 + n × 222", () => {
    const { nodes } = computeTreeLayout(chain);
    const y = (id: string) => nodes.find((n) => n.data.id === id)!.y;
    expect(y("g0")).toBe(24);
    expect(y("g1")).toBe(24 + 222);
    expect(y("g2")).toBe(24 + 2 * 222);
    expect(y("g3")).toBe(24 + 3 * 222);
  });

  it("keeps siblings on the same generation row", () => {
    const family = {
      id: "root",
      children: [{ id: "a" }, { id: "b" }, { id: "c" }],
    } as unknown as GraphNode;
    const { nodes } = computeTreeLayout(family);
    const kids = nodes.filter((n) => n.data.id !== "root");
    expect(new Set(kids.map((n) => n.y))).toEqual(new Set([24 + 222]));
    // …and spread horizontally, never stacked.
    expect(new Set(kids.map((n) => n.x)).size).toBe(3);
  });
});
