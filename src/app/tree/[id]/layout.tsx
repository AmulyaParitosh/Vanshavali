"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import Loading from "../../../components/Loading";
import TreeRail from "../../../components/TreeRail";
import { TreeCanvasProvider } from "../../../context/TreeCanvasContext";

/**
 * Layout for every `/tree/[id]/*` route.
 *
 * Responsibilities:
 *   1. Bind the URL `[id]` param to `currentTreeId` in AppContext, so child
 *      pages (family, people, members, settings, tree view) read from a single
 *      source rather than each one re-parsing the URL.
 *   2. Gate access by membership — non-members see an access-denied screen
 *      instead of an empty tree.
 *
 * Tree data subscription itself stays inside AppProvider for now so the
 * <Tree> visualization can use it without prop-drilling. A future perf pass
 * could move the subscription here to scope it to tree routes only.
 */
export default function TreeLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const urlTreeId = params?.id ?? null;
  const { currentTreeId, setCurrentTreeId, membership, myTrees } = useAppContext();

  useEffect(() => {
    if (urlTreeId && urlTreeId !== currentTreeId) {
      setCurrentTreeId(urlTreeId);
    }
  }, [urlTreeId, currentTreeId, setCurrentTreeId]);

  // Wait for context to catch up to the URL — first render after navigation.
  if (!urlTreeId || currentTreeId !== urlTreeId) {
    return <Loading />;
  }

  // myTrees not loaded yet — distinct from "loaded and empty".
  if (myTrees === null) return <Loading />;

  // Membership not yet loaded (subscription is mid-flight).
  if (membership === null) {
    const allTreeIds = [...myTrees.owned.map((t) => t.id), ...myTrees.member.map((t) => t.id)];
    if (!allTreeIds.includes(urlTreeId)) {
      return (
        <div className="welcome-message">
          <h2>You don&apos;t have access to this tree</h2>
          <p>Ask the tree owner for an invite.</p>
        </div>
      );
    }
    // Membership row is loading even though we know the user is in the tree.
    return <Loading text="Loading membership..." />;
  }

  return (
    <TreeCanvasProvider>
      <div className="tree-shell">
        <TreeRail />
        <div className="tree-shell-content">{children}</div>
      </div>
    </TreeCanvasProvider>
  );
}
