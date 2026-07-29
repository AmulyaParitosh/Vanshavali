import { describe, expect, it } from "vitest";
import {
  countInWords,
  diffFields,
  inversePatch,
  isDirty,
  summarizeChanges,
  toPatch,
} from "@/lib/writeState";

/**
 * Spec 13 — dirty-tracking core. Acceptance a2 (disabled until a value differs),
 * a6 (each change carries a verb, incl. old → new for edits), flow 2 (patch =
 * only changed fields), flow 3 (inverse patch powers Undo), edge 6 (long lists
 * collapse to "and N more").
 */

const LABELS = { born: "Born", gotra: "Gotra", job: "Occupation" };

describe("isDirty — a2: Save disabled until a value differs", () => {
  it("is clean when nothing changed", () => {
    expect(isDirty({ born: "1958" }, { born: "1958" })).toBe(false);
  });
  it("treats an empty string as absent (blank ≠ dirty)", () => {
    expect(isDirty({ born: "" }, { born: "" })).toBe(false);
    expect(isDirty({ born: "1958" }, { born: "  1958 " })).toBe(false);
  });
  it("is dirty on any real difference", () => {
    expect(isDirty({ born: "1958" }, { born: "1959" })).toBe(true);
  });
});

describe("diffFields — a6: a verb per change, old → new for edits", () => {
  it("classifies added / changed / removed", () => {
    const changes = diffFields(
      { born: "1958", gotra: "Vatsa" },
      { born: "22 July 1958", gotra: "", job: "Engineer" },
      LABELS
    );
    expect(changes).toEqual([
      { field: "born", label: "Born", verb: "Changed", from: "1958", to: "22 July 1958" },
      { field: "gotra", label: "Gotra", verb: "Removed", from: "Vatsa" },
      { field: "job", label: "Occupation", verb: "Added", to: "Engineer" },
    ]);
  });
  it("labels default to the field key", () => {
    expect(diffFields({}, { alias: "Ani" })[0]).toMatchObject({ field: "alias", label: "alias" });
  });
});

describe("toPatch / inversePatch — flow 2 & 3", () => {
  it("patch carries only changed fields; a removal is null", () => {
    expect(
      toPatch(
        { born: "1958", gotra: "Vatsa", job: "Engineer" },
        { born: "1959", gotra: "", job: "Engineer" }
      )
    ).toEqual({ born: "1959", gotra: null });
  });
  it("inverse patch restores the previous state exactly (a4)", () => {
    const original = { born: "1958", gotra: "Vatsa" };
    const current = { born: "1959", gotra: "" };
    expect(inversePatch(original, current)).toEqual({ born: "1958", gotra: "Vatsa" });
  });
});

describe("countInWords — leaving-guard body", () => {
  it("small counts are words", () => {
    expect(countInWords(3)).toBe("three");
    expect(countInWords(1)).toBe("one");
  });
  it("larger counts fall back to digits", () => {
    expect(countInWords(12)).toBe("12");
  });
});

describe("summarizeChanges — edge 6: first six + N more", () => {
  it("caps the shown rows and reports the overflow", () => {
    const changes = Array.from({ length: 10 }, (_, i) => ({
      field: `f${i}`,
      label: `F${i}`,
      verb: "Added" as const,
      to: String(i),
    }));
    const s = summarizeChanges(changes);
    expect(s.count).toBe(10);
    expect(s.shown).toHaveLength(6);
    expect(s.moreCount).toBe(4);
  });
  it("no overflow when within the cap", () => {
    const s = summarizeChanges([{ field: "a", label: "A", verb: "Added", to: "x" }]);
    expect(s.moreCount).toBe(0);
  });
});
