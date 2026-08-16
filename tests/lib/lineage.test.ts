import { describe, expect, it } from "vitest";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";
import { GraphManager } from "@/lib/graph/GraphManager";
import {
  ancestorTerm,
  buildDescent,
  buildLineage,
  describeRelation,
  generationLabel,
  ordinalWord,
  relationsFrom,
} from "@/lib/lineage";
import { bornInLine } from "@/lib/generations";

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

describe("ancestorTerm — what to call an ancestor N generations back", () => {
  it("names the near ones outright", () => {
    expect(ancestorTerm(1, "M")).toBe("father");
    expect(ancestorTerm(1, "F")).toBe("mother");
    expect(ancestorTerm(2, "F")).toBe("grandmother");
    expect(ancestorTerm(3, "M")).toBe("great-grandfather");
    expect(ancestorTerm(4, "M")).toBe("great-great-grandfather");
  });
  it("counts instead of stacking 'great-' for a long line", () => {
    expect(ancestorTerm(5, "M")).toBe("3× great-grandfather");
    expect(ancestorTerm(8, "F")).toBe("6× great-grandmother");
  });
  it("has no term for the record itself", () => {
    expect(ancestorTerm(0, "M")).toBe("");
  });
});

describe("generationLabel — a generation named once, for the whole household", () => {
  const M = P("m", "क", "M");
  const F = P("f", "ख", "F");
  it("names a couple as a pair — the card's two rows say which is which", () => {
    expect(generationLabel(1, [M, F])).toBe("Parents");
    expect(generationLabel(2, [M, F])).toBe("Grandparents");
    expect(generationLabel(3, [M, F])).toBe("Great-grandparents");
    expect(generationLabel(5, [M, F])).toBe("3× great-grandparents");
  });
  it("names the one person exactly when there is no second row to read against", () => {
    expect(generationLabel(2, [F])).toBe("Grandmother");
    expect(generationLabel(4, [M])).toBe("Great-great-grandfather");
  });
  it("marks the opened record", () => {
    expect(generationLabel(0, [M])).toBe("This record");
  });
});

describe("buildDescent — one household per generation, back up the line", () => {
  const born = bornInLine(people, families);

  it("opens with the record itself, then a card per generation", () => {
    const d = buildDescent("ani", gm, born);
    expect(d.map((g) => g.people.map((p) => p.id))).toEqual([
      ["ani"],
      ["dev", "kamala"],
      ["raghu", "sushila"],
    ]);
    expect(d.map((g) => g.step)).toEqual([0, 1, 2]);
    expect(d.map((g) => g.label)).toEqual(["This record", "Parents", "Grandparents"]);
  });

  it("keeps the father first whoever carries the line", () => {
    const d = buildDescent("ani", gm, born);
    expect(d.map((g) => g.people[0]!.sex)).toEqual(["M", "M", "M"]);
    expect(d.map((g) => g.carriesId)).toEqual(["ani", "dev", "raghu"]);
  });

  it("stops at a person with nobody recorded above them", () => {
    expect(buildDescent("raghu", gm, born).map((g) => g.people.map((p) => p.id))).toEqual([
      ["raghu"],
    ]);
  });

  it("is empty for a person who isn't in the tree", () => {
    expect(buildDescent("nobody", gm, born)).toEqual([]);
  });

  it("follows the mother when she is the one born into the line", () => {
    // A daughter's house: the line runs through her, not the husband who married in.
    const ppl: Person[] = [
      { ...P("r", "मूल", "M"), root: true },
      P("rw", "मूल-पत्नी", "F"),
      P("d", "पुत्री", "F"),
      P("dh", "जामाता", "M"),
      P("gc", "दौहित्र", "M"),
    ];
    const fams: Family[] = [
      { id: "f1", husband: "r", wife: "rw", children: ["d"] },
      { id: "f2", husband: "dh", wife: "d", children: ["gc"] },
    ];
    const g = new GraphManager(ppl, fams);
    const d = buildDescent("gc", g, bornInLine(ppl, fams));
    expect(d.map((gen) => gen.people.map((p) => p.id))).toEqual([["gc"], ["dh", "d"], ["r", "rw"]]);
    // The mother carries it — but she still sits in the mother's row.
    expect(d[1]!.carriesId).toBe("d");
    expect(d[1]!.people[1]!.id).toBe("d");
  });

  it("labels a generation with only one parent recorded by that person", () => {
    const ppl: Person[] = [{ ...P("r", "मूल", "M"), root: true }, P("c", "पुत्र", "M")];
    const fams: Family[] = [{ id: "f1", husband: "r", children: ["c"] }];
    const g = new GraphManager(ppl, fams);
    const d = buildDescent("c", g, bornInLine(ppl, fams));
    expect(d[1]!.people.map((p) => p.id)).toEqual(["r"]);
    expect(d[1]!.label).toBe("Father");
  });

  it("does not loop when the data makes someone their own ancestor", () => {
    const ppl = [P("a", "क", "M"), P("b", "ख", "F")];
    const fams: Family[] = [{ id: "c", husband: "a", wife: "b", children: ["a"] }];
    const g = new GraphManager(ppl, fams);
    expect(buildDescent("a", g, new Set(["a"])).map((gen) => gen.people.map((p) => p.id))).toEqual([
      ["a"],
    ]);
  });
});

describe("ordinalWord", () => {
  it("maps birth position to a word", () => {
    expect(ordinalWord(0)).toBe("Eldest");
    expect(ordinalWord(1)).toBe("Second");
  });
});

describe("relationsFrom — one walk of the graph names everyone", () => {
  it("agrees with describeRelation for every person", () => {
    const all = relationsFrom("ani", gm);
    for (const p of people) {
      const expected = p.id === "ani" ? "you" : describeRelation("ani", p.id, gm);
      expect(all.get(p.id) ?? null).toBe(expected);
    }
  });

  it("names the viewer, and leaves nobody out", () => {
    const all = relationsFrom("ani", gm);
    expect(all.get("ani")).toBe("you");
    expect(all.get("dev")).toBe("father");
    expect(all.get("sneha")).toBe("first cousin");
    expect(all.size).toBe(people.length);
  });

  it("is empty but valid for someone not in the graph", () => {
    expect([...relationsFrom("nobody", gm).keys()]).toEqual(["nobody"]);
  });
});
