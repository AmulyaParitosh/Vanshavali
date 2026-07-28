"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { isSiteAdmin } from "../lib/access";

/**
 * The account rail shown under `/user/*` — mirrors the tree rail: an identity
 * header, the account destinations, and Sign out pinned at the bottom.
 */
const UserSidebar: React.FC = () => {
  const { user, profile, handleLogout } = useAppContext();
  const pathname = usePathname();

  if (!user) return null;

  const name = profile?.name || user.displayName || "You";
  const email = profile?.email || user.email || "";
  const item = (href: string, label: string) => (
    <li>
      <Link
        href={href}
        className={`tree-rail-item${pathname === href ? " active" : ""}`}
        aria-current={pathname === href ? "page" : undefined}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <nav className="tree-rail" aria-label="Account navigation">
      <div className="account-rail-identity">
        <span className="account-rail-avatar">
          {user.photoURL ? <img src={user.photoURL} alt={name} /> : name.charAt(0).toUpperCase()}
        </span>
        <div className="account-rail-idbody">
          <span className="account-rail-name">{name}</span>
          {email && <span className="account-rail-email">{email}</span>}
        </div>
      </div>

      <ul className="tree-rail-nav">
        {item("/user/profile", "Account")}
        {isSiteAdmin(user.uid) && item("/user/suggestions", "Suggestions")}
      </ul>

      <div className="tree-rail-foot">
        <button type="button" className="btn btn-secondary btn-block btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
};

export default UserSidebar;
