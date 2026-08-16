"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Person, DraftPerson } from "../../types/person";
import type { Family } from "../../types/family";
import type { TreeMembership, TreeRole } from "../../types/tree";
import { portraitTint, personInitials } from "../../utils/portrait";
import { GraphManager } from "../../lib/graph/GraphManager";
import { generationMap, roman, bornInLine } from "../../lib/generations";
import { buildLineage, describeRelation, ordinalWord, type Lineage } from "../../lib/lineage";
import { detectConflict, type FieldChange, type FieldConflict } from "../../lib/writeState";
import { personFieldMap } from "../../lib/personChanges";
import { overlayPersonFields, changedFieldKeys } from "../../lib/personMerge";
import type { PatchPersonResult } from "../../services/types";
import AccessBlock from "./AccessBlock";
import RecordEditor from "./RecordEditor";
import LeavingGuard from "./LeavingGuard";
import ConsequenceDialog from "./ConsequenceDialog";
import ConflictDialog from "./ConflictDialog";

interface TreeInspectorProps {
  person: Person;
  people: Person[];
  families: Family[];
  /** True when the selected person is the signed-in user's own record. */
  isSelf: boolean;
  /** The viewer's own linked person in this tree, for the relation line. */
  viewerPersonId: string | null;
  /** The selected person's membership in this tree (their role/account), if any. */
  personMembership: TreeMembership | null;
  /** Whether the signed-in viewer is a keeper of this tree. */
  viewerIsKeeper: boolean;
  canEdit: boolean;
  treeId: string | null;
  onClose: () => void;
  onSelect: (personId: string) => void;
  /**
   * Save one person with optimistic locking (Spec 13 flow 7). Returns the
   * outcome so the panel can run the three-way merge on a conflict; the caller
   * owns the success toast + undo.
   */
  savePerson: (person: Person, baseVersion: number) => Promise<PatchPersonResult>;
  /** True while a record save is in flight. */
  saving?: boolean;
  /** Keeper only: change a member's role (a5, no confirmation). */
  onChangeRole?: (uid: string, role: TreeRole) => Promise<void> | void;
  /** True while a role change is in flight. */
  savingRole?: boolean;
  /** Keeper only: remove a member's access (the person record is untouched, a8). */
  onRemoveAccess?: (uid: string, personName: string) => Promise<void> | void;
}

/** The birth event, if one is recorded. */
function birthOf(person: Person) {
  return (person.events ?? []).find((e) => /birth|born/i.test(e.type));
}
function deathOf(person: Person) {
  return (person.events ?? []).find((e) => /death|died|passed/i.test(e.type));
}

/**
 * The record panel (Spec 07) — a 384px inspector that opens in place. Read mode:
 * a header that orients (generation · line, then who they are to you), the prose
 * lineage as a sentence of linked names, life events (❀) and details (✧). The
 * access block, edit-in-place and the write footer are the remaining sub-units.
 */
const TreeInspector: React.FC<TreeInspectorProps> = ({
  person,
  people,
  families,
  isSelf,
  viewerPersonId,
  personMembership,
  viewerIsKeeper,
  canEdit,
  treeId,
  onClose,
  onSelect,
  savePerson,
  saving = false,
  onChangeRole,
  savingRole = false,
  onRemoveAccess,
}) => {
  const [editing, setEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Live edit state, reported up by RecordEditor, so a dirty close can be gated.
  const [liveChanges, setLiveChanges] = useState<FieldChange[]>([]);
  const [liveDraft, setLiveDraft] = useState<DraftPerson | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);
  // The record as the editor opened it — the base for the three-way merge. Held
  // in a ref so a post-save re-fetch (which updates `person`) can't shift it.
  const editBaseRef = useRef<Person>(person);
  // An unresolved stale save: the fields both sides changed, awaiting a choice.
  const [conflict, setConflict] = useState<{
    base: Person;
    draft: DraftPerson;
    stored: Person;
    conflicts: FieldConflict[];
  } | null>(null);

  const dirty = editing && liveChanges.length > 0;

  const startEditing = () => {
    editBaseRef.current = person;
    setEditing(true);
  };

  const stopEditing = () => {
    setEditing(false);
    setGuardOpen(false);
    setConflict(null);
    setLiveChanges([]);
    setLiveDraft(null);
  };

  /**
   * Save a draft through the optimistic-lock path. On success the panel closes
   * the editor; on a stale base it runs the three-way merge (Spec 13 flow 7):
   * fields nobody else touched are re-saved silently against the fresh version,
   * and only genuinely contested fields open the conflict dialog. Returns whether
   * the record is now saved (so a Save-and-leave knows if it may leave).
   */
  const commitSave = async (draft: DraftPerson): Promise<boolean> => {
    const base = editBaseRef.current;
    const mine: Person = { ...(draft as Person), id: person.id };
    const first = await savePerson(mine, base.version ?? 0);
    if (first.ok) return true;

    const detected = detectConflict(
      personFieldMap(base),
      personFieldMap(first.stored),
      personFieldMap(draft)
    );
    if (detected.conflicts.length === 0) {
      // Nothing contested — merge my changes onto the fresh record and re-save.
      const keys = new Set(changedFieldKeys(base, draft));
      const merged = overlayPersonFields(first.stored, draft, keys);
      const second = await savePerson(merged, first.stored.version ?? 0);
      if (second.ok) return true;
      const again = detectConflict(
        personFieldMap(base),
        personFieldMap(second.stored),
        personFieldMap(draft)
      );
      setConflict({ base, draft, stored: second.stored, conflicts: again.conflicts });
      return false;
    }
    setConflict({ base, draft, stored: first.stored, conflicts: detected.conflicts });
    return false;
  };

  // Resolve the conflict dialog: keep the chosen fields from my version, take the
  // rest (and any field only they changed) from what's stored now, and re-save.
  const resolveConflict = async (keepMine: ReadonlySet<string>): Promise<void> => {
    if (!conflict) return;
    const contested = new Set(conflict.conflicts.map((c) => c.field));
    const keys = new Set<string>(keepMine);
    // My changes that were never contested are safe to keep from my version.
    for (const k of changedFieldKeys(conflict.base, conflict.draft)) {
      if (!contested.has(k)) keys.add(k);
    }
    const merged = overlayPersonFields(conflict.stored, conflict.draft, keys);
    const res = await savePerson(merged, conflict.stored.version ?? 0);
    if (res.ok) {
      stopEditing();
      return;
    }
    const again = detectConflict(
      personFieldMap(conflict.base),
      personFieldMap(res.stored),
      personFieldMap(conflict.draft)
    );
    setConflict({ ...conflict, stored: res.stored, conflicts: again.conflicts });
  };

  // Closing (✕ / Esc) a dirty edit routes through the leaving guard, never a
  // silent discard and never the browser confirm (Spec 13).
  const requestClose = (after: () => void) => {
    if (dirty) {
      pendingLeave.current = after;
      setGuardOpen(true);
    } else {
      after();
    }
  };

  // Esc closes the panel (asking first if dirty). Registered with the values it
  // reads so it never goes stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (guardOpen) setGuardOpen(false);
        else requestClose(onClose);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, guardOpen, onClose]);

  const gm = useMemo(() => new GraphManager(people, families), [people, families]);
  const gens = useMemo(() => generationMap(people, families), [people, families]);
  const inLine = useMemo(() => bornInLine(people, families), [people, families]);
  const lineage = useMemo<Lineage | null>(() => buildLineage(person.id, gm), [person.id, gm]);

  const aliases = person.name.aliases?.filter((a) => a.trim().length > 0) ?? [];
  const events = person.events ?? [];
  const details = person.custom_fields
    ? Object.entries(person.custom_fields).filter(([, v]) => v && v.trim().length > 0)
    : [];
  const birth = birthOf(person);

  // Header orientation.
  const gen = gens.get(person.id);
  const rootName = people.find((p) => p.root)?.name.official_name ?? "";
  const line = rootName.trim().split(/\s+/).pop() ?? "";
  const eyebrow =
    (gen !== undefined ? `Generation ${roman(gen)}` : "In this tree") +
    (line ? ` · ${line} line` : "");
  // Fact line (Spec 07 c2): "b. 1958, Madhubani · living" — birth + place, then
  // the living/deceased status, so a dateless record still states one fact.
  const death = deathOf(person);
  const birthPart = [birth?.date ? `b. ${birth.date}` : null, birth?.place ?? null]
    .filter(Boolean)
    .join(", ");
  const status = death?.date ? `d. ${death.date}` : "living";
  const fact = [birthPart || null, status].filter(Boolean).join(" · ");
  const kin = isSelf || !viewerPersonId ? null : describeRelation(viewerPersonId, person.id, gm);
  const relation = isSelf ? "this is you" : kin ? `your ${kin}` : null;
  const married = !inLine.has(person.id); // marigold ring = married into this line

  // A person's name rendered as an inline link that swaps the panel in place.
  const NameLink: React.FC<{ p: Person }> = ({ p }) => (
    <button type="button" className="prose-link" onClick={() => onSelect(p.id)}>
      {p.name.official_name}
    </button>
  );
  // Join person links with commas and a final "and".
  const joinPeople = (persons: Person[]): React.ReactNode =>
    persons.map((p, i) => (
      <React.Fragment key={p.id}>
        {i > 0 && (i === persons.length - 1 ? " and " : ", ")}
        <NameLink p={p} />
      </React.Fragment>
    ));

  const hasProse =
    !!lineage && (!!lineage.childOf || lineage.unions.some((u) => u.spouse || u.children.length));

  return (
    <aside className="inspector" aria-label={`Record: ${person.name.official_name}`}>
      <div className="inspector-bar" aria-hidden="true" />
      <div className="inspector-body">
        <div className="inspector-head">
          <span className="eyebrow">{eyebrow}</span>
          <button
            type="button"
            className="icon-close"
            onClick={() => requestClose(onClose)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {editing ? (
          <RecordEditor
            person={person}
            saving={saving}
            onDirtyChange={(changes, draft) => {
              setLiveChanges(changes);
              setLiveDraft(draft);
            }}
            onCancel={stopEditing}
            onSave={async (draft) => {
              const saved = await commitSave(draft);
              if (saved) stopEditing();
            }}
          />
        ) : (
          <>
            <div className="inspector-identity">
              <span
                className={`portrait portrait--panel${married ? " portrait--married" : ""}`}
                style={{ background: portraitTint(person.id) }}
              >
                {person.image_url ? (
                  <img
                    src={person.image_url}
                    alt={person.name.official_name}
                    className="portrait-img"
                  />
                ) : (
                  personInitials(person.name.official_name)
                )}
              </span>
              <div className="inspector-names">
                <span className="inspector-name">{person.name.official_name}</span>
                {aliases.length > 0 && (
                  <span className="inspector-secondary">
                    {aliases.map((a) => `‘${a}’`).join(" · ")}
                  </span>
                )}
                {fact && <span className="inspector-fact">{fact}</span>}
                {relation && <span className="inspector-relation-line">{relation}</span>}
              </div>
            </div>

            {/* Edit affordance — outlined, in the header (Spec 07); read mode has no
             * footer. Editable by a writer/keeper, or by anyone on their own record.
             * (Edit-in-place with the shared form is sub-unit C; this opens the
             * editor meanwhile.) */}
            {treeId && (canEdit || isSelf) && (
              <div className="inspector-actions">
                <button type="button" className="btn" onClick={startEditing}>
                  Edit record
                </button>
              </div>
            )}

            <AccessBlock
              person={person}
              membership={personMembership}
              isSelf={isSelf}
              viewerIsKeeper={viewerIsKeeper}
              treeId={treeId}
              savingRole={savingRole}
              {...(personMembership && onChangeRole
                ? { onChangeRole: (role: TreeRole) => onChangeRole(personMembership.uid, role) }
                : {})}
              {...(personMembership && onRemoveAccess
                ? { onRemoveAccess: () => setRemoveOpen(true) }
                : {})}
            />

            {hasProse && lineage && (
              <section className="inspector-section">
                <div className="inspector-section-head">
                  <span className="eyebrow">In the tree</span>
                  <span className="inspector-rule" />
                </div>
                <p className="inspector-prose">
                  {lineage.childOf && (lineage.childOf.father || lineage.childOf.mother) && (
                    <>
                      {ordinalWord(lineage.childOf.ordinal)}{" "}
                      {person.sex === "M" ? "son" : "daughter"} of{" "}
                      {joinPeople(
                        [lineage.childOf.father, lineage.childOf.mother].filter(
                          (p): p is Person => !!p
                        )
                      )}
                      .{" "}
                    </>
                  )}
                  {lineage.unions.map((u, i) => (
                    <React.Fragment key={i}>
                      {u.spouse && (
                        <>
                          Married <NameLink p={u.spouse} />.{" "}
                        </>
                      )}
                      {u.children.length > 0 && (
                        <>
                          {u.children.length === 1
                            ? "One child — "
                            : `${u.children.length} children — `}
                          {joinPeople(u.children)}.{" "}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </p>
              </section>
            )}

            {events.length > 0 && (
              <section className="inspector-section">
                <div className="inspector-section-head">
                  <span className="eyebrow">Life</span>
                  <span className="inspector-rule" />
                </div>
                {events.map((e, i) => (
                  <div key={`${e.type}-${i}`} className="inspector-event">
                    <span className={`inspector-event-date${e.date ? "" : " absent"}`}>
                      {e.date ?? "no date recorded"}
                    </span>
                    <span className="inspector-glyph inspector-glyph--event" aria-hidden="true">
                      ❀
                    </span>
                    <div className="inspector-event-body">
                      <span className="inspector-event-what">{e.type}</span>
                      {e.place && <span className="inspector-event-where">{e.place}</span>}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {details.length > 0 && (
              <section className="inspector-section">
                <div className="inspector-section-head">
                  <span className="eyebrow">Details</span>
                  <span className="inspector-rule" />
                </div>
                {details.map(([key, value]) => (
                  <div key={key} className="inspector-detail">
                    <span className="inspector-glyph inspector-glyph--detail" aria-hidden="true">
                      ✧
                    </span>
                    <span className="inspector-detail-label">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span className="inspector-detail-value">{value}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {guardOpen && (
        <LeavingGuard
          personName={person.name.official_name}
          changes={liveChanges}
          saving={saving}
          onKeepEditing={() => setGuardOpen(false)}
          onDiscard={() => {
            const after = pendingLeave.current;
            stopEditing();
            after?.();
          }}
          onSaveAndLeave={async () => {
            // Only leave once the save actually lands; a conflict opens its dialog
            // and holds the panel here until the user resolves it.
            const saved = liveDraft ? await commitSave(liveDraft) : true;
            if (!saved) {
              setGuardOpen(false);
              return;
            }
            const after = pendingLeave.current;
            stopEditing();
            after?.();
          }}
        />
      )}

      {conflict && (
        <ConflictDialog
          personName={person.name.official_name}
          conflicts={conflict.conflicts}
          saving={saving}
          onKeepEditing={() => setConflict(null)}
          onResolve={resolveConflict}
        />
      )}

      {removeOpen && personMembership && onRemoveAccess && (
        <ConsequenceDialog
          eyebrow="Access only"
          heading={`Remove ${person.name.official_name}'s access?`}
          consequences={[
            `${person.name.official_name} keeps their record in this tree — every name, date, event and photograph stays.`,
            "They can no longer open or change anything here, until a keeper invites them again.",
          ]}
          actionLabel="Remove access"
          busy={removing}
          onCancel={() => setRemoveOpen(false)}
          onConfirm={async () => {
            setRemoving(true);
            try {
              await onRemoveAccess(personMembership.uid, person.name.official_name);
            } finally {
              setRemoving(false);
              setRemoveOpen(false);
            }
          }}
        />
      )}
    </aside>
  );
};

export default TreeInspector;
