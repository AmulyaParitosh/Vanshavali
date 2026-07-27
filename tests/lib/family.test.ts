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
    expect(familyPartners(family({ wife: "w" }))).toEqual(["w"]);
  });

  it("appends legacy partners after husband and wife", () => {
    expect(familyPartners(family({ husband: "h", wife: "w", partners: ["p3"] }))).toEqual([
      "h",
      "w",
      "p3",
    ]);
  });

  it("falls back to partners when husband and wife are absent", () => {
    expect(familyPartners(family({ partners: ["a", "b"] }))).toEqual(["a", "b"]);
  });

  it("skips entries that are absent from the family", () => {
    // husband omitted entirely (the common shape for single-mother families).
    expect(familyPartners(family({ wife: "w" }))).toEqual(["w"]);
  });

  it("returns an empty array for a family with no members", () => {
    expect(familyPartners(family())).toEqual([]);
  });
});

describe("inferHusbandWife", () => {
  const sexOf = (m: Record<string, "M" | "F">) => (id: string) => m[id];

  it("returns canonical fields when both are set", () => {
    const result = inferHusbandWife(family({ husband: "h", wife: "w" }), sexOf({ h: "M", w: "F" }));
    expect(result).toEqual({ husbandId: "h", wifeId: "w" });
  });

  it("falls back to partners by sex when husband is missing", () => {
    const result = inferHusbandWife(
      family({ wife: "w", partners: ["m1"] }),
      sexOf({ w: "F", m1: "M" })
    );
    expect(result).toEqual({ husbandId: "m1", wifeId: "w" });
  });

  it("falls back to partners by sex when wife is missing", () => {
    const result = inferHusbandWife(
      family({ husband: "h", partners: ["f1"] }),
      sexOf({ h: "M", f1: "F" })
    );
    expect(result).toEqual({ husbandId: "h", wifeId: "f1" });
  });

  it("leaves a slot undefined when no partner of the right sex is available", () => {
    const result = inferHusbandWife(family({ partners: ["m1"] }), sexOf({ m1: "M" }));
    expect(result).toEqual({ husbandId: "m1", wifeId: undefined });
  });
});
