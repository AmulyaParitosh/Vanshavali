import type { Person, PersonEvent } from "../types/person";
import type { TreeRole } from "../types/tree";
import { canEdit } from "./access";

/**
 * Reader date projection (Spec 11 a4 / access-matrix row 4). When a tree's
 * `readers_see_dates` is off (the default), a **reader** (viewer) sees only the
 * *year* of a **living** relative's events — never the exact date. Keepers and
 * writers are unaffected, and the redaction is applied server-side on the read
 * path so it holds on every query (edge e2), not just the first load.
 *
 * Deceased people are historical record, not living privacy — their exact dates
 * are shown to everyone. A reader's own linked record is their own data, so it
 * is never redacted from them.
 */

/** A person is deceased if a death event is recorded (mirrors the Members list). */
export function isDeceased(person: Person): boolean {
  return (person.events ?? []).some((e) => /death|died|passed|expired|d\./i.test(e.type));
}

/** The 4-digit year inside a free-form date string, or undefined if there is none. */
export function yearOnly(date: string | undefined): string | undefined {
  return date?.match(/\d{4}/)?.[0];
}

/** Replace each event's exact date with its year alone; drop dates with no year. */
function toYearOnly(events: PersonEvent[]): PersonEvent[] {
  return events.map((e) => {
    if (!e.date) return e;
    const year = yearOnly(e.date);
    // exactOptionalPropertyTypes: omit `date` entirely when there's no year.
    const { date: _date, ...rest } = e;
    return year ? { ...rest, date: year } : rest;
  });
}

/**
 * Project a tree's people for the caller. For a reader with dates hidden, every
 * living relative's event dates collapse to the year; the reader's own record
 * (`userId === viewerUid`) and all deceased people keep their exact dates. Any
 * other role gets the list untouched.
 */
export function projectPeopleForReader(
  people: Person[],
  role: TreeRole | null | undefined,
  readersSeeDates: boolean,
  viewerUid: string
): Person[] {
  // Only a reader (view-but-not-edit) with the setting off triggers redaction.
  if (readersSeeDates || canEdit(role)) return people;

  return people.map((p) => {
    if (!p.events || p.userId === viewerUid || isDeceased(p)) return p;
    return { ...p, events: toYearOnly(p.events) };
  });
}
