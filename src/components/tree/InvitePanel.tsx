"use client";

import React, { useState } from "react";
import type { Person } from "../../types/person";
import type { InvitableTreeRole } from "../../types/tree";
import { TREE_ROLES } from "../../constants";
import { portraitTint, personInitials } from "../../utils/portrait";
import { roman } from "../../lib/generations";

/**
 * The invite panel (Spec 06) — a 384px right inspector fired from a specific row's
 * Invite button, so the person is already chosen (step 1 is a confirmation, not a
 * picker). An invitation ties an account to a person who already has a row, so the
 * invitee lands on their own branch. Pronouns derive from the record's sex, never
 * hard-coded (a10). Ends with a plain statement of what Send will do (a8).
 */

interface InvitePanelProps {
  person: Person;
  /** The person's generation (for the message preview), if known. */
  generation?: number;
  /** Who is sending — the signed-in keeper's display name. */
  inviterName: string;
  /** The family/surname line, e.g. "Verma", for the message. */
  familyName: string;
  /** The tree's default invite role (Spec 11 card 3); preselects the role card. */
  defaultRole?: InvitableTreeRole;
  onClose: () => void;
  onSend: (email: string, role: InvitableTreeRole) => Promise<void>;
  sending?: boolean;
}

const subject = (s: Person["sex"]): string => (s === "M" ? "he" : "she");
const possessive = (s: Person["sex"]): string => (s === "M" ? "his" : "her");
const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

const ROLE_CARDS: { role: InvitableTreeRole; label: string; body: string }[] = [
  {
    role: TREE_ROLES.VIEWER,
    label: "May read",
    body: "Sees every name, date and photograph. Changes nothing.",
  },
  {
    role: TREE_ROLES.EDITOR,
    label: "May write",
    body: "Adds and edits people, dates, households and photographs anywhere in the tree.",
  },
];

const emailValid = (e: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());

const InvitePanel: React.FC<InvitePanelProps> = ({
  person,
  generation,
  inviterName,
  familyName,
  defaultRole = TREE_ROLES.EDITOR,
  onClose,
  onSend,
  sending = false,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableTreeRole>(defaultRole);
  const sx = person.sex;
  const genRoman = generation !== undefined ? roman(generation) : null;

  return (
    <aside className="inspector invite-panel" aria-label={`Invite ${person.name.official_name}`}>
      <div className="inspector-bar" aria-hidden="true" />
      <div className="inspector-body">
        <div className="inspector-head">
          <span className="eyebrow">Invite</span>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <h2 className="invite-heading">Who are you inviting?</h2>
        <p className="invite-note">
          Opened from {possessive(sx)} row, so {subject(sx)} is already chosen.{" "}
          {cap(possessive(sx))} account will be tied to <em>this</em> record — {subject(sx)} lands
          on {possessive(sx)} own branch instead of a blank canvas.
        </p>

        <div className="invite-step">
          <span className="invite-step-label">1 · who you picked</span>
          <div className="invite-who">
            <span
              className="portrait portrait--who"
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
            <div className="invite-who-names">
              <span className="invite-who-primary">{person.name.official_name}</span>
              <span className="invite-who-secondary">
                {[genRoman ? `gen ${genRoman}` : null, "no account"].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
        </div>

        <div className="invite-step">
          <span className="invite-step-label">2 · where to send it</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            aria-label="Email address"
            autoFocus
            disabled={sending}
          />
        </div>

        <div className="invite-step">
          <span className="invite-step-label">3 · what {subject(sx)} may do</span>
          <div className="invite-roles" role="radiogroup" aria-label="What they may do">
            {ROLE_CARDS.map((c) => {
              const on = role === c.role;
              return (
                <button
                  key={c.role}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`invite-role-card${on ? " selected" : ""}`}
                  onClick={() => setRole(c.role)}
                  disabled={sending}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span className="invite-role-text">
                    <span className="invite-role-title">{c.label}</span>
                    <span className="invite-role-body">{c.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* What Send will do, in plain language (a8) — the heritage message preview. */}
        <div className="invite-step">
          <span className="invite-step-label">{cap(subject(sx))} will receive</span>
          <div className="invite-preview">
            <div className="invite-preview-banner" aria-hidden="true" />
            <p className="invite-preview-body">
              {inviterName} has added you to the {familyName} family record.
              {genRoman ? ` You appear in generation ${genRoman}.` : ""}
            </p>
            <span className="invite-preview-btn" aria-hidden="true">
              Open my branch
            </span>
            <span className="invite-preview-foot">This link expires in 14 days</span>
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <button type="button" className="btn btn-quiet" onClick={onClose} disabled={sending}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={sending || !emailValid(email)}
          onClick={() => void onSend(email.trim(), role)}
        >
          {sending ? "Sending…" : "Send the invitation"}
        </button>
      </div>
    </aside>
  );
};

export default InvitePanel;
