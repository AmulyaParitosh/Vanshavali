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
        <h1>My Trees</h1>
      </header>

      {myTrees.owned.length > 0 && (
        <section className="trees-section">
          <h2>Owned by me</h2>
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
          <h2>Shared with me</h2>
          <ul className="tree-grid">
            {myTrees.member.map((tree) => (
              <li key={tree.id}>
                <TreeCard tree={tree} role="member" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <style jsx>{`
        .trees-landing {
          padding: var(--space-10);
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .trees-landing-header h1 {
          font-family: var(--font-heading);
          font-size: var(--font-size-3xl);
          margin: 0 0 var(--space-8);
          color: var(--color-text);
        }
        .trees-section {
          margin-bottom: var(--space-10);
        }
        .trees-section h2 {
          font-family: var(--font-heading);
          font-size: var(--font-size-xl);
          color: var(--color-text);
          margin: 0 0 var(--space-4);
        }
        .tree-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }
      `}</style>
    </div>
  );
}

function TreeCard({ tree, role }: { tree: TreeMeta; role: "owner" | "member" }) {
  return (
    <Link href={`/tree/${tree.id}`} className="tree-card">
      <h3>{tree.name}</h3>
      <span className={`tree-card-role tree-card-role--${role}`}>{role}</span>
      <style jsx>{`
        .tree-card {
          display: block;
          padding: var(--space-5);
          background: var(--color-neutral-0);
          border: 1px solid var(--color-neutral-200);
          border-radius: var(--radius-lg);
          color: inherit;
          text-decoration: none;
          transition:
            transform var(--duration-base) var(--ease-standard),
            box-shadow var(--duration-base) var(--ease-standard);
        }
        .tree-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-500);
        }
        .tree-card h3 {
          font-family: var(--font-heading);
          font-size: var(--font-size-lg);
          margin: 0 0 var(--space-2);
          color: var(--color-text);
        }
        .tree-card-role {
          display: inline-block;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-xs);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tree-card-role--owner {
          background: var(--color-primary-50);
          color: var(--color-primary-700);
        }
        .tree-card-role--member {
          background: var(--color-neutral-100);
          color: var(--color-neutral-700);
        }
      `}</style>
    </Link>
  );
}
