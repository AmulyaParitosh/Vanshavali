import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Person, DraftPerson } from "../../types/person";
import type { Family } from "../../types/family";
import type { TreeMembership } from "../../types/tree";
import { portraitTint, personInitials } from "../../utils/portrait";
import { GraphManager } from "../../lib/graph/GraphManager";
import { generationMap, roman, bornInLine } from "../../lib/generations";
import { buildLineage, describeRelation, ordinalWord, type Lineage } from "../../lib/lineage";
import type { FieldChange } from "../../lib/writeState";
import AccessBlock from "./AccessBlock";
import RecordEditor from "./RecordEditor";
import LeavingGuard from "./LeavingGuard";

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
  /** Persist an edited record (edit-in-place Save). */
  onSaveRecord: (draft: DraftPerson) => Promise<void> | void;
  /** True while a save is in flight. */
  saving?: boolean;
}

/** The birth event, if one is recorded. */
function birthOf(person: Person) {
  return (person.events ?? []).find((e) => /birth|born/i.test(e.type));
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
  onSaveRecord,
  saving = false,
}) => {
  const [editing, setEditing] = useState(false);
  // Live edit state, reported up by RecordEditor, so a dirty close can be gated.
  const [liveChanges, setLiveChanges] = useState<FieldChange[]>([]);
  const [liveDraft, setLiveDraft] = useState<DraftPerson | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);

  const dirty = editing && liveChanges.length > 0;

  const stopEditing = () => {
    setEditing(false);
    setGuardOpen(false);
    setLiveChanges([]);
    setLiveDraft(null);
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
  const fact = [birth?.date ? `b. ${birth.date}` : null, birth?.place ?? null]
    .filter(Boolean)
    .join(", ");
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
              await onSaveRecord(draft);
              stopEditing();
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
                    {aliases.map((a) => `“${a}”`).join(" · ")}
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
                <button type="button" className="btn" onClick={() => setEditing(true)}>
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
                    <span className="inspector-event-date">{e.date ?? ""}</span>
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
            if (liveDraft) await onSaveRecord(liveDraft);
            const after = pendingLeave.current;
            stopEditing();
            after?.();
          }}
        />
      )}
    </aside>
  );
};

export default TreeInspector;
