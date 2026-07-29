import React, { useState } from "react";
import type { FieldConflict } from "../../lib/writeState";

/**
 * The conflict dialog (Spec 13 flow 7 / a10). When a save lands on a record
 * someone else changed while it was open, the fields nobody contested are already
 * merged in silently — only the genuinely contested ones surface here, each
 * showing what you typed against what the record shows now, with a plain choice
 * per field. Nothing is overwritten without that choice. "Keep editing" returns to
 * the form so the two versions can be reconciled by hand instead.
 */

interface ConflictDialogProps {
  personName: string;
  conflicts: FieldConflict[];
  /** Resolve with the set of contested field keys to keep from your version. */
  onResolve: (keepMine: ReadonlySet<string>) => void | Promise<void>;
  onKeepEditing: () => void;
  saving?: boolean;
}

/** A stated value, or the "left blank" phrasing when a side cleared the field. */
function stated(value: string): React.ReactNode {
  return value.trim() ? <strong>{value}</strong> : <em>left blank</em>;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  personName,
  conflicts,
  onResolve,
  onKeepEditing,
  saving = false,
}) => {
  // Each contested field starts on "keep mine" — the editor was actively changing
  // it — but can be switched to the stored version before saving.
  const [choice, setChoice] = useState<Record<string, "mine" | "theirs">>(
    Object.fromEntries(conflicts.map((c) => [c.field, "mine"]))
  );

  return (
    <div className="dialog-scrim">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${personName} was also edited`}
      >
        <span className="dialog-eyebrow">Also edited</span>
        <h2 className="dialog-heading">Someone changed this while you were editing</h2>
        <p className="leave-body">
          The rest of your changes are saved. These few were changed on both sides — choose which to
          keep for each.
        </p>

        <div className="conflict-list">
          {conflicts.map((c) => (
            <div key={c.field} className="conflict-row">
              <span className="conflict-field">{c.field}</span>
              <div
                className="segmented conflict-choice"
                role="group"
                aria-label={`${c.field}: which to keep`}
              >
                <button
                  type="button"
                  className={`segmented-option${choice[c.field] === "mine" ? " selected" : ""}`}
                  aria-pressed={choice[c.field] === "mine"}
                  onClick={() => setChoice((s) => ({ ...s, [c.field]: "mine" }))}
                  disabled={saving}
                >
                  Keep mine — {stated(c.mine)}
                </button>
                <button
                  type="button"
                  className={`segmented-option${choice[c.field] === "theirs" ? " selected" : ""}`}
                  aria-pressed={choice[c.field] === "theirs"}
                  onClick={() => setChoice((s) => ({ ...s, [c.field]: "theirs" }))}
                  disabled={saving}
                >
                  Use theirs — {stated(c.theirs)}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn-quiet" onClick={onKeepEditing} disabled={saving}>
            Keep editing
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => {
              const keepMine = new Set(
                conflicts.filter((c) => choice[c.field] === "mine").map((c) => c.field)
              );
              void onResolve(keepMine);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictDialog;
