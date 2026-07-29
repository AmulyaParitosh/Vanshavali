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
 * Edit access for a single record (Spec 00 §04 row 5 + Spec 12 a4). `targetUserId`
 * is the `user_id` of the person being edited. Two rules combine:
 *  - Anyone who can view the tree may edit the ONE record linked to their own
 *    account (the self-edit exception).
 *  - A writer/keeper may edit anyone who is NOT linked to another account. But a
 *    person linked to a *different* user is their OWN record — even a keeper may
 *    read it but never write it (Spec 12 a4); only its owner edits it, on Account.
 */
export async function requireEditOrSelf(
  treeId: string,
  uid: string,
  targetUserId: string | null | undefined
): Promise<TreeRole> {
  const membership = await MembershipRepository.find(getPool(), treeId, uid);
  const role = membership?.role;
  const isSelf = !!targetUserId && targetUserId === uid;
  const linkedToOther = !!targetUserId && targetUserId !== uid;
  const allowed = (canViewTree(role) && isSelf) || (canEdit(role) && !linkedToOther);
  if (!allowed) throw new HttpError("You don't have permission to edit this record.", 403);
  return role as TreeRole;
}

export function requireOwner(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, isOwner, "Only the tree owner can do that.");
}

export function requireInvite(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, canInvite, "You don't have permission to invite members.");
}
