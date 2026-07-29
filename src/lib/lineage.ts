import type { Person } from "../types/person";
import type { GraphManager } from "./graph/GraphManager";

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
  const path = gm.findPath(viewerId, personId);
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
