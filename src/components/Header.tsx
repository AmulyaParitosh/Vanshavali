"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";
import type { AuthUser } from "../services/types";
import type { TreeMembership } from "../types/tree";
import { canViewTree } from "../lib/access";

interface HeaderProps {
  user: AuthUser | null;
  membership: TreeMembership | null;
}

/**
 * The chrome bar — the one loud surface (§04). 60px of darkened Madhubani
 * banner closed with a 2px red rule. Holds the wordmark lockup (the single
 * place the two scripts stack, and the one place marigold sits on near-black
 * and passes contrast), the tree switcher, and the signed-in avatar.
 *
 * Per-tree navigation lives in the rail (`TreeRail`), not here.
 */
export default function Header({ user, membership }: HeaderProps) {
  const pathname = usePathname();
  const { currentTreeId, myTrees } = useAppContext();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!isPickerOpen) return undefined;
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isPickerOpen]);

  // Close on navigation.
  useEffect(() => {
    setIsPickerOpen(false);
  }, [pathname]);

  // The tree picker (`/` and `/trees`, Spec 03 a4) carries no tree switcher: a
  // control that needs a tree isn't drawn where there isn't one. The Account
  // area (`/user/*`) keeps it, though — it's the only way back into a tree from
  // there — provided there's a current tree to switch to and view access to it.
  const treelessRoute = !!pathname && (pathname === "/" || pathname.startsWith("/trees"));
  const showTreeSwitcher =
    !!user && canViewTree(membership?.role) && !!currentTreeId && !treelessRoute;
  const allTrees = myTrees ? [...myTrees.owned, ...myTrees.member] : [];
  const currentTree = allTrees.find((t) => t.id === currentTreeId);

  return (
    <header className="chrome-bar">
      <div className="chrome-bar-banner" aria-hidden="true" />

      <Link href="/" className="chrome-wordmark">
        <span className="mark">Vanshavali</span>
        <span className="script" lang="hi">
          वंशावली
        </span>
      </Link>

      {showTreeSwitcher && currentTreeId && (
        <div className="chrome-treeswitcher" ref={pickerRef}>
          <button
            type="button"
            className="chrome-treeswitcher-button"
            onClick={() => setIsPickerOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={isPickerOpen}
          >
            <span>{currentTree?.name ?? "Tree"}</span>
            <span aria-hidden="true" className="caret">
              ▾
            </span>
          </button>
          {isPickerOpen && (
            <ul className="tree-switcher-menu" role="menu">
              {allTrees.map((tree) => (
                <li key={tree.id} role="none">
                  <Link
                    href={`/tree/${tree.id}`}
                    className={`tree-switcher-item${tree.id === currentTreeId ? " active" : ""}`}
                    role="menuitem"
                  >
                    {tree.name}
                  </Link>
                </li>
              ))}
              <li role="none" className="tree-switcher-separator" />
              <li role="none">
                <Link href="/" className="tree-switcher-item" role="menuitem">
                  All trees…
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* The search trigger was removed from the top nav by request; ⌘K still
       * opens the palette (CommandSearch listens globally) and the tree canvas
       * carries its own "Search the whole tree" field. */}

      <div className="chrome-spacer" />

      {user && (
        <Link href="/user/profile" className="chrome-avatar-link" aria-label="Your profile">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || "You"} className="chrome-avatar" />
          ) : (
            <span className="chrome-avatar chrome-avatar--placeholder">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </span>
          )}
        </Link>
      )}
    </header>
  );
}
