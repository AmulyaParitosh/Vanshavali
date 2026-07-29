import { nanoid } from "nanoid";
import type { MyTrees, TreeMeta, TreeSettingsPatch, TreeCardSummary } from "../types/tree";
import { getPool, transaction } from "../repositories/db";
import { TreeRepository } from "../repositories/TreeRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { UserRepository } from "../repositories/UserRepository";
import { HttpError } from "../lib/api";
import { requireOwner } from "./authz";

/**
 * Tree lifecycle. createTree does the whole thing (ensure user row, insert
 * tree, insert owner membership) in one transaction — so unlike the old path
 * there's no window where a tree exists without its owner membership.
 */

export async function createTree(
  uid: string,
  email: string | null,
  name: string
): Promise<TreeMeta> {
  const id = `tree_${nanoid(10)}`;
  return transaction(async (tx) => {
    await UserRepository.ensure(tx, uid, email);
    const tree = await TreeRepository.insert(tx, id, name, uid, "private");
    await MembershipRepository.insertOwner(tx, id, uid);
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
