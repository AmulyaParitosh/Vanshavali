"use client";

import React from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import { Sidebar, SidebarContent } from "./Sidebar";

/**
 * Sidebar shown under `/user/*` pages. Pre-multi-tenancy this had an admin
 * section linking to global user management / access requests; those routes
 * are gone, replaced (in Phase 9) by per-tree members management.
 */
const UserSidebar: React.FC = () => {
  const { user, handleLogout } = useAppContext();

  if (!user) return null;

  return (
    <Sidebar
      className="user-sidebar-override"
      footer={
        <button onClick={handleLogout} className="btn btn-outline-danger btn-block btn-sm">
          Logout
        </button>
      }
    >
      <SidebarContent>
        <nav className="sidebar-nav">
          <span className="sidebar-divider">Account</span>
          <Link href="/user/profile" className="sidebar-link">
            My Profile
          </Link>
          <Link href="/user/suggestions" className="sidebar-link">
            Feature Requests
          </Link>
        </nav>
      </SidebarContent>
    </Sidebar>
  );
};

export default UserSidebar;
