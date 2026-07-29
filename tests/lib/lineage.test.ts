import { describe, expect, it } from "vitest";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";
import { GraphManager } from "@/lib/graph/GraphManager";
import { buildLineage, describeRelation, ordinalWord } from "@/lib/lineage";

/**
 * Spec 07 — relation-to-viewer naming and the prose-lineage builder. A three-
 * generation family: grandparents Raghunath+Sushila → Devendra+Kamala →
 * Aniruddha (you), Vandana; plus cousin Sneha via Devendra's brother Mahesh.
 */
const P = (id: string, name: string, sex: "M" | "F"): Person => ({
  id,
  name: { official_name: name },
  sex,
});
const people: Person[] = [
  P("raghu", "रघुनाथ", "M"),
  P("sushila", "सुशीला", "F"),
  P("dev", "देवेन्द्र", "M"),
  P("mahesh", "महेश", "M"),
  P("kamala", "कमला", "F"),
  P("shanti", "शान्ति", "F"),
  P("ani", "अनिरुद्ध", "M"),
  P("vandana", "वन्दना", "F"),
  P("sneha", "स्नेहा", "F"),
];
const families: Family[] = [
  { id: "g1", husband: "raghu", wife: "sushila", children: ["dev", "mahesh"] },
  { id: "g2", husband: "dev", wife: "kamala", children: ["ani", "vandana"] },
  { id: "g3", husband: "mahesh", wife: "shanti", children: ["sneha"] },
];
const gm = new GraphManager(people, families);

describe("describeRelation — the viewer's relation as a phrase", () => {
  const rel = (id: string) => describeRelation("ani", id, gm);

  it("names the one-step kinships by the person's sex", () => {
    expect(rel("dev")).toBe("father");
    expect(rel("kamala")).toBe("mother");
    expect(rel("vandana")).toBe("sister");
  });
  it("collapses grandparents", () => {
    expect(rel("raghu")).toBe("grandfather");
    expect(rel("sushila")).toBe("grandmother");
  });
  it("reads an uncle as a possessive chain (father's brother)", () => {
    expect(rel("mahesh")).toBe("father's brother");
  });
  it("collapses a parent's sibling's child to first cousin", () => {
    expect(rel("sneha")).toBe("first cousin");
  });
  it("is null for self", () => {
    expect(rel("ani")).toBeNull();
  });
});

describe("buildLineage — parents, unions and children for the prose", () => {
  it("gathers the household you were born into, with birth order", () => {
    const l = buildLineage("ani", gm)!;
    expect(l.childOf?.father?.id).toBe("dev");
    expect(l.childOf?.mother?.id).toBe("kamala");
    expect(l.childOf?.ordinal).toBe(0); // eldest
    expect(l.childOf?.total).toBe(2);
  });
  it("gathers each union's spouse and children", () => {
    const l = buildLineage("dev", gm)!;
    expect(l.unions).toHaveLength(1);
    expect(l.unions[0]!.spouse?.id).toBe("kamala");
    expect(l.unions[0]!.children.map((c) => c.id)).toEqual(["ani", "vandana"]);
  });
  it("a person with no household of their own has no unions", () => {
    const l = buildLineage("vandana", gm)!;
    expect(l.unions).toEqual([]);
    expect(l.childOf?.ordinal).toBe(1); // second child
  });
});

describe("ordinalWord", () => {
  it("maps birth position to a word", () => {
    expect(ordinalWord(0)).toBe("Eldest");
    expect(ordinalWord(1)).toBe("Second");
  });
});
