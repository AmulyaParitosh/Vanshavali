import React from "react";
import Link from "next/link";
import type { Person } from "../../types/person";
import type { TreeMembership, TreeRole } from "../../types/tree";

/**
 * The record panel's access block (Spec 07) — read display. States the same fact
 * to everyone: what this person may do, and since when. A reader sees it exactly
 * as a keeper does; only the ability to CHANGE it differs (the keeper radio set +
 * Save + Remove access are sub-unit D, with the footer + consequence dialog).
 * Access is a fact about the person, so it lives in the record, not a menu.
 */

const ROLE: Record<TreeRole, { cls: string; label: string; stated: string }> = {
  owner: {
    cls: "chip--keeper",
    label: "Keeper",
    stated: "Holds the record — invitations, access and settings",
  },
  editor: { cls: "chip--write", label: "Write", stated: "May add and correct anyone" },
  viewer: { cls: "chip--read", label: "Read", stated: "Sees every name, date and photograph" },
};

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
  /** The selected person's membership in this tree, or null if they have no account. */
  membership: TreeMembership | null;
  isSelf: boolean;
  viewerIsKeeper: boolean;
  treeId: string | null;
}

const AccessBlock: React.FC<AccessBlockProps> = ({
  person,
  membership,
  isSelf,
  viewerIsKeeper,
  treeId,
}) => {
  const role = membership ? ROLE[membership.role] : null;
  const joined = membership ? since(membership.joinedAt) : "";
  return (
    <section className="inspector-section access-block">
      <div className="inspector-section-head">
        <span className="eyebrow">What {subject(person.sex)} may do</span>
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
