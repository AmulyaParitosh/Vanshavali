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
  /** Y-offset for the name label, measured from the portrait centre. */
  labelOffsetY?: number;
  /** Draw the single-person circle pill behind the portrait (couples get one pill from PartnerNode instead). */
  showPill?: boolean;
  onSelect: (personId: string) => void;
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
  labelOffsetY = 52,
  showPill = false,
  onSelect,
}) => {
  const { PILL } = TREE_CONFIG;

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

      {/* Name label — name only; a column centred under this portrait (§07). */}
      <foreignObject
        x={-46}
        y={labelOffsetY}
        width={92}
        height={44}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <span className="node-label">{person.name.official_name}</span>
      </foreignObject>
    </g>
  );
};

export default PersonNode;
