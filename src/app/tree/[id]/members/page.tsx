"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import { canInvite } from "../../../../lib/access";
import { INVITABLE_ROLES, TREE_ROLES } from "../../../../constants";
import type {
  TreeMembership,
  TreeInvite,
  InvitableTreeRole,
  TreeRole,
} from "../../../../types/tree";

/**
 * Members + invitations page for one tree. Owner-only operations (role
 * changes, removal, invite/revoke) are gated client-side AND by the service
 * layer on the server. Non-owners see a read-only list.
 *
 * `createInvite` writes the pending row and sends the invitation email in one
 * server step (POST /api/tree/[id]/invites → Resend).
 */
export default function MembersPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, myTrees, refreshNonce } = useAppContext();
  const toast = useToast();

  const [members, setMembers] = useState<TreeMembership[]>([]);
  const [invites, setInvites] = useState<TreeInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitableTreeRole>(TREE_ROLES.EDITOR);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!treeId) return;
    const unsubMembers = dataProvider.subscribeToMembers(treeId, setMembers);
    const unsubInvites = canInvite(membership?.role)
      ? dataProvider.subscribeToInvites(treeId, setInvites)
      : undefined;
    return () => {
      unsubMembers();
      unsubInvites?.();
    };
  }, [treeId, dataProvider, membership?.role, refreshNonce]);

  if (!treeId) return <Loading />;

  const ownerCanManage = canInvite(membership?.role);
  const treeName = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find(
    (t) => t.id === treeId
  )?.name;

  const handleRoleChange = async (uid: string, newRole: TreeRole) => {
    try {
      await dataProvider.updateMemberRole(treeId, uid, newRole);
      toast.success("Role updated");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Role update failed";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    toast.confirm("Remove this member from the tree?", async () => {
      try {
        await dataProvider.removeMember(treeId, uid);
        toast.success("Member removed");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Removal failed";
        toast.error(message);
      }
    });
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    try {
      await dataProvider.createInvite(treeId, inviteEmail.trim(), inviteRole);
      toast.success(`Invite created for ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invite failed";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await dataProvider.revokeInvite(treeId, inviteId);
      toast.success("Invite revoked");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Revoke failed";
      toast.error(message);
    }
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="members-page">
      <header className="members-header">
        <h1>Members{treeName ? ` — ${treeName}` : ""}</h1>
        {!ownerCanManage && (
          <p className="members-note">
            Only the tree owner can invite, change roles, or remove members.
          </p>
        )}
      </header>

      <section className="section-card">
        <h2>Current members ({members.length})</h2>
        {members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.uid} className="member-row">
                <span className="member-uid">{m.uid}</span>
                {ownerCanManage && m.role !== "owner" ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.uid, e.target.value as TreeRole)}
                    aria-label={`Role for ${m.uid}`}
                    className="role-select"
                  >
                    <option value={TREE_ROLES.EDITOR}>Editor</option>
                    <option value={TREE_ROLES.VIEWER}>Viewer</option>
                  </select>
                ) : (
                  <span className={`role-badge role-${m.role}`}>{m.role}</span>
                )}
                {ownerCanManage && m.role !== "owner" && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemoveMember(m.uid)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ownerCanManage && (
        <>
          <section className="section-card">
            <h2>Invite someone</h2>
            <form onSubmit={handleSendInvite} className="invite-form">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                required
                aria-label="Email address to invite"
                disabled={isSending}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InvitableTreeRole)}
                aria-label="Role to grant"
                className="role-select"
                disabled={isSending}
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary" disabled={isSending}>
                {isSending ? "Sending..." : "Send invite"}
              </button>
            </form>
            <p className="members-note">
              The recipient gets an email with an accept link. Invites can be revoked below until
              they&apos;re accepted.
            </p>
          </section>

          {pendingInvites.length > 0 && (
            <section className="section-card">
              <h2>Pending invites ({pendingInvites.length})</h2>
              <ul className="member-list">
                {pendingInvites.map((invite) => (
                  <li key={invite.id} className="member-row">
                    <span className="member-uid">{invite.email}</span>
                    <span className={`role-badge role-${invite.role}`}>{invite.role}</span>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleRevokeInvite(invite.id)}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <style jsx>{`
        .members-page {
          padding: var(--space-10);
          max-width: 900px;
          margin: 0 auto;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .members-header h1 {
          font-family: var(--font-heading);
          font-size: var(--font-size-2xl);
          margin: 0 0 var(--space-2);
          color: var(--color-text);
        }
        .members-note {
          color: var(--color-neutral-600);
          font-size: var(--font-size-sm);
          margin: var(--space-2) 0 0;
        }
        .member-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .member-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-neutral-0);
          border: 1px solid var(--color-neutral-200);
          border-radius: var(--radius-md);
        }
        .member-uid {
          flex: 1;
          font-family: var(--font-body);
          font-size: var(--font-size-base);
          color: var(--color-text);
          word-break: break-all;
        }
        .invite-form {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }
        .invite-form input[type="email"] {
          flex: 1;
        }
        .role-badge {
          display: inline-block;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-xs);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
        }
        .role-owner {
          background: var(--color-primary-50);
          color: var(--color-primary-700);
        }
        .role-editor {
          background: #fff5e0;
          color: #7a4400;
        }
        .role-viewer {
          background: #e8f5ec;
          color: #1f6a3e;
        }
        @media (max-width: 600px) {
          .invite-form {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
