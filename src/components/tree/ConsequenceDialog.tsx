import React, { useState } from "react";

/**
 * The consequence dialog (Spec 13 / Spec 07). A destructive action names what it
 * will do — what goes, what stays — before asking, and offers the softer choice
 * where one exists. Irreversible actions (deleting a person or a tree) require
 * the exact name typed and cannot be dismissed by a misclick; a reversible one
 * (removing access) simply confirms. Never a filled red button.
 */

interface ConsequenceDialogProps {
  /** Small caps label — "Cannot be undone" (irreversible) or e.g. "Access only". */
  eyebrow: string;
  /** Deep-red eyebrow for an irreversible action. */
  danger?: boolean;
  /** Heading naming the thing being acted on. */
  heading: string;
  /** One sentence per consequence, each on its own line. */
  consequences: string[];
  /** Optional softer-alternative line beneath the consequences. */
  softer?: React.ReactNode;
  /** If set, the action stays disabled until this exact name is typed (deletion). */
  confirmName?: string;
  /** Placeholder/label prompting the typed name. */
  confirmPrompt?: string;
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}

const ConsequenceDialog: React.FC<ConsequenceDialogProps> = ({
  eyebrow,
  danger = false,
  heading,
  consequences,
  softer,
  confirmName,
  confirmPrompt,
  actionLabel,
  onConfirm,
  onCancel,
  busy = false,
}) => {
  const [typed, setTyped] = useState("");
  const needsName = !!confirmName;
  const matches = !needsName || typed.trim() === confirmName!.trim();
  // A misclick must not dismiss a decision being explained: only reversible
  // (non-name-gated) dialogs cancel on scrim-click.
  const dismissible = !needsName;

  return (
    <div className="dialog-scrim" onClick={dismissible ? onCancel : undefined}>
      <div
        className={`dialog${danger ? " dialog--danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="dialog-eyebrow">{eyebrow}</span>
        <h2 className="dialog-heading">{heading}</h2>
        <div className="consequence">
          {consequences.map((line, i) => (
            <p key={i} className="consequence-line">
              {line}
            </p>
          ))}
        </div>
        {softer && <p className="consequence-softer">{softer}</p>}
        {needsName && (
          <div className="form-group">
            {confirmPrompt && <span className="field-label">{confirmPrompt}</span>}
            <input
              className={`input${typed && !matches ? " is-error" : ""}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmName}
              aria-label={confirmPrompt ?? "Type to confirm"}
              autoComplete="off"
            />
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={busy || !matches}
          >
            {busy ? "Working…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsequenceDialog;
