import { describe, expect, it } from "vitest";
import type { Person } from "@/types/person";
import type { Family } from "@/types/family";
import { applyOwnFacts, mergePlaceholder, ownFactsOf } from "@/lib/onerecord";

/**
 * Integration contract §6 (join → one row, links intact) and §7 (edit own record
 * → changes in every tree). One-record rule, Option B (per-tree + propagate/merge;
 * QUESTIONS Q9). Pure logic; the service/UI seams (Invite §04, Account §12) call
 * these.
 */

// A placeholder a keeper entered for a cousin not yet a member, already wired
// into a household and a children list.
const placeholder: Person = {
  id: "p_sneha",
  name: { official_name: "स्नेहा मिश्र" },
  sex: "F",
  root: false,
  events: [{ type: "Note", date: "", place: "Darbhanga" }],
};

// The user's canonical identity (from their account / other trees).
const canonical: Person = {
  id: "p_sneha_home_tree",
  name: { official_name: "स्नेहा वर्मा", aliases: ["Sneha"] },
  sex: "F",
  image_url: "/u/sneha.jpg",
  events: [{ type: "Birth", date: "2001", place: "Darbhanga" }],
  userId: "u_sneha",
  root: true,
};

// Households/children in the joined tree reference the placeholder id.
const families: Family[] = [
  { id: "f_parents", husband: "p_umesh", wife: "p_rekha", children: ["p_nikhil", "p_sneha"] },
];

describe("§6 — joining a tree where a placeholder exists ends with ONE row, links intact", () => {
  const merged = mergePlaceholder(placeholder, ownFactsOf(canonical), "u_sneha");

  it("keeps the placeholder's row id — nothing is re-pointed, no second row", () => {
    expect(merged.id).toBe("p_sneha");
  });

  it("every household / sibling reference still resolves to the one row", () => {
    const refs = families.flatMap((f) => [f.husband, f.wife, ...f.children]).filter(Boolean);
    expect(refs).toContain(merged.id);
    // The children list is untouched and still names exactly one Sneha.
    expect(families[0]!.children.filter((c) => c === merged.id)).toHaveLength(1);
  });

  it("claims the row for the joining user and carries their own facts", () => {
    expect(merged.userId).toBe("u_sneha");
    expect(merged.name.official_name).toBe("स्नेहा वर्मा");
    expect(merged.name.aliases).toEqual(["Sneha"]);
    expect(merged.image_url).toBe("/u/sneha.jpg");
  });

  it("keeps the tree-owned root flag from the placeholder, not the canonical record", () => {
    expect(merged.root).toBe(false); // placeholder was not this tree's root
  });
});

describe("§7 — editing your own record changes it in every tree, keeping tree-owned fields", () => {
  // The same user linked in two other trees, each with its own row id / root.
  const inTreeA: Person = {
    id: "pA",
    name: { official_name: "old" },
    sex: "F",
    userId: "u_sneha",
    root: true,
  };
  const inTreeB: Person = {
    id: "pB",
    name: { official_name: "old" },
    sex: "F",
    userId: "u_sneha",
    root: false,
  };
  const edited = ownFactsOf({
    ...canonical,
    name: { official_name: "स्नेहा वर्मा", aliases: ["Snehu"] },
  });

  it("propagates own facts to each linked row", () => {
    for (const row of [inTreeA, inTreeB]) {
      const next = applyOwnFacts(row, edited);
      expect(next.name.official_name).toBe("स्नेहा वर्मा");
      expect(next.name.aliases).toEqual(["Snehu"]);
    }
  });

  it("keeps each row's tree-owned id, userId and root", () => {
    expect(applyOwnFacts(inTreeA, edited)).toMatchObject({
      id: "pA",
      userId: "u_sneha",
      root: true,
    });
    expect(applyOwnFacts(inTreeB, edited)).toMatchObject({
      id: "pB",
      userId: "u_sneha",
      root: false,
    });
  });

  it("a cleared own fact clears everywhere (own facts are authoritative)", () => {
    const withPhoto: Person = { ...inTreeA, image_url: "/old.jpg" };
    const cleared = ownFactsOf({ ...canonical, image_url: undefined as unknown as string });
    expect(applyOwnFacts(withPhoto, cleared).image_url).toBeUndefined();
  });
});
