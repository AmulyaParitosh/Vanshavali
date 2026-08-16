"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GraphNode } from "../types/graph";
import type { Person } from "../types/person";
import type { TreeMembership } from "../types/tree";
import { TREE_CONFIG } from "../constants";
import { bornInLine } from "../lib/generations";
import { useAppContext } from "../context/AppContext";
import { GraphManager } from "../lib/graph/GraphManager";
import { useTreeLayout, type LaidOutNode, type TreeOrientation } from "./tree/useTreeLayout";
import { useTreeZoom } from "./tree/useTreeZoom";
import HouseholdCard from "./tree/HouseholdCard";
import { cardModel, cardHeight, type CardModel } from "./tree/cardModel";
import { orthogonalLinkPath, orthogonalLinkPathH } from "./tree/orthogonalLink";
import SegmentedControl from "./SegmentedControl";
import TreeLink from "./tree/TreeLink";
import RecordInspectorDock from "./tree/RecordInspectorDock";
import type { GenerationRow } from "./tree/GenerationRail";
import { useTreeCanvas, type Attention } from "../context/TreeCanvasContext";

interface TreeProps {
  data: GraphNode | null;
}

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

/** Where the chosen tree view is remembered across navigation and reload. */
const ORIENTATION_KEY = "vanshavali:tree-orientation";

const Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { treeData, membership, currentTreeId, user, dataProvider, refreshNonce, myTrees } =
    useAppContext();
  // The attention filter (Spec 05 a8) lives in the rail; the canvas reads the
  // shared state to dim non-matching households, and registers its jump API so
  // the rail's "Jump to generation" can pan here.
  const canvasBridge = useTreeCanvas();
  const attention = canvasBridge?.attention ?? null;
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

  // Which way the generations run. Remembered across reloads; hydrated after
  // mount so the server render always starts from the classic top-down view.
  const [orientation, setOrientation] = useState<TreeOrientation>("vertical");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ORIENTATION_KEY) === "horizontal") {
        setOrientation("horizontal");
      }
    } catch {
      /* storage unavailable — stay top-down */
    }
  }, []);
  const chooseOrientation = (next: TreeOrientation) => {
    setOrientation(next);
    try {
      window.localStorage.setItem(ORIENTATION_KEY, next);
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  };
  const horizontal = orientation === "horizontal";

  const layout = useTreeLayout(data, orientation);
  const people = treeData?.people ?? [];
  const families = treeData?.families ?? [];
  // Who was born into this line (red ring) vs married in (marigold) — the ring
  // meaning is the same on every node (Spec 05 a3).
  const born = useMemo(() => bornInLine(people, families), [people, families]);
  const selectedPerson = selectedPersonId
    ? (people.find((p) => p.id === selectedPersonId) ?? null)
    : null;

  // Focus path: selecting anyone lights an unbroken path to the founder plus all
  // of their descent; everything off it drops to 26%. Escape (or a background
  // click) clears the selection and the path with it.
  const graph = useMemo(() => new GraphManager(people, families), [people, families]);
  const focusIds = useMemo(() => {
    if (!selectedPersonId) return null;
    const set = new Set<string>([selectedPersonId]);
    graph.getAncestors(selectedPersonId).forEach((p) => set.add(p.id));
    graph.getDescendants(selectedPersonId).forEach((p) => set.add(p.id));
    // Keep the selected household whole — include the spouse on the path.
    for (const f of families) {
      if (f.husband === selectedPersonId && f.wife) set.add(f.wife);
      if (f.wife === selectedPersonId && f.husband) set.add(f.husband);
    }
    return set;
  }, [selectedPersonId, graph, families]);
  const nodeOnPath = (node: GraphNode) =>
    !focusIds || nodePersons(node).some((p) => focusIds.has(p.id));

  // One card model per laid-out node (rows + spine colour). Memoised so link
  // routing can read each card's height without rebuilding it per render.
  const viewerUid = user?.uid ?? null;
  const cards = useMemo(() => {
    const map = new Map<string, CardModel>();
    for (const n of layout.nodes) map.set(n.data.id, cardModel(n.data, born, viewerUid));
    return map;
  }, [layout.nodes, born, viewerUid]);
  const heightOf = (node: LaidOutNode) => cardHeight(cards.get(node.data.id)?.rows.length ?? 1);

  // Generation bands: one full-width horizontal stripe per generation, alternating
  // cream tints (the only thing separating them). Drawn inside the panned group so
  // they scale and move with the tree. Each band tiles the full generation pitch.
  const bands = useMemo(() => {
    if (!layout.nodes.length) return [];
    const { GEN_TOP, NODE_HEIGHT, CARD_ROW_H: rowH, GEN_LEFT, COL_PITCH, CARD_WIDTH } = TREE_CONFIG;
    const depths = [...new Set(layout.nodes.map((n) => n.depth))].sort((a, b) => a - b);

    if (horizontal) {
      // Left→right: each generation is a vertical column instead of a stripe.
      const ys = layout.nodes.map((n) => n.y);
      const y = Math.min(...ys) - 2600;
      const height = Math.max(...ys) - Math.min(...ys) + 5200;
      return depths.map((d) => ({
        depth: d,
        x: GEN_LEFT + d * COL_PITCH - CARD_WIDTH / 2 - 28,
        width: COL_PITCH,
        y,
        height,
      }));
    }

    const xs = layout.nodes.map((n) => n.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const x = minX - 2600;
    const width = maxX - minX + 5200;
    return depths.map((d) => ({
      depth: d,
      x,
      width,
      y: GEN_TOP + d * NODE_HEIGHT - rowH - 24,
      height: NODE_HEIGHT,
    }));
  }, [layout.nodes, horizontal]);

  // The trunk: the main patrilineal line inked heavier (a panjikar's main stroke,
  // branches thinning out). From the root, follow the eldest son who continues the
  // line at each generation; the set holds those "source-target" link keys.
  const trunkLinks = useMemo(() => {
    const set = new Set<string>();
    const personMap = new Map(people.map((p) => [p.id, p]));
    let node: LaidOutNode | undefined = layout.root ?? undefined;
    while (node?.children?.length) {
      const heir =
        node.children.find((k) => {
          const lm = k.data.lineageMemberId;
          return lm ? personMap.get(lm)?.sex === "M" : false;
        }) ?? node.children[0];
      if (!heir) break;
      set.add(`${node.data.id}-${heir.data.id}`);
      node = heir;
    }
    return set;
  }, [layout.root, people]);

  // Frame the viewer's own household on first data (a4), falling back to the root.
  const viewerPersonId = user ? (people.find((p) => p.userId === user.uid)?.id ?? null) : null;
  const initialCenter = useMemo(() => {
    const own = viewerPersonId ? findContainingNode(layout.nodes, viewerPersonId) : null;
    const target = own ?? layout.root;
    return target ? { x: target.x, y: target.y } : null;
  }, [layout, viewerPersonId]);

  const { panTo, fitToView, zoomBy } = useTreeZoom({ svgRef, gRef, initialCenter });
  const { STEP } = TREE_CONFIG.ZOOM;
  const { CARD_ROW_H } = TREE_CONFIG;
  // The <foreignObject> that frames each card: card width + room for the selected
  // border/shadow, and card height + room for the fold chip that hangs below.
  const CARD_FO_W = TREE_CONFIG.CARD_WIDTH + 40;
  const CARD_FO_H = CARD_ROW_H * 2 + 40;

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

  // Register the canvas jump API so the rail's "Jump to generation" list can pan
  // the canvas. The rail passes a 1-indexed generation depth; the layout is
  // 0-indexed, so match on depth - 1.
  const registerCanvasApi = canvasBridge?.registerCanvasApi;
  useEffect(() => {
    if (!registerCanvasApi) return undefined;
    registerCanvasApi({
      panToGeneration: (depth: number) => {
        const row = generations.find((g) => g.depth === depth - 1);
        if (row) panTo(row.x, row.y);
      },
    });
    return () => registerCanvasApi(null);
  }, [registerCanvasApi, generations, panTo]);

  /** Center the canvas on a person's household card. */
  const panToPerson = (personId: string) => {
    const target = findContainingNode(layout.nodes, personId);
    if (!target) return;
    panTo(target.x, target.y);
  };

  /** Open a person's record; the effect below centres their household. */
  const handleSelect = (personId: string) => {
    setSelectedPersonId(personId);
  };

  // Centre the open record's household in the canvas. Runs on every selection —
  // a card click, a relation link, or a ?person= from the Members table/search —
  // on the next frame, once the inspector has taken its column, so the node lands
  // in the middle of what's left of the canvas rather than behind the panel.
  useEffect(() => {
    if (!selectedPersonId) return undefined;
    const raf = requestAnimationFrame(() => panToPerson(selectedPersonId));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  // Reflect a ?person= from the URL into the selection (the ⌘K search or a
  // Members-table click pushes it over the current canvas — Spec 07 a1); the
  // centring effect above then frames it.
  useEffect(() => {
    if (personParam) setSelectedPersonId(personParam);
  }, [personParam]);

  // Switching the view re-lays every node, so keep the reader where they were:
  // re-centre on the open record (or their own household, or the root) at the
  // current zoom, instead of leaving the old transform pointing at empty canvas.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return undefined;
    }
    const raf = requestAnimationFrame(() => {
      const anchor =
        (selectedPersonId ? findContainingNode(layout.nodes, selectedPersonId) : null) ??
        (viewerPersonId ? findContainingNode(layout.nodes, viewerPersonId) : null) ??
        layout.root;
      if (anchor) panTo(anchor.x, anchor.y);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

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
            {/* Generation bands — behind the joinery and the cards. */}
            <g className="bands" aria-hidden="true">
              {bands.map((b) => (
                <g key={b.depth}>
                  <rect
                    className={`gen-band gen-band--${b.depth % 2 === 0 ? "even" : "odd"}`}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                  />
                  {horizontal ? (
                    <line
                      className="gen-band-line"
                      x1={b.x}
                      y1={b.y}
                      x2={b.x}
                      y2={b.y + b.height}
                    />
                  ) : (
                    <line className="gen-band-line" x1={b.x} y1={b.y} x2={b.x + b.width} y2={b.y} />
                  )}
                </g>
              ))}
            </g>

            <g className="links">
              {layout.links.map((link) => {
                // Descent runs edge-to-edge between the two cards: bottom→top in
                // the top-down view, right→left in the left→right one (where the
                // cards are centred on their row, so both anchor at node.y).
                const s = horizontal
                  ? { x: link.source.x + TREE_CONFIG.CARD_WIDTH / 2, y: link.source.y }
                  : {
                      x: link.source.x,
                      y: link.source.y - CARD_ROW_H + heightOf(link.source),
                    };
                const t = horizontal
                  ? { x: link.target.x - TREE_CONFIG.CARD_WIDTH / 2, y: link.target.y }
                  : { x: link.target.x, y: link.target.y - CARD_ROW_H };
                const key = `${link.source.data.id}-${link.target.data.id}`;
                const onPath = nodeOnPath(link.source.data) && nodeOnPath(link.target.data);
                return (
                  <TreeLink
                    key={key}
                    d={
                      horizontal
                        ? orthogonalLinkPathH(s, t, { corner: 10 })
                        : orthogonalLinkPath(s, t, { corner: 10 })
                    }
                    trunk={trunkLinks.has(key)}
                    dim={!onPath}
                  />
                );
              })}
              {/* First run (Spec 03 a7): a lone node gets a 44px connector stub
                  going nowhere — what makes the tree feel unfinished, on purpose. */}
              {layout.nodes.length === 1 && layout.nodes[0] && (
                <line
                  className="tree-stub"
                  x1={layout.nodes[0].x}
                  y1={layout.nodes[0].y}
                  x2={layout.nodes[0].x + (horizontal ? 44 : 0)}
                  y2={layout.nodes[0].y + (horizontal ? 0 : 44)}
                />
              )}
            </g>

            <g className="nodes">
              {layout.nodes.map((node) => {
                const model = cards.get(node.data.id);
                if (!model) return null;
                const dim =
                  (attention && !nodeHasAttention(node.data, attention)) ||
                  (placeFilter && !nodeHasPlace(node.data, placeFilter));
                const off = !nodeOnPath(node.data);
                const cls = ["node-wrap", dim && "dimmed", off && "off-path"]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <g
                    key={node.data.id}
                    className={cls}
                    transform={`translate(${node.x},${node.y})`}
                  >
                    <foreignObject
                      className="hcard-fo"
                      x={-CARD_FO_W / 2}
                      y={horizontal ? -CARD_FO_H / 2 : -CARD_ROW_H}
                      width={CARD_FO_W}
                      height={CARD_FO_H}
                    >
                      <div className={`hcard-fo-inner${horizontal ? " hcard-fo-inner--mid" : ""}`}>
                        <HouseholdCard
                          model={model}
                          selectedId={selectedPersonId}
                          onSelect={handleSelect}
                        />
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* The "Jump to generation" list and the attention filter live in the
            rail now (Spec 05 g8 / a8), driven through the canvas bridge. */}

        {/* View switcher — which way the generations run. Top-right of the canvas,
            because it belongs to the drawing, not to the rail's navigation. */}
        <div className="tree-viewswitch">
          <SegmentedControl
            ariaLabel="Tree view"
            options={[
              { value: "vertical", label: "Top-down" },
              { value: "horizontal", label: "Left-right" },
            ]}
            value={orientation}
            onChange={chooseOrientation}
          />
        </div>

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

        {/* Canvas controls (Spec 05 g10) — search the whole tree, then Fit + zoom,
            bottom-centre. The search field opens the same ⌘K palette. */}
        <div className="tree-controls">
          <button
            type="button"
            className="tree-canvas-search"
            onClick={() => window.dispatchEvent(new CustomEvent("vanshavali:open-search"))}
          >
            <span className="tree-canvas-search-icon" aria-hidden="true">
              ⌕
            </span>
            <span className="tree-canvas-search-label">Search the whole tree</span>
          </button>
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
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};

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
