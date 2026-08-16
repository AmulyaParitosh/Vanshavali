"use client";

import { useModalFocus } from "../../hooks/useModalFocus";
import React, { useState } from "react";
import type { FieldConflict } from "../../lib/writeState";
import SegmentedControl from "../SegmentedControl";

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

  const dialogRef = useModalFocus<HTMLDivElement>(onKeepEditing);

  return (
    <div className="dialog-scrim">
      <div
        ref={dialogRef}
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
              <SegmentedControl
                className="conflict-choice"
                ariaLabel={`${c.field}: which to keep`}
                options={[
                  { value: "mine", label: <>Keep mine — {stated(c.mine)}</> },
                  { value: "theirs", label: <>Use theirs — {stated(c.theirs)}</> },
                ]}
                value={choice[c.field] as "mine" | "theirs"}
                onChange={(v) => setChoice((s) => ({ ...s, [c.field]: v }))}
                disabled={saving}
              />
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onKeepEditing} disabled={saving}>
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
