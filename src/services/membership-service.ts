import type { TreeMembership, TreeRole } from "../types/tree";
import { isOwner } from "../lib/access";
import { getPool } from "../repositories/db";
import { MembershipRepository } from "../repositories/MembershipRepository";
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
