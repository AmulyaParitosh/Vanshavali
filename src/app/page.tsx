"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import Loading from "../components/Loading";
import type { TreeMeta } from "../types/tree";

/**
 * Landing route — picks a default tree to view, or shows a picker when the
 * user has multiple trees.
 *
 * If the user has exactly one tree (owned or invited), redirects directly to
 * `/tree/{id}`. Otherwise renders the picker.
 */
export default function LandingPage() {
  const { myTrees, currentTreeId, user } = useAppContext();
  const router = useRouter();

  const allTrees = React.useMemo<TreeMeta[]>(() => {
    if (!myTrees) return [];
    return [...myTrees.owned, ...myTrees.member];
  }, [myTrees]);

  useEffect(() => {
    if (!myTrees || !user) return;
    if (allTrees.length === 1) {
      router.replace(`/tree/${allTrees[0]!.id}`);
    } else if (allTrees.length > 1 && currentTreeId) {
      // User has a current tree selected (from prior session) — honor it.
      router.replace(`/tree/${currentTreeId}`);
    }
  }, [myTrees, allTrees, currentTreeId, router, user]);

  if (!user || !myTrees) return <Loading />;

  if (allTrees.length === 0) {
    // Should be rare — auto-provision runs on first sign-in. Surface a
    // recovery path instead of an infinite spinner.
    return (
      <div className="welcome-message">
        <h2>No trees yet</h2>
        <p>Your tree should have been created automatically. Try refreshing.</p>
      </div>
    );
  }

  if (allTrees.length === 1) {
    // Redirect is in flight — render a spinner so we don't flash the picker.
    return <Loading />;
  }

  return (
    <div className="trees-landing">
      <header className="trees-landing-header">
        <span className="eyebrow">Your family trees</span>
        <h1>My trees</h1>
      </header>

      {myTrees.owned.length > 0 && (
        <section className="trees-section">
          <span className="eyebrow">Owned by me</span>
          <ul className="tree-grid">
            {myTrees.owned.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} role="owner" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {myTrees.member.length > 0 && (
        <section className="trees-section">
          <span className="eyebrow">Shared with me</span>
          <ul className="tree-grid">
            {myTrees.member.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} role="member" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TreeCard({ tree, role }: { tree: TreeMeta; role: "owner" | "member" }) {
  // Owner holds the record (keeper chip); a shared tree reads as neutral until
  // the specific per-tree role is resolved on the tree itself.
  const chipClass = role === "owner" ? "chip--keeper" : "chip--read";
  const label = role === "owner" ? "Keeper" : "Member";
  return (
    <Link href={`/tree/${tree.id}`} className="tree-card">
      <h3>{tree.name}</h3>
      <span className={`chip ${chipClass}`}>{label}</span>
    </Link>
  );
}
