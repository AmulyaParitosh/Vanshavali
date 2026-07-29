import type { TreeRole } from "../types/tree";
import { canViewTree, canEdit, isOwner, canInvite } from "../lib/access";
import { HttpError } from "../lib/api";
import { getPool } from "../repositories/db";
import { MembershipRepository } from "../repositories/MembershipRepository";

/**
 * Server-side authorization — the primary access control now that the pg
 * connection bypasses RLS. Each guard resolves the caller's role in the tree
 * and throws HttpError(403) unless the matching predicate (from lib/access,
 * shared with the client) allows it. Returns the confirmed role so callers can
 * branch on it without a second lookup.
 */

async function requireRole(
  treeId: string,
  uid: string,
  allowed: (role: string | null | undefined) => boolean,
  message: string
): Promise<TreeRole> {
  const membership = await MembershipRepository.find(getPool(), treeId, uid);
  const role = membership?.role;
  if (!allowed(role)) throw new HttpError(message, 403);
  return role as TreeRole;
}

export function requireView(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, canViewTree, "You don't have access to this tree.");
}

export function requireEdit(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, canEdit, "You don't have permission to edit this tree.");
}

/**
 * Edit access for a single record, with the self-edit exception (Spec 00 §04,
 * matrix row 5): an editor/keeper may edit anyone, and a reader may edit the one
 * record linked to their own account. Any lower access is refused. `targetUserId`
 * is the `user_id` of the person being edited.
 */
export async function requireEditOrSelf(
  treeId: string,
  uid: string,
  targetUserId: string | null | undefined
): Promise<TreeRole> {
  const membership = await MembershipRepository.find(getPool(), treeId, uid);
  const role = membership?.role;
  const allowed = canEdit(role) || (canViewTree(role) && !!targetUserId && targetUserId === uid);
  if (!allowed) throw new HttpError("You don't have permission to edit this record.", 403);
  return role as TreeRole;
}

export function requireOwner(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, isOwner, "Only the tree owner can do that.");
}

export function requireInvite(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, canInvite, "You don't have permission to invite members.");
}
