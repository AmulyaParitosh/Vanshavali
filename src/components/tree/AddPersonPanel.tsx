"use client";

import React, { useState } from "react";
import type { Person } from "../../types/person";
import type { AddRelationship } from "../../lib/addPerson";
import { usePersonPicker } from "../../providers/PersonPickerProvider";
import { portraitTint, personInitials } from "../../utils/portrait";

/**
 * The add-person panel (Spec 06) — relationship first, then the name, then the
 * little you know. Asks WHERE someone belongs before WHO they are, so a new
 * person is always placed in the tree rather than left floating. Ends with a
 * plain statement of what the button will do (a8). Submitting hands the fields up;
 * a name already in the tree opens the duplicate guard before anything is written.
 */

export interface AddFields {
  name: string;
  sex: Person["sex"];
  born: string;
  living: boolean;
  rel: AddRelationship;
  anchorId: string | null;
}

interface AddPersonPanelProps {
  people: Person[];
  onClose: () => void;
  onAdd: (fields: AddFields) => void | Promise<void>;
  saving?: boolean;
}

const RELATIONSHIPS: { rel: AddRelationship; label: string }[] = [
  { rel: "child", label: "Child of" },
  { rel: "spouse", label: "Married to" },
  { rel: "sibling", label: "Sibling of" },
  { rel: "parent", label: "Parent of" },
  { rel: "none", label: "Not yet connected" },
];

function previewLine(name: string, rel: AddRelationship, anchor: Person | null): string {
  const who = name.trim() || "This person";
  const to = anchor?.name.official_name ?? "someone";
  switch (rel) {
    case "child":
      return `${who} joins ${to}'s household as a child. Nothing else in the tree moves.`;
    case "spouse":
      return `${who} is recorded as married to ${to}. Nothing else in the tree moves.`;
    case "sibling":
      return `${who} is added alongside ${to} as a sibling. Nothing else in the tree moves.`;
    case "parent":
      return `${who} is recorded as ${to}'s parent. Nothing else in the tree moves.`;
    default:
      return `${who} is added to the record, not yet connected to anyone.`;
  }
}

const AddPersonPanel: React.FC<AddPersonPanelProps> = ({
  people,
  onClose,
  onAdd,
  saving = false,
}) => {
  const { openPicker } = usePersonPicker();
  const [rel, setRel] = useState<AddRelationship>("child");
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Person["sex"]>("M");
  const [born, setBorn] = useState("");
  const [living, setLiving] = useState(true);

  const anchor = anchorId ? (people.find((p) => p.id === anchorId) ?? null) : null;
  const needsAnchor = rel !== "none";
  const ready = name.trim().length > 0 && (!needsAnchor || !!anchorId);

  return (
    <aside className="inspector add-panel" aria-label="Add a person">
      <div className="inspector-bar" aria-hidden="true" />
      <div className="inspector-body">
        <div className="inspector-head">
          <span className="eyebrow">New person</span>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <h2 className="invite-heading">Who are you adding?</h2>

        <div className="invite-step">
          <span className="invite-step-label">1 · where they belong</span>
          <div className="rel-chips" role="radiogroup" aria-label="Relationship">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r.rel}
                type="button"
                role="radio"
                aria-checked={rel === r.rel}
                className={`rel-chip${rel === r.rel ? " selected" : ""}${r.rel === "none" ? " rel-chip--loose" : ""}`}
                onClick={() => setRel(r.rel)}
                disabled={saving}
              >
                {r.label}
              </button>
            ))}
          </div>
          {needsAnchor && (
            <button
              type="button"
              className={`input add-anchor add-anchor-trigger${anchor ? " chosen" : ""}`}
              aria-label="Who they relate to"
              disabled={saving}
              onClick={() =>
                openPicker({
                  title: "Who they relate to",
                  placeholder: "Search for a person…",
                  selectedPersonId: anchorId,
                  onPick: setAnchorId,
                })
              }
            >
              {anchor ? (
                <>
                  <span
                    className="add-anchor-avatar"
                    style={{ background: portraitTint(anchor.id) }}
                  >
                    {personInitials(anchor.name.official_name)}
                  </span>
                  <span className="add-anchor-name">{anchor.name.official_name}</span>
                  <span className="add-anchor-change" aria-hidden="true">
                    Change
                  </span>
                </>
              ) : (
                "Choose a person…"
              )}
            </button>
          )}
        </div>

        <div className="invite-step">
          <span className="invite-step-label">2 · their name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            aria-label="Name"
            autoFocus
            disabled={saving}
          />
        </div>

        <div className="invite-step">
          <span className="invite-step-label">3 · the little you know</span>
          <div className="add-field">
            <span className="field-label">Sex</span>
            <div className="segmented" role="group" aria-label="Sex">
              {(["M", "F"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`segmented-option${sex === s ? " selected" : ""}`}
                  aria-pressed={sex === s}
                  onClick={() => setSex(s)}
                  disabled={saving}
                >
                  {s === "M" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
          <div className="add-field">
            <span className="field-label">Born</span>
            <input
              className="input"
              value={born}
              onChange={(e) => setBorn(e.target.value)}
              placeholder="unknown"
              aria-label="Born"
              disabled={saving}
            />
          </div>
          <div className="add-field add-field--row">
            <span className="field-label">Living</span>
            <button
              type="button"
              className={`toggle${living ? " on" : ""}`}
              role="switch"
              aria-checked={living}
              aria-label="Living"
              onClick={() => setLiving((v) => !v)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="invite-step">
          <span className="invite-step-label">This will change</span>
          <p className="add-preview">{previewLine(name, rel, anchor)}</p>
        </div>
      </div>

      <div className="panel-footer">
        <button type="button" className="btn-quiet" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || !ready}
          onClick={() =>
            void onAdd({ name: name.trim(), sex, born: born.trim(), living, rel, anchorId })
          }
        >
          {saving ? "Adding…" : "Add to the record"}
        </button>
      </div>
    </aside>
  );
};

export default AddPersonPanel;
