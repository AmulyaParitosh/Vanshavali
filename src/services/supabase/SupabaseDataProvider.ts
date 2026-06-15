import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataProvider, TreeData, UserProfile } from "../types";
import type {
  TreeMeta,
  TreeMembership,
  TreeInvite,
  TreeRole,
  InvitableTreeRole,
  MyTrees,
} from "../../types/tree";
import type { Suggestion, SuggestionStatus } from "../../types/suggestion";

/**
 * Supabase implementation of DataProvider.
 *
 * STATUS: Phase 1 scaffold + Phase 8 signature update. Every method throws
 * `NotImplementedError`; the Phase 5 implementation will fill them in against
 * the Drizzle schema in `db/schema.ts`. The signatures here lock in the
 * multi-tenant contract the implementation must satisfy.
 */
export class SupabaseDataProvider implements DataProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ---- UserProvider ----
  getUserProfile(_uid: string): Promise<UserProfile | null> {
    throw notImplemented("getUserProfile");
  }
  createUserProfile(_uid: string, _profile: UserProfile): Promise<void> {
    throw notImplemented("createUserProfile");
  }

  // ---- TreeMetaProvider ----
  createTree(_ownerUid: string, _name: string): Promise<TreeMeta> {
    throw notImplemented("createTree");
  }
  deleteTree(_treeId: string): Promise<void> {
    throw notImplemented("deleteTree");
  }
  getTreeMeta(_treeId: string): Promise<TreeMeta | null> {
    throw notImplemented("getTreeMeta");
  }
  listMyTrees(_uid: string): Promise<MyTrees> {
    throw notImplemented("listMyTrees");
  }
  subscribeToMyTrees(_uid: string, _callback: (trees: MyTrees) => void): () => void {
    throw notImplemented("subscribeToMyTrees");
  }

  // ---- TreeDataProvider ----
  subscribeToTreeData(_treeId: string, _callback: (data: TreeData) => void): () => void {
    throw notImplemented("subscribeToTreeData");
  }
  saveTreeData(_treeId: string, _data: TreeData): Promise<void> {
    throw notImplemented("saveTreeData");
  }
  linkUserToPerson(_treeId: string, _personId: string, _uid: string): Promise<void> {
    throw notImplemented("linkUserToPerson");
  }

  // ---- MembershipProvider ----
  getMembership(_treeId: string, _uid: string): Promise<TreeMembership | null> {
    throw notImplemented("getMembership");
  }
  subscribeToMembership(
    _treeId: string,
    _uid: string,
    _callback: (membership: TreeMembership | null) => void
  ): () => void {
    throw notImplemented("subscribeToMembership");
  }
  subscribeToMembers(_treeId: string, _callback: (members: TreeMembership[]) => void): () => void {
    throw notImplemented("subscribeToMembers");
  }
  updateMemberRole(_treeId: string, _uid: string, _role: TreeRole): Promise<void> {
    throw notImplemented("updateMemberRole");
  }
  removeMember(_treeId: string, _uid: string): Promise<void> {
    throw notImplemented("removeMember");
  }

  // ---- InvitationProvider ----
  createInvite(_treeId: string, _email: string, _role: InvitableTreeRole): Promise<TreeInvite> {
    throw notImplemented("createInvite");
  }
  acceptInvite(_inviteId: string, _uid: string): Promise<TreeMembership> {
    throw notImplemented("acceptInvite");
  }
  revokeInvite(_treeId: string, _inviteId: string): Promise<void> {
    throw notImplemented("revokeInvite");
  }
  subscribeToInvites(_treeId: string, _callback: (invites: TreeInvite[]) => void): () => void {
    throw notImplemented("subscribeToInvites");
  }

  // ---- SuggestionProvider ----
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
    `SupabaseDataProvider.${method} is not yet implemented (Phase 5/6/7 — see docs/ARCHITECTURE.md).`
  );
}
