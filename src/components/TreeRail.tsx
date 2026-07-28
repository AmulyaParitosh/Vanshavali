"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";
import { isOwner } from "../lib/access";

/**
 * The left rail (§03 shell metrics) — 232px of fixed furniture on every
 * tree-scoped screen. Carries the identity of the tree and the four
 * destinations (plus Settings for the owner). Navigation used to live in the
 * top bar; it lives here now so the chrome bar can stay a single quiet lockup.
 */
export default function TreeRail() {
  const pathname = usePathname();
  const { currentTreeId, myTrees, membership, treeData } = useAppContext();

  if (!currentTreeId) return null;

  const allTrees = myTrees ? [...myTrees.owned, ...myTrees.member] : [];
  const tree = allTrees.find((t) => t.id === currentTreeId);
  const peopleCount = treeData?.people.length ?? 0;

  const base = `/tree/${currentTreeId}`;
  const destinations = [
    { href: base, label: "Tree" },
    { href: `${base}/people`, label: "People" },
    { href: `${base}/family`, label: "Family" },
    { href: `${base}/members`, label: "Members" },
  ];
  if (isOwner(membership?.role)) {
    destinations.push({ href: `${base}/settings`, label: "Settings" });
  }

  return (
    <nav className="tree-rail" aria-label="Tree navigation">
      <div className="tree-rail-identity">
        <span className="eyebrow">Tree</span>
        <span className="tree-rail-name">{tree?.name ?? "Tree"}</span>
        {peopleCount > 0 && (
          <span className="tree-rail-meta">
            {peopleCount} {peopleCount === 1 ? "person" : "people"} in the record
          </span>
        )}
      </div>

      <ul className="tree-rail-nav">
        {destinations.map((d) => {
          const active = pathname === d.href;
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                className={`tree-rail-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {d.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="tree-rail-foot">
        <Link href="/about" className={`tree-rail-item${pathname === "/about" ? " active" : ""}`}>
          About
        </Link>
      </div>
    </nav>
  );
}
