import { nanoid } from "nanoid";
import type { MyTrees, TreeMeta } from "../types/tree";
import { getPool, transaction } from "../repositories/db";
import { TreeRepository } from "../repositories/TreeRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { UserRepository } from "../repositories/UserRepository";
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

export async function listMyTrees(uid: string): Promise<MyTrees> {
  const db = getPool();
  const owned = await TreeRepository.listOwned(db, uid);
  const member = await TreeRepository.listMemberOnly(db, uid);
  return { owned, member };
}
