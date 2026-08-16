"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppContext } from "../../../../context/AppContext";
import { useToast } from "../../../../components/ToastSystem";
import Loading from "../../../../components/Loading";
import InvitePanel from "../../../../components/tree/InvitePanel";
import RecordInspectorDock from "../../../../components/tree/RecordInspectorDock";
import AddPersonPanel, { type AddFields } from "../../../../components/tree/AddPersonPanel";
import DuplicateGuard from "../../../../components/tree/DuplicateGuard";
import RecordsScreen from "../../../../components/records/RecordsScreen";
import RecordsTable, { type RecordsColumn } from "../../../../components/records/RecordsTable";
import { canEdit as canEditRole, canInvite } from "../../../../lib/access";
import { portraitTint, personInitials } from "../../../../utils/portrait";
import { generationMap, roman, bornInLine } from "../../../../lib/generations";
import { GraphManager } from "../../../../lib/graph/GraphManager";
import { relationsFrom } from "../../../../lib/lineage";
import { findDuplicate, personIdFromName, placePerson } from "../../../../lib/addPerson";
import type { Person, PersonEvent } from "../../../../types/person";
import type {
  TreeMembership,
  TreeInvite,
  InvitableTreeRole,
  TreeRole,
} from "../../../../types/tree";

/** Members table columns (Spec 06). The className carries only the width; the
 *  header font is uniform via `.records-thead span`. */
const MEMBER_COLUMNS: RecordsColumn[] = [
  { key: "portrait", className: "records-col-portrait" },
  { key: "name", label: "Name", className: "records-col-name" },
  { key: "gen", label: "Gen", className: "records-col-gen" },
  { key: "born", label: "Born", className: "records-col-born" },
  { key: "relation", label: "Relation to you", className: "records-col-relation" },
  { key: "may", label: "May", className: "records-col-may" },
];

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
  const { dataProvider, membership, treeData, refreshNonce, user, myTrees } = useAppContext();
  const toast = useToast();

  const [members, setMembers] = useState<TreeMembership[]>([]);
  const [invites, setInvites] = useState<TreeInvite[]>([]);
  const [query, setQuery] = useState("");
  const [invitingPerson, setInvitingPerson] = useState<Person | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  // The record open in the shared inspector, opened in place (no route change, a2).
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addingSave, setAddingSave] = useState(false);
  // A submitted name that already exists — the duplicate guard (a6) awaits a choice.
  const [duplicate, setDuplicate] = useState<{ existing: Person; fields: AddFields } | null>(null);

  const tree = useMemo(() => {
    const all = [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])];
    return all.find((t) => t.id === treeId) ?? null;
  }, [myTrees, treeId]);
  const treeName = tree?.name ?? "the tree";

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

  // Every row's relation to the viewer, from one walk of the graph rather than
  // one per row (see relationsFrom). Keyed on the graph and the viewer, so
  // typing in the search box — which changes neither — recomputes nothing.
  const relations = useMemo(
    () => (viewerPersonId ? relationsFrom(viewerPersonId, gm) : new Map<string, string | null>()),
    [viewerPersonId, gm]
  );

  const openRecord = useCallback((id: string) => setSelectedPersonId(id), []);

  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const selectedPerson = selectedPersonId
    ? (people.find((p) => p.id === selectedPersonId) ?? null)
    : null;

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

  /** Persist a person placed into the tree per the chosen relationship. */
  const writePlacement = async (person: Person, fields: AddFields, note: string) => {
    setAddingSave(true);
    try {
      const next = placePerson({ people, families }, person, fields.rel, fields.anchorId);
      await dataProvider.saveTreeData(treeId, next);
      toast.success(note);
      setAddOpen(false);
      setDuplicate(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Add failed");
    } finally {
      setAddingSave(false);
    }
  };

  /** Build a brand-new person from the add form (born → birth event, not-living → death marker). */
  const buildNewPerson = (fields: AddFields): Person => {
    const events: PersonEvent[] = [];
    if (fields.born) events.push({ type: "birth", date: fields.born });
    if (!fields.living) events.push({ type: "death" });
    return {
      id: personIdFromName(fields.name, new Set(people.map((p) => p.id))),
      name: { official_name: fields.name },
      sex: fields.sex,
      ...(events.length ? { events } : {}),
    };
  };

  // Submitting an existing name always opens the duplicate guard before any write (a6).
  const handleAdd = async (fields: AddFields) => {
    const existing = findDuplicate(people, fields.name);
    if (existing) {
      setDuplicate({ existing, fields });
      return;
    }
    await writePlacement(buildNewPerson(fields), fields, `${fields.name} added to the record`);
  };

  const sub =
    `${people.length} in the record · ${members.length} with an account` +
    (pendingCount > 0
      ? ` · ${pendingCount} invitation${pendingCount === 1 ? "" : "s"} waiting`
      : "");

  return (
    <RecordsScreen
      title="Members"
      subtitle={sub}
      action={
        canAdd ? (
          <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
            + Add person
          </button>
        ) : (
          <span className="records-reader-note">Ask a keeper to add someone</span>
        )
      }
      search={
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
      }
      inspectorOpen={!!selectedPerson || addOpen}
    >
      <RecordsTable
        columns={MEMBER_COLUMNS}
        items={rows}
        ariaLabel="Members"
        rowKey={(p) => p.id}
        empty={
          <div className="records-empty">
            {treeData ? "Nobody here by that name" : "Reading the record…"}
          </div>
        }
        renderRow={(p, i) => (
          <MemberRow
            rowIndex={i}
            person={p}
            gen={roman(gens.get(p.id))}
            born={birthDate(p)}
            bornIntoLine={born.has(p.id)}
            isYou={viewerPersonId === p.id}
            relation={relations.get(p.id) ?? null}
            role={membershipByPerson.get(p.id)?.role ?? null}
            invited={pendingByPerson.has(p.id)}
            canInviteThem={ownerCanManage && !isDeceased(p)}
            selected={selectedPersonId === p.id}
            onOpen={openRecord}
            onInvite={setInvitingPerson}
          />
        )}
      />

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
          {...(tree ? { defaultRole: tree.defaultInviteRole } : {})}
          sending={sendingInvite}
          onClose={() => setInvitingPerson(null)}
          onSend={handleSend}
        />
      )}

      {selectedPerson && (
        <RecordInspectorDock
          selectedPerson={selectedPerson}
          people={people}
          families={families}
          members={members}
          membership={membership}
          user={user}
          treeId={treeId}
          treeName={treeName}
          variant="drawer"
          onClose={() => setSelectedPersonId(null)}
          onSelect={(id) => setSelectedPersonId(id)}
        />
      )}

      {addOpen && (
        <div className="record-dock">
          <AddPersonPanel
            people={people}
            saving={addingSave}
            onClose={() => setAddOpen(false)}
            onAdd={handleAdd}
          />
        </div>
      )}

      {duplicate && (
        <DuplicateGuard
          existing={duplicate.existing}
          typedName={duplicate.fields.name}
          busy={addingSave}
          onBack={() => setDuplicate(null)}
          onConnect={() =>
            writePlacement(
              duplicate.existing,
              duplicate.fields,
              `${duplicate.existing.name.official_name} connected`
            )
          }
          onAddAnyway={() =>
            writePlacement(
              buildNewPerson(duplicate.fields),
              duplicate.fields,
              `${duplicate.fields.name} added to the record`
            )
          }
        />
      )}
    </RecordsScreen>
  );
}

interface MemberRowProps {
  /** Position in the FULL list, not the rendered window (see RecordsTable). */
  rowIndex: number;
  person: Person;
  /** Generation as a roman numeral, already formatted. */
  gen: string;
  born: string | undefined;
  bornIntoLine: boolean;
  isYou: boolean;
  relation: string | null;
  role: TreeRole | null;
  invited: boolean;
  canInviteThem: boolean;
  selected: boolean;
  onOpen: (personId: string) => void;
  onInvite: (person: Person) => void;
}

/**
 * One row of the Members list, memoised.
 *
 * Everything it needs arrives as a primitive or a stable reference, so React can
 * answer "did this row change?" with a handful of `===` checks instead of
 * re-rendering it. That is what makes opening a record cheap: selecting someone
 * changes `selected` on exactly two rows, and the other 1,998 are skipped. It
 * only works while the props stay shallow — pass a freshly-derived object or an
 * inline arrow here and every row re-renders again, silently.
 */
const MemberRow = React.memo(function MemberRow({
  rowIndex,
  person,
  gen,
  born,
  bornIntoLine,
  isYou,
  relation,
  role,
  invited,
  canInviteThem,
  selected,
  onOpen,
  onInvite,
}: MemberRowProps) {
  const aliases = person.name.aliases;
  return (
    <div
      data-row=""
      role="row"
      tabIndex={0}
      aria-rowindex={rowIndex + 1}
      aria-current={selected}
      className={`records-row${selected ? " open" : ""}`}
      onClick={() => onOpen(person.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(person.id);
        }
      }}
    >
      <span
        role="gridcell"
        className="records-avatar records-col-portrait"
        style={{
          background: portraitTint(person.id),
          border: `2px solid ${bornIntoLine ? "var(--ring-born)" : "var(--ring-married)"}`,
        }}
      >
        {personInitials(person.name.official_name)}
      </span>
      <span role="gridcell" className="records-name records-col-name">
        <span className="records-name-primary">{person.name.official_name}</span>
        {aliases && aliases.length > 0 && (
          <span className="records-name-secondary">{aliases.map((a) => `‘${a}’`).join(" · ")}</span>
        )}
      </span>
      <span role="gridcell" className="records-col-gen">
        {gen}
      </span>
      <span role="gridcell" className={`records-col-born${born ? "" : " absent"}`}>
        {born ?? "no date recorded"}
      </span>
      <span
        role="gridcell"
        className={`records-col-relation${isYou ? " you" : relation ? "" : " none"}`}
      >
        {relation ?? "not connected yet"}
      </span>
      <span role="gridcell" className="records-col-may">
        {role ? (
          <span className={`chip ${ROLE_CHIP[role].cls}`}>{ROLE_CHIP[role].label}</span>
        ) : invited ? (
          <span className="chip chip--invited">Invited</span>
        ) : canInviteThem ? (
          <button
            type="button"
            className="records-invite"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInvite(person);
            }}
          >
            Invite
          </button>
        ) : (
          <span className="records-noaccount">no account</span>
        )}
      </span>
    </div>
  );
});
