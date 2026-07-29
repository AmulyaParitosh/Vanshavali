import { describe, expect, it } from "vitest";
import type { Person } from "@/types/person";
import { overlayPersonFields, changedFieldKeys } from "@/lib/personMerge";

/**
 * Spec 13 flow 7 — the field-group merge that reconstructs a real Person from a
 * conflict resolution. `changedFieldKeys` names which flat fields the editor
 * touched; `overlayPersonFields` starts from the freshly-stored record and pulls
 * only the chosen groups from the editor's version, so the id / account link /
 * root a save must never move always come from what is stored.
 */

const base: Person = {
  id: "p1",
  name: { official_name: "Ishaan Verma" },
  sex: "M",
  events: [{ type: "birth", date: "1958", place: "Madhubani" }],
  userId: "uid_ishaan",
  root: true,
  version: 3,
};

describe("changedFieldKeys", () => {
  it("names the flat fields the editor changed, and nothing else", () => {
    const mine = { ...base, name: { official_name: "Ishaan K. Verma" } };
    expect(changedFieldKeys(base, mine)).toEqual(["Name"]);
  });

  it("is empty when nothing changed", () => {
    expect(changedFieldKeys(base, { ...base })).toEqual([]);
  });

  it("treats the whole life list as one field", () => {
    const mine = { ...base, events: [{ type: "birth", date: "1959", place: "Madhubani" }] };
    expect(changedFieldKeys(base, mine)).toEqual(["Life"]);
  });
});

describe("overlayPersonFields", () => {
  it("keeps id, account link and root from the stored record, never from mine", () => {
    const stored: Person = { ...base, userId: "uid_ishaan", root: true, version: 9 };
    const mine: Person = {
      id: "p1",
      name: { official_name: "Someone Else" },
      sex: "F",
      userId: "uid_intruder",
      // a malicious draft can't smuggle root/userId through — they come from stored
    };
    const merged = overlayPersonFields(stored, mine, new Set(["Name"]));
    expect(merged.id).toBe("p1");
    expect(merged.userId).toBe("uid_ishaan");
    expect(merged.root).toBe(true);
    expect(merged.name.official_name).toBe("Someone Else"); // Name was chosen from mine
    expect(merged.sex).toBe("M"); // Sex not chosen — stays stored
  });

  it("takes only the chosen field groups from mine; the rest stay stored", () => {
    const stored: Person = {
      ...base,
      name: { official_name: "Ishaan Verma" },
      events: [{ type: "birth", date: "1958" }],
    };
    const mine: Person = {
      ...base,
      name: { official_name: "Ishaan Kumar Verma" },
      events: [{ type: "birth", date: "1999" }],
    };
    // Keep my Name, but take their Life.
    const merged = overlayPersonFields(stored, mine, new Set(["Name"]));
    expect(merged.name.official_name).toBe("Ishaan Kumar Verma");
    expect(merged.events).toEqual([{ type: "birth", date: "1958" }]);
  });

  it("clears a field when the chosen (mine) side left it blank", () => {
    const stored: Person = { ...base, image_url: "https://x/y.jpg" };
    const mine: Person = { ...base };
    delete (mine as { image_url?: string }).image_url;
    const merged = overlayPersonFields(stored, mine, new Set(["Photograph"]));
    expect(merged.image_url).toBeUndefined();
  });
});
