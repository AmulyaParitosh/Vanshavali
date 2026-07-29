import type { OwnFacts } from "../lib/onerecord";
import { applyOwnFacts } from "../lib/onerecord";
import { transaction } from "../repositories/db";
import { PersonRepository } from "../repositories/PersonRepository";

/**
 * The one-record propagation (Spec 12 a5 / integration §7). A user edits their own
 * facts once on the Account record; this writes them to every person row linked to
 * that user, in every tree, atomically — so the change shows in each tree without a
 * reload. Self-scoped by construction: `uid` comes from the caller's bearer token,
 * so a user can only ever rewrite their OWN linked rows (a4 holds — no one edits
 * another user's record through here). Own facts are authoritative: a cleared fact
 * clears in every tree. Tree-owned fields (id, userId link, root) are preserved per
 * row by applyOwnFacts.
 *
 * Returns the number of trees the record was written to.
 */
export async function updateOwnRecord(uid: string, facts: OwnFacts): Promise<{ trees: number }> {
  return transaction(async (tx) => {
    const linked = await PersonRepository.listByUser(tx, uid);
    // A single pg client runs statements sequentially — no Promise.all on `tx`.
    for (const { treeId, person } of linked) {
      await PersonRepository.upsert(tx, treeId, applyOwnFacts(person, facts));
    }
    return { trees: linked.length };
  });
}
