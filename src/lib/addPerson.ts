import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { TreeData } from "../services/types";

/**
 * Add-person graph logic (Spec 06 add panel) — pure so the family wiring, the
 * riskiest write in the product, is verified without a browser. "Relationship
 * first": a person is placed into the tree by how they relate to someone already
 * in it. Connecting an EXISTING person reuses their record (a7 — their facts come
 * along); adding a new one appends a fresh Person. Either way the person is then
 * wired into a household per the chosen relationship.
 */

export type AddRelationship = "child" | "spouse" | "sibling" | "parent" | "none";

/** The existing person a submitted name would duplicate (official name or alias), else null (a6). */
export function findDuplicate(people: Person[], name: string): Person | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return (
    people.find((p) =>
      [p.name.official_name, ...(p.name.aliases ?? [])].some((n) => n.trim().toLowerCase() === q)
    ) ?? null
  );
}

/** A stable, readable id from a name, made unique against the ids already in use. */
export function personIdFromName(name: string, existing: ReadonlySet<string>): string {
  const base =
    "p_" +
    (name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "person");
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/** A family id not colliding with those in use. */
export function nextFamilyId(families: Family[]): string {
  const used = new Set(families.map((f) => f.id));
  let i = families.length + 1;
  while (used.has(`f_${i}`)) i++;
  return `f_${i}`;
}

const slot = (sex: Person["sex"]): "husband" | "wife" => (sex === "M" ? "husband" : "wife");

/** A one/two-parent family, placing each partner in the husband/wife slot by sex. */
function makeFamily(
  id: string,
  partners: { id: string; sex: Person["sex"] }[],
  children: string[]
): Family {
  const f: Family = { id, children };
  for (const p of partners) {
    if (p.sex === "M") f.husband = p.id;
    else f.wife = p.id;
  }
  return f;
}

/**
 * Place `personId` (sex `sex`) into the households relative to `anchorId`,
 * returning the updated families. Joins an existing household where one fits
 * (an empty spouse/parent slot, or the anchor's own household) rather than
 * spawning duplicates; otherwise creates the one new household the relationship
 * implies. "none" leaves the graph untouched (an unconnected person).
 */
export function wireRelationship(
  people: Person[],
  families: Family[],
  personId: string,
  sex: Person["sex"],
  rel: AddRelationship,
  anchorId: string | null,
  makeFamilyId: () => string
): Family[] {
  if (rel === "none" || !anchorId) return families;
  const anchorSex = people.find((p) => p.id === anchorId)?.sex ?? "M";
  const newSlot = slot(sex);

  if (rel === "child") {
    const fam = families.find((f) => f.husband === anchorId || f.wife === anchorId);
    if (fam) {
      return families.map((f) =>
        f.id === fam.id ? { ...f, children: [...f.children, personId] } : f
      );
    }
    return [
      ...families,
      makeFamily(makeFamilyId(), [{ id: anchorId, sex: anchorSex }], [personId]),
    ];
  }

  if (rel === "sibling") {
    const fam = families.find((f) => f.children.includes(anchorId));
    if (fam) {
      return families.map((f) =>
        f.id === fam.id ? { ...f, children: [...f.children, personId] } : f
      );
    }
    // No known parents — record them together as siblings, parents unfilled.
    return [...families, makeFamily(makeFamilyId(), [], [anchorId, personId])];
  }

  if (rel === "spouse") {
    // Join the anchor's household if its matching partner slot is free.
    const fam = families.find(
      (f) => (f.husband === anchorId || f.wife === anchorId) && !f[newSlot]
    );
    if (fam) {
      return families.map((f) => (f.id === fam.id ? { ...f, [newSlot]: personId } : f));
    }
    return [
      ...families,
      makeFamily(
        makeFamilyId(),
        [
          { id: anchorId, sex: anchorSex },
          { id: personId, sex },
        ],
        []
      ),
    ];
  }

  if (rel === "parent") {
    // Fill an empty parent slot of the anchor's own household, else create one.
    const fam = families.find((f) => f.children.includes(anchorId) && !f[newSlot]);
    if (fam) {
      return families.map((f) => (f.id === fam.id ? { ...f, [newSlot]: personId } : f));
    }
    return [...families, makeFamily(makeFamilyId(), [{ id: personId, sex }], [anchorId])];
  }

  return families;
}

/**
 * The tree data after adding/connecting a person and wiring the relationship. A
 * connect (person already present) leaves `people` alone so nothing they own is
 * rewritten (a7); a new person is appended. Callers persist the result whole.
 */
export function placePerson(
  data: TreeData,
  person: Person,
  rel: AddRelationship,
  anchorId: string | null
): TreeData {
  const exists = data.people.some((p) => p.id === person.id);
  const people = exists ? data.people : [...data.people, person];
  const families = wireRelationship(
    people,
    data.families,
    person.id,
    person.sex,
    rel,
    anchorId,
    () => nextFamilyId(data.families)
  );
  return { people, families };
}
