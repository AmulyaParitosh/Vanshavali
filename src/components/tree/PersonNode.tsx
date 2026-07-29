import React from "react";
import type { Person } from "../../types/person";
import { TREE_CONFIG } from "../../constants";
import PersonAvatar from "./PersonAvatar";

interface PersonNodeProps {
  person: Person;
  /** Whether this person is part of the lineage line from the root. */
  isLineage: boolean;
  /** Whether this person's record is open in the inspector. */
  isSelected: boolean;
  /** True when this is the signed-in viewer's own record (the "· you" marker). */
  isSelf?: boolean;
  /** Y-offset for the name label, measured from the portrait centre. */
  labelOffsetY?: number;
  /** Draw the single-person circle pill behind the portrait (couples get one pill from PartnerNode instead). */
  showPill?: boolean;
  onSelect: (personId: string) => void;
}

/** The four-digit birth year from a person's birth event, if recorded. */
function birthYear(person: Person): string | null {
  const d = person.events?.find((e) => /birth|born/i.test(e.type))?.date;
  const m = d?.match(/\d{4}/);
  return m ? m[0] : null;
}

/**
 * One person on the canvas — a portrait + name label. Clicking opens the
 * person's record in the inspector (the tree keeps its coordinates). Composed
 * by Tree (single people) and by PartnerNode (each partner in a couple).
 */
const PersonNode: React.FC<PersonNodeProps> = ({
  person,
  isLineage,
  isSelected,
  isSelf = false,
  labelOffsetY = 52,
  showPill = false,
  onSelect,
}) => {
  const { PILL } = TREE_CONFIG;
  const year = birthYear(person);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(person.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(person.id);
    }
  };

  return (
    <g
      className={`node${isSelected ? " selected" : ""}`}
      data-id={person.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${person.name.official_name} — open record`}
      aria-pressed={isSelected}
    >
      {/* Single-person household pill (a 90px circle) behind the portrait. */}
      {showPill && <circle className="node-pill" r={PILL.SINGLE_RADIUS} />}

      <PersonAvatar person={person} isLineage={isLineage} />

      {/* Name + birth year in this portrait's own 78px column (Spec 05). The "you"
          year line reads e.g. "2001 · you" in red. */}
      <foreignObject
        x={-39}
        y={labelOffsetY}
        width={78}
        height={44}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <span className={`node-label${showPill ? " node-label--single" : ""}`}>
          {person.name.official_name}
        </span>
        {(year || isSelf) && (
          <span className={`node-year${isSelf ? " node-year--you" : ""}`}>
            {[year, isSelf ? "you" : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </foreignObject>
    </g>
  );
};

export default PersonNode;
