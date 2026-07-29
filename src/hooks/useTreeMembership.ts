"use client";
import { useEffect, useRef, useState } from "react";
import type { MembershipProvider } from "../services/types";
import type { TreeMembership } from "../types/tree";

export interface UseTreeMembershipResult {
  membership: TreeMembership | null;
  isLoaded: boolean;
}

/**
 * Subscribes to the current user's membership in a specific tree. The hook
 * resolves null when treeId/uid is missing (no tree selected, signed out) and
 * marks isLoaded=true immediately so loading-state derivations don't stall.
 */
export function useTreeMembership(
  treeId: string | null,
  uid: string | null,
  provider: MembershipProvider,
  refreshNonce = 0
): UseTreeMembershipResult {
  const [membership, setMembership] = useState<TreeMembership | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Gate only on a real (tree, user) change — a refreshNonce re-fetch is a
  // background refresh and must not drop the gate (which would unmount the page).
  const gatedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!treeId || !uid) {
      setMembership(null);
      setIsLoaded(true);
      gatedKey.current = null;
      return;
    }

    const key = `${treeId}|${uid}`;
    if (gatedKey.current !== key) {
      setIsLoaded(false);
      gatedKey.current = key;
    }
    const unsubscribe = provider.subscribeToMembership(treeId, uid, (m) => {
      setMembership(m);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [treeId, uid, provider, refreshNonce]);

  return { membership, isLoaded };
}
