import { nanoid } from "nanoid";
import type { MyTrees, TreeMeta, TreeSettingsPatch, TreeCardSummary } from "../types/tree";
import type { Person } from "../types/person";
import { getPool, transaction } from "../repositories/db";
import { TreeRepository } from "../repositories/TreeRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { PersonRepository } from "../repositories/PersonRepository";
import { UserRepository } from "../repositories/UserRepository";
import { ownFactsOf, applyOwnFacts } from "../lib/onerecord";
import { HttpError } from "../lib/api";
import { requireOwner } from "./authz";

/**
 * Tree lifecycle. createTree does the whole thing in ONE transaction — ensure
 * the user row, insert the tree (+ optional ancestral place), insert the owner
 * membership, and seed the keeper's own root person (Spec 03 flow f4) — so there
 * is never a window where a tree exists without its keeper or its first node.
 *
 * One-record rule (a3 / e1): if the user already has a person in another tree,
 * the new tree's root REUSES their own facts (name, sex, dates, photo) rather
 * than minting a stranger; a brand-new user is seeded from their account name.
 * Every tree still gets its own row (a fresh global id) — the facts travel, the
 * row does not (see lib/onerecord).
 */

export async function createTree(
  uid: string,
  email: string | null,
  name: string,
  place?: string
): Promise<TreeMeta> {
  const id = `tree_${nanoid(10)}`;
  return transaction(async (tx) => {
    await UserRepository.ensure(tx, uid, email);
    const tree = await TreeRepository.insert(tx, id, name, uid, "private", place ?? null);
    await MembershipRepository.insertOwner(tx, id, uid);

    const personId = `p_${nanoid(10)}`;
    const existing = await PersonRepository.listByUser(tx, uid);
    let root: Person;
    if (existing[0]) {
      // Reuse the user's own facts into a fresh row for this tree (a3).
      const base: Person = {
        id: personId,
        userId: uid,
        root: true,
        name: existing[0].person.name,
        sex: existing[0].person.sex,
      };
      root = applyOwnFacts(base, ownFactsOf(existing[0].person));
    } else {
      const profile = await UserRepository.find(tx, uid);
      root = {
        id: personId,
        userId: uid,
        root: true,
        name: { official_name: profile?.name || email?.split("@")[0] || "Me" },
        sex: "M",
        events: [],
        custom_fields: {},
      };
    }
    await PersonRepository.upsert(tx, id, root);
    await MembershipRepository.setPersonId(tx, id, uid, personId);
    return tree;
  });
}

export async function deleteTree(treeId: string, uid: string): Promise<void> {
  await requireOwner(treeId, uid);
  await TreeRepository.delete(getPool(), treeId);
}

/**
 * Keeper-only settings edit (Spec 11). Every write on the settings page is
 * server-enforced keeper-only; a name, if present, must be non-empty after trim
 * (no uniqueness constraint — two families may share a name). Returns the fresh meta.
 */
export async function updateTreeSettings(
  treeId: string,
  uid: string,
  patch: TreeSettingsPatch
): Promise<TreeMeta> {
  await requireOwner(treeId, uid);

  const clean: TreeSettingsPatch = { ...patch };
  if (clean.name !== undefined) {
    const name = clean.name.trim();
    if (!name) throw new HttpError("A tree needs a name.", 400);
    clean.name = name;
  }
  if (clean.place !== undefined) clean.place = clean.place.trim();

  const updated = await TreeRepository.patch(getPool(), treeId, clean);
  if (!updated) throw new HttpError("Tree not found", 404);
  return updated;
}

export async function listMyTrees(uid: string): Promise<MyTrees> {
  const db = getPool();
  const owned = await TreeRepository.listOwned(db, uid);
  const member = await TreeRepository.listMemberOnly(db, uid);
  return { owned, member };
}

/**
 * The picker/switcher cards (Spec 03) — every tree the caller belongs to, with
 * their role and a small summary. Self-scoped: the uid is the caller's token, so
 * a user only ever sees their own memberships (perm p1).
 */
export async function listMyTreeCards(uid: string): Promise<TreeCardSummary[]> {
  return TreeRepository.listSummariesByUser(getPool(), uid);
}
