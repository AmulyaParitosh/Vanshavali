import { describe, expect, it } from "vitest";
import { stringToColor } from "@/utils/colorUtils";

describe("stringToColor", () => {
  it("is deterministic — same input yields same output", () => {
    expect(stringToColor("amulya")).toBe(stringToColor("amulya"));
  });

  it("returns a valid 7-character hex color", () => {
    expect(stringToColor("anything")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("yields different colors for different inputs", () => {
    expect(stringToColor("alice")).not.toBe(stringToColor("bob"));
  });

  it("handles empty string without throwing", () => {
    expect(stringToColor("")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
