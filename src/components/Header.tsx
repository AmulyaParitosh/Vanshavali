"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppContext } from "../context/AppContext";
import type { AuthUser } from "../services/types";
import { APP_CONFIG, USER_ROLES } from "../constants";
import { stringToColor } from "../utils/colorUtils";

interface HeaderProps {
  user: AuthUser | null;
  userRole: string | null;
  onLogout: () => void;
}

export default function Header({ user, userRole, onLogout }: HeaderProps) {
  const { dataProvider } = useAppContext();
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isAdmin = userRole === USER_ROLES.ADMIN;
  const gateRoles: readonly string[] = [USER_ROLES.PENDING, USER_ROLES.DENIED];
  const showNav = !!user && !!userRole && !gateRoles.includes(userRole);

  useEffect(() => {
    if (isAdmin) {
      const unsubscribe = dataProvider.subscribeToPendingCount((count) => {
        setPendingCount(count);
      });
      return () => unsubscribe();
    }
    return undefined;
  }, [isAdmin, dataProvider]);

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
          <Link href="/user/profile" className="user-menu-link">
             {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="header-user-avatar" />
              ) : (
                <div className="header-user-placeholder" style={{ backgroundColor: stringToColor(user.email || user.displayName || "User") }}>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
          </Link>
        )}
      </div>
    </header>
  );
}
