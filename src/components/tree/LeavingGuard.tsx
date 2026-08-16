"use client";

import { useModalFocus } from "../../hooks/useModalFocus";
import React from "react";
import { summarizeChanges, countInWords, type FieldChange } from "../../lib/writeState";

/**
 * The unsaved-changes guard (Spec 13). Shown when a dirty record is closed or
 * navigated away from — never the browser's beforeunload, which cannot list what
 * would be lost. It itemises each pending change with a verb (old → new for
 * edits), and offers saving as the primary because most people who hit it meant
 * to keep their work. Scrim-click and Keep editing both cancel.
 */

interface LeavingGuardProps {
  personName: string;
  changes: FieldChange[];
  onSaveAndLeave: () => void;
  onKeepEditing: () => void;
  onDiscard: () => void;
  saving?: boolean;
}

const LeavingGuard: React.FC<LeavingGuardProps> = ({
  personName,
  changes,
  onSaveAndLeave,
  onKeepEditing,
  onDiscard,
  saving = false,
}) => {
  const { shown, moreCount, count } = summarizeChanges(changes);
  const things = count === 1 ? "thing" : "things";

  const dialogRef = useModalFocus<HTMLDivElement>(onKeepEditing);

  return (
    <div className="dialog-scrim" onClick={onKeepEditing}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Leave without saving?"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="dialog-eyebrow">Not saved yet</span>
        <h2 className="dialog-heading">Leave without saving?</h2>
        <p className="leave-body">
          You changed {countInWords(count)} {things} on {personName}. Leaving now throws them away —
          nobody else has seen them yet.
        </p>

        <div className="leave-list">
          {shown.map((c) => (
            <div key={c.field} className="leave-row">
              <span className={`verb-chip verb-${c.verb.toLowerCase()}`}>{c.verb}</span>
              <span className="leave-value">
                {c.label}
                {c.verb === "Changed" && c.from && c.to && (
                  <>
                    {" · "}
                    {c.from} <span className="leave-arrow">→</span> {c.to}
                  </>
                )}
                {c.verb === "Added" && c.to && <> · {c.to}</>}
              </span>
            </div>
          ))}
          {moreCount > 0 && <div className="leave-more">and {moreCount} more changes</div>}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn-danger-text" onClick={onDiscard} disabled={saving}>
            Throw them away
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onKeepEditing} disabled={saving}>
            Keep editing
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveAndLeave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save and leave"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeavingGuard;
