"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import { canEdit as canEditRole, canInvite } from "../../../../lib/access";
import { INVITABLE_ROLES, TREE_ROLES } from "../../../../constants";
import { portraitTint, personInitials } from "../../../../utils/portrait";
import type { Person } from "../../../../types/person";
import type { Family } from "../../../../types/family";
import type {
  TreeMembership,
  TreeInvite,
  InvitableTreeRole,
  TreeRole,
} from "../../../../types/tree";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const roman = (n: number | undefined) => (n && ROMAN[n]) || (n ? String(n) : "");

/** Access-chip presentation for a per-tree role. */
const ROLE_CHIP: Record<TreeRole, { label: string; cls: string }> = {
  owner: { label: "Keeper", cls: "chip--keeper" },
  editor: { label: "Write", cls: "chip--write" },
  viewer: { label: "Read", cls: "chip--read" },
};

/** Generation number per person (root = I, spouses share it, children +1). */
function generationMap(people: Person[], families: Family[]): Map<string, number> {
  const gen = new Map<string, number>();
  const root = people.find((p) => p.root);
  if (!root) return gen;
  gen.set(root.id, 1);
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    const g = gen.get(id)!;
    for (const f of families) {
      if (f.husband === id || f.wife === id) {
        const spouse = f.husband === id ? f.wife : f.husband;
        if (spouse && !gen.has(spouse)) {
          gen.set(spouse, g);
          queue.push(spouse);
        }
        for (const c of f.children) {
          if (!gen.has(c)) {
            gen.set(c, g + 1);
            queue.push(c);
          }
        }
      }
    }
  }
  return gen;
}

/** IDs born into the line (root + every child) — they carry the red ring. */
function bornSet(people: Person[], families: Family[]): Set<string> {
  const set = new Set<string>();
  const root = people.find((p) => p.root);
  if (root) set.add(root.id);
  for (const f of families) f.children.forEach((c) => set.add(c));
  return set;
}

const birthDate = (p: Person) => p.events?.find((e) => /birth|born/i.test(e.type))?.date;

/**
 * The Members page — the mockup's one surface for people, access and
 * invitations (§2/§3). Every person in the record is a row; the "May" column
 * shows and (for the keeper) changes access. Email invitations for anyone who
 * should get an account are managed below.
 */
export default function MembersPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, treeData, refreshNonce } = useAppContext();
  const toast = useToast();

  const [members, setMembers] = useState<TreeMembership[]>([]);
  const [invites, setInvites] = useState<TreeInvite[]>([]);
  const [query, setQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitableTreeRole>(TREE_ROLES.EDITOR);
  const [isSending, setIsSending] = useState(false);

  const ownerCanManage = canInvite(membership?.role);
  const canAdd = canEditRole(membership?.role);

  useEffect(() => {
    if (!treeId) return undefined;
    const unsubMembers = dataProvider.subscribeToMembers(treeId, setMembers);
    const unsubInvites = ownerCanManage
      ? dataProvider.subscribeToInvites(treeId, setInvites)
      : undefined;
    return () => {
      unsubMembers();
      unsubInvites?.();
    };
  }, [treeId, dataProvider, ownerCanManage, refreshNonce]);

  const people = useMemo(() => treeData?.people ?? [], [treeData]);
  const families = useMemo(() => treeData?.families ?? [], [treeData]);
  const gens = useMemo(() => generationMap(people, families), [people, families]);
  const born = useMemo(() => bornSet(people, families), [people, families]);
  const membershipByPerson = useMemo(() => {
    const m = new Map<string, TreeMembership>();
    for (const mem of members) if (mem.personId) m.set(mem.personId, mem);
    return m;
  }, [members]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? people.filter((p) => {
          const hay = [p.name.official_name, ...(p.name.aliases ?? [])].join(" ").toLowerCase();
          return hay.includes(q);
        })
      : people;
    return [...list].sort((a, b) => (gens.get(a.id) ?? 99) - (gens.get(b.id) ?? 99));
  }, [people, query, gens]);

  const pendingInvites = invites.filter((i) => i.status === "pending");

  if (!treeId) return <Loading />;

  const handleRoleChange = async (uid: string, newRole: TreeRole) => {
    try {
      await dataProvider.updateMemberRole(treeId, uid, newRole);
      toast.success("Access updated");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const handleRemove = (uid: string) => {
    toast.confirm("Remove this person's access to the tree?", async () => {
      try {
        await dataProvider.removeMember(treeId, uid);
        toast.success("Access removed");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Removal failed");
      }
    });
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    try {
      await dataProvider.createInvite(treeId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await dataProvider.revokeInvite(treeId, inviteId);
      toast.success("Invitation revoked");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Revoke failed");
    }
  };

  return (
    <div className="records-page">
      <header className="records-header">
        <div>
          <h1>Members</h1>
          <div className="records-subtitle">
            {people.length} in the record · {members.length} with an account
            {pendingInvites.length > 0 &&
              ` · ${pendingInvites.length} invitation${pendingInvites.length === 1 ? "" : "s"} waiting`}
          </div>
        </div>
        <div className="records-header-spacer" />
        {canAdd && (
          <Link href={`/tree/${treeId}/people`} className="btn btn-primary">
            + Add person
          </Link>
        )}
      </header>

      <label className="records-search">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
          style={{ color: "var(--text-meta)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or alias"
          aria-label="Search people"
        />
      </label>

      <div className="records-table">
        <div className="records-thead">
          <span style={{ width: 40, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>Name</span>
          <span className="records-col-gen">Gen</span>
          <span className="records-col-born">Born</span>
          <span className="records-col-may">May</span>
        </div>
        {rows.length === 0 ? (
          <div className="records-empty">No one matches “{query}”.</div>
        ) : (
          rows.map((p) => {
            const mem = membershipByPerson.get(p.id);
            const bornDate = birthDate(p);
            const ring = born.has(p.id) ? "var(--ring-born)" : "var(--ring-married)";
            return (
              <div key={p.id} className="records-row">
                <span
                  className="records-avatar"
                  style={{ background: portraitTint(p.id), border: `2px solid ${ring}` }}
                >
                  {personInitials(p.name.official_name)}
                </span>
                <Link
                  href={`/tree/${treeId}?person=${encodeURIComponent(p.id)}`}
                  className="records-name"
                >
                  <span className="records-name-primary">{p.name.official_name}</span>
                  {p.name.aliases && p.name.aliases.length > 0 && (
                    <span className="records-name-secondary">{p.name.aliases.join(" · ")}</span>
                  )}
                </Link>
                <span className="records-col-gen">{roman(gens.get(p.id))}</span>
                <span className={`records-col-born${bornDate ? "" : " absent"}`}>
                  {bornDate ?? "no date recorded"}
                </span>
                <span className="records-col-may">
                  {mem ? (
                    ownerCanManage && mem.role !== "owner" ? (
                      <>
                        <select
                          className="records-select"
                          value={mem.role}
                          onChange={(e) => handleRoleChange(mem.uid, e.target.value as TreeRole)}
                          aria-label={`Access for ${p.name.official_name}`}
                        >
                          <option value={TREE_ROLES.EDITOR}>Write</option>
                          <option value={TREE_ROLES.VIEWER}>Read</option>
                        </select>
                        <button
                          type="button"
                          className="records-remove"
                          onClick={() => handleRemove(mem.uid)}
                          aria-label={`Remove ${p.name.official_name}'s access`}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className={`chip ${ROLE_CHIP[mem.role].cls}`}>
                        {ROLE_CHIP[mem.role].label}
                      </span>
                    )
                  ) : (
                    <span className="records-noaccount">no account</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="records-note">
        Everyone can read the <strong>May</strong> column — a relative should see who can change the
        record.{" "}
        {ownerCanManage
          ? "As keeper, you change a role from its dropdown."
          : "Only the keeper can change access."}
      </p>

      {ownerCanManage && (
        <section className="section-card records-manage">
          <h3>Invite someone to an account</h3>
          <form onSubmit={handleSendInvite} className="records-invite-form">
            <input
              className="input"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              required
              aria-label="Email address to invite"
              disabled={isSending}
            />
            <select
              className="records-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as InvitableTreeRole)}
              aria-label="Access to grant"
              disabled={isSending}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_CHIP[r].label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={isSending}>
              {isSending ? "Sending…" : "Send invitation"}
            </button>
          </form>
          {pendingInvites.length > 0 && (
            <ul className="member-list">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="member-row">
                  <span className="member-uid">{invite.email}</span>
                  <span className="chip chip--invited">
                    Invited · {ROLE_CHIP[invite.role].label}
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRevoke(invite.id)}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
