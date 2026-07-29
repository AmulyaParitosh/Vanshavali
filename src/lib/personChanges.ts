import type { Person, DraftPerson } from "../types/person";
import { diffFields, type FieldChange } from "./writeState";

/**
 * The itemised pending changes on a person, for the leaving guard's change list
 * (Spec 13 a6 — each change carries a verb, with old → new for edits). Reduces
 * the record to a labelled field map and diffs it; arrays (aliases, life,
 * details) collapse to one entry each rather than per-item, which is enough to
 * tell a relative what they would lose.
 */

/**
 * A person reduced to the flat, human-labelled field map the write-state logic
 * compares (Spec 13). Arrays (aliases, life, details) collapse to one entry each
 * rather than per-item — enough to tell a relative what a change would touch, and
 * the same keyspace the conflict detector and the field-group merge use. Exported
 * so `personMerge` shares exactly these keys.
 */
export function personFieldMap(p: DraftPerson): Record<string, string> {
  const aliases = (p.name?.aliases ?? []).filter((a) => a.trim());
  const events = (p.events ?? [])
    .map((e) => [e.type, e.date, e.place].filter(Boolean).join(" "))
    .filter(Boolean);
  const details = Object.entries(p.custom_fields ?? {})
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k} ${v}`);
  return {
    Name: p.name?.official_name ?? "",
    Sex: p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : "",
    Photograph: p.image_url ? "a photograph" : "",
    "Also known as": aliases.join(", "),
    Life: events.join(" · "),
    Details: details.join(" · "),
  };
}

const LABELS = {
  Name: "Name",
  Sex: "Sex",
  Photograph: "Photograph",
  "Also known as": "Also known as",
  Life: "Life",
  Details: "Details",
};

export function personChanges(original: Person, draft: DraftPerson): FieldChange[] {
  return diffFields(personFieldMap(original), personFieldMap(draft), LABELS);
}
