import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataProvider, TreeData, UserProfile } from "./types";
import type {
  TreeMeta,
  TreeMembership,
  TreeInvite,
  TreeRole,
  InvitableTreeRole,
  MyTrees,
} from "../types/tree";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";
import { authedFetch } from "./api/authedFetch";
import { formatError } from "../lib/formatError";

/**
 * The client-side DataProvider. Every data read/write goes over HTTP to the
 * `/api/*` routes (→ service → repository → raw SQL), attaching the user's
 * Supabase access token as a bearer via `authedFetch`.
 *
 * supabase-js (`this.client`) is kept only for auth — minting the bearer token
 * for each request (and reading the session uid in acceptInvite).
 *
 * There are no live updates: the tables have no RLS and no anon grants, so the
 * browser can't subscribe to Postgres changes. The `subscribe*` methods do a
 * single fetch and return a no-op unsubscribe; the UI re-fetches after the
 * user's own mutations via the refresh-nonce in AppContext (see useAuthAndData).
 */
export class ApiDataProvider implements DataProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Run the fetcher once and hand the result to the callback. Returns a no-op
   * unsubscribe (guarded so a late fetch after unmount doesn't fire the
   * callback). Every subscribe* method uses this now that there are no channels.
   */
  private subscribeOnce<T>(fetcher: () => Promise<T>, callback: (value: T) => void): () => void {
    let cancelled = false;
    void fetcher()
      .then((value) => {
        if (!cancelled) callback(value);
      })
      .catch((error) => console.error("[subscribeOnce] fetch failed", formatError(error)));
    return () => {
      cancelled = true;
    };
  }

  // ----------------------------- UserProvider -----------------------------

  async getUserProfile(_uid: string): Promise<UserProfile | null> {
    // Self-scoped: the API derives the uid from the bearer token.
    return authedFetch<UserProfile | null>(this.client, "/api/user/profile");
  }

  async createUserProfile(_uid: string, profile: UserProfile): Promise<void> {
    await authedFetch(this.client, "/api/user/profile", { method: "POST", body: profile });
  }

  // --------------------------- TreeMetaProvider ---------------------------

  async createTree(_ownerUid: string, name: string): Promise<TreeMeta> {
    // uid is derived from the bearer token server-side; the argument only
    // satisfies the interface.
    const { tree } = await authedFetch<{ tree: TreeMeta }>(this.client, "/api/tree/create", {
      method: "POST",
      body: { name },
    });
    return tree;
  }

  async deleteTree(treeId: string): Promise<void> {
    await authedFetch(this.client, `/api/tree/${treeId}`, { method: "DELETE" });
  }

  listMyTrees(_uid: string): Promise<MyTrees> {
    return authedFetch<MyTrees>(this.client, "/api/trees");
  }

  subscribeToMyTrees(_uid: string, callback: (trees: MyTrees) => void): () => void {
    return this.subscribeOnce(() => authedFetch<MyTrees>(this.client, "/api/trees"), callback);
  }

  // --------------------------- TreeDataProvider ---------------------------

  subscribeToTreeData(treeId: string, callback: (data: TreeData) => void): () => void {
    return this.subscribeOnce(
      () => authedFetch<TreeData>(this.client, `/api/tree/${treeId}/data`),
      callback
    );
  }

  async saveTreeData(treeId: string, data: TreeData): Promise<void> {
    await authedFetch(this.client, `/api/tree/${treeId}/data`, { method: "PUT", body: data });
  }

  async linkUserToPerson(treeId: string, personId: string, _uid: string): Promise<void> {
    // uid is derived from the bearer token server-side, so a user can only link
    // themselves — the argument is ignored here beyond satisfying the interface.
    await authedFetch(this.client, `/api/tree/${treeId}/link-person`, {
      method: "POST",
      body: { personId },
    });
  }

  // -------------------------- MembershipProvider --------------------------

  getMembership(treeId: string, _uid: string): Promise<TreeMembership | null> {
    // Self-scoped: the API returns the caller's own membership from the token.
    return authedFetch<TreeMembership | null>(this.client, `/api/tree/${treeId}/membership`);
  }

  subscribeToMembership(
    treeId: string,
    _uid: string,
    callback: (membership: TreeMembership | null) => void
  ): () => void {
    return this.subscribeOnce(
      () => authedFetch<TreeMembership | null>(this.client, `/api/tree/${treeId}/membership`),
      callback
    );
  }

  subscribeToMembers(treeId: string, callback: (members: TreeMembership[]) => void): () => void {
    return this.subscribeOnce(
      () => authedFetch<TreeMembership[]>(this.client, `/api/tree/${treeId}/members`),
      callback
    );
  }

  async updateMemberRole(treeId: string, uid: string, role: TreeRole): Promise<void> {
    await authedFetch(this.client, `/api/tree/${treeId}/members/${uid}`, {
      method: "PATCH",
      body: { role },
    });
  }

  async removeMember(treeId: string, uid: string): Promise<void> {
    await authedFetch(this.client, `/api/tree/${treeId}/members/${uid}`, { method: "DELETE" });
  }

  // -------------------------- InvitationProvider --------------------------

  async createInvite(treeId: string, email: string, role: InvitableTreeRole): Promise<TreeInvite> {
    // The server route creates the row and sends the email in one step. A
    // non-empty emailError means the invite exists but the email didn't go out
    // — surface it the way the old flow did (the row still lands via realtime).
    const { invite, emailError } = await authedFetch<{
      invite: TreeInvite;
      emailError?: string;
    }>(this.client, `/api/tree/${treeId}/invites`, {
      method: "POST",
      body: { email, role },
    });
    if (emailError) {
      throw new Error(`Invite created but email failed to send: ${emailError}`);
    }
    return invite;
  }

  async acceptInvite(inviteId: string, _uid: string): Promise<TreeMembership> {
    const { data: sessionData } = await this.client.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) throw new Error("Sign in to accept this invite.");
    const body = await authedFetch<{ treeId: string; role: string }>(
      this.client,
      "/api/invite/accept",
      { method: "POST", body: { inviteId } }
    );
    return {
      treeId: body.treeId,
      uid,
      role: body.role as TreeMembership["role"],
      joinedAt: Date.now(),
    };
  }

  async revokeInvite(treeId: string, inviteId: string): Promise<void> {
    await authedFetch(this.client, `/api/tree/${treeId}/invites/${inviteId}`, {
      method: "DELETE",
    });
  }

  subscribeToInvites(treeId: string, callback: (invites: TreeInvite[]) => void): () => void {
    return this.subscribeOnce(
      () => authedFetch<TreeInvite[]>(this.client, `/api/tree/${treeId}/invites`),
      callback
    );
  }

  // -------------------------- SuggestionProvider --------------------------

  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    return this.subscribeOnce(
      () => authedFetch<Suggestion[]>(this.client, "/api/suggestions"),
      callback
    );
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
    await authedFetch(this.client, `/api/suggestions/${id}`, {
      method: "PATCH",
      body: { status },
    });
  }

  async addSuggestion(suggestion: Omit<Suggestion, "id" | "timestamp">): Promise<void> {
    await authedFetch(this.client, "/api/suggestions", {
      method: "POST",
      body: { message: suggestion.message, status: suggestion.status },
    });
  }
}
