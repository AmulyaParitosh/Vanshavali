import type { Family } from "../types/family";

/**
 * Returns the partner IDs in a family, merging the canonical `husband`/`wife`
 * fields with the deprecated `partners` fallback. Order: husband, wife, then any
 * extras from `partners`. Always returns a flat string[], skipping undefined.
 *
 * The `partners` legacy field is being removed in the multi-tenancy migration;
 * once gone this collapses to `[husband, wife].filter(Boolean)`.
 */
export function familyPartners(family: Family): string[] {
  const legacy = family.partners ?? [];
  return [family.husband, family.wife, ...legacy].filter((id): id is string => !!id);
}

/**
 * Returns the husband/wife pair, preferring the canonical fields and falling back
 * to scanning `partners` by `sex`. Returns `{ husbandId, wifeId }` with either
 * value possibly undefined (single-parent families, or legacy data where sex
 * couldn't be inferred).
 */
export function inferHusbandWife(
  family: Family,
  personSex: (id: string) => "M" | "F" | undefined
): { husbandId: string | undefined; wifeId: string | undefined } {
  let husbandId = family.husband;
  let wifeId = family.wife;

  if (husbandId && wifeId) return { husbandId, wifeId };

  const legacy = family.partners ?? [];
  if (!husbandId) husbandId = legacy.find((id) => personSex(id) === "M");
  if (!wifeId) wifeId = legacy.find((id) => personSex(id) === "F");

  return { husbandId, wifeId };
}
