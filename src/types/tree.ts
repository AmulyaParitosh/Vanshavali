/**
 * Multi-tenancy domain types. Each user can own one or more trees and be
 * invited to others; people / families are tree-scoped; roles live on
 * TreeMembership (per-tree), not on the user.
 *
 * The persistence layer's row shapes are in `db/migrations/0001_initial.sql`;
 * these are the domain-level types the UI and hooks operate against.
 */

export type TreeRole = "owner" | "editor" | "viewer";

/** Roles that can be assigned via invitation (owner is created, not invited). */
export type InvitableTreeRole = Exclude<TreeRole, "owner">;

/** Tree-level metadata; doesn't include the people/families inside. */
export interface TreeMeta {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: number;
  visibility: "private" | "public" | "unlisted";
}

/** A user's role inside a specific tree. */
export interface TreeMembership {
  treeId: string;
  uid: string;
  role: TreeRole;
  personId?: string;
  joinedAt: number;
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface TreeInvite {
  id: string;
  treeId: string;
  email: string;
  role: InvitableTreeRole;
  invitedBy: string;
  status: InviteStatus;
  createdAt: number;
  expiresAt?: number;
}

/** A user's full inventory of trees — owned vs invited. */
export interface MyTrees {
  owned: TreeMeta[];
  member: TreeMeta[];
}
