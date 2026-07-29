import { describe, it, expect } from "vitest";
import { projectPeopleForReader, yearOnly, isDeceased } from "@/lib/readerDates";
import type { Person } from "@/types/person";

/**
 * Spec 11 a4 — reader date projection. A reader (viewer) with the setting off
 * sees only the year of a LIVING relative's events; deceased people and the
 * reader's own record keep their exact dates; keepers/writers are never redacted.
 */

const person = (over: Partial<Person> & Pick<Person, "id">): Person => ({
  name: { official_name: over.id },
  sex: "M",
  ...over,
});

const READER = "uid_reader";

const living = person({
  id: "p_living",
  events: [
    { type: "Birth", date: "1989-05-12", place: "Patna" },
    { type: "Marriage", date: "12 April 2014", place: "Ranchi" },
  ],
});
const deceased = person({
  id: "p_gone",
  events: [
    { type: "Birth", date: "1931-04-12" },
    { type: "Death", date: "2009-11-03" },
  ],
});
const self = person({
  id: "p_self",
  userId: READER,
  events: [{ type: "Birth", date: "1990-01-02" }],
});

describe("yearOnly", () => {
  it("pulls the 4-digit year from any date shape, or nothing", () => {
    expect(yearOnly("1989-05-12")).toBe("1989");
    expect(yearOnly("12 April 2014")).toBe("2014");
    expect(yearOnly("sometime")).toBeUndefined();
    expect(yearOnly(undefined)).toBeUndefined();
  });
});

describe("isDeceased", () => {
  it("is true only when a death-like event is recorded", () => {
    expect(isDeceased(deceased)).toBe(true);
    expect(isDeceased(living)).toBe(false);
  });
});

describe("projectPeopleForReader", () => {
  it("collapses a living relative's dates to the year for a reader (setting off)", () => {
    const [p] = projectPeopleForReader([living], "viewer", false, READER);
    expect(p!.events!.map((e) => e.date)).toEqual(["1989", "2014"]);
    // Places are untouched — only the date is redacted.
    expect(p!.events![0]!.place).toBe("Patna");
  });

  it("leaves the deceased and the reader's own record at full precision", () => {
    const [gone, me] = projectPeopleForReader([deceased, self], "viewer", false, READER);
    expect(gone!.events!.map((e) => e.date)).toEqual(["1931-04-12", "2009-11-03"]);
    expect(me!.events![0]!.date).toBe("1990-01-02");
  });

  it("drops a date that has no year rather than leaking a partial", () => {
    const p = person({ id: "p_x", events: [{ type: "Birth", date: "spring, no year" }] });
    const [out] = projectPeopleForReader([p], "viewer", false, READER);
    expect(out!.events![0]).not.toHaveProperty("date");
    expect(out!.events![0]!.type).toBe("Birth");
  });

  it("does not redact when the keeper turned reader dates on", () => {
    const [p] = projectPeopleForReader([living], "viewer", true, READER);
    expect(p!.events![0]!.date).toBe("1989-05-12");
  });

  it("never redacts a writer or a keeper", () => {
    for (const role of ["editor", "owner"] as const) {
      const [p] = projectPeopleForReader([living], role, false, READER);
      expect(p!.events![0]!.date).toBe("1989-05-12");
    }
  });
});
