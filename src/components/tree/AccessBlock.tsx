"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Person } from "../../types/person";
import type { TreeMembership, TreeRole } from "../../types/tree";

/**
 * The record panel's access block (Spec 07). States the same fact to everyone —
 * what this person may do, and since when — and, for a keeper viewing someone
 * else, offers the role radio set (with the stored role marked `now`) and a
 * single Save. There is no confirmation step before saving a role change (a5).
 * Access is a fact about the person, so it lives in the record, not a menu.
 */

const ROLE: Record<TreeRole, { cls: string; label: string; stated: string; body: string }> = {
  owner: {
    cls: "chip--keeper",
    label: "Keeper",
    stated: "Holds the record — invitations, access and settings",
    body: "Everything you can do, including invitations and settings.",
  },
  editor: {
    cls: "chip--write",
    label: "Write",
    stated: "May add and correct anyone",
    body: "Adds and corrects anyone, anywhere in the tree.",
  },
  viewer: {
    cls: "chip--read",
    label: "Read",
    stated: "Sees every name, date and photograph",
    body: "Sees every name, date and photograph. Changes nothing.",
  },
};
// Read → Write → Keeper, the order the radio set presents them.
const ROLE_ORDER: TreeRole[] = ["viewer", "editor", "owner"];

// Gendered from the record's sex, never hard-coded (a10). Sex is always M or F.
const subject = (sex: Person["sex"]): string => (sex === "M" ? "he" : "she");
const object = (sex: Person["sex"]): string => (sex === "M" ? "him" : "her");

function since(ms: number): string {
  const d = new Date(ms);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface AccessBlockProps {
  person: Person;
  membership: TreeMembership | null;
  isSelf: boolean;
  viewerIsKeeper: boolean;
  treeId: string | null;
  /** Keeper only: persist a role change (a5, no confirmation). */
  onChangeRole?: (role: TreeRole) => void;
  /** Keeper only: remove this member's access (routes through a consequence dialog). */
  onRemoveAccess?: () => void;
  savingRole?: boolean;
}

const AccessBlock: React.FC<AccessBlockProps> = ({
  person,
  membership,
  isSelf,
  viewerIsKeeper,
  treeId,
  onChangeRole,
  onRemoveAccess,
  savingRole = false,
}) => {
  const storedRole = membership?.role ?? null;
  const [selected, setSelected] = useState<TreeRole | null>(storedRole);
  useEffect(() => setSelected(storedRole), [storedRole]);

  const eyebrow = <span className="eyebrow">What {subject(person.sex)} may do</span>;

  // Keeper editing another member's access: the radio set + Save.
  if (membership && viewerIsKeeper && !isSelf) {
    const changed = selected !== storedRole;
    return (
      <section className="inspector-section access-block">
        <div className="inspector-section-head">
          {eyebrow}
          <span className="inspector-rule" />
        </div>
        <p className="access-preface">You can change this because you keep this tree.</p>
        <div className="access-roles" role="radiogroup" aria-label="Access level">
          {ROLE_ORDER.map((role) => {
            const on = selected === role;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={on}
                className={`radio-row${on ? " selected" : ""}`}
                onClick={() => setSelected(role)}
                disabled={savingRole}
              >
                <span className="radio-dot" aria-hidden="true" />
                <span className="access-role-text">
                  <span className="access-role-title">
                    {ROLE[role].label}
                    {role === storedRole && <span className="radio-now">now</span>}
                  </span>
                  <span className="access-role-body">{ROLE[role].body}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="access-controls">
          {onRemoveAccess && (
            <button
              type="button"
              className="btn-danger-text"
              onClick={onRemoveAccess}
              disabled={savingRole}
            >
              Remove access
            </button>
          )}
          <span style={{ flex: 1 }} />
          {changed && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => selected && onChangeRole?.(selected)}
              disabled={savingRole}
            >
              {savingRole ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </section>
    );
  }

  // Everyone else: the same fact stated once, no control.
  const role = membership ? ROLE[membership.role] : null;
  const joined = membership ? since(membership.joinedAt) : "";
  return (
    <section className="inspector-section access-block">
      <div className="inspector-section-head">
        {eyebrow}
        <span className="inspector-rule" />
      </div>
      {role ? (
        <>
          <div className="access-stated">
            <span className={`chip ${role.cls}`}>{role.label}</span>
            <span className="access-line">
              {role.stated}
              {joined && ` · since ${joined}`}
            </span>
          </div>
          {isSelf && (
            <span className="access-self">This is your access. Only a keeper can change it.</span>
          )}
        </>
      ) : (
        <div className="access-none">
          <span className="access-line">Not on Vanshavali yet</span>
          {viewerIsKeeper && treeId && (
            <Link href={`/tree/${treeId}/members`} className="btn btn-quiet btn-sm">
              Invite {object(person.sex)}
            </Link>
          )}
        </div>
      )}
    </section>
  );
};

export default AccessBlock;
