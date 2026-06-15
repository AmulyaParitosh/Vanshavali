import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";

export interface TreeData {
  people: Person[];
  families: Family[];
}

export interface UserProfile {
  email: string | null;
  name: string | null;
  role: string;
  personId?: string;
}

export interface AdminUser extends UserProfile {
  uid: string;
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
  signOut(): Promise<void>;
}

// ---------------------------------------------------------------------------
// DataProvider — split per ISP into focused sub-interfaces so consumers can
// narrow their dependency footprint. Implementations (Firebase, local) satisfy
// the combined `DataProvider` type below.
// ---------------------------------------------------------------------------

/** Identity / profile operations scoped to a single user (uid). */
export interface UserProvider {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  createUserProfile(uid: string, profile: UserProfile): Promise<void>;
}

/** Tree data read/write plus the person↔user linkage. */
export interface TreeDataProvider {
  subscribeToTreeData(callback: (data: TreeData) => void): () => void;
  saveTreeData(data: TreeData): Promise<void>;
  linkUserToPerson(personId: string, uid: string): Promise<void>;
}

/**
 * Global admin operations — user listing, role assignment, pending-approval
 * count. These go away once the multi-tenancy migration replaces the global
 * role system with per-tree memberships; for now they're isolated here so the
 * legacy admin pages have a clear dependency.
 */
export interface AdminProvider {
  getAllUsers(): Promise<AdminUser[]>;
  updateUserRole(uid: string, role: string): Promise<void>;
  subscribeToPendingCount(callback: (count: number) => void): () => void;
}

/** Site-level feedback inbox (independent of tree data). */
export interface SuggestionProvider {
  subscribeToSuggestions(
    callback: (suggestions: Suggestion[]) => void
  ): () => void;
  updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void>;
  addSuggestion(
    suggestion: Omit<Suggestion, "id" | "timestamp">
  ): Promise<void>;
}

/**
 * Combined contract that the Firebase / local / future Supabase implementations
 * all satisfy. Prefer typing dependencies against the narrower sub-interfaces
 * (UserProvider, TreeDataProvider, etc.) when you don't need the full surface.
 */
export interface DataProvider
  extends UserProvider,
    TreeDataProvider,
    AdminProvider,
    SuggestionProvider {}

export interface StorageProvider {
  uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }>;
  getDownloadURL(path: string): Promise<string>;
}

export interface ProviderConfig {
  auth: AuthProvider;
  data: DataProvider;
  storage: StorageProvider;
}
