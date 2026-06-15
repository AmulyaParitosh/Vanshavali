import React from "react";
import type { GraphNode } from "../../types/graph";
import { TREE_CONFIG } from "../../constants";
import PersonNode from "./PersonNode";

interface PartnerNodeProps {
  node: GraphNode;
  depth: number;
  lockedPersonId: string | null;
  canEdit: boolean;
  onLock: (personId: string) => void;
}

/**
 * A partner-group node — husband and wife rendered side by side at
 * ±PARTNER_OFFSET. The one whose line continues downward (lineage member) is
 * marked with the primary border ring; the spouse gets the secondary ring.
 *
 * JSX order matters: the second-rendered partner sits on top in SVG paint
 * order. We render the non-lineage partner first so the lineage partner's
 * details card renders above when their cards overlap.
 */
const PartnerNode: React.FC<PartnerNodeProps> = ({
  node,
  depth,
  lockedPersonId,
  canEdit,
  onLock,
}) => {
  const { PARTNER_OFFSET, NODE_RADIUS } = TREE_CONFIG;
  const { husband, wife, lineageMemberId } = node;
  const isWifeLineage = lineageMemberId === wife?.id;

  if (!husband && !wife) return null;

  const husbandNode = husband ? (
    <g key="husband" transform={`translate(${-PARTNER_OFFSET}, 0)`}>
      <PersonNode
        person={husband}
        isLineage={lineageMemberId === husband.id && depth > 0}
        isLocked={lockedPersonId === husband.id}
        cardSide="left"
        labelOffsetY={NODE_RADIUS + 50}
        canEdit={canEdit}
        onLock={onLock}
      />
    </g>
  ) : null;

  const wifeNode = wife ? (
    <g key="wife" transform={`translate(${PARTNER_OFFSET}, 0)`}>
      <PersonNode
        person={wife}
        isLineage={lineageMemberId === wife.id && depth > 0}
        isLocked={lockedPersonId === wife.id}
        cardSide="right"
        labelOffsetY={NODE_RADIUS + 72}
        canEdit={canEdit}
        onLock={onLock}
      />
    </g>
  ) : null;

  return (
    <g className="partner-group">
      {isWifeLineage ? (
        <>
          {husbandNode}
          {wifeNode}
        </>
      ) : (
        <>
          {wifeNode}
          {husbandNode}
        </>
      )}
    </g>
  );
};

export default PartnerNode;
