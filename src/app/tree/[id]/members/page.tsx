"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import InvitePanel from "../../../../components/tree/InvitePanel";
import { canEdit as canEditRole, canInvite } from "../../../../lib/access";
import { portraitTint, personInitials } from "../../../../utils/portrait";
import { generationMap, roman, bornInLine } from "../../../../lib/generations";
import { GraphManager } from "../../../../lib/graph/GraphManager";
import { describeRelation } from "../../../../lib/lineage";
import type { Person } from "../../../../types/person";
import type {
  TreeMembership,
  TreeInvite,
  InvitableTreeRole,
  TreeRole,
} from "../../../../types/tree";

/** Access-chip presentation for a per-tree role (repo owner/editor/viewer = keeper/write/read). */
const ROLE_CHIP: Record<TreeRole, { label: string; cls: string }> = {
  owner: { label: "Keeper", cls: "chip--keeper" },
  editor: { label: "Write", cls: "chip--write" },
  viewer: { label: "Read", cls: "chip--read" },
};

const birthDate = (p: Person) => p.events?.find((e) => /birth|born/i.test(e.type))?.date;

/** A person is deceased if a death event is recorded — never invite the deceased (a4/edge e2). */
const isDeceased = (p: Person): boolean =>
  (p.events ?? []).some((e) => /death|died|passed|expired|d\./i.test(e.type));

/** A birth instant for sorting; undated people sort last within their generation. */
function birthValue(p: Person): number {
  const d = birthDate(p);
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Relative "Updated" time (Spec 06: `2 mo ago`, `1 h ago`, `—`). */
function relativeTime(ms?: number): string {
  if (!ms) return "—";
  const secs = Math.max(0, (Date.now() - ms) / 1000);
  const mins = secs / 60;
  const hrs = mins / 60;
  const days = hrs / 24;
  if (secs < 60) return "just now";
  if (mins < 60) return `${Math.floor(mins)} min ago`;
  if (hrs < 24) return `${Math.floor(hrs)} h ago`;
  if (days < 7) return `${Math.floor(days)} d ago`;
  if (days < 35) return `${Math.floor(days / 7)} w ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} y ago`;
}

/**
 * The Members page (Spec 06) — the ONE list of everyone in the record. Access is
 * a column ("May") in this list, read by everyone; roles are only ever changed in
 * the record panel (a3), never from the table. Keepers invite an account-less,
 * living relative from their own row (a4) via the invite panel. Rows are ordered
 * by generation then birth order, never alphabetically (a10).
 */
export default function MembersPage() {
  const params = useParams<{ id: string }>();
  const treeId = params?.id ?? null;
  const { dataProvider, membership, treeData, refreshNonce, user } = useAppContext();
  const toast = useToast();

  const [members, setMembers] = useState<TreeMembership[]>([]);
  const [invites, setInvites] = useState<TreeInvite[]>([]);
  const [query, setQuery] = useState("");
  const [invitingPerson, setInvitingPerson] = useState<Person | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

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
  const born = useMemo(() => bornInLine(people, families), [people, families]);
  const gm = useMemo(() => new GraphManager(people, families), [people, families]);
  const viewerPersonId = useMemo(
    () => people.find((p) => !!user && p.userId === user.uid)?.id ?? null,
    [people, user]
  );
  const familyName = useMemo(() => {
    const root = people.find((p) => p.root)?.name.official_name ?? "";
    return root.trim().split(/\s+/).pop() ?? "the";
  }, [people]);
  const membershipByPerson = useMemo(() => {
    const m = new Map<string, TreeMembership>();
    for (const mem of members) if (mem.personId) m.set(mem.personId, mem);
    return m;
  }, [members]);
  const pendingByPerson = useMemo(() => {
    const m = new Map<string, TreeInvite>();
    for (const inv of invites)
      if (inv.status === "pending" && inv.personId) m.set(inv.personId, inv);
    return m;
  }, [invites]);

  // Generation, then birth order, then a stable original index — never alphabetical (a10).
  // Search filters but does not re-sort (a9); it matches the official name + every alias.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const index = new Map(people.map((p, i) => [p.id, i]));
    const list = q
      ? people.filter((p) =>
          [p.name.official_name, ...(p.name.aliases ?? [])].join(" ").toLowerCase().includes(q)
        )
      : people;
    return [...list].sort((a, b) => {
      const ga = gens.get(a.id) ?? 99;
      const gb = gens.get(b.id) ?? 99;
      if (ga !== gb) return ga - gb;
      const ba = birthValue(a);
      const bb = birthValue(b);
      if (ba !== bb) return ba - bb;
      return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
    });
  }, [people, query, gens]);

  const pendingCount = invites.filter((i) => i.status === "pending").length;

  if (!treeId) return <Loading />;

  const handleSend = async (email: string, role: InvitableTreeRole) => {
    if (!invitingPerson) return;
    setSendingInvite(true);
    try {
      await dataProvider.createInvite(treeId, email, role, invitingPerson.id);
      toast.success(`Invitation sent to ${email}`);
      setInvitingPerson(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setSendingInvite(false);
    }
  };

  const sub =
    `${people.length} in the record · ${members.length} with an account` +
    (pendingCount > 0
      ? ` · ${pendingCount} invitation${pendingCount === 1 ? "" : "s"} waiting`
      : "");

  return (
    <div className="records-page">
      <header className="records-header">
        <div>
          <h1>Members</h1>
          <div className="records-subtitle">{sub}</div>
        </div>
        <div className="records-header-spacer" />
        {canAdd ? (
          <Link href={`/tree/${treeId}/people`} className="btn btn-primary">
            + Add person
          </Link>
        ) : (
          <span className="records-reader-note">Ask a keeper to add someone</span>
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
          <span className="records-col-portrait" />
          <span className="records-col-name">Name</span>
          <span className="records-col-gen">Gen</span>
          <span className="records-col-born">Born</span>
          <span className="records-col-relation">Relation to you</span>
          <span className="records-col-updated">Updated</span>
          <span className="records-col-may">May</span>
          <span className="records-col-overflow" />
        </div>
        {rows.length === 0 ? (
          <div className="records-empty">Nobody here by that name</div>
        ) : (
          rows.map((p) => {
            const mem = membershipByPerson.get(p.id);
            const pending = pendingByPerson.get(p.id);
            const bornOn = birthDate(p);
            const ring = born.has(p.id) ? "var(--ring-born)" : "var(--ring-married)";
            const isYou = viewerPersonId === p.id;
            const relation = isYou
              ? "you"
              : viewerPersonId
                ? describeRelation(viewerPersonId, p.id, gm)
                : null;
            return (
              <Link
                key={p.id}
                href={`/tree/${treeId}?person=${encodeURIComponent(p.id)}`}
                className="records-row"
              >
                <span
                  className="records-avatar records-col-portrait"
                  style={{ background: portraitTint(p.id), border: `2px solid ${ring}` }}
                >
                  {personInitials(p.name.official_name)}
                </span>
                <span className="records-name records-col-name">
                  <span className="records-name-primary">{p.name.official_name}</span>
                  {p.name.aliases && p.name.aliases.length > 0 && (
                    <span className="records-name-secondary">{p.name.aliases.join(" · ")}</span>
                  )}
                </span>
                <span className="records-col-gen">{roman(gens.get(p.id))}</span>
                <span className={`records-col-born${bornOn ? "" : " absent"}`}>
                  {bornOn ?? "no date recorded"}
                </span>
                <span className={`records-col-relation${isYou ? " you" : relation ? "" : " none"}`}>
                  {relation ?? "not connected yet"}
                </span>
                <span className="records-col-updated">{relativeTime(p.updatedAt)}</span>
                <span className="records-col-may">
                  {mem ? (
                    <span className={`chip ${ROLE_CHIP[mem.role].cls}`}>
                      {ROLE_CHIP[mem.role].label}
                    </span>
                  ) : pending ? (
                    <span className="chip chip--invited">Invited</span>
                  ) : ownerCanManage && !isDeceased(p) ? (
                    <button
                      type="button"
                      className="records-invite"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setInvitingPerson(p);
                      }}
                    >
                      Invite
                    </button>
                  ) : (
                    <span className="records-noaccount">no account</span>
                  )}
                </span>
                <span className="records-col-overflow" aria-hidden="true">
                  ⋯
                </span>
              </Link>
            );
          })
        )}
      </div>

      <p className="records-note">
        Everyone can read the <strong>May</strong> column — a relative should be able to see who can
        change the record.{" "}
        {ownerCanManage
          ? "Only you, as keeper, get the controls — the caret that changes a role (open a record) and Invite on anyone still without an account."
          : "Only the keeper can change access."}
      </p>

      {invitingPerson && (
        <InvitePanel
          person={invitingPerson}
          {...(() => {
            const g = gens.get(invitingPerson.id);
            return g !== undefined ? { generation: g } : {};
          })()}
          inviterName={user?.displayName || user?.email || "A family member"}
          familyName={familyName}
          sending={sendingInvite}
          onClose={() => setInvitingPerson(null)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
