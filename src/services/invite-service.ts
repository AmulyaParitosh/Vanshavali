import { nanoid } from "nanoid";
import type { TreeInvite, InvitableTreeRole, InviteDetail } from "../types/tree";
import type { Person } from "../types/person";
import { getPool, transaction } from "../repositories/db";
import { InviteRepository } from "../repositories/InviteRepository";
import { TreeRepository } from "../repositories/TreeRepository";
import { UserRepository } from "../repositories/UserRepository";
import { PersonRepository } from "../repositories/PersonRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { ownFactsOf, applyOwnFacts, mergePlaceholder } from "../lib/onerecord";
import { requireOwner } from "./authz";
import { HttpError } from "../lib/api";
import { sendInviteEmail } from "../lib/resend";

/** How a collision is resolved on accept (Spec 04 step 2). */
export type AcceptMode = "become_one" | "separate";
export interface AcceptResult {
  status: "joined" | "needs_decision";
  treeId: string;
  role: string;
}

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

/**
 * Public invite detail (Spec 04 a1) — legible from the token alone, before any
 * sign-in. Exposes the tree summary + the offered record + the role, and nothing
 * else. An expired-by-TTL pending invite is marked expired here too. Never throws
 * a 404: a missing/expired/revoked token resolves to a status the card explains.
 */
export async function getInviteDetail(inviteId: string): Promise<InviteDetail> {
  const db = getPool();
  const invite = await InviteRepository.find(db, inviteId);
  if (!invite) return { status: "not_found", inviteId };

  let raw = invite.status;
  if (raw === "pending" && invite.expiresAt && invite.expiresAt < Date.now()) {
    await InviteRepository.updateStatus(db, inviteId, "expired");
    raw = "expired";
  }
  const status: InviteDetail["status"] =
    raw === "pending"
      ? "valid"
      : raw === "accepted"
        ? "accepted"
        : raw === "revoked"
          ? "revoked"
          : "expired";

  const tree = await TreeRepository.findMeta(db, invite.treeId);
  const inviter = await UserRepository.find(db, invite.invitedBy);
  const people = await PersonRepository.listByTree(db, invite.treeId);

  let offered: InviteDetail["offered"];
  if (invite.personId) {
    const p = people.find((pp) => pp.id === invite.personId);
    if (p) {
      const birth = (p.events ?? []).find((e) => /birth|born/i.test(e.type));
      offered = {
        name: p.name.official_name,
        ...(birth?.date?.match(/\d{4}/)?.[0] ? { birthYear: birth.date.match(/\d{4}/)![0] } : {}),
        ...(birth?.place ? { birthPlace: birth.place } : {}),
      };
    }
  }

  return {
    status,
    inviteId,
    email: invite.email,
    role: invite.role,
    inviterName: inviter?.name || inviter?.email || "A family member",
    ...(tree
      ? {
          tree: {
            id: tree.id,
            name: tree.name,
            ...(tree.place ? { place: tree.place } : {}),
            personCount: people.length,
          },
        }
      : {}),
    ...(offered ? { offered } : {}),
  };
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
  callerEmail: string | null,
  mode?: AcceptMode
): Promise<AcceptResult> {
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
  const member = await MembershipRepository.find(db, invite.treeId, callerUid);
  if (member) {
    await InviteRepository.updateStatus(db, inviteId, "accepted");
    return { status: "joined", treeId: member.treeId, role: member.role };
  }

  // Collision: the invitee already has a record elsewhere and the invite offers a
  // placeholder. Becoming one (or not) is their call — write NOTHING until they
  // decide (a4). Most invitations have no collision and skip this (a3).
  const own = invite.personId ? await PersonRepository.listByUser(db, callerUid) : [];
  const collision = !!invite.personId && own.length > 0;
  if (collision && !mode) {
    return { status: "needs_decision", treeId: invite.treeId, role: invite.role };
  }

  const role = collision && mode === "separate" ? "viewer" : invite.role;

  await transaction(async (tx) => {
    await UserRepository.ensure(tx, callerUid, callerEmail);
    await MembershipRepository.insert(tx, invite.treeId, callerUid, role);

    if (invite.personId && collision && mode === "become_one") {
      // Become one (a5): the user's own facts overlay the keeper's placeholder
      // IN PLACE — the row keeps its id, so every household/sibling/event link
      // stays intact (no re-point, no second row), and the user's facts win.
      const placeholder = await PersonRepository.find(tx, invite.treeId, invite.personId);
      if (placeholder) {
        const merged = mergePlaceholder(placeholder, ownFactsOf(own[0]!.person), callerUid);
        await PersonRepository.upsert(tx, invite.treeId, merged);
        await MembershipRepository.setPersonId(tx, invite.treeId, callerUid, invite.personId);
      }
    } else if (invite.personId && collision && mode === "separate") {
      // Decline the match (a6): the placeholder is untouched; the user's own
      // record is placed BESIDE it as a fresh row, linked to them, read-only.
      const facts = ownFactsOf(own[0]!.person);
      const beside = applyOwnFacts(
        { id: `p_${nanoid(10)}`, userId: callerUid, name: facts.name, sex: facts.sex },
        facts
      );
      await PersonRepository.upsert(tx, invite.treeId, beside);
      await MembershipRepository.setPersonId(tx, invite.treeId, callerUid, beside.id);
    } else if (invite.personId) {
      // No collision: claim the offered record so they land on their branch (f4).
      const linked = await PersonRepository.linkUser(tx, invite.treeId, invite.personId, callerUid);
      if (linked) {
        await MembershipRepository.setPersonId(tx, invite.treeId, callerUid, invite.personId);
      }
    }

    await InviteRepository.updateStatus(tx, inviteId, "accepted");
  });
  return { status: "joined", treeId: invite.treeId, role };
}
