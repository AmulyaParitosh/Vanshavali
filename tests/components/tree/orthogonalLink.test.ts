import { describe, it, expect } from "vitest";
import { orthogonalLinkPath } from "@/components/tree/orthogonalLink";

/**
 * Spec 05 g7 — the lineage thread is orthogonal, never a bezier. It starts at the
 * parent pill's centre (a1) and ends at the child, with small arc corners.
 */

describe("orthogonalLinkPath", () => {
  const source = { x: 100, y: 24 };
  const target = { x: 400, y: 246 };

  it("never emits a cubic-bezier curve (g7)", () => {
    const d = orthogonalLinkPath(source, target);
    expect(d).not.toMatch(/[Cc]/); // no cubic-bezier command
  });

  it("starts at the parent centre and ends at the child (a1)", () => {
    const d = orthogonalLinkPath(source, target);
    expect(d.startsWith("M 100,24")).toBe(true);
    expect(d.endsWith("L 400,246")).toBe(true);
  });

  it("runs vertical → horizontal → vertical with arc corners", () => {
    const d = orthogonalLinkPath(source, target);
    // Two quadratic arc corners (the elbow), and a horizontal run at the bus line.
    expect((d.match(/Q/g) ?? []).length).toBe(2);
    expect(d).toContain(",64"); // bus at parent.y + drop(40)
  });

  it("draws a straight vertical when the child shares the parent's column", () => {
    const d = orthogonalLinkPath({ x: 100, y: 24 }, { x: 100, y: 246 });
    expect(d).toBe("M 100,24 L 100,246");
    expect(d).not.toContain("Q");
  });
});
