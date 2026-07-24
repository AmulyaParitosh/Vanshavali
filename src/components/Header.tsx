"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";
import type { AuthUser } from "../services/types";
import type { TreeMembership } from "../types/tree";
import { APP_CONFIG } from "../constants";
import { canViewTree } from "../lib/access";
import { stringToColor } from "../utils/colorUtils";

interface HeaderProps {
  user: AuthUser | null;
  membership: TreeMembership | null;
  onLogout: () => void;
}

/**
 * App header — logo + tree switcher + scoped nav + user avatar.
 *
 * Nav links resolve against `currentTreeId` so they always point at the active
 * tree (`/tree/{id}/family`, etc.). When the user has more than one tree the
 * tree name in the breadcrumb opens a dropdown to switch.
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

  const showNav = !!user && canViewTree(membership?.role) && !!currentTreeId;
  const allTrees = myTrees ? [...myTrees.owned, ...myTrees.member] : [];
  const currentTree = allTrees.find((t) => t.id === currentTreeId);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="App-header">
      <div className="header-left-section">
        <Link href="/" className="header-title-link">
          <h1>{APP_CONFIG.NAME}</h1>
        </Link>

        {showNav && currentTreeId && (
          <>
            {/* Tree breadcrumb + switcher */}
            <div className="tree-switcher" ref={pickerRef}>
              <button
                type="button"
                className="tree-switcher-button"
                onClick={() => setIsPickerOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={isPickerOpen}
              >
                <span>{currentTree?.name ?? "Tree"}</span>
                <span aria-hidden="true" className="tree-switcher-caret">
                  ▾
                </span>
              </button>
              {isPickerOpen && (
                <ul className="tree-switcher-menu" role="menu">
                  {allTrees.map((tree) => (
                    <li key={tree.id} role="none">
                      <Link
                        href={`/tree/${tree.id}`}
                        className={`tree-switcher-item${
                          tree.id === currentTreeId ? " active" : ""
                        }`}
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

            <div className="header-nav">
              <Link
                href={`/tree/${currentTreeId}`}
                className={`nav-link ${isActive(`/tree/${currentTreeId}`) ? "active" : ""}`}
              >
                Tree
              </Link>
              <Link
                href={`/tree/${currentTreeId}/people`}
                className={`nav-link ${isActive(`/tree/${currentTreeId}/people`) ? "active" : ""}`}
              >
                People
              </Link>
              <Link
                href={`/tree/${currentTreeId}/family`}
                className={`nav-link ${isActive(`/tree/${currentTreeId}/family`) ? "active" : ""}`}
              >
                Family
              </Link>
              <Link
                href={`/tree/${currentTreeId}/members`}
                className={`nav-link ${isActive(`/tree/${currentTreeId}/members`) ? "active" : ""}`}
              >
                Members
              </Link>
              <Link href="/about" className={`nav-link ${isActive("/about") ? "active" : ""}`}>
                About
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="header-right">
        {user && (
          <Link href="/user/profile" className="user-menu-link" aria-label="Profile">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="header-user-avatar"
              />
            ) : (
              <div
                className="header-user-placeholder"
                style={{
                  backgroundColor: stringToColor(user.email || user.displayName || "User"),
                }}
              >
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
