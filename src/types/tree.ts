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

/** How names render tree-wide (Spec 11 card 2). Belongs to the tree, not the user. */
export type NameOrder = "devanagari" | "latin" | "latin-only";

/** Tree-level metadata; doesn't include the people/families inside. */
export interface TreeMeta {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: number;
  visibility: "private" | "public" | "unlisted";
  /** Optional ancestral place, shown in the rail meta line (Spec 11 card 1). */
  place?: string;
  /** Name display order applied to every surface (Spec 11 card 2). */
  nameOrder: NameOrder;
  /** Role a new invitation grants unless overridden per person (Spec 11 card 3). */
  defaultInviteRole: InvitableTreeRole;
  /** False hides living relatives' exact dates from readers (Spec 11 card 3 / access-matrix row 4). */
  readersSeeDates: boolean;
  /** Readers may add descendants of their own household (Spec 11 card 3). */
  allowOwnChildren: boolean;
}

/**
 * A keeper's edit to a tree's settings — one patch per card (Spec 11 save
 * model): only the fields the saved card touched are present; absent fields are
 * left unchanged.
 */
export interface TreeSettingsPatch {
  name?: string;
  place?: string;
  nameOrder?: NameOrder;
  defaultInviteRole?: InvitableTreeRole;
  readersSeeDates?: boolean;
  allowOwnChildren?: boolean;
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
  /** The person this invite ties an account to (Spec 06 — fired from a row). */
  personId?: string;
  role: InvitableTreeRole;
  invitedBy: string;
  status: InviteStatus;
  createdAt: number;
  expiresAt?: number;
}

/**
 * What an invitation link reveals from the token alone (Spec 04 step 1) — legible
 * before any sign-in, exposing the tree summary + the offered record + the role,
 * and nothing else about anyone else.
 */
export interface InviteDetail {
  status: "valid" | "expired" | "revoked" | "accepted" | "not_found";
  inviteId: string;
  email?: string;
  role?: InvitableTreeRole;
  inviterName?: string;
  tree?: { id: string; name: string; place?: string; personCount: number };
  offered?: { name: string; birthYear?: string; birthPlace?: string };
}

/** A user's full inventory of trees — owned vs invited. */
export interface MyTrees {
  owned: TreeMeta[];
  member: TreeMeta[];
}

/** One person in a picker card's portrait cluster (Spec 03 card c1). */
export interface TreePortrait {
  id: string;
  name: string;
}

/**
 * A tree as the picker + switcher render it (Spec 03) — the tree, the viewer's
 * role in it, its size, and the first few people for the portrait cluster.
 */
export interface TreeCardSummary {
  id: string;
  name: string;
  place?: string;
  role: TreeRole;
  personCount: number;
  portraits: TreePortrait[];
}
