import { describe, expect, it } from "vitest";
import { familyPartners, inferHusbandWife } from "@/lib/family";
import type { Family } from "@/types/family";

const family = (overrides: Partial<Family> = {}): Family => ({
  id: "f1",
  children: [],
  ...overrides,
});

describe("familyPartners", () => {
  it("returns husband then wife when both are set", () => {
    expect(familyPartners(family({ husband: "h", wife: "w" }))).toEqual(["h", "w"]);
  });

  it("returns only husband when wife is missing", () => {
    expect(familyPartners(family({ husband: "h" }))).toEqual(["h"]);
  });

  it("returns only wife when husband is missing", () => {
    // The common shape for single-mother families.
    expect(familyPartners(family({ wife: "w" }))).toEqual(["w"]);
  });

  it("returns an empty array for a family with no members", () => {
    expect(familyPartners(family())).toEqual([]);
  });
});

describe("inferHusbandWife", () => {
  it("returns both ids when both are set", () => {
    expect(inferHusbandWife(family({ husband: "h", wife: "w" }))).toEqual({
      husbandId: "h",
      wifeId: "w",
    });
  });

  it("leaves the missing slot undefined for single-parent families", () => {
    expect(inferHusbandWife(family({ wife: "w" }))).toEqual({
      husbandId: undefined,
      wifeId: "w",
    });
    expect(inferHusbandWife(family({ husband: "h" }))).toEqual({
      husbandId: "h",
      wifeId: undefined,
    });
  });
});
