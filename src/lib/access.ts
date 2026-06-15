import {
  ROLES_WITH_EDIT_ACCESS,
  ROLES_WITH_OWNER_PRIVILEGES,
  ROLES_WITH_TREE_ACCESS,
  TREE_ROLES,
  type TreeRoleValue,
} from "../constants";

export type { TreeRoleValue };

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

/** Convenience predicate — has any role at all (not signed out / unjoined). */
export function isMember(role: string | null | undefined): boolean {
  return canViewTree(role);
}

export { TREE_ROLES };
