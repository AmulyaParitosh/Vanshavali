"use client";
import { useEffect, useState } from "react";
import type { TreeDataProvider, TreeData } from "../services/types";
import { canViewTree } from "../lib/access";

export interface UseTreeSubscriptionResult {
  treeData: TreeData | null;
  /** True once the first subscription tick has delivered data (or role disallows access). */
  isLoaded: boolean;
}

/**
 * Subscribes to live tree data when the user's role permits viewing.
 * Disposes the prior subscription and clears tree data when the role changes
 * away from a viewable one (e.g. an admin demotes a user mid-session).
 *
 * Under the multi-tenancy migration this will gain a `treeId` parameter; for
 * now there is one global tree.
 */
export function useTreeSubscription(
  role: string | null,
  treeProvider: TreeDataProvider
): UseTreeSubscriptionResult {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canViewTree(role)) {
      setTreeData(null);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const unsubscribe = treeProvider.subscribeToTreeData((data) => {
      setTreeData(data);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [role, treeProvider]);

  return { treeData, isLoaded };
}
