import React from "react";
import type { GraphNode } from "../../types/graph";
import { TREE_CONFIG } from "../../constants";
import PersonNode from "./PersonNode";

interface PartnerNodeProps {
  node: GraphNode;
  selectedPersonId: string | null;
  /** The people born into this line (red ring); everyone else married in (marigold) — a3. */
  born: ReadonlySet<string>;
  /** The signed-in viewer's uid, for the "· you" marker. */
  viewerUid: string | null;
  onSelect: (personId: string) => void;
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
  selectedPersonId,
  born,
  viewerUid,
  onSelect,
}) => {
  const { PARTNER_OFFSET, PILL } = TREE_CONFIG;
  const { husband, wife, lineageMemberId } = node;
  const isWifeLineage = lineageMemberId === wife?.id;

  if (!husband && !wife) return null;

  const husbandNode = husband ? (
    <g key="husband" transform={`translate(${-PARTNER_OFFSET}, 0)`}>
      <PersonNode
        person={husband}
        isLineage={born.has(husband.id)}
        isSelected={selectedPersonId === husband.id}
        isSelf={!!viewerUid && husband.userId === viewerUid}
        onSelect={onSelect}
      />
    </g>
  ) : null;

  const wifeNode = wife ? (
    // Right-hand label sits 26px lower so two long names never collide (a2).
    <g key="wife" transform={`translate(${PARTNER_OFFSET}, 0)`}>
      <PersonNode
        person={wife}
        isLineage={born.has(wife.id)}
        isSelected={selectedPersonId === wife.id}
        isSelf={!!viewerUid && wife.userId === viewerUid}
        labelOffsetY={52 + 26}
        onSelect={onSelect}
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
