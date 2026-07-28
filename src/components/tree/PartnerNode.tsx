import React from "react";
import type { GraphNode } from "../../types/graph";
import { TREE_CONFIG } from "../../constants";
import PersonNode from "./PersonNode";

interface PartnerNodeProps {
  node: GraphNode;
  depth: number;
  lockedPersonId: string | null;
  canEdit: boolean;
  treeId: string | null;
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
  treeId,
  onLock,
}) => {
  const { PARTNER_OFFSET, PILL } = TREE_CONFIG;
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
        canEdit={canEdit}
        treeId={treeId}
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
        canEdit={canEdit}
        treeId={treeId}
        onLock={onLock}
      />
    </g>
  ) : null;

  return (
    <g className="partner-group">
      {/* One household pill behind both portraits — a couple reads as a single
          object, never two overlapping circles. */}
      <rect
        className="node-pill"
        x={-PILL.COUPLE_WIDTH / 2}
        y={-PILL.COUPLE_HEIGHT / 2}
        width={PILL.COUPLE_WIDTH}
        height={PILL.COUPLE_HEIGHT}
        rx={PILL.COUPLE_RADIUS}
      />
      {/* Paint order: render the non-lineage partner first so the lineage
          partner's details card sits above when the two cards overlap. */}
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
