/**
 * Spec 13 — the dirty-tracking core shared by every form in the product. Pure,
 * framework-free logic: a form hands it the stored field map and the current
 * one, and it answers the questions Spec 13 asks — is anything dirty (so Save
 * can be disabled until it is), what is the patch (only changed fields), what is
 * the inverse patch (for the 12-second Undo), and how does the change list read
 * in the leaving guard (a verb per change, with old → new for edits).
 *
 * Fields are a flat `Record<string, string>` the form normalises to; an empty
 * string is "absent" (no value recorded), matching how the UI states absence in
 * words rather than storing a blank.
 */

export type ChangeVerb = "Added" | "Changed" | "Removed";

export interface FieldChange {
  /** The field key (e.g. "born"). */
  field: string;
  /** Human label for the change list (e.g. "Born"); defaults to the key. */
  label: string;
  verb: ChangeVerb;
  /** Previous value, present for Changed and Removed. */
  from?: string;
  /** New value, present for Added and Changed. */
  to?: string;
}

type Fields = Readonly<Record<string, string>>;

/** All keys present in either map, order stable (original first, then new keys). */
function unionKeys(a: Fields, b: Fields): string[] {
  const keys: string[] = [];
  for (const k of Object.keys(a)) keys.push(k);
  for (const k of Object.keys(b)) if (!keys.includes(k)) keys.push(k);
  return keys;
}

/**
 * The changes between the stored record and the edited one, each classified by
 * verb. Absent→present is Added, present→absent is Removed, and a real value
 * change is Changed (carrying from → to). Unchanged fields are omitted.
 */
export function diffFields(
  original: Fields,
  current: Fields,
  labels: Readonly<Record<string, string>> = {}
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of unionKeys(original, current)) {
    // A field's value is its trimmed content; "" is absent (matches how the UI
    // states absence in words rather than storing a blank).
    const o = (original[field] ?? "").trim();
    const c = (current[field] ?? "").trim();
    if (o === c) continue; // covers both-absent and unchanged
    const label = labels[field] ?? field;
    if (o === "") changes.push({ field, label, verb: "Added", to: c });
    else if (c === "") changes.push({ field, label, verb: "Removed", from: o });
    else changes.push({ field, label, verb: "Changed", from: o, to: c });
  }
  return changes;
}

/** Spec 13 a2: Save is disabled until a value differs from what is stored. */
export function isDirty(original: Fields, current: Fields): boolean {
  return diffFields(original, current).length > 0;
}

/**
 * The patch sent on Save — only changed fields (Spec 13 flow 2). A removed field
 * maps to `null` so the server clears it; added/changed map to the new value.
 */
export function toPatch(original: Fields, current: Fields): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  for (const ch of diffFields(original, current)) {
    patch[ch.field] = ch.verb === "Removed" ? null : (ch.to ?? null);
  }
  return patch;
}

/** The inverse of a save, held client-side for 12s to power Undo (Spec 13 flow 3). */
export function inversePatch(original: Fields, current: Fields): Record<string, string | null> {
  return toPatch(current, original);
}

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** Small counts as words for the leaving-guard body ("You changed three things"). */
export function countInWords(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n]! : String(n);
}

export interface ChangeListSummary {
  count: number;
  /** The changes to render — capped so a decision dialog never scrolls (Spec 13 edge 6). */
  shown: FieldChange[];
  /** How many changes are hidden beyond the cap ("and N more changes"). */
  moreCount: number;
}

/**
 * The leaving-guard change list: every pending change, but never more than `max`
 * rows on screen — the rest collapse into "and N more changes" (Spec 13 edge 6).
 */
export function summarizeChanges(changes: readonly FieldChange[], max = 6): ChangeListSummary {
  return {
    count: changes.length,
    shown: changes.slice(0, max),
    moreCount: Math.max(0, changes.length - max),
  };
}

const norm = (v: string | undefined): string => (v ?? "").trim();

export interface FieldConflict {
  field: string;
  /** What I typed. */
  mine: string;
  /** What is stored now (someone changed it while I was editing). */
  theirs: string;
}

export interface ThreeWayResult {
  /** Fields safe to write now — I changed them and nobody else did. */
  safe: Record<string, string | null>;
  /** Fields both I and someone else changed, to different values — these wait. */
  conflicts: FieldConflict[];
}

/**
 * Three-way merge for a stale save (Spec 13 flow 7, a10). `base` is the snapshot
 * from when I opened the record, `stored` is the server's current value, `mine`
 * is my edit. For each field I changed: if nobody else touched it, it is safe to
 * write; if someone else changed it to the same value, it has converged (no-op);
 * otherwise it is a genuine conflict that must wait for the user (Keep mine / See
 * hers) — never overwritten silently.
 */
export function detectConflict(base: Fields, stored: Fields, mine: Fields): ThreeWayResult {
  const safe: Record<string, string | null> = {};
  const conflicts: FieldConflict[] = [];
  for (const ch of diffFields(base, mine)) {
    const b = norm(base[ch.field]);
    const s = norm(stored[ch.field]);
    const m = norm(mine[ch.field]);
    if (s === b)
      safe[ch.field] = m === "" ? null : m; // nobody else touched it
    else if (s === m)
      continue; // converged — same change, nothing to do
    else conflicts.push({ field: ch.field, mine: m, theirs: s });
  }
  return { safe, conflicts };
}

/** Whether a save against `stored` (from `base`) has any genuinely contested field. */
export function hasConflict(base: Fields, stored: Fields, mine: Fields): boolean {
  return detectConflict(base, stored, mine).conflicts.length > 0;
}
