"use client";
import { useEffect, useState } from "react";
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
  provider: MembershipProvider
): UseTreeMembershipResult {
  const [membership, setMembership] = useState<TreeMembership | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!treeId || !uid) {
      setMembership(null);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    const unsubscribe = provider.subscribeToMembership(treeId, uid, (m) => {
      setMembership(m);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [treeId, uid, provider]);

  return { membership, isLoaded };
}
