"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Bridge between the tree rail (furniture) and the canvas (the page). Spec 05
 * puts the "Jump to generation" list and the attention filter in the rail, but
 * both act on the canvas, which is a sibling under the tree layout. The rail
 * reads the shared attention state and calls the canvas API the canvas registers
 * here; the canvas reads the same attention state to dim non-matching households.
 * Outside the tree layout the context is null and both sections simply don't render.
 */

/** The three "needs attention" lenses (Spec 05 a8). */
export type Attention = "dates" | "account" | "photo";

interface CanvasApi {
  /** Pan the canvas to a generation (1-indexed depth) — the rail's jump action. */
  panToGeneration: (depth: number) => void;
}

interface TreeCanvasValue {
  attention: Attention | null;
  setAttention: React.Dispatch<React.SetStateAction<Attention | null>>;
  /** The canvas registers its API on mount; the rail jumps through it. */
  registerCanvasApi: (api: CanvasApi | null) => void;
  /** The rail calls this; it forwards to the registered canvas API, if any. */
  panToGeneration: (depth: number) => void;
}

const TreeCanvasContext = createContext<TreeCanvasValue | null>(null);

export function TreeCanvasProvider({ children }: { children: React.ReactNode }) {
  const [attention, setAttention] = useState<Attention | null>(null);
  const canvasApiRef = useRef<CanvasApi | null>(null);
  // The ref is mutated only here, inside the hook that owns it.
  const registerCanvasApi = useCallback((api: CanvasApi | null) => {
    canvasApiRef.current = api;
  }, []);
  const panToGeneration = useCallback((depth: number) => {
    canvasApiRef.current?.panToGeneration(depth);
  }, []);
  const value = useMemo(
    () => ({ attention, setAttention, registerCanvasApi, panToGeneration }),
    [attention, registerCanvasApi, panToGeneration]
  );
  return <TreeCanvasContext.Provider value={value}>{children}</TreeCanvasContext.Provider>;
}

export function useTreeCanvas(): TreeCanvasValue | null {
  return useContext(TreeCanvasContext);
}
