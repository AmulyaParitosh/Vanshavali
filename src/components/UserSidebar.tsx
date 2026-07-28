"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { isSiteAdmin } from "../lib/access";
import { Sidebar, SidebarContent } from "./Sidebar";

/**
 * Sidebar shown under `/user/*` pages. Pre-multi-tenancy this had an admin
 * section linking to global user management / access requests; those routes
 * are gone, replaced by per-tree members management. The suggestions inbox
 * link only shows for allowlisted site admins (same gate as the page itself).
 */
const UserSidebar: React.FC = () => {
  const { user, handleLogout } = useAppContext();
  const pathname = usePathname();

  if (!user) return null;

  const linkClass = (href: string) => `sidebar-link${pathname === href ? " active" : ""}`;

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
          <Link href="/user/profile" className={linkClass("/user/profile")}>
            My Profile
          </Link>
          {isSiteAdmin(user.uid) && (
            <Link href="/user/suggestions" className={linkClass("/user/suggestions")}>
              Suggestions Inbox
            </Link>
          )}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
};

export default UserSidebar;
