"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
 * App header — title, nav, user avatar. Nav links only render when the user
 * is a member of the active tree (i.e. they can actually see / edit something).
 * Phase 9 will replace the static nav with a tree-switcher + scoped routes.
 */
export default function Header({ user, membership }: HeaderProps) {
  const pathname = usePathname();
  const showNav = !!user && canViewTree(membership?.role);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="App-header">
      <div className="header-left-section">
        <h1>{APP_CONFIG.NAME}</h1>
        <div className="header-nav">
          {showNav && (
            <>
              <Link href="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
                Tree
              </Link>
              <Link href="/people" className={`nav-link ${isActive("/people") ? "active" : ""}`}>
                People
              </Link>
              <Link href="/family" className={`nav-link ${isActive("/family") ? "active" : ""}`}>
                Family
              </Link>
              <Link href="/about" className={`nav-link ${isActive("/about") ? "active" : ""}`}>
                About
              </Link>
            </>
          )}
        </div>
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
