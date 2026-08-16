import type { Person } from "../types/person";
import type { GraphManager } from "./graph/GraphManager";
import type { PathStep } from "../types/graph";

/**
 * Spec 07 — the record panel's "relation to the viewer" and its prose lineage,
 * as pure logic. Relation naming walks the shortest kinship path (GraphManager
 * edges label each step relative to the previous node: Parent/Child/Spouse/
 * Sibling); the lineage builder gathers the parents, unions and children a
 * sentence is read from. Gender comes from `person.sex` — never hard-coded copy.
 */

type Rel = "Parent" | "Child" | "Spouse" | "Sibling";

function term(relation: string, sex: Person["sex"] | undefined): string | null {
  const m = sex === "M";
  switch (relation as Rel) {
    case "Parent":
      return m ? "father" : "mother";
    case "Child":
      return m ? "son" : "daughter";
    case "Spouse":
      return m ? "husband" : "wife";
    case "Sibling":
      return m ? "brother" : "sister";
    default:
      return null;
  }
}

/**
 * The viewer's relation to `personId` as a phrase ("father", "father's brother",
 * "first cousin", "grandmother") — or null if unrelated or self. Common
 * two/three-step kinships collapse to a single word; anything else reads as a
 * possessive chain, which is exactly how the spec renders "father's brother's
 * wife". The caller renders self as "this is you".
 */
export function describeRelation(
  viewerId: string,
  personId: string,
  gm: GraphManager
): string | null {
  if (viewerId === personId) return null;
  return nameFromPath(gm.findPath(viewerId, personId), gm);
}

/**
 * Every person's relation to the viewer, from ONE walk of the graph.
 *
 * The naming rules are exactly `describeRelation`'s — they share `nameFromPath`
 * — but the traversal is done once for the whole tree rather than once per
 * person. That is the difference between a Members list that re-renders in
 * milliseconds and one that takes a second and a half at two thousand people.
 * The viewer maps to "you"; anyone unrelated maps to null.
 */
export function relationsFrom(viewerId: string, gm: GraphManager): Map<string, string | null> {
  const out = new Map<string, string | null>();
  out.set(viewerId, "you");
  for (const [personId, path] of gm.pathsFrom(viewerId)) {
    out.set(personId, nameFromPath(path, gm));
  }
  return out;
}

/**
 * A kinship path read as a phrase. Common two- and three-step kinships collapse
 * to a single word; anything else reads as a possessive chain, which is exactly
 * how the spec renders "father's brother's wife".
 */
function nameFromPath(path: PathStep[] | null, gm: GraphManager): string | null {
  if (!path || path.length < 2) return null;
  const steps = path.slice(1); // drop the Start node
  const rels = steps.map((s) => s.relation);
  const sexes = steps.map((s) => gm.getPerson(s.personId)?.sex);
  const last = sexes[sexes.length - 1];

  if (rels.length === 2 && rels[0] === "Parent" && rels[1] === "Parent")
    return last === "M" ? "grandfather" : "grandmother";
  if (rels.length === 2 && rels[0] === "Child" && rels[1] === "Child")
    return last === "M" ? "grandson" : "granddaughter";
  if (rels.length === 3 && rels[0] === "Parent" && rels[1] === "Sibling" && rels[2] === "Child")
    return "first cousin";

  const terms = steps.map((s, i) => term(rels[i]!, sexes[i]));
  if (terms.some((t) => t === null)) return null;
  return terms.join("'s "); // "father" + "brother" → "father's brother"
}

export interface Lineage {
  self: Person;
  /** The household `self` was born into. */
  childOf?: {
    father?: Person;
    mother?: Person;
    /** 0-based birth position among the siblings, and the sibling count. */
    ordinal: number;
    total: number;
  };
  /** Each household `self` is a partner in: the spouse (if any) and the children. */
  unions: Array<{ spouse?: Person; children: Person[] }>;
}

/**
 * One generation on the descent line — a household, the same atom the canvas
 * draws: the father and mother of that step, or whichever of the two is
 * recorded. Rendered as one card, so which people belong to which generation is
 * a fact of the layout rather than something the copy has to explain.
 */
export interface DescentGeneration {
  /** Steps back from the opened record: 0 = them, 1 = their parents, 2 = grandparents… */
  step: number;
  /** Father first, mother second — the order the card stacks them in. */
  people: Person[];
  /** The one the line continues up through; the household's spine colour follows them. */
  carriesId: string;
  /** "Parents" · "Grandparents" · "3× great-grandparents" · "Great-grandmother". */
  label: string;
}

/** Deep enough for any recorded vanshavali; a guard against malformed data. */
const MAX_DESCENT = 24;

/**
 * "great-", "great-great-", then counted ("3× great-") — so a long line stays
 * readable instead of turning into a wall of "great-".
 */
function greatPrefix(step: number): string {
  if (step <= 2) return "";
  if (step === 3) return "great-";
  if (step === 4) return "great-great-";
  return `${step - 2}× great-`;
}

/** What to call an ancestor `step` generations back, by their sex. */
export function ancestorTerm(step: number, sex: Person["sex"] | undefined): string {
  if (step <= 0) return "";
  const base = sex === "M" ? "father" : "mother";
  if (step === 1) return base;
  return `${greatPrefix(step)}grand${base}`;
}

/**
 * What to call a whole generation. A couple is named as a pair ("Grandparents")
 * — the card's two rows already say which is the father and which the mother.
 * When only one of them is recorded the label names them exactly, since there
 * is no second row to read the position against.
 */
export function generationLabel(step: number, people: Person[]): string {
  if (step <= 0) return "This record";
  const one = people.length === 1 ? people[0] : undefined;
  const term = one
    ? ancestorTerm(step, one.sex)
    : step === 1
      ? "parents"
      : `${greatPrefix(step)}grandparents`;
  return term.charAt(0).toUpperCase() + term.slice(1);
}

/**
 * The line of descent behind a person (Spec 07): them, then the father and
 * mother of each generation going back, one household per step.
 *
 * Which parent carries the line up is not a guess about gender — it's the one
 * **born into this line** (`bornInLine`, the same set that paints the red ring).
 * Only when that's ambiguous — both parents born in, or neither, as happens when
 * a second family's ancestry is recorded — does it fall back to the father, the
 * vanshavali convention. The people themselves stay in husband-then-wife order
 * whoever carries the line, so the top row of a card is always the father.
 */
export function buildDescent(
  personId: string,
  gm: GraphManager,
  bornInLine: ReadonlySet<string>
): DescentGeneration[] {
  const self = gm.getPerson(personId);
  if (!self) return [];

  const families = gm.getAllFamilies();
  const generations: DescentGeneration[] = [
    { step: 0, people: [self], carriesId: self.id, label: generationLabel(0, [self]) },
  ];
  const seen = new Set<string>([personId]);
  let child = personId;

  for (let step = 1; step <= MAX_DESCENT; step += 1) {
    const bornInto = families.find((f) => f.children.includes(child));
    if (!bornInto) break;
    const father = bornInto.husband ? gm.getPerson(bornInto.husband) : undefined;
    const mother = bornInto.wife ? gm.getPerson(bornInto.wife) : undefined;
    const people = [father, mother].filter((p): p is Person => !!p);
    if (people.length === 0) break;

    const inLine = people.filter((p) => bornInLine.has(p.id));
    const carrier = (inLine.length === 1 ? inLine[0] : (father ?? mother))!;
    // A person recorded as their own ancestor would loop for ever; stop instead.
    if (seen.has(carrier.id)) break;

    generations.push({ step, people, carriesId: carrier.id, label: generationLabel(step, people) });
    seen.add(carrier.id);
    child = carrier.id;
  }

  return generations;
}

const ORDINALS = ["Eldest", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];

/** "Eldest" / "Second" / … for a 0-based birth position (falls back to "A"). */
export function ordinalWord(index: number): string {
  return ORDINALS[index] ?? "A";
}

/** The parents, unions and children the prose lineage is read from (Spec 07). */
export function buildLineage(personId: string, gm: GraphManager): Lineage | null {
  const self = gm.getPerson(personId);
  if (!self) return null;
  const families = gm.getAllFamilies();
  const person = (id: string | undefined): Person | undefined =>
    id ? gm.getPerson(id) : undefined;

  const lineage: Lineage = { self, unions: [] };

  const bornInto = families.find((f) => f.children.includes(personId));
  if (bornInto) {
    const father = person(bornInto.husband);
    const mother = person(bornInto.wife);
    lineage.childOf = {
      ...(father ? { father } : {}),
      ...(mother ? { mother } : {}),
      ordinal: bornInto.children.indexOf(personId),
      total: bornInto.children.length,
    };
  }

  for (const f of families) {
    if (f.husband === personId || f.wife === personId) {
      const spouse = person(f.husband === personId ? f.wife : f.husband);
      lineage.unions.push({
        ...(spouse ? { spouse } : {}),
        children: f.children.map(person).filter((p): p is Person => !!p),
      });
    }
  }

  return lineage;
}
