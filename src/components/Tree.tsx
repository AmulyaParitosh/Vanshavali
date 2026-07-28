"use client";

import React, { useRef, useState } from "react";
import type { GraphNode } from "../types/graph";
import type { Person } from "../types/person";
import { TREE_CONFIG } from "../constants";
import { canEdit as canEditRole } from "../lib/access";
import { useAppContext } from "../context/AppContext";
import TreeSearch from "./TreeSearch";
import { useTreeLayout, type LaidOutNode } from "./tree/useTreeLayout";
import { useTreeZoom } from "./tree/useTreeZoom";
import PersonNode from "./tree/PersonNode";
import PartnerNode from "./tree/PartnerNode";
import TreeLink from "./tree/TreeLink";
import TreeInspector from "./tree/TreeInspector";

interface TreeProps {
  data: GraphNode | null;
}

const Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { treeData, membership, currentTreeId, user } = useAppContext();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const canEdit = canEditRole(membership?.role);
  const layout = useTreeLayout(data);

  const { panTo } = useTreeZoom({
    svgRef,
    gRef,
    centerOnDataChange: layout.root ? layout.root.x : null,
    initialRootX: layout.root?.x ?? 0,
    initialOffsetY: TREE_CONFIG.NODE_HEIGHT / 2,
  });

  const people = treeData?.people ?? [];
  const selectedPerson = selectedPersonId
    ? (people.find((p) => p.id === selectedPersonId) ?? null)
    : null;

  /**
   * Open a person's record. A direct node click doesn't pan — the tree keeps
   * its coordinates so the person you clicked doesn't jump out from under the
   * cursor (§07). Selecting from search or a relation chip does pan, since the
   * target may be off-screen.
   */
  const handleSelect = (personId: string, pan = false) => {
    setSelectedPersonId(personId);
    if (!pan) return;
    const target = findContainingNode(layout.nodes, personId);
    if (!target) return;
    let xOffset = 0;
    if (target.data.isPartnerGroup) {
      if (target.data.husband?.id === personId) xOffset = -TREE_CONFIG.PARTNER_OFFSET;
      else if (target.data.wife?.id === personId) xOffset = TREE_CONFIG.PARTNER_OFFSET;
    }
    panTo(target.x + xOffset, target.y);
  };

  return (
    <div className={`tree-canvas-container${selectedPerson ? " inspector-open" : ""}`}>
      <div className="tree-stage">
        <TreeSearch people={people} onSelectPerson={(p: Person) => handleSelect(p.id, true)} />
        {/* Sizing/cursor live on .tree-canvas in globals.css. Background click clears the selection. */}
        <svg ref={svgRef} className="tree-canvas" onClick={() => setSelectedPersonId(null)}>
          <g ref={gRef}>
            <BackgroundOrnaments />

            <g className="links">
              {layout.links.map((link) => (
                <TreeLink
                  key={`${link.source.data.id}-${link.target.data.id}`}
                  d={layout.linkPath(link)}
                />
              ))}
            </g>

            <g className="nodes">
              {layout.nodes.map((node) => (
                <g key={node.data.id} transform={`translate(${node.x},${node.y})`}>
                  {node.data.isPartnerGroup ? (
                    <PartnerNode
                      node={node.data}
                      depth={node.depth}
                      selectedPersonId={selectedPersonId}
                      onSelect={handleSelect}
                    />
                  ) : (
                    <PersonNode
                      person={node.data}
                      isLineage={node.depth > 0}
                      isSelected={selectedPersonId === node.data.id}
                      showPill
                      onSelect={handleSelect}
                    />
                  )}
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>

      {selectedPerson && (
        <TreeInspector
          person={selectedPerson}
          people={people}
          families={treeData?.families ?? []}
          isSelf={!!user && selectedPerson.userId === user.uid}
          canEdit={canEdit}
          treeId={currentTreeId}
          onClose={() => setSelectedPersonId(null)}
          onSelect={(id) => handleSelect(id, true)}
        />
      )}
    </div>
  );
};

/**
 * Heritage ornaments rendered behind the tree — a faint trunk silhouette.
 * Kept SVG-native so it scales/pans with the zoom transform.
 */
const BackgroundOrnaments: React.FC = () => (
  <path
    d="M-20,600 Q0,300 20,600 Z M-10,300 Q0,0 10,300 Z"
    fill="var(--color-primary)"
    fillOpacity={0.03}
    transform="translate(0, 100)"
  />
);

/**
 * Walks the laid-out nodes to find the one containing a given personId —
 * either as a single-person node, or as one half of a partner group.
 */
function findContainingNode(nodes: LaidOutNode[], personId: string): LaidOutNode | undefined {
  return nodes.find((n) => {
    if (n.data.isPartnerGroup) {
      return n.data.husband?.id === personId || n.data.wife?.id === personId;
    }
    return n.data.id === personId;
  });
}

export default Tree;
