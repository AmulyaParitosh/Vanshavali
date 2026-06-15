import { describe, expect, it } from "vitest";
import { getPersonPlaceholderUrl } from "./imageUtils";
import type { Person } from "../types/person";

const person = (overrides: Partial<Person> = {}): Person => ({
  id: "p_alice",
  name: { official_name: "Alice" },
  sex: "F",
  ...overrides,
});

describe("getPersonPlaceholderUrl", () => {
  it("returns a placehold.co URL keyed off the person id", () => {
    const url = getPersonPlaceholderUrl(person());
    expect(url).toMatch(/^https:\/\/placehold\.co\/100x100\/[0-9a-f]{6}\//i);
    expect(url).toMatch(/text=Al$/);
  });

  it("falls back to the official name when id is missing", () => {
    const orphan = { ...person(), id: "" };
    const url = getPersonPlaceholderUrl(orphan);
    expect(url).toMatch(/^https:\/\/placehold\.co\//);
  });

  it("uses the first two characters of the official name as the text", () => {
    expect(getPersonPlaceholderUrl(person({ name: { official_name: "बाबा" } }))).toMatch(
      /text=बा$/
    );
  });
});
