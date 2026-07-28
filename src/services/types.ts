import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";
import type {
  TreeMeta,
  TreeMembership,
  TreeInvite,
  TreeRole,
  InvitableTreeRole,
  MyTrees,
} from "../types/tree";

export interface TreeData {
  people: Person[];
  families: Family[];
}

/**
 * Global user profile — name, email, photo. Roles live on TreeMembership
 * (per-tree), not here. Pre-multi-tenancy this carried a global role and a
 * personId; both are gone.
 */
export interface UserProfile {
  email: string | null;
  name: string | null;
  photoURL?: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthProvider {
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Set a new password for the signed-in user (the /auth/reset-password flow). */
  updatePassword(newPassword: string): Promise<void>;
  signOut(): Promise<void>;
}

// ---------------------------------------------------------------------------
// DataProvider split per ISP. The combined DataProvider extends all of them
// and is what concrete implementations satisfy. Consumers should type their
// dependency on the narrowest interface they need.
// ---------------------------------------------------------------------------

/** Identity / profile operations scoped to a uid. */
export interface UserProvider {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  createUserProfile(uid: string, profile: UserProfile): Promise<void>;
}

/** Tree lifecycle — creation, deletion, and the user→tree relation. */
export interface TreeMetaProvider {
  createTree(ownerUid: string, name: string): Promise<TreeMeta>;
  deleteTree(treeId: string): Promise<void>;
  listMyTrees(uid: string): Promise<MyTrees>;
  subscribeToMyTrees(uid: string, callback: (trees: MyTrees) => void): () => void;
}

/** Tree-scoped people + families. */
export interface TreeDataProvider {
  subscribeToTreeData(treeId: string, callback: (data: TreeData) => void): () => void;
  saveTreeData(treeId: string, data: TreeData): Promise<void>;
  linkUserToPerson(treeId: string, personId: string, uid: string): Promise<void>;
}

/** Per-tree memberships. */
export interface MembershipProvider {
  getMembership(treeId: string, uid: string): Promise<TreeMembership | null>;
  subscribeToMembership(
    treeId: string,
    uid: string,
    callback: (membership: TreeMembership | null) => void
  ): () => void;
  subscribeToMembers(treeId: string, callback: (members: TreeMembership[]) => void): () => void;
  updateMemberRole(treeId: string, uid: string, role: TreeRole): Promise<void>;
  removeMember(treeId: string, uid: string): Promise<void>;
}

/** Invitations to a tree. */
export interface InvitationProvider {
  createInvite(treeId: string, email: string, role: InvitableTreeRole): Promise<TreeInvite>;
  acceptInvite(inviteId: string, uid: string): Promise<TreeMembership>;
  revokeInvite(treeId: string, inviteId: string): Promise<void>;
  subscribeToInvites(treeId: string, callback: (invites: TreeInvite[]) => void): () => void;
}

/** Site-level feedback inbox (not tree-scoped). */
export interface SuggestionProvider {
  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void;
  updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void>;
  addSuggestion(suggestion: Omit<Suggestion, "id" | "timestamp">): Promise<void>;
}

/**
 * Combined contract that the local / Supabase implementations both satisfy.
 * Prefer typing dependencies against the narrower sub-interfaces above when
 * the caller only needs part of the surface.
 */
export interface DataProvider
  extends
    UserProvider,
    TreeMetaProvider,
    TreeDataProvider,
    MembershipProvider,
    InvitationProvider,
    SuggestionProvider {}

export interface StorageProvider {
  uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }>;
}

export interface ProviderConfig {
  auth: AuthProvider;
  data: DataProvider;
  storage: StorageProvider;
}
