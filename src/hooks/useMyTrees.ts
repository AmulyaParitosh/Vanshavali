"use client";
import { useEffect, useRef, useState } from "react";
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
  // Gate only when the user changes — a refreshNonce re-fetch is a background
  // refresh (keeps the list on screen), not a reason to blank the whole page.
  const gatedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setMyTrees(null);
      setIsLoaded(true);
      gatedUid.current = null;
      return;
    }

    if (gatedUid.current !== uid) {
      setIsLoaded(false);
      gatedUid.current = uid;
    }
    // No live channel — subscribe does one fetch. refreshNonce re-fetches it
    // after the user's own mutations (see useAuthAndData).
    const unsubscribe = provider.subscribeToMyTrees(uid, (trees) => {
      setMyTrees(trees);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [uid, provider, refreshNonce]);

  return { myTrees, isLoaded };
}
