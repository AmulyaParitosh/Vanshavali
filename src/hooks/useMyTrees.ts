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
export function useMyTrees(uid: string | null, provider: TreeMetaProvider): UseMyTreesResult {
  const [myTrees, setMyTrees] = useState<MyTrees | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!uid) {
      setMyTrees(null);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const unsubscribe = provider.subscribeToMyTrees(uid, (trees) => {
      setMyTrees(trees);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [uid, provider]);

  return { myTrees, isLoaded };
}
