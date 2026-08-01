import type { Person } from "../../types/person";
import type { GraphNode } from "../../types/graph";

/**
 * The household card (Tree Canvas spec — "the only atom on the canvas"). A card
 * is one household: a single person, or a married pair as two rows with a seam —
 * never two loose people. This module turns a laid-out {@link GraphNode} into the
 * rows + spine colour the card renders, kept out of JSX so the rules are testable.
 *
 * Meaning carried by colour (never by shape):
 * - ring `born` (red) = born into this line · `married` (marigold) = married in.
 * - spine `born` (red) = the family name carries on through this household ·
 *   `married` (marigold) = it changes by marriage (a daughter's house, whose
 *   children take the husband's name).
 */

export type RingKind = "born" | "married";

export interface CardRow {
  person: Person;
  ring: RingKind;
  /** A death date is recorded — the row reads back at 50% (opacity only). */
  deceased: boolean;
  /** "1968–" (living), "1944–2011" (both dates), "" (nothing recorded). */
  years: string;
  /** This row is the signed-in viewer — the "· you" marker. */
  isSelf: boolean;
}

export interface CardModel {
  /** The node id (a person id, or a family id for a couple). */
  id: string;
  /** Head first, spouse (if any) second. */
  rows: CardRow[];
  spine: RingKind;
}

/** The four-digit year from the first event whose type matches `re`. */
function year(person: Person, re: RegExp): string | null {
  const d = (person.events ?? []).find((e) => re.test(e.type))?.date;
  return d?.match(/\d{4}/)?.[0] ?? null;
}

const birthYear = (p: Person) => year(p, /birth|born/i);
const deathYear = (p: Person) => year(p, /death|died|passed/i);

/** The card's year line, and whether the person is deceased. */
export function yearSpan(person: Person): { years: string; deceased: boolean } {
  const b = birthYear(person);
  const d = deathYear(person);
  const years = b && d ? `${b}–${d}` : b ? `${b}–` : d ? `–${d}` : "";
  return { years, deceased: !!d };
}

/** The people in a household node — both partners (head first), or the one person. */
function personsOf(node: GraphNode, born: ReadonlySet<string>): Person[] {
  if (!node.isPartnerGroup) return [node as unknown as Person];
  const pair = [node.husband, node.wife].filter((p): p is Person => !!p);
  if (pair.length < 2) return pair;
  const [a, b] = pair as [Person, Person];
  // The born-into-the-line partner heads the household; the married-in spouse
  // sits below. When both or neither are born in, keep the husband-first order.
  if (born.has(b.id) && !born.has(a.id)) return [b, a];
  return [a, b];
}

/**
 * Build the card model for a laid-out node. `born` is the set of ids born into
 * the line (red ring); everyone else married in (marigold).
 */
export function cardModel(
  node: GraphNode,
  born: ReadonlySet<string>,
  viewerUid: string | null
): CardModel {
  const persons = personsOf(node, born);
  const rows: CardRow[] = persons.map((person) => {
    const { years, deceased } = yearSpan(person);
    return {
      person,
      ring: born.has(person.id) ? "born" : "married",
      deceased,
      years,
      isSelf: !!viewerUid && person.userId === viewerUid,
    };
  });
  // The spine changes to marigold when the household's line carries on through a
  // daughter — the born-in anchor is female — so the family name changes here.
  const anchor = persons.find((p) => born.has(p.id));
  const spine: RingKind = anchor && anchor.sex === "F" ? "married" : "born";
  return { id: node.id, rows, spine };
}

/** Card height in full-detail px: one row (44) or a couple's two rows (88). */
export function cardHeight(rowCount: number): number {
  return rowCount >= 2 ? 88 : 44;
}
