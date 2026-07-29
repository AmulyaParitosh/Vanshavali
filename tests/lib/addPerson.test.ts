import { describe, it, expect } from "vitest";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";
import { findDuplicate, personIdFromName, wireRelationship, placePerson } from "@/lib/addPerson";

/**
 * Spec 06 add panel — the family wiring is the riskiest write in the product, so
 * it is pure and exhaustively tested here. Each relationship either joins an
 * existing household (no duplicate rows) or creates the single one it implies.
 */

const P = (id: string, sex: Person["sex"], name = id): Person => ({
  id,
  name: { official_name: name },
  sex,
});

const people: Person[] = [
  P("p_umesh", "M", "Umesh"),
  P("p_rekha", "F", "Rekha"),
  P("p_nikhil", "M", "Nikhil"),
  P("p_lonely", "M", "Lonely"), // in no household
];
const families: Family[] = [
  { id: "f_1", husband: "p_umesh", wife: "p_rekha", children: ["p_nikhil"] },
];
const mk = () => "f_new";

describe("findDuplicate (a6)", () => {
  it("matches the official name, case-insensitively", () => {
    expect(findDuplicate(people, "  umesh ")?.id).toBe("p_umesh");
  });
  it("matches an alias", () => {
    const withAlias = [
      { ...P("p_x", "F", "Anjali"), name: { official_name: "Anjali", aliases: ["Anju"] } },
    ];
    expect(findDuplicate(withAlias, "anju")?.id).toBe("p_x");
  });
  it("returns null on no match and on empty input", () => {
    expect(findDuplicate(people, "Nobody")).toBeNull();
    expect(findDuplicate(people, "  ")).toBeNull();
  });
});

describe("personIdFromName", () => {
  it("slugifies and de-duplicates against ids in use", () => {
    expect(personIdFromName("Anjali Mishra", new Set())).toBe("p_anjali_mishra");
    expect(personIdFromName("Anjali Mishra", new Set(["p_anjali_mishra"]))).toBe(
      "p_anjali_mishra_2"
    );
  });
});

describe("wireRelationship — child", () => {
  it("appends the child to the anchor's existing household", () => {
    const out = wireRelationship(people, families, "p_ira", "F", "child", "p_umesh", mk);
    expect(out).toHaveLength(1);
    expect(out[0]!.children).toEqual(["p_nikhil", "p_ira"]);
  });
  it("creates a household for an anchor who has none, with the anchor as parent", () => {
    const out = wireRelationship(people, families, "p_kid", "M", "child", "p_lonely", mk);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ id: "f_new", husband: "p_lonely", children: ["p_kid"] });
  });
});

describe("wireRelationship — sibling", () => {
  it("joins the anchor's parents' household", () => {
    const out = wireRelationship(people, families, "p_sib", "F", "sibling", "p_nikhil", mk);
    expect(out[0]!.children).toEqual(["p_nikhil", "p_sib"]);
  });
  it("groups parentless siblings together when no parent household exists", () => {
    const out = wireRelationship(people, families, "p_sib", "M", "sibling", "p_lonely", mk);
    expect(out[1]).toEqual({ id: "f_new", children: ["p_lonely", "p_sib"] });
  });
});

describe("wireRelationship — spouse", () => {
  it("fills the empty partner slot of the anchor's household", () => {
    const lone: Family[] = [{ id: "f_2", husband: "p_lonely", children: [] }];
    const out = wireRelationship(people, lone, "p_wife", "F", "spouse", "p_lonely", mk);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ id: "f_2", husband: "p_lonely", wife: "p_wife", children: [] });
  });
  it("creates a new couple when the anchor's household is already complete", () => {
    // p_umesh already has a wife; a new spouse makes a second household.
    const out = wireRelationship(people, families, "p_second", "F", "spouse", "p_umesh", mk);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ id: "f_new", husband: "p_umesh", wife: "p_second", children: [] });
  });
});

describe("wireRelationship — parent", () => {
  it("fills the empty parent slot of the child's household", () => {
    const oneParent: Family[] = [{ id: "f_3", wife: "p_rekha", children: ["p_nikhil"] }];
    const out = wireRelationship(people, oneParent, "p_dad", "M", "parent", "p_nikhil", mk);
    expect(out[0]).toEqual({
      id: "f_3",
      wife: "p_rekha",
      husband: "p_dad",
      children: ["p_nikhil"],
    });
  });
  it("creates a household with the child when they have none", () => {
    const out = wireRelationship(people, families, "p_dad", "M", "parent", "p_lonely", mk);
    expect(out[1]).toEqual({ id: "f_new", husband: "p_dad", children: ["p_lonely"] });
  });
});

describe("wireRelationship — none / missing anchor", () => {
  it("leaves the graph untouched", () => {
    expect(wireRelationship(people, families, "p_x", "M", "none", null, mk)).toBe(families);
    expect(wireRelationship(people, families, "p_x", "M", "child", null, mk)).toBe(families);
  });
});

describe("placePerson", () => {
  it("appends a brand-new person and wires them (add)", () => {
    const ira = P("p_ira", "F", "Ira");
    const out = placePerson({ people, families }, ira, "child", "p_umesh");
    expect(out.people).toHaveLength(people.length + 1);
    expect(out.families[0]!.children).toContain("p_ira");
  });
  it("connecting an existing person does not duplicate the row (a7)", () => {
    // p_lonely already exists; connect them as Umesh's child.
    const out = placePerson({ people, families }, people[3]!, "child", "p_umesh");
    expect(out.people).toHaveLength(people.length); // no new row
    expect(out.families[0]!.children).toContain("p_lonely");
  });
});
