import { describe, expect, it } from "vitest";
import { GraphManager } from "@/lib/graph/GraphManager";
import { ConsistencyValidator } from "@/lib/graph/ConsistencyValidator";
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

const validate = (people: Person[], families: Family[]) =>
  ConsistencyValidator.validate(new GraphManager(people, families));

describe("ConsistencyValidator", () => {
  it("returns no issues for a healthy tree", () => {
    const issues = validate(
      [person("dad", { root: true }), person("kid")],
      [family("f", { husband: "dad", children: ["kid"] })]
    );
    expect(issues).toEqual([]);
  });

  it("flags a family referencing a missing partner", () => {
    const issues = validate([person("known")], [family("f", { husband: "known", wife: "ghost" })]);
    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "error",
        entityId: "f",
        message: expect.stringContaining("ghost"),
      })
    );
  });

  it("flags a family referencing a missing child", () => {
    const issues = validate(
      [person("dad")],
      [family("f", { husband: "dad", children: ["phantom_kid"] })]
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "error",
        entityId: "f",
        message: expect.stringContaining("phantom_kid"),
      })
    );
  });

  it("warns about a person with no sex", () => {
    const noSex = { ...person("nosex"), sex: "" } as unknown as Person;
    const issues = validate([noSex], []);
    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "warning",
        entityId: "nosex",
        message: expect.stringContaining("no sex defined"),
      })
    );
  });

  it("detects a person who is both partner and child of the same family", () => {
    const issues = validate(
      [person("self_parent")],
      [family("f", { husband: "self_parent", children: ["self_parent"] })]
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "error",
        entityId: "f",
        message: expect.stringContaining("Circular"),
      })
    );
  });

  it("flags multiple persons marked root: true", () => {
    const issues = validate([person("a", { root: true }), person("b", { root: true })], []);
    expect(issues).toContainEqual(
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("Multiple root persons"),
      })
    );
  });

  it("does not flag a tree with exactly one root", () => {
    const issues = validate([person("a", { root: true }), person("b")], []);
    expect(issues.some((i) => i.message.includes("Multiple root persons"))).toBe(false);
  });
});
