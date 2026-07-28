"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";

/**
 * The left rail (Spec 00 §02) — 232px of fixed furniture on every tree-scoped
 * screen, part of the shell that never remounts on route change. Carries the
 * identity of the tree and its four — and only four — destinations: Tree,
 * Members, Households, Settings (Spec 00: "Nothing else is ever added here").
 * Members and Households show a count badge.
 */
export default function TreeRail() {
  const pathname = usePathname();
  const { currentTreeId, myTrees, treeData } = useAppContext();

  if (!currentTreeId) return null;

  const allTrees = myTrees ? [...myTrees.owned, ...myTrees.member] : [];
  const tree = allTrees.find((t) => t.id === currentTreeId);
  const peopleCount = treeData?.people.length ?? 0;
  const familyCount = treeData?.families.length ?? 0;

  const base = `/tree/${currentTreeId}`;
  const destinations = [
    { href: base, label: "Tree", glyph: "❦", badge: "" },
    { href: `${base}/members`, label: "Members", glyph: "☰", badge: peopleCount || "" },
    { href: `${base}/families`, label: "Households", glyph: "❀", badge: familyCount || "" },
    { href: `${base}/settings`, label: "Settings", glyph: "✧", badge: "" },
  ];

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
                <span className="tree-rail-glyph" aria-hidden="true">
                  {d.glyph}
                </span>
                <span className="tree-rail-label">{d.label}</span>
                {d.badge !== "" && <span className="tree-rail-badge">{d.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
