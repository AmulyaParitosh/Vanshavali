import React from "react";
import type { Person } from "../../types/person";
import { TREE_CONFIG } from "../../constants";
import PersonAvatar from "./PersonAvatar";
import DetailsCard from "./DetailsCard";

interface PersonNodeProps {
  person: Person;
  /** Whether this person is part of the lineage line from the root. */
  isLineage: boolean;
  /** Whether the details card should be pinned open. */
  isLocked: boolean;
  /** Which side of the avatar the details card sits on. */
  cardSide: "left" | "right";
  /** Y-offset for the name label, measured from the portrait centre. */
  labelOffsetY?: number;
  /** Draw the single-person circle pill behind the portrait (couples get one pill from PartnerNode instead). */
  showPill?: boolean;
  canEdit: boolean;
  /** Active treeId — threaded through to the EDIT INFO link inside DetailsCard. */
  treeId: string | null;
  onLock: (personId: string) => void;
}

/**
 * One person rendered as a circular avatar + name label + details card popup.
 * Composed by Tree (single people) and by PartnerNode (each partner in a couple).
 */
const PersonNode: React.FC<PersonNodeProps> = ({
  person,
  isLineage,
  isLocked,
  cardSide,
  labelOffsetY = 52,
  showPill = false,
  canEdit,
  treeId,
  onLock,
}) => {
  const { NODE_RADIUS, DETAILS_CARD, PILL } = TREE_CONFIG;
  const cardX = cardSide === "left" ? -NODE_RADIUS - DETAILS_CARD.WIDTH - 20 : NODE_RADIUS + 10;
  const cardY = -50;

  // Invisible bridge rect so the cursor can travel from avatar → card without
  // crossing dead space (otherwise the card hover state would flicker).
  const bridgeX = cardSide === "left" ? cardX + DETAILS_CARD.WIDTH : NODE_RADIUS;
  const bridgeWidth = cardSide === "left" ? -NODE_RADIUS - (cardX + DETAILS_CARD.WIDTH) : 10;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLock(person.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onLock(person.id);
    }
  };

  return (
    <g
      className={`node${isLocked ? " locked" : ""}`}
      data-id={person.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${person.name.official_name} — toggle details`}
      aria-pressed={isLocked}
      onMouseEnter={(e) => {
        // Raise this node above its siblings so the details card isn't clipped.
        const el = e.currentTarget;
        el.parentNode?.appendChild(el);
      }}
      onFocus={(e) => {
        // Raise on keyboard focus so the details card is also above siblings.
        const el = e.currentTarget;
        el.parentNode?.appendChild(el);
      }}
    >
      {/* Single-person household pill (a 90px circle) behind the portrait. */}
      {showPill && <circle className="node-pill" r={PILL.SINGLE_RADIUS} />}

      <PersonAvatar person={person} isLineage={isLineage} />

      {/* Bridge area for hover continuity between avatar and details card */}
      <rect
        x={bridgeX}
        y={cardY}
        width={bridgeWidth}
        height={DETAILS_CARD.HEIGHT}
        fill="transparent"
      />

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

      {/* Details card */}
      <foreignObject
        x={cardX}
        y={cardY}
        width={DETAILS_CARD.WIDTH}
        height={DETAILS_CARD.HEIGHT}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <DetailsCard person={person} canEdit={canEdit} treeId={treeId} />
      </foreignObject>
    </g>
  );
};

export default PersonNode;
