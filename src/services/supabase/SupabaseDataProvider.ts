import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminUser, DataProvider, TreeData, UserProfile } from "../types";
import type { Suggestion, SuggestionStatus } from "../../types/suggestion";

/**
 * Supabase implementation of DataProvider.
 *
 * STATUS: Phase 1 scaffold. The DataProvider interface here is the legacy
 * single-tenant shape; the real implementation in Phase 5 will land alongside
 * the Phase 8 interface updates that introduce per-tree scoping (treeId
 * parameters, new MembershipProvider / InvitationProvider methods).
 *
 * Every method throws `NotImplementedError` for now so any accidental use
 * fails loudly. The methods are listed here as documentation of the surface
 * the Phase 5 implementation must satisfy.
 */
export class SupabaseDataProvider implements DataProvider {
  // Held for the Phase 5 implementation; unused until methods are filled in.
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  getUserProfile(_uid: string): Promise<UserProfile | null> {
    throw notImplemented("getUserProfile");
  }
  createUserProfile(_uid: string, _profile: UserProfile): Promise<void> {
    throw notImplemented("createUserProfile");
  }

  subscribeToTreeData(_callback: (data: TreeData) => void): () => void {
    throw notImplemented("subscribeToTreeData");
  }
  saveTreeData(_data: TreeData): Promise<void> {
    throw notImplemented("saveTreeData");
  }
  linkUserToPerson(_personId: string, _uid: string): Promise<void> {
    throw notImplemented("linkUserToPerson");
  }

  // Legacy admin surface — these will not survive the multi-tenancy migration;
  // they're stubbed here only so this class satisfies the DataProvider
  // interface as it stands today.
  getAllUsers(): Promise<AdminUser[]> {
    throw notImplemented("getAllUsers");
  }
  updateUserRole(_uid: string, _role: string): Promise<void> {
    throw notImplemented("updateUserRole");
  }
  subscribeToPendingCount(_callback: (count: number) => void): () => void {
    throw notImplemented("subscribeToPendingCount");
  }

  subscribeToSuggestions(_callback: (suggestions: Suggestion[]) => void): () => void {
    throw notImplemented("subscribeToSuggestions");
  }
  updateSuggestionStatus(_id: string, _status: SuggestionStatus): Promise<void> {
    throw notImplemented("updateSuggestionStatus");
  }
  addSuggestion(_suggestion: Omit<Suggestion, "id" | "timestamp">): Promise<void> {
    throw notImplemented("addSuggestion");
  }
}

function notImplemented(method: string): Error {
  return new Error(
    `SupabaseDataProvider.${method} is not yet implemented (Phase 5 — see docs/ARCHITECTURE.md).`
  );
}
