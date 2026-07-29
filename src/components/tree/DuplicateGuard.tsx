import React from "react";
import type { Person } from "../../types/person";
import { portraitTint, personInitials } from "../../utils/portrait";

/**
 * The duplicate guard (Spec 06 a6) — a stop, not a block. When a submitted name
 * already exists, this opens before anything is written: connect to the existing
 * record (so their photographs, stories and events come along — a7) or, if they
 * really are two different people (cousins named alike is common), add anyway. The
 * "add anyway" path is outlined, never quiet-red — a second real person is legit.
 */

interface DuplicateGuardProps {
  existing: Person;
  typedName: string;
  onConnect: () => void | Promise<void>;
  onAddAnyway: () => void | Promise<void>;
  onBack: () => void;
  busy?: boolean;
}

const bornOf = (p: Person) => p.events?.find((e) => /birth|born/i.test(e.type))?.date;

const DuplicateGuard: React.FC<DuplicateGuardProps> = ({
  existing,
  typedName,
  onConnect,
  onAddAnyway,
  onBack,
  busy = false,
}) => {
  const name = existing.name.official_name;
  return (
    <div className="dialog-scrim">
      <div
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-label={`Already an ${name} in this tree`}
      >
        <span className="dialog-eyebrow dup-eyebrow">Before we add them</span>
        <h2 className="dialog-heading">There is already a {name} in this tree</h2>
        <p className="leave-body">
          A person exists once in Vanshavali. If this is the same {name}, connect them instead of
          typing a second copy — everything already written about them comes along.
        </p>

        <div className="dup-compare">
          <div className="dup-card">
            <span className="dup-card-label">Already in the tree</span>
            <div className="dup-who">
              <span
                className="portrait portrait--who"
                style={{ background: portraitTint(existing.id) }}
              >
                {personInitials(name)}
              </span>
              <div className="invite-who-names">
                <span className="invite-who-primary">{name}</span>
                <span className="invite-who-secondary">
                  {bornOf(existing) ? `Born ${bornOf(existing)}` : "no birth date"}
                </span>
              </div>
            </div>
          </div>
          <span className="dup-sep" aria-hidden="true">
            ≟
          </span>
          <div className="dup-card dup-card--new">
            <span className="dup-card-label">What you just typed</span>
            <div className="dup-who">
              <span className="portrait portrait--who portrait--dashed">
                {personInitials(typedName)}
              </span>
              <div className="invite-who-names">
                <span className="invite-who-primary">{typedName}</span>
                <span className="invite-who-secondary">new record</span>
              </div>
            </div>
          </div>
        </div>

        <p className="dup-note">
          If they are the same person, {name}&rsquo;s photographs and stories are kept, and they
          gain the household you just chose. If they really are two different people, add anyway —
          both show their birth year on the tree so nobody confuses them.
        </p>

        <div className="dialog-actions dialog-actions--stack">
          <button type="button" className="btn-quiet" onClick={onBack} disabled={busy}>
            Back to the form
          </button>
          <button type="button" className="btn" onClick={() => void onAddAnyway()} disabled={busy}>
            They are different people · add anyway
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onConnect()}
            disabled={busy}
          >
            {busy ? "Connecting…" : `Connect the existing ${name}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateGuard;
