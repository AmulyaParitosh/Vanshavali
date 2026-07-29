"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GraphNode } from "../types/graph";
import type { TreeMembership } from "../types/tree";
import { TREE_CONFIG } from "../constants";
import { useAppContext } from "../context/AppContext";
import { useTreeLayout, type LaidOutNode } from "./tree/useTreeLayout";
import { useTreeZoom } from "./tree/useTreeZoom";
import PersonNode from "./tree/PersonNode";
import PartnerNode from "./tree/PartnerNode";
import TreeLink from "./tree/TreeLink";
import RecordInspectorDock from "./tree/RecordInspectorDock";

interface TreeProps {
  data: GraphNode | null;
}

const Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { treeData, membership, currentTreeId, user, dataProvider, refreshNonce, myTrees } =
    useAppContext();
  const treeName =
    [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === currentTreeId)
      ?.name ?? "the tree";
  const searchParams = useSearchParams();

  // The tree's members, so the record panel's access block can state each
  // person's role. Re-subscribed on the refresh nonce like every other read.
  const [members, setMembers] = useState<TreeMembership[]>([]);
  useEffect(() => {
    if (!currentTreeId) return undefined;
    return dataProvider.subscribeToMembers(currentTreeId, setMembers);
  }, [currentTreeId, dataProvider, refreshNonce]);
  // A ?person= param (e.g. a click from the Members table) opens that record on
  // mount — set as the initial selection so it doesn't take a state write in an
  // effect; the effect below only pans it into view.
  const personParam = searchParams.get("person");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(personParam);

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

  /** Center the canvas on a person (their couple offset accounted for). */
  const panToPerson = (personId: string) => {
    const target = findContainingNode(layout.nodes, personId);
    if (!target) return;
    let xOffset = 0;
    if (target.data.isPartnerGroup) {
      if (target.data.husband?.id === personId) xOffset = -TREE_CONFIG.PARTNER_OFFSET;
      else if (target.data.wife?.id === personId) xOffset = TREE_CONFIG.PARTNER_OFFSET;
    }
    panTo(target.x + xOffset, target.y);
  };

  /**
   * Open a person's record. A direct node click doesn't pan — the tree keeps
   * its coordinates so the person you clicked doesn't jump out from under the
   * cursor (§07). Selecting from search or a relation chip does pan, since the
   * target may be off-screen.
   */
  const handleSelect = (personId: string, pan = false) => {
    setSelectedPersonId(personId);
    if (pan) panToPerson(personId);
  };

  // Open (and pan to) whatever ?person= names — on mount, and whenever it
  // changes while the canvas stays mounted (e.g. the ⌘K search or a Members-table
  // click pushes a new ?person=, reusing this one inspector — Spec 07 a1). A
  // direct node click sets the selection without touching the URL, so it doesn't
  // re-trigger this and the clicked node stays put (no jump).
  useEffect(() => {
    if (personParam) {
      setSelectedPersonId(personParam);
      panToPerson(personParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personParam]);

  return (
    <div className={`tree-canvas-container${selectedPerson ? " inspector-open" : ""}`}>
      <div className="tree-stage">
        {/* Search is the ⌘K palette (CommandSearch); the canvas has no floating box.
            Sizing/cursor live on .tree-canvas in globals.css; a background click clears the selection. */}
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
        <RecordInspectorDock
          selectedPerson={selectedPerson}
          people={people}
          families={treeData?.families ?? []}
          members={members}
          membership={membership}
          user={user}
          treeId={currentTreeId}
          treeName={treeName}
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
