import { nanoid } from "nanoid";
import type { TreeInvite, InvitableTreeRole } from "../types/tree";
import { getPool, transaction } from "../repositories/db";
import { InviteRepository } from "../repositories/InviteRepository";
import { TreeRepository } from "../repositories/TreeRepository";
import { UserRepository } from "../repositories/UserRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { requireOwner } from "./authz";
import { HttpError } from "../lib/api";
import { sendInviteEmail } from "../lib/resend";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Invitation lifecycle. Create + email are one server step now (the old flow
 * split them across a client insert and an /api/invite/send call). Email
 * failures are non-fatal: the invite row persists and the caller is told, so
 * the owner can re-send later.
 */

export async function createInvite(
  treeId: string,
  actorUid: string,
  email: string,
  role: InvitableTreeRole,
  origin: string,
  personId?: string | null
): Promise<{ invite: TreeInvite; emailError?: string }> {
  await requireOwner(treeId, actorUid);
  const db = getPool();
  const invite = await InviteRepository.insert(db, {
    id: `inv_${nanoid(12)}`,
    treeId,
    email: email.toLowerCase(),
    ...(personId ? { personId } : {}),
    role,
    invitedBy: actorUid,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });

  try {
    const tree = await TreeRepository.findMeta(db, treeId);
    const inviter = await UserRepository.find(db, actorUid);
    await sendInviteEmail({
      to: invite.email,
      treeName: tree?.name ?? "a family tree",
      inviterName: inviter?.name || inviter?.email || "A family member",
      role,
      acceptUrl: `${origin}/invite/${invite.id}`,
    });
    return { invite };
  } catch (error) {
    return { invite, emailError: error instanceof Error ? error.message : "Email send failed" };
  }
}

export async function listInvites(treeId: string, actorUid: string): Promise<TreeInvite[]> {
  await requireOwner(treeId, actorUid);
  return InviteRepository.listByTree(getPool(), treeId);
}

export async function revokeInvite(
  treeId: string,
  actorUid: string,
  inviteId: string
): Promise<void> {
  await requireOwner(treeId, actorUid);
  const invite = await InviteRepository.find(getPool(), inviteId);
  if (!invite || invite.treeId !== treeId) throw new HttpError("Invite not found.", 404);
  await InviteRepository.updateStatus(getPool(), inviteId, "revoked");
}

/**
 * Accept a pending invite. Validations that surface an error (already
 * accepted/expired/wrong-email) run outside a transaction so the expired-marking
 * still commits, exactly like the old service-role route; the membership insert
 * + accepted-marking are atomic.
 */
export async function acceptInvite(
  inviteId: string,
  callerUid: string,
  callerEmail: string | null
): Promise<{ treeId: string; role: string }> {
  if (!callerEmail) {
    throw new HttpError("Your account doesn't have a verified email yet.", 400);
  }
  const db = getPool();

  const invite = await InviteRepository.find(db, inviteId);
  if (!invite) throw new HttpError("Invite not found", 404);
  if (invite.status !== "pending") throw new HttpError(`Invite is ${invite.status}`, 409);
  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    await InviteRepository.updateStatus(db, inviteId, "expired");
    throw new HttpError("Invite expired", 410);
  }
  if (invite.email.toLowerCase() !== callerEmail.toLowerCase()) {
    throw new HttpError("This invite was sent to a different email address.", 403);
  }

  // Idempotent: if they're already a member, just mark the invite accepted.
  const existing = await MembershipRepository.find(db, invite.treeId, callerUid);
  if (existing) {
    await InviteRepository.updateStatus(db, inviteId, "accepted");
    return { treeId: existing.treeId, role: existing.role };
  }

  await transaction(async (tx) => {
    await UserRepository.ensure(tx, callerUid, callerEmail);
    await MembershipRepository.insert(tx, invite.treeId, callerUid, invite.role);
    await InviteRepository.updateStatus(tx, inviteId, "accepted");
  });
  return { treeId: invite.treeId, role: invite.role };
}
