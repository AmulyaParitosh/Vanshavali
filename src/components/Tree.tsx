"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GraphNode } from "../types/graph";
import type { TreeMembership } from "../types/tree";
import { TREE_CONFIG } from "../constants";
import { canEdit as canEditRole, isOwner } from "../lib/access";
import { useAppContext } from "../context/AppContext";
import { showSaveToast } from "./ToastSystem";
import { personChanges } from "../lib/personChanges";
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
  const { treeData, membership, currentTreeId, user, dataProvider, refreshNonce, onSave, myTrees } =
    useAppContext();
  const treeName =
    [...(myTrees?.owned ?? []), ...(myTrees?.member ?? [])].find((t) => t.id === currentTreeId)
      ?.name ?? "the tree";
  const searchParams = useSearchParams();
  const [savingRecord, setSavingRecord] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  // The tree's members, so the record panel's access block can state each
  // person's role. Re-subscribed on the refresh nonce like every other read.
  const [members, setMembers] = useState<TreeMembership[]>([]);
  useEffect(() => {
    if (!currentTreeId) return undefined;
    return dataProvider.subscribeToMembers(currentTreeId, setMembers);
  }, [currentTreeId, dataProvider, refreshNonce]);
  const membershipByPerson = React.useMemo(() => {
    const map = new Map<string, TreeMembership>();
    for (const m of members) if (m.personId) map.set(m.personId, m);
    return map;
  }, [members]);
  // A ?person= param (e.g. a click from the Members table) opens that record on
  // mount — set as the initial selection so it doesn't take a state write in an
  // effect; the effect below only pans it into view.
  const personParam = searchParams.get("person");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(personParam);

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

  // Bring a ?person= target into view once the layout is ready (its selection
  // is already the initial state above, so this effect writes no state).
  useEffect(() => {
    if (personParam) panToPerson(personParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <TreeInspector
          person={selectedPerson}
          people={people}
          families={treeData?.families ?? []}
          isSelf={!!user && selectedPerson.userId === user.uid}
          viewerPersonId={people.find((p) => !!user && p.userId === user.uid)?.id ?? null}
          personMembership={membershipByPerson.get(selectedPerson.id) ?? null}
          viewerIsKeeper={isOwner(membership?.role)}
          canEdit={canEdit}
          treeId={currentTreeId}
          onClose={() => setSelectedPersonId(null)}
          onSelect={(id) => handleSelect(id, true)}
          saving={savingRecord}
          savingRole={savingRole}
          onChangeRole={async (uid, role) => {
            if (!currentTreeId) return;
            const name = selectedPerson.name.official_name;
            const prev = members.find((m) => m.uid === uid)?.role;
            const verb =
              role === "owner"
                ? "now keeps this tree"
                : role === "editor"
                  ? "may now add and correct anyone"
                  : "may now read the tree";
            setSavingRole(true);
            try {
              await dataProvider.updateMemberRole(currentTreeId, uid, role);
              showSaveToast({
                primary: `${name} ${verb}`,
                ...(prev
                  ? { onUndo: async () => dataProvider.updateMemberRole(currentTreeId, uid, prev) }
                  : {}),
              });
            } finally {
              setSavingRole(false);
            }
          }}
          onRemoveAccess={async (uid, name) => {
            if (!currentTreeId) return;
            await dataProvider.removeMember(currentTreeId, uid);
            showSaveToast({ primary: `${name} no longer has access`, warn: true });
          }}
          onSaveRecord={async (draft) => {
            if (!draft.id) return;
            const families = treeData?.families ?? [];
            const prevPeople = people;
            const prev = people.find((p) => p.id === draft.id);
            const labels = prev ? personChanges(prev, draft).map((c) => c.label) : [];
            const summary =
              labels.length === 0
                ? "your changes"
                : labels.length === 1
                  ? labels[0]!
                  : `${labels[0]} and ${labels.length - 1} more`;
            setSavingRecord(true);
            try {
              const nextPeople = people.map((p) =>
                p.id === draft.id ? ({ ...draft, id: draft.id } as (typeof people)[number]) : p
              );
              await onSave({ people: nextPeople, families });
              showSaveToast({
                primary: `Saved to ${treeName}`,
                consequence: `${summary} · everyone sees it now`,
                onUndo: async () => {
                  await onSave({ people: prevPeople, families });
                },
              });
            } finally {
              setSavingRecord(false);
            }
          }}
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
