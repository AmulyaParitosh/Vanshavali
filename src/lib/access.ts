import {
  ROLES_WITH_EDIT_ACCESS,
  ROLES_WITH_TREE_ACCESS,
  USER_ROLES,
  type UserRole,
} from "../constants";

export type { UserRole };

/**
 * Whether the role can read tree data (people + families).
 * Pending/denied roles cannot.
 */
export function canViewTree(role: string | null | undefined): boolean {
  return !!role && (ROLES_WITH_TREE_ACCESS as readonly string[]).includes(role);
}

/**
 * Whether the role can mutate tree data via onSave.
 * Editor + admin only. Viewers are read-only.
 */
export function canEdit(role: string | null | undefined): boolean {
  return !!role && (ROLES_WITH_EDIT_ACCESS as readonly string[]).includes(role);
}

/**
 * Whether the role has admin powers (manage users, approve access, etc.).
 * Pre-multi-tenancy this is the global admin role; post-migration this concept
 * splits into per-tree owner (see TreeMembership) and a separate site-admin
 * allowlist.
 */
export function isAdmin(role: string | null | undefined): boolean {
  return role === USER_ROLES.ADMIN;
}
