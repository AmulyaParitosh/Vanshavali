"use client";
import { useEffect, useRef, useState } from "react";
import type { TreeData, TreeDataProvider } from "../services/types";

export interface UseTreeSubscriptionResult {
  treeData: TreeData | null;
  isLoaded: boolean;
}

/**
 * Subscribes to live tree data for a specific tree. Returns null and loaded=true
 * when treeId is null (caller hasn't selected a tree yet, e.g. user signed in
 * but currentTreeId hasn't been resolved).
 */
export function useTreeSubscription(
  treeId: string | null,
  treeProvider: TreeDataProvider,
  refreshNonce = 0
): UseTreeSubscriptionResult {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // The tree we last showed the loading gate for. A refreshNonce bump re-fetches
  // in the background (Spec 13: saves re-fetch in place) — the gate must NOT drop
  // then, or the whole page would unmount and lose in-place state (edit drafts,
  // the conflict dialog). Only a genuine tree switch re-gates.
  const gatedTree = useRef<string | null>(null);

  useEffect(() => {
    if (!treeId) {
      setTreeData(null);
      setIsLoaded(true);
      gatedTree.current = null;
      return;
    }

    if (gatedTree.current !== treeId) {
      setIsLoaded(false);
      gatedTree.current = treeId;
    }
    const unsubscribe = treeProvider.subscribeToTreeData(treeId, (data) => {
      setTreeData(data);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [treeId, treeProvider, refreshNonce]);

  return { treeData, isLoaded };
}
