"use client";
import { useEffect, useState } from "react";
import type { TreeMetaProvider } from "../services/types";
import type { MyTrees } from "../types/tree";

export interface UseMyTreesResult {
  myTrees: MyTrees | null;
  isLoaded: boolean;
}

/**
 * Subscribes to the user's list of trees (owned + invited to). Returns
 * `myTrees: null` until the first response arrives.
 */
export function useMyTrees(
  uid: string | null,
  provider: TreeMetaProvider,
  refreshNonce = 0
): UseMyTreesResult {
  const [myTrees, setMyTrees] = useState<MyTrees | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!uid) {
      setMyTrees(null);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    // No live channel — subscribe does one fetch. refreshNonce bumps re-fetch
    // it after the user's own mutations (see useAuthAndData).
    const unsubscribe = provider.subscribeToMyTrees(uid, (trees) => {
      setMyTrees(trees);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [uid, provider, refreshNonce]);

  return { myTrees, isLoaded };
}
