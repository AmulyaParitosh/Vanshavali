"use client";

import React, { useState } from "react";
import Link from "next/link";

import type { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  userRole: string | null;
  onLogout: () => void;
}

export default function Header({ user, userRole, onLogout }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isAdmin = userRole === "admin";
  const showNav = user && userRole && !["pending", "denied"].includes(userRole);

  return (
    <header className="App-header">
      <div className="header-left">
        {showNav && (
          <>
            <Link href="/" className="btn">
              Tree
            </Link>
            <Link href="/people" className="btn">
              People
            </Link>
            <Link href="/family" className="btn">
              Family
            </Link>
            {isAdmin && (
              <Link href="/admin" className="btn">
                Admin
              </Link>
            )}
          </>
        )}
      </div>
      <h1>Vanshavali</h1>
      <div className="header-right">
        {user && (
          <div className="user-menu">
            <button
              className="btn user-menu-button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              {user.displayName}
            </button>
            {isUserMenuOpen && (
              <div className="user-menu-dropdown">
                <button onClick={onLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
