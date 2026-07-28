import React from "react";
import Link from "next/link";
import type { Person } from "../../types/person";
import type { Family } from "../../types/family";
import { portraitTint, personInitials } from "../../utils/portrait";

interface TreeInspectorProps {
  person: Person;
  people: Person[];
  families: Family[];
  /** True when the selected person is the signed-in user's own record. */
  isSelf: boolean;
  canEdit: boolean;
  treeId: string | null;
  onClose: () => void;
  onSelect: (personId: string) => void;
}

type Relation = { person: Person; role: "parent" | "spouse" | "child" };

const ROLE_LABEL: Record<Relation["role"], string> = {
  parent: "parent",
  spouse: "spouse",
  child: "child",
};

/** Parents, spouse(s) and children of `person`, from the family memberships. */
function relationsOf(person: Person, people: Person[], families: Family[]): Relation[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const out: Relation[] = [];
  const seen = new Set<string>();
  const add = (id: string | undefined, role: Relation["role"]) => {
    if (!id || id === person.id || seen.has(id)) return;
    const p = byId.get(id);
    if (!p) return;
    seen.add(id);
    out.push({ person: p, role });
  };
  for (const f of families) {
    if (f.husband === person.id || f.wife === person.id) {
      add(f.husband === person.id ? f.wife : f.husband, "spouse");
      f.children.forEach((c) => add(c, "child"));
    }
    if (f.children.includes(person.id)) {
      add(f.husband, "parent");
      add(f.wife, "parent");
    }
  }
  // parents first, then spouse, then children
  const order = { parent: 0, spouse: 1, child: 2 };
  return out.sort((a, b) => order[a.role] - order[b.role]);
}

/**
 * The record inspector (§07) — a 384px panel that opens in place when a person
 * is selected. One scroll, no tabs: identity, life events (❀), details (✧),
 * and the people this person is connected to. Replaces the old hover popup.
 */
const TreeInspector: React.FC<TreeInspectorProps> = ({
  person,
  people,
  families,
  isSelf,
  canEdit,
  treeId,
  onClose,
  onSelect,
}) => {
  const aliases = person.name.aliases?.filter((a) => a.trim().length > 0) ?? [];
  const events = person.events ?? [];
  const details = person.custom_fields
    ? Object.entries(person.custom_fields).filter(([, v]) => v && v.trim().length > 0)
    : [];
  const relations = relationsOf(person, people, families);
  const birth = events.find((e) => /birth|born/i.test(e.type));

  return (
    <aside className="inspector" aria-label={`Record: ${person.name.official_name}`}>
      <div className="inspector-bar" aria-hidden="true" />
      <div className="inspector-body">
        <div className="inspector-head">
          <span className="eyebrow">The record</span>
          <button type="button" className="inspector-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="inspector-identity">
          <span className="inspector-portrait" style={{ background: portraitTint(person.id) }}>
            {person.image_url ? (
              <img src={person.image_url} alt={person.name.official_name} />
            ) : (
              personInitials(person.name.official_name)
            )}
          </span>
          <div className="inspector-names">
            <span className="inspector-name">{person.name.official_name}</span>
            {aliases.length > 0 && (
              <span className="inspector-secondary">{aliases.join(" · ")}</span>
            )}
            {birth?.date && <span className="inspector-meta">b. {birth.date}</span>}
            {isSelf && <span className="chip chip--write inspector-you">This is you</span>}
          </div>
        </div>

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

        {relations.length > 0 && (
          <section className="inspector-section">
            <div className="inspector-section-head">
              <span className="eyebrow">In the family</span>
              <span className="inspector-rule" />
            </div>
            <div className="inspector-relations">
              {relations.map((r) => (
                <button
                  type="button"
                  key={r.person.id}
                  className="inspector-relation"
                  onClick={() => onSelect(r.person.id)}
                >
                  <span
                    className="inspector-relation-avatar"
                    style={{ background: portraitTint(r.person.id) }}
                  >
                    {personInitials(r.person.name.official_name)}
                  </span>
                  <span className="inspector-relation-name">{r.person.name.official_name}</span>
                  <span className="inspector-relation-role">{ROLE_LABEL[r.role]}</span>
                </button>
              ))}
            </div>
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
