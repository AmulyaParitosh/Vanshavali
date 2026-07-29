import type { TreeMembership, TreeRole } from "../types/tree";
import { isOwner } from "../lib/access";
import { getPool, transaction } from "../repositories/db";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { TreeRepository } from "../repositories/TreeRepository";
import { requireView, requireOwner } from "./authz";
import { HttpError } from "../lib/api";

/**
 * Per-tree membership operations.
 *
 * - getMembership is self-scoped: a signed-in user reads their own row (or null
 *   if they're not a member) — no role gate, so the UI can tell "not a member".
 * - Listing members needs viewer+; mutations need owner.
 * - The owner's membership is protected: it can't be re-roled or removed, and
 *   role changes can't mint a second owner.
 */

export function getMembership(treeId: string, uid: string): Promise<TreeMembership | null> {
  return MembershipRepository.find(getPool(), treeId, uid);
}

export async function listMembers(treeId: string, uid: string): Promise<TreeMembership[]> {
  await requireView(treeId, uid);
  return MembershipRepository.listByTree(getPool(), treeId);
}

export async function updateMemberRole(
  treeId: string,
  actorUid: string,
  targetUid: string,
  role: TreeRole
): Promise<void> {
  await requireOwner(treeId, actorUid);
  if (role === "owner") {
    throw new HttpError("Can't assign the owner role via a role change.", 400);
  }
  const target = await MembershipRepository.find(getPool(), treeId, targetUid);
  if (!target) throw new HttpError("Member not found.", 404);
  if (isOwner(target.role)) throw new HttpError("Can't change the tree owner's role.", 400);
  await MembershipRepository.updateRole(getPool(), treeId, targetUid, role);
}

export async function removeMember(
  treeId: string,
  actorUid: string,
  targetUid: string
): Promise<void> {
  await requireOwner(treeId, actorUid);
  const target = await MembershipRepository.find(getPool(), treeId, targetUid);
  if (!target) return; // already gone — treat as idempotent
  if (isOwner(target.role)) throw new HttpError("Can't remove the tree owner.", 400);
  await MembershipRepository.remove(getPool(), treeId, targetUid);
}

/**
 * Hand over the keeper role (Spec 11 a9). The current keeper picks a member of
 * the tree (edge e4: only real members — everyone in tree_members has an
 * account); in ONE transaction the tree's owner_uid moves to them, they become
 * `owner`, and the outgoing keeper steps down to `editor` (a writer). This is
 * the only way to stop being keeper, so a tree is never left without one.
 */
export async function handOverKeeper(
  treeId: string,
  actorUid: string,
  targetUid: string
): Promise<void> {
  await requireOwner(treeId, actorUid);
  if (targetUid === actorUid) throw new HttpError("You are already the keeper.", 400);
  const target = await MembershipRepository.find(getPool(), treeId, targetUid);
  if (!target) throw new HttpError("Choose a member of this tree to hand over to.", 404);

  await transaction(async (tx) => {
    await TreeRepository.setOwner(tx, treeId, targetUid);
    await MembershipRepository.updateRole(tx, treeId, targetUid, "owner");
    await MembershipRepository.updateRole(tx, treeId, actorUid, "editor");
  });
}

/**
 * Self-leave (Spec 12 a6): the caller removes their OWN membership. Self-scoped —
 * `uid` is the caller's token — so no owner gate. The person record is untouched
 * (only the tree_members row goes), so their record stays in the tree. A keeper
 * (owner) can't leave and orphan the tree — they must hand the tree over first.
 */
export async function leaveTree(treeId: string, uid: string): Promise<void> {
  const membership = await MembershipRepository.find(getPool(), treeId, uid);
  if (!membership) return; // not a member — idempotent
  if (isOwner(membership.role)) {
    throw new HttpError("A tree needs a keeper. Make someone else a keeper before you leave.", 400);
  }
  await MembershipRepository.remove(getPool(), treeId, uid);
}
