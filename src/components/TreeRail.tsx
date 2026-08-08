"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";
import { useTreeCanvas } from "../context/TreeCanvasContext";
import { generationSummaries, roman } from "../lib/generations";
import { canEdit, isOwner } from "../lib/access";
import GettingStarted from "./GettingStarted";

/**
 * The left rail (Spec 00 §02 / Spec 05) — 232px of fixed furniture on every
 * tree-scoped screen, part of the shell that never remounts on route change.
 * Carries the identity of the tree, its four — and only four — destinations
 * (Tree, Members, Households, Settings), the "Jump to generation" list on the
 * canvas route, and the "what's unfinished" zone (getting-started → attention).
 */

/** The viewer's role stated as a meta fragment (Spec 05 rail identity). */
function roleWords(role: string | undefined): string {
  if (isOwner(role ?? "")) return "kept by you";
  if (canEdit(role ?? "")) return "you may write";
  return "read only";
}

/** Where the collapsed/expanded choice is remembered across navigation + reload. */
const RAIL_COLLAPSED_KEY = "vanshavali:tree-rail-collapsed";

export default function TreeRail() {
  const pathname = usePathname();
  const { currentTreeId, myTrees, treeData, membership } = useAppContext();
  const canvas = useTreeCanvas();

  const people = treeData?.people ?? [];
  const families = treeData?.families ?? [];
  const generations = useMemo(() => generationSummaries(people, families), [people, families]);

  // Default to expanded on first load; hydrate the remembered choice after mount
  // (localStorage is client-only, so reading it in an effect avoids a hydration
  // mismatch and keeps the server render — and the e2e default — expanded).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
    } catch {
      /* storage unavailable — stay expanded */
    }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — the choice just won't persist */
      }
      return next;
    });
  };

  if (!currentTreeId) return null;

  const allTrees = myTrees ? [...myTrees.owned, ...myTrees.member] : [];
  const tree = allTrees.find((t) => t.id === currentTreeId);
  const peopleCount = people.length;
  const familyCount = families.length;

  const base = `/tree/${currentTreeId}`;
  const onCanvas = pathname === base;
  const destinations = [
    { href: base, label: "Tree", glyph: "❦", badge: "" },
    { href: `${base}/members`, label: "Members", glyph: "☰", badge: peopleCount || "" },
    { href: `${base}/families`, label: "Households", glyph: "❀", badge: familyCount || "" },
    { href: `${base}/settings`, label: "Settings", glyph: "✧", badge: "" },
  ];

  // Rail identity meta: "N people · N generations · place · your role" (Spec 05).
  const meta = [
    peopleCount > 0 ? `${peopleCount} ${peopleCount === 1 ? "person" : "people"}` : null,
    generations.length > 1 ? `${generations.length} generations` : null,
    tree?.place || null,
    roleWords(membership?.role),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <nav className={`tree-rail${collapsed ? " collapsed" : ""}`} aria-label="Tree navigation">
      <div className="tree-rail-toolbar">
        <button
          type="button"
          className="tree-rail-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      <div className="tree-rail-identity">
        <span className="eyebrow">Tree</span>
        <span className="tree-rail-name">{tree?.name ?? "Tree"}</span>
        {peopleCount > 0 && <span className="tree-rail-meta">{meta}</span>}
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
                aria-label={d.label}
                title={d.label}
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

      {/* Jump to generation (Spec 05 g8) — only on the canvas route; each row
          states the numeral, the year span and the people in it, and jumps the
          canvas there through the shared canvas API. */}
      {onCanvas && generations.length > 0 && (
        <div className="tree-genjump">
          <span className="eyebrow">Jump to generation</span>
          <ul className="tree-genjump-list">
            {generations.map((g) => (
              <li key={g.depth}>
                <button
                  type="button"
                  className="tree-genjump-row"
                  onClick={() => canvas?.panToGeneration(g.depth)}
                >
                  <span className="tree-genjump-numeral">{roman(g.depth)}</span>
                  <span className="tree-genjump-years">{g.span || "—"}</span>
                  <span className="tree-genjump-count">{g.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The rail's "what's unfinished" zone (Spec 00 §02): the getting-started
          checklist while a member is onboarding, the attention filter once it's
          done (Spec 05). One component owns the exclusivity. */}
      <GettingStarted />
    </nav>
  );
}
