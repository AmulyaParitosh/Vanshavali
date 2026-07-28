import type { Family } from "../types/family";

/**
 * Returns the partner IDs in a family — husband then wife, skipping whichever
 * is absent (single-parent families). Kept as a helper (rather than inlining
 * `[husband, wife].filter(...)` at call sites) so partner semantics stay in
 * one place.
 */
export function familyPartners(family: Family): string[] {
  return [family.husband, family.wife].filter((id): id is string => !!id);
}

/**
 * Returns the husband/wife pair as `{ husbandId, wifeId }`, either possibly
 * undefined (single-parent families).
 */
export function inferHusbandWife(family: Family): {
  husbandId: string | undefined;
  wifeId: string | undefined;
} {
  return { husbandId: family.husband, wifeId: family.wife };
}
