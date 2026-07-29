"use client";

import React, { useRef } from "react";
import { roman } from "../../lib/generations";

/**
 * The generation rail (Spec 05 a7) — the tree's keyboard spine. Each generation
 * is a roman numeral + a household count; focusing one and pressing Enter (or
 * clicking) jumps the canvas to that generation. Arrow Up/Down move between
 * generations without leaving the rail, so the whole tree is reachable from the
 * keyboard even though the canvas itself is a free pan/zoom surface.
 */

export interface GenerationRow {
  depth: number;
  count: number;
  x: number;
  y: number;
}

interface GenerationRailProps {
  generations: GenerationRow[];
  onJump: (x: number, y: number) => void;
}

const GenerationRail: React.FC<GenerationRailProps> = ({ generations, onJump }) => {
  const railRef = useRef<HTMLDivElement>(null);

  const focusRow = (index: number) => {
    const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>(".genrail-row");
    const clamped = Math.max(0, Math.min((buttons?.length ?? 1) - 1, index));
    buttons?.[clamped]?.focus();
  };

  if (generations.length === 0) return null;

  return (
    <nav className="genrail" aria-label="Jump to generation" ref={railRef}>
      {generations.map((g, i) => (
        <button
          key={g.depth}
          type="button"
          className="genrail-row"
          onClick={() => onJump(g.x, g.y)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusRow(i + 1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              focusRow(i - 1);
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onJump(g.x, g.y);
            }
          }}
        >
          <span className="genrail-numeral">{roman(g.depth + 1)}</span>
          <span className="genrail-count">{g.count}</span>
        </button>
      ))}
    </nav>
  );
};

export default GenerationRail;
