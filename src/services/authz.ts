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

export function requireOwner(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, isOwner, "Only the tree owner can do that.");
}

export function requireInvite(treeId: string, uid: string): Promise<TreeRole> {
  return requireRole(treeId, uid, canInvite, "You don't have permission to invite members.");
}
