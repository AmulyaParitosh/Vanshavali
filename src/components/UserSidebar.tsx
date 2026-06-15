"use client";

import React from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import { USER_ROLES } from "../constants";
import { Sidebar, SidebarContent } from "./Sidebar";
import { stringToColor } from "../utils/colorUtils";

const UserSidebar: React.FC = () => {
  const { user, handleLogout } = useAppContext();
  const userRole = user?.role;
  const isAdmin = userRole === USER_ROLES.ADMIN;

  if (!user) return null;

  const avatarUrl = user.photoURL;
  const initial = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.email
      ? user.email.charAt(0).toUpperCase()
      : "?";
  const avatarColor = stringToColor(user.email || user.displayName || "User");

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

          {isAdmin && (
            <>
              <span className="sidebar-divider">Administration</span>
              <Link href="/user/access_requests" className="sidebar-link">
                Access Requests
              </Link>
              <Link href="/user/management" className="sidebar-link">
                User Management
              </Link>
              <Link href="/user/suggestions" className="sidebar-link">
                Feature Requests
              </Link>
            </>
          )}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
};

export default UserSidebar;
