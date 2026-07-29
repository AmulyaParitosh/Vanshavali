import React, { useMemo } from "react";
import Link from "next/link";
import type { Person } from "../../types/person";
import type { Family } from "../../types/family";
import type { TreeMembership } from "../../types/tree";
import { portraitTint, personInitials } from "../../utils/portrait";
import { GraphManager } from "../../lib/graph/GraphManager";
import { generationMap, roman, bornInLine } from "../../lib/generations";
import { buildLineage, describeRelation, ordinalWord, type Lineage } from "../../lib/lineage";
import AccessBlock from "./AccessBlock";

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
}) => {
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
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

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
                  {ordinalWord(lineage.childOf.ordinal)} {person.sex === "M" ? "son" : "daughter"}{" "}
                  of{" "}
                  {joinPeople(
                    [lineage.childOf.father, lineage.childOf.mother].filter((p): p is Person => !!p)
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
      </div>

      {canEdit && treeId && (
        <div className="inspector-foot">
          <Link
            href={`/tree/${treeId}/people?id=${encodeURIComponent(person.id)}`}
            className="btn btn-primary btn-block"
          >
            Edit record
          </Link>
        </div>
      )}
    </aside>
  );
};

export default TreeInspector;
