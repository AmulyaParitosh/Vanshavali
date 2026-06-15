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
  /** Y-offset for the name label (partner-group wife sits lower than husband). */
  labelOffsetY?: number;
  canEdit: boolean;
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
  labelOffsetY = TREE_CONFIG.NODE_RADIUS + 50,
  canEdit,
  onLock,
}) => {
  const { NODE_RADIUS, DETAILS_CARD } = TREE_CONFIG;
  const cardX =
    cardSide === "left"
      ? -NODE_RADIUS - DETAILS_CARD.WIDTH - 20
      : NODE_RADIUS + 10;
  const cardY = -50;

  // Invisible bridge rect so the cursor can travel from avatar → card without
  // crossing dead space (otherwise the card hover state would flicker).
  const bridgeX = cardSide === "left" ? cardX + DETAILS_CARD.WIDTH : NODE_RADIUS;
  const bridgeWidth = cardSide === "left" ? -NODE_RADIUS - (cardX + DETAILS_CARD.WIDTH) : 10;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLock(person.id);
  };

  return (
    <g
      className={`node${isLocked ? " locked" : ""}`}
      data-id={person.id}
      onClick={handleClick}
      onMouseEnter={(e) => {
        // Raise this node above its siblings so the details card isn't clipped.
        const el = e.currentTarget;
        el.parentNode?.appendChild(el);
      }}
    >
      <PersonAvatar person={person} isLineage={isLineage} />

      {/* Bridge area for hover continuity between avatar and details card */}
      <rect
        x={bridgeX}
        y={cardY}
        width={bridgeWidth}
        height={DETAILS_CARD.HEIGHT}
        fill="transparent"
      />

      {/* Name label (foreignObject lets the rounded background auto-size) */}
      <foreignObject
        x={-100}
        y={labelOffsetY - 18}
        width={200}
        height={36}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div style={{ textAlign: "center" }}>
          <span className="node-label">{person.name.official_name}</span>
        </div>
      </foreignObject>

      {/* Details card */}
      <foreignObject
        x={cardX}
        y={cardY}
        width={DETAILS_CARD.WIDTH}
        height={DETAILS_CARD.HEIGHT}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <DetailsCard person={person} canEdit={canEdit} />
      </foreignObject>
    </g>
  );
};

export default PersonNode;
