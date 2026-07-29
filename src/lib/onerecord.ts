import type { Person } from "../types/person";

/**
 * The one-record rule (Spec 00 §06), Option B (see QUESTIONS Q9): the repo keeps
 * per-tree person rows, and this module implements the rule's *behaviour* at the
 * seams — a person's own facts travel across every tree they appear in, while the
 * fields a tree owns stay put.
 *
 * Own facts (travel): name, sex, life events, custom fields, photograph.
 * Tree-owned (stay): the row `id` (so household / sibling / event references keep
 * pointing at the same row — one row, nothing re-pointed), the per-tree `userId`
 * link, and `root` (exactly one root per tree).
 */

export interface OwnFacts {
  name: Person["name"];
  sex: Person["sex"];
  events?: Person["events"];
  custom_fields?: Person["custom_fields"];
  image_url?: string;
  image_storage_path?: string;
}

/** The facts that belong to the person and travel across trees. */
export function ownFactsOf(p: Person): OwnFacts {
  return {
    name: p.name,
    sex: p.sex,
    ...(p.events !== undefined ? { events: p.events } : {}),
    ...(p.custom_fields !== undefined ? { custom_fields: p.custom_fields } : {}),
    ...(p.image_url !== undefined ? { image_url: p.image_url } : {}),
    ...(p.image_storage_path !== undefined ? { image_storage_path: p.image_storage_path } : {}),
  };
}

/**
 * Overlay a person's own facts onto a linked row in some tree, keeping that row's
 * tree-owned fields (id, userId, root). Own facts are authoritative — a fact
 * cleared on the canonical record clears here too. Powers /user propagation
 * (integration §7): edit your record once, it changes in every tree.
 */
export function applyOwnFacts(target: Person, facts: OwnFacts): Person {
  return {
    id: target.id,
    ...(target.userId !== undefined ? { userId: target.userId } : {}),
    ...(target.root !== undefined ? { root: target.root } : {}),
    name: facts.name,
    sex: facts.sex,
    ...(facts.events !== undefined ? { events: facts.events } : {}),
    ...(facts.custom_fields !== undefined ? { custom_fields: facts.custom_fields } : {}),
    ...(facts.image_url !== undefined ? { image_url: facts.image_url } : {}),
    ...(facts.image_storage_path !== undefined
      ? { image_storage_path: facts.image_storage_path }
      : {}),
  };
}

/**
 * Claim + merge a tree's placeholder into the joining user's identity
 * (Spec 00 §06 c3/c4; integration §6). The placeholder row is KEPT — its `id` and
 * `root` are preserved, so every household, sibling and event reference to it
 * stays intact and no second row is ever created — while the user's own facts
 * overlay it and the per-tree `userId` link is set. Callers UPDATE the placeholder
 * row with this result; they never INSERT.
 */
export function mergePlaceholder(placeholder: Person, canonical: OwnFacts, uid: string): Person {
  return applyOwnFacts({ ...placeholder, userId: uid }, canonical);
}
