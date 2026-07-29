import type { Person, DraftPerson } from "../types/person";
import { diffFields, type FieldChange } from "./writeState";

/**
 * The itemised pending changes on a person, for the leaving guard's change list
 * (Spec 13 a6 — each change carries a verb, with old → new for edits). Reduces
 * the record to a labelled field map and diffs it; arrays (aliases, life,
 * details) collapse to one entry each rather than per-item, which is enough to
 * tell a relative what they would lose.
 */

function changeFields(p: DraftPerson): Record<string, string> {
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
  return diffFields(changeFields(original), changeFields(draft), LABELS);
}
