import { describe, expect, it } from "vitest";
import { GraphManager } from "@/lib/graph/GraphManager";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";

const person = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  name: { official_name: id.toUpperCase() },
  sex: "M",
  ...overrides,
});

const family = (id: string, overrides: Partial<Family> = {}): Family => ({
  id,
  children: [],
  ...overrides,
});

describe("GraphManager.getAncestors", () => {
  it("walks up parent families to find all ancestors", () => {
    const people = [
      person("grandpa"),
      person("grandma", { sex: "F" }),
      person("dad"),
      person("mom", { sex: "F" }),
      person("me"),
    ];
    const families = [
      family("f_grand", { husband: "grandpa", wife: "grandma", children: ["dad"] }),
      family("f_parents", { husband: "dad", wife: "mom", children: ["me"] }),
    ];
    const gm = new GraphManager(people, families);
    const ancestors = gm.getAncestors("me").map((p) => p.id);
    expect(ancestors).toEqual(expect.arrayContaining(["dad", "mom", "grandpa", "grandma"]));
    expect(ancestors).toHaveLength(4);
  });

  it("returns empty array for an orphan with no parent family", () => {
    const gm = new GraphManager([person("solo")], []);
    expect(gm.getAncestors("solo")).toEqual([]);
  });
});

describe("GraphManager.getDescendants", () => {
  it("walks down through child families", () => {
    const people = [person("root"), person("kid1"), person("kid2"), person("grandkid")];
    const families = [
      family("f1", { husband: "root", children: ["kid1", "kid2"] }),
      family("f2", { husband: "kid1", children: ["grandkid"] }),
    ];
    const gm = new GraphManager(people, families);
    const descendants = gm.getDescendants("root").map((p) => p.id);
    expect(descendants).toEqual(expect.arrayContaining(["kid1", "kid2", "grandkid"]));
    expect(descendants).toHaveLength(3);
  });
});

describe("GraphManager.findPath", () => {
  it("returns a single Self step when start equals end", () => {
    const gm = new GraphManager([person("a")], []);
    expect(gm.findPath("a", "a")).toEqual([{ personId: "a", relation: "Self" }]);
  });

  it("finds a Spouse path between husband and wife", () => {
    const gm = new GraphManager(
      [person("h"), person("w", { sex: "F" })],
      [family("f", { husband: "h", wife: "w" })]
    );
    const path = gm.findPath("h", "w");
    expect(path).not.toBeNull();
    expect(path!.map((step) => step.relation)).toEqual(["Start", "Spouse"]);
  });

  it("finds a Sibling path between two children of the same family", () => {
    const gm = new GraphManager(
      [person("dad"), person("a"), person("b")],
      [family("f", { husband: "dad", children: ["a", "b"] })]
    );
    const path = gm.findPath("a", "b");
    expect(path).not.toBeNull();
    expect(path!.map((step) => step.relation)).toEqual(["Start", "Sibling"]);
  });

  it("finds a Parent path from child to parent", () => {
    const gm = new GraphManager(
      [person("dad"), person("kid")],
      [family("f", { husband: "dad", children: ["kid"] })]
    );
    const path = gm.findPath("kid", "dad");
    expect(path).not.toBeNull();
    expect(path!.map((step) => step.relation)).toEqual(["Start", "Parent"]);
  });

  it("edges husband and wife as Spouse", () => {
    const gm = new GraphManager(
      [person("h"), person("w", { sex: "F" })],
      [family("f", { husband: "h", wife: "w", children: [] })]
    );
    expect(gm.findPath("h", "w")?.at(-1)?.relation).toBe("Spouse");
    expect(gm.findPath("w", "h")?.at(-1)?.relation).toBe("Spouse");
  });

  it("returns null when no path exists", () => {
    const gm = new GraphManager(
      [person("a"), person("b")],
      [] // no families → no edges
    );
    expect(gm.findPath("a", "b")).toBeNull();
  });
});

describe("GraphManager.buildHierarchy", () => {
  it("returns null when there are no people", () => {
    const gm = new GraphManager([], []);
    expect(gm.buildHierarchy()).toBeNull();
  });

  // Regression: prior code returned null when families.length === 0,
  // breaking the valid case of a single root person with no descendants.
  it("renders a single root person with no families", () => {
    const gm = new GraphManager([person("root", { root: true })], []);
    const hierarchy = gm.buildHierarchy();
    expect(hierarchy).not.toBeNull();
    expect(hierarchy!.id).toBe("root");
    expect(hierarchy!.lineageMemberId).toBe("root");
  });

  it("returns null when no person is marked root", () => {
    const gm = new GraphManager(
      [person("a"), person("b")],
      [family("f", { husband: "a", children: ["b"] })]
    );
    expect(gm.buildHierarchy()).toBeNull();
  });

  it("anchors the hierarchy on the family containing the root person", () => {
    const gm = new GraphManager(
      [person("dad", { root: true }), person("mom", { sex: "F" }), person("kid")],
      [family("f", { husband: "dad", wife: "mom", children: ["kid"] })]
    );
    const hierarchy = gm.buildHierarchy();
    expect(hierarchy).not.toBeNull();
    expect(hierarchy!.isPartnerGroup).toBe(true);
    expect(hierarchy!.lineageMemberId).toBe("dad");
    expect(hierarchy!.children.map((c) => c.id)).toEqual(["kid"]);
  });
});
