/**
 * Boundary mappers between Postgres row shapes (snake_case, columns mirror
 * `db/migrations/0001_initial.sql`) and the domain types the rest of the
 * codebase uses (camelCase). Keep the rest of the code free of snake_case
 * knowledge.
 *
 * These are the serialization half of the repository pattern: every repository
 * runs raw SQL and hands the rows through the `rowTo*` functions here.
 */

import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type {
  TreeMeta,
  TreeMembership,
  TreeInvite,
  TreeRole,
  InvitableTreeRole,
  InviteStatus,
} from "../types/tree";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";
import type { UserProfile } from "../services/types";

// ---------------------------------------------------------------------------
// Row shapes (db column names)
// ---------------------------------------------------------------------------

export interface UserRow {
  uid: string;
  email: string;
  name: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface TreeRow {
  id: string;
  name: string;
  owner_uid: string;
  visibility: string;
  created_at: string;
}

export interface TreeMemberRow {
  tree_id: string;
  uid: string;
  role: string;
  person_id: string | null;
  joined_at: string;
}

export interface PersonRow {
  id: string;
  tree_id: string;
  data: Omit<Person, "id" | "userId" | "version">;
  user_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyRow {
  id: string;
  tree_id: string;
  husband_id: string | null;
  wife_id: string | null;
  children: string[];
  created_at: string;
  updated_at: string;
}

export interface TreeInviteRow {
  id: string;
  tree_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export interface SuggestionRow {
  id: string;
  uid: string;
  message: string;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Row → Domain
// ---------------------------------------------------------------------------

export function rowToUserProfile(row: UserRow): UserProfile {
  return {
    email: row.email,
    name: row.name,
    photoURL: row.photo_url,
  };
}

export function rowToTreeMeta(row: TreeRow): TreeMeta {
  return {
    id: row.id,
    name: row.name,
    ownerUid: row.owner_uid,
    visibility: (row.visibility as TreeMeta["visibility"]) ?? "private",
    createdAt: toMillis(row.created_at),
  };
}

export function rowToTreeMembership(row: TreeMemberRow): TreeMembership {
  return {
    treeId: row.tree_id,
    uid: row.uid,
    role: row.role as TreeRole,
    ...(row.person_id ? { personId: row.person_id } : {}),
    joinedAt: toMillis(row.joined_at),
  };
}

export function rowToPerson(row: PersonRow): Person {
  return {
    ...row.data,
    id: row.id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    version: row.version,
  };
}

export function rowToFamily(row: FamilyRow): Family {
  return {
    id: row.id,
    ...(row.husband_id ? { husband: row.husband_id } : {}),
    ...(row.wife_id ? { wife: row.wife_id } : {}),
    children: row.children ?? [],
  };
}

export function rowToTreeInvite(row: TreeInviteRow): TreeInvite {
  return {
    id: row.id,
    treeId: row.tree_id,
    email: row.email,
    role: row.role as InvitableTreeRole,
    invitedBy: row.invited_by,
    status: row.status as InviteStatus,
    createdAt: toMillis(row.created_at),
    ...(row.expires_at ? { expiresAt: toMillis(row.expires_at) } : {}),
  };
}

export function rowToSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    userId: row.uid,
    message: row.message,
    status: row.status as SuggestionStatus,
    timestamp: toMillis(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Domain → Row (for inserts / updates)
// ---------------------------------------------------------------------------

export function personToRow(
  person: Person,
  treeId: string
): Omit<PersonRow, "created_at" | "updated_at" | "version"> {
  // version is a row column, never part of the stored data — strip it here.
  const { id, userId, version: _version, ...rest } = person;
  return {
    id,
    tree_id: treeId,
    data: rest,
    user_id: userId ?? null,
  };
}

export function familyToRow(
  family: Family,
  treeId: string
): Omit<FamilyRow, "created_at" | "updated_at"> {
  return {
    id: family.id,
    tree_id: treeId,
    husband_id: family.husband ?? null,
    wife_id: family.wife ?? null,
    children: family.children ?? [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMillis(timestamptz: string): number {
  return new Date(timestamptz).getTime();
}
