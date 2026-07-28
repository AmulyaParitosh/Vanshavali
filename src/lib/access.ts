import {
  ROLES_WITH_EDIT_ACCESS,
  ROLES_WITH_OWNER_PRIVILEGES,
  ROLES_WITH_TREE_ACCESS,
} from "../constants";

/** Whether the role can read tree data. */
export function canViewTree(role: string | null | undefined): boolean {
  return !!role && (ROLES_WITH_TREE_ACCESS as readonly string[]).includes(role);
}

/** Whether the role can mutate people / families. */
export function canEdit(role: string | null | undefined): boolean {
  return !!role && (ROLES_WITH_EDIT_ACCESS as readonly string[]).includes(role);
}

/** Whether the role can manage members + delete the tree (owner only for v1). */
export function isOwner(role: string | null | undefined): boolean {
  return !!role && (ROLES_WITH_OWNER_PRIVILEGES as readonly string[]).includes(role);
}

/** Whether the role can invite new members (owner only for v1). */
export function canInvite(role: string | null | undefined): boolean {
  return isOwner(role);
}

/**
 * Whether the uid is on the site-admin allowlist (comma-separated
 * NEXT_PUBLIC_SITE_ADMIN_UIDS). Gates the global suggestions inbox — both the
 * sidebar link and the page itself use this so they can't drift apart.
 */
export function isSiteAdmin(uid: string | null | undefined): boolean {
  if (!uid) return false;
  const allowlist = (process.env.NEXT_PUBLIC_SITE_ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(uid);
}
