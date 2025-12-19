"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { User } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { database } from "../lib/firebase";

import { APP_CONFIG, USER_ROLES } from "../constants";

interface HeaderProps {
  user: User | null;
  userRole: string | null;
  onLogout: () => void;
}

export default function Header({ user, userRole, onLogout }: HeaderProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isAdmin = userRole === USER_ROLES.ADMIN;
  const showNav = user && userRole && ![USER_ROLES.PENDING, USER_ROLES.DENIED].includes(userRole);

  useEffect(() => {
    if (isAdmin) {
      const usersRef = ref(database, "users/");
      const unsubscribe = onValue(usersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const count = Object.values(data).filter((u: any) => u.role === 'pending').length;
        setPendingCount(count);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="App-header">
      <div className="header-left">
        {showNav && (
          <>
            <Link href="/" className={`btn ${isActive("/") ? "active" : ""}`}>
              Tree
            </Link>
            <Link href="/people" className={`btn ${isActive("/people") ? "active" : ""}`}>
              People
            </Link>
            <Link href="/family" className={`btn ${isActive("/family") ? "active" : ""}`}>
              Family
            </Link>
            <Link href="/about" className={`btn ${isActive("/about") ? "active" : ""}`}>
              About
            </Link>
          </>
        )}
      </div>
      <h1>{APP_CONFIG.NAME}</h1>
      <div className="header-right">
        {user && (
          <div className="user-menu">
            <button
              className="btn user-menu-button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              {user.displayName}
              {isAdmin && pendingCount > 0 && (
                <span className="notification-badge">
                  {pendingCount}
                </span>
              )}
            </button>
            {isUserMenuOpen && (
              <div className="user-menu-dropdown">
                {isAdmin && (
                  <>
                    <Link 
                      href="/access_requests" 
                      className="menu-link"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Access Requests
                      {pendingCount > 0 && (
                        <span className="notification-badge">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link 
                      href="/user_management" 
                      className="menu-link"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      User Management
                    </Link>
                    <Link 
                      href="/suggestions" 
                      className="menu-link"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Feature Requests
                    </Link>
                    <div className="menu-divider"></div>
                  </>
                )}
                <button 
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }} 
                  className="btn user-menu-button logout-button"
                  style={{ width: '100%', border: 'none', textAlign: 'left', padding: '10px 15px', borderRadius: 'inherit' }}
                >
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
