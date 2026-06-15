"use client";
import { useEffect, useState } from "react";
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
  treeProvider: TreeDataProvider
): UseTreeSubscriptionResult {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!treeId) {
      setTreeData(null);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const unsubscribe = treeProvider.subscribeToTreeData(treeId, (data) => {
      setTreeData(data);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [treeId, treeProvider]);

  return { treeData, isLoaded };
}
