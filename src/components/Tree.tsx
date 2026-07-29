"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GraphNode } from "../types/graph";
import type { Person } from "../types/person";
import type { TreeMembership } from "../types/tree";
import { TREE_CONFIG } from "../constants";
import { bornInLine } from "../lib/generations";
import { useAppContext } from "../context/AppContext";
import { useTreeLayout, type LaidOutNode } from "./tree/useTreeLayout";
import { useTreeZoom } from "./tree/useTreeZoom";
import PersonNode from "./tree/PersonNode";
import PartnerNode from "./tree/PartnerNode";
import TreeLink from "./tree/TreeLink";
import RecordInspectorDock from "./tree/RecordInspectorDock";
import GenerationRail, { type GenerationRow } from "./tree/GenerationRail";

interface TreeProps {
  data: GraphNode | null;
}

/** The three "needs attention" lenses (Spec 05 a8). */
type Attention = "dates" | "account" | "photo";
const ATTENTION: { key: Attention; label: string }[] = [
  { key: "dates", label: "Missing dates" },
  { key: "account", label: "No account linked" },
  { key: "photo", label: "No photograph" },
];

/** The people in a household node (both partners, or the single person). */
function nodePersons(data: GraphNode): Person[] {
  if (data.isPartnerGroup) {
    return [data.husband, data.wife].filter((p): p is Person => !!p);
  }
  return [data as unknown as Person];
}

/** Whether a household has the given attention issue (any member does). */
function nodeHasAttention(data: GraphNode, a: Attention): boolean {
  const people = nodePersons(data);
  if (a === "dates") {
    return people.some((p) => !(p.events ?? []).some((e) => /birth|born/i.test(e.type) && e.date));
  }
  if (a === "account") return people.some((p) => !p.userId);
  return people.some((p) => !p.image_url);
}

/** Whether anyone in a household has an event at `place` (Spec 09 a6 place filter). */
function nodeHasPlace(data: GraphNode, place: string): boolean {
  return nodePersons(data).some((p) => (p.events ?? []).some((e) => e.place === place));
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
  // A ?place= param (a place result from ⌘K search) filters the canvas: everyone
  // connected to the place stays at full opacity, the rest dim to .35, with a
  // dismissible chip (Spec 09 a6). Seeded from the URL, dismissed to local null.
  const placeParam = searchParams.get("place");
  const [placeFilter, setPlaceFilter] = useState<string | null>(placeParam);

  const layout = useTreeLayout(data);
  const people = treeData?.people ?? [];
  // Who was born into this line (red ring) vs married in (marigold) — the ring
  // meaning is the same on every node (Spec 05 a3).
  const born = useMemo(
    () => bornInLine(people, treeData?.families ?? []),
    [people, treeData?.families]
  );
  const selectedPerson = selectedPersonId
    ? (people.find((p) => p.id === selectedPersonId) ?? null)
    : null;

  // Frame the viewer's own household on first data (a4), falling back to the root.
  const viewerPersonId = user ? (people.find((p) => p.userId === user.uid)?.id ?? null) : null;
  const initialCenter = useMemo(() => {
    const own = viewerPersonId ? findContainingNode(layout.nodes, viewerPersonId) : null;
    const target = own ?? layout.root;
    return target ? { x: target.x, y: target.y } : null;
  }, [layout, viewerPersonId]);

  const { panTo, fitToView, zoomBy } = useTreeZoom({ svgRef, gRef, initialCenter });
  const { STEP } = TREE_CONFIG.ZOOM;

  // The generations, for the keyboard rail (a7): a roman numeral + household count
  // per row, with a jump target (the first household in that generation).
  const generations = useMemo<GenerationRow[]>(() => {
    const byDepth = new Map<number, { count: number; x: number; y: number }>();
    for (const n of layout.nodes) {
      const cur = byDepth.get(n.depth);
      if (cur) cur.count += 1;
      else byDepth.set(n.depth, { count: 1, x: n.x, y: n.y });
    }
    return [...byDepth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([depth, v]) => ({ depth, count: v.count, x: v.x, y: v.y }));
  }, [layout]);

  // Attention filter (a8): dims non-matching households, never hides them.
  const [attention, setAttention] = useState<Attention | null>(null);
  const attentionCounts = useMemo(
    () => ({
      dates: layout.nodes.filter((n) => nodeHasAttention(n.data, "dates")).length,
      account: layout.nodes.filter((n) => nodeHasAttention(n.data, "account")).length,
      photo: layout.nodes.filter((n) => nodeHasAttention(n.data, "photo")).length,
    }),
    [layout]
  );

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

  // Pick up a place filter pushed onto the URL by search, even when the canvas
  // stays mounted (the ⌘K overlay pushes ?place= over the current canvas).
  useEffect(() => {
    setPlaceFilter(placeParam);
  }, [placeParam]);

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
              {/* First run (Spec 03 a7): a lone node gets a 44px connector stub
                  going nowhere — what makes the tree feel unfinished, on purpose. */}
              {layout.nodes.length === 1 && layout.nodes[0] && (
                <line
                  className="tree-stub"
                  x1={layout.nodes[0].x}
                  y1={layout.nodes[0].y + 60}
                  x2={layout.nodes[0].x}
                  y2={layout.nodes[0].y + 104}
                />
              )}
            </g>

            <g className="nodes">
              {layout.nodes.map((node) => (
                <g
                  key={node.data.id}
                  className={
                    (attention && !nodeHasAttention(node.data, attention)) ||
                    (placeFilter && !nodeHasPlace(node.data, placeFilter))
                      ? "node-wrap dimmed"
                      : "node-wrap"
                  }
                  transform={`translate(${node.x},${node.y})`}
                >
                  {node.data.isPartnerGroup ? (
                    <PartnerNode
                      node={node.data}
                      selectedPersonId={selectedPersonId}
                      born={born}
                      viewerUid={user?.uid ?? null}
                      onSelect={handleSelect}
                    />
                  ) : (
                    <PersonNode
                      person={node.data}
                      isLineage={born.has(node.data.id)}
                      isSelected={selectedPersonId === node.data.id}
                      isSelf={!!user && node.data.userId === user.uid}
                      showPill
                      onSelect={handleSelect}
                    />
                  )}
                </g>
              ))}
            </g>
          </g>
        </svg>

        {/* Generation rail (Spec 05 a7) — the keyboard spine; jump to a generation. */}
        <GenerationRail generations={generations} onJump={(x, y) => panTo(x, y)} />

        {/* Place filter chip (Spec 09 a6) — a place dims the rest of the canvas
            rather than opening a page; dismissible, restoring full opacity. */}
        {placeFilter && (
          <div className="tree-place-filter">
            <span className="tree-place-filter-label">Connected to {placeFilter}</span>
            <button
              type="button"
              className="tree-place-filter-clear"
              aria-label="Clear place filter"
              onClick={() => setPlaceFilter(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Attention filters (Spec 05 a8) — dim non-matching households, never hide. */}
        <div className="tree-attention" role="group" aria-label="Needs attention">
          {ATTENTION.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`attention-chip${attention === key ? " active" : ""}`}
              aria-pressed={attention === key}
              onClick={() => setAttention((cur) => (cur === key ? null : key))}
            >
              {label}
              <span className="attention-count">{attentionCounts[key]}</span>
            </button>
          ))}
        </div>

        {/* Legend (Spec 05 g9) — what the two ring colours mean. */}
        <div className="tree-legend" aria-hidden="true">
          <span className="legend-item">
            <span className="legend-dot legend-dot--born" />
            born into this line
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot--married" />
            married in
          </span>
        </div>

        {/* Canvas controls (Spec 05 g10) — Fit + zoom, bottom-right. */}
        <div className="tree-controls">
          <button
            type="button"
            className="tree-control"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / STEP)}
          >
            −
          </button>
          <button type="button" className="tree-control tree-control--fit" onClick={fitToView}>
            Fit
          </button>
          <button
            type="button"
            className="tree-control"
            aria-label="Zoom in"
            onClick={() => zoomBy(STEP)}
          >
            +
          </button>
        </div>
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
