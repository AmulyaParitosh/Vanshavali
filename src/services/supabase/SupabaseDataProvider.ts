import type { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
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
import { SUGGESTION_STATUS } from "../../constants";
import {
  familyToRow,
  personToRow,
  rowToFamily,
  rowToPerson,
  rowToSuggestion,
  rowToTreeInvite,
  rowToTreeMembership,
  rowToTreeMeta,
  type FamilyRow,
  type PersonRow,
  type SuggestionRow,
  type TreeInviteRow,
  type TreeMemberRow,
  type TreeRow,
  type UserRow,
} from "./mappers";
import { subscribeWithRealtime } from "./realtime";

/**
 * Supabase implementation of DataProvider.
 *
 * Queries go through the supabase-js client (there's no ORM) because most
 * operations are client-side and need to go through RLS with the user's JWT.
 * Server-side flows (e.g. invite accept) will live in `/api/*` route handlers
 * with the service role — Phase 10.
 *
 * Realtime subscriptions follow the "initial fetch + watch postgres_changes"
 * pattern from `realtime.ts` so a subscribed callback fires once with current
 * data and again on every change. saveTreeData uses diff-upserts (not whole-
 * collection overwrites) so concurrent editors don't clobber each other.
 */
export class SupabaseDataProvider implements DataProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ----------------------------- UserProvider -----------------------------

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("users")
      .select("email, name, photo_url")
      .eq("uid", uid)
      .maybeSingle<Pick<UserRow, "email" | "name" | "photo_url">>();
    if (error) throw error;
    if (!data) return null;
    return {
      email: data.email,
      name: data.name,
      photoURL: data.photo_url,
    };
  }

  async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    // The on-auth-user trigger in 0001_initial.sql usually creates this row;
    // upsert keeps client-side "make sure profile exists" idempotent.
    const { error } = await this.client.from("users").upsert(
      {
        uid,
        email: profile.email ?? "",
        name: profile.name ?? null,
        photo_url: profile.photoURL ?? null,
      },
      { onConflict: "uid" }
    );
    if (error) throw error;
  }

  // --------------------------- TreeMetaProvider ---------------------------

  async createTree(ownerUid: string, name: string): Promise<TreeMeta> {
    // Delegated to a server-side route so the writes happen with the
    // service-role key. The client-side `.insert()` path fails RLS on
    // projects where PostgREST can't verify the user's JWT (see the route
    // header for the long explanation). Validating identity is the route's
    // job; we just attach the access token and the name.
    const { data: sessionData } = await this.client.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      throw new Error("createTree: no active Supabase session. Sign in first.");
    }
    if (session.user.id !== ownerUid) {
      throw new Error(
        `createTree: ownerUid (${ownerUid}) does not match session uid (${session.user.id}). ` +
          "This usually means React state holds a stale user reference."
      );
    }

    const response = await fetch("/api/tree/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorBody?.error ?? `createTree failed (HTTP ${response.status})`);
    }
    const { tree } = (await response.json()) as { tree: TreeMeta };
    return tree;
  }

  async deleteTree(treeId: string): Promise<void> {
    const { error } = await this.client.from("trees").delete().eq("id", treeId);
    if (error) throw error;
  }

  async getTreeMeta(treeId: string): Promise<TreeMeta | null> {
    const { data, error } = await this.client
      .from("trees")
      .select("*")
      .eq("id", treeId)
      .maybeSingle<TreeRow>();
    if (error) throw error;
    return data ? rowToTreeMeta(data) : null;
  }

  async listMyTrees(uid: string): Promise<MyTrees> {
    // Owned trees: trees.owner_uid = uid
    const { data: ownedRows, error: ownedError } = await this.client
      .from("trees")
      .select("*")
      .eq("owner_uid", uid)
      .returns<TreeRow[]>();
    if (ownedError) throw ownedError;

    // Member-only trees: join through tree_members; exclude owned.
    const { data: memberRows, error: memberError } = await this.client
      .from("tree_members")
      .select("tree:trees(*)")
      .eq("uid", uid)
      .returns<Array<{ tree: TreeRow | null }>>();
    if (memberError) throw memberError;

    const ownedIds = new Set((ownedRows ?? []).map((t) => t.id));
    const memberOnly = (memberRows ?? [])
      .map((r) => r.tree)
      .filter((t): t is TreeRow => !!t && !ownedIds.has(t.id))
      .map(rowToTreeMeta);

    return {
      owned: (ownedRows ?? []).map(rowToTreeMeta),
      member: memberOnly,
    };
  }

  subscribeToMyTrees(uid: string, callback: (trees: MyTrees) => void): () => void {
    return subscribeWithRealtime(
      this.client,
      `my-trees:${uid}`,
      // Anything that affects which trees a user can see touches trees or tree_members.
      [{ table: "trees" }, { table: "tree_members", filter: `uid=eq.${uid}` }],
      () => this.listMyTrees(uid),
      callback
    );
  }

  // --------------------------- TreeDataProvider ---------------------------

  subscribeToTreeData(treeId: string, callback: (data: TreeData) => void): () => void {
    return subscribeWithRealtime(
      this.client,
      `tree-data:${treeId}`,
      [
        { table: "people", filter: `tree_id=eq.${treeId}` },
        { table: "families", filter: `tree_id=eq.${treeId}` },
      ],
      () => this.fetchTreeData(treeId),
      callback
    );
  }

  private async fetchTreeData(treeId: string): Promise<TreeData> {
    const [peopleRes, familiesRes] = await Promise.all([
      this.client.from("people").select("*").eq("tree_id", treeId).returns<PersonRow[]>(),
      this.client.from("families").select("*").eq("tree_id", treeId).returns<FamilyRow[]>(),
    ]);
    if (peopleRes.error) throw peopleRes.error;
    if (familiesRes.error) throw familiesRes.error;
    return {
      people: (peopleRes.data ?? []).map(rowToPerson),
      families: (familiesRes.data ?? []).map(rowToFamily),
    };
  }

  async saveTreeData(treeId: string, data: TreeData): Promise<void> {
    // Diff-based upsert + delete-missing, so two editors saving small changes
    // to different rows don't clobber each other.
    const [{ data: existingPeople }, { data: existingFamilies }] = await Promise.all([
      this.client
        .from("people")
        .select("id")
        .eq("tree_id", treeId)
        .returns<Array<{ id: string }>>(),
      this.client
        .from("families")
        .select("id")
        .eq("tree_id", treeId)
        .returns<Array<{ id: string }>>(),
    ]);

    const peopleToDelete = (existingPeople ?? [])
      .map((r) => r.id)
      .filter((id) => !data.people.some((p) => p.id === id));
    const familiesToDelete = (existingFamilies ?? [])
      .map((r) => r.id)
      .filter((id) => !data.families.some((f) => f.id === id));

    if (data.people.length > 0) {
      const { error } = await this.client
        .from("people")
        .upsert(data.people.map((p) => personToRow(p, treeId)));
      if (error) throw error;
    }
    if (data.families.length > 0) {
      const { error } = await this.client
        .from("families")
        .upsert(data.families.map((f) => familyToRow(f, treeId)));
      if (error) throw error;
    }
    if (peopleToDelete.length > 0) {
      const { error } = await this.client
        .from("people")
        .delete()
        .eq("tree_id", treeId)
        .in("id", peopleToDelete);
      if (error) throw error;
    }
    if (familiesToDelete.length > 0) {
      const { error } = await this.client
        .from("families")
        .delete()
        .eq("tree_id", treeId)
        .in("id", familiesToDelete);
      if (error) throw error;
    }
  }

  async linkUserToPerson(treeId: string, personId: string, uid: string): Promise<void> {
    // Transactional check: only succeed if the row's user_id is still null.
    // The .is("user_id", null) filter is the atomicity guarantee — Postgres
    // evaluates the WHERE under the row's MVCC snapshot.
    const { data, error } = await this.client
      .from("people")
      .update({ user_id: uid })
      .eq("id", personId)
      .eq("tree_id", treeId)
      .is("user_id", null)
      .select("id")
      .returns<Array<{ id: string }>>();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Person not found or already linked to another user.");
    }

    // Mirror the link onto tree_members so a single read of membership
    // resolves "what person represents this user".
    const { error: memberError } = await this.client
      .from("tree_members")
      .update({ person_id: personId })
      .eq("tree_id", treeId)
      .eq("uid", uid);
    if (memberError) throw memberError;
  }

  // -------------------------- MembershipProvider --------------------------

  async getMembership(treeId: string, uid: string): Promise<TreeMembership | null> {
    const { data, error } = await this.client
      .from("tree_members")
      .select("*")
      .eq("tree_id", treeId)
      .eq("uid", uid)
      .maybeSingle<TreeMemberRow>();
    if (error) throw error;
    return data ? rowToTreeMembership(data) : null;
  }

  subscribeToMembership(
    treeId: string,
    uid: string,
    callback: (membership: TreeMembership | null) => void
  ): () => void {
    return subscribeWithRealtime(
      this.client,
      `membership:${treeId}:${uid}`,
      [{ table: "tree_members", filter: `tree_id=eq.${treeId}` }],
      () => this.getMembership(treeId, uid),
      callback
    );
  }

  subscribeToMembers(treeId: string, callback: (members: TreeMembership[]) => void): () => void {
    return subscribeWithRealtime(
      this.client,
      `members:${treeId}`,
      [{ table: "tree_members", filter: `tree_id=eq.${treeId}` }],
      async () => {
        const { data, error } = await this.client
          .from("tree_members")
          .select("*")
          .eq("tree_id", treeId)
          .returns<TreeMemberRow[]>();
        if (error) throw error;
        return (data ?? []).map(rowToTreeMembership);
      },
      callback
    );
  }

  async updateMemberRole(treeId: string, uid: string, role: TreeRole): Promise<void> {
    const { error } = await this.client
      .from("tree_members")
      .update({ role })
      .eq("tree_id", treeId)
      .eq("uid", uid);
    if (error) throw error;
  }

  async removeMember(treeId: string, uid: string): Promise<void> {
    // Don't let the owner be removed — that would orphan the tree.
    const existing = await this.getMembership(treeId, uid);
    if (existing?.role === "owner") {
      throw new Error("Cannot remove the tree owner.");
    }
    const { error } = await this.client
      .from("tree_members")
      .delete()
      .eq("tree_id", treeId)
      .eq("uid", uid);
    if (error) throw error;
  }

  // -------------------------- InvitationProvider --------------------------

  async createInvite(treeId: string, email: string, role: InvitableTreeRole): Promise<TreeInvite> {
    const inviteId = `inv_${nanoid(12)}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessionData } = await this.client.auth.getSession();
    const invitedBy = sessionData.session?.user.id;
    const accessToken = sessionData.session?.access_token;
    if (!invitedBy || !accessToken) throw new Error("Must be signed in to create invites.");

    const { data, error } = await this.client
      .from("tree_invites")
      .insert({
        id: inviteId,
        tree_id: treeId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("*")
      .single<TreeInviteRow>();
    if (error) throw error;

    // Fire the email send via the server route. If it fails, the invite row
    // still exists — surface the error so the caller can mention it, but don't
    // tear the row down (the owner can re-trigger sending later).
    try {
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ inviteId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Email send returned ${res.status}`);
      }
    } catch (sendError: unknown) {
      console.error("Invite email failed", sendError);
      const message = sendError instanceof Error ? sendError.message : "Email send failed";
      throw new Error(`Invite created but email failed to send: ${message}`);
    }

    return rowToTreeInvite(data);
  }

  async acceptInvite(inviteId: string, _uid: string): Promise<TreeMembership> {
    // The invitee can't write tree_members under RLS (owner-only). Go through
    // the server route which uses the service role after validating identity
    // from the bearer token.
    const { data: sessionData } = await this.client.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const uid = sessionData.session?.user.id;
    if (!accessToken || !uid) throw new Error("Sign in to accept this invite.");

    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inviteId }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      treeId?: string;
      role?: string;
      error?: string;
    };
    if (!res.ok || !body.treeId || !body.role) {
      throw new Error(body.error || `Accept failed (${res.status})`);
    }

    return {
      treeId: body.treeId,
      uid,
      role: body.role as TreeMembership["role"],
      joinedAt: Date.now(),
    };
  }

  async revokeInvite(treeId: string, inviteId: string): Promise<void> {
    const { error } = await this.client
      .from("tree_invites")
      .update({ status: "revoked" })
      .eq("tree_id", treeId)
      .eq("id", inviteId);
    if (error) throw error;
  }

  subscribeToInvites(treeId: string, callback: (invites: TreeInvite[]) => void): () => void {
    return subscribeWithRealtime(
      this.client,
      `invites:${treeId}`,
      [{ table: "tree_invites", filter: `tree_id=eq.${treeId}` }],
      async () => {
        const { data, error } = await this.client
          .from("tree_invites")
          .select("*")
          .eq("tree_id", treeId)
          .returns<TreeInviteRow[]>();
        if (error) throw error;
        return (data ?? []).map(rowToTreeInvite);
      },
      callback
    );
  }

  // -------------------------- SuggestionProvider --------------------------

  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    return subscribeWithRealtime(
      this.client,
      `suggestions`,
      [{ table: "suggestions" }],
      async () => {
        const { data, error } = await this.client
          .from("suggestions")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<SuggestionRow[]>();
        if (error) throw error;
        return (data ?? []).map(rowToSuggestion);
      },
      callback
    );
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
    const { error } = await this.client.from("suggestions").update({ status }).eq("id", id);
    if (error) throw error;
  }

  async addSuggestion(suggestion: Omit<Suggestion, "id" | "timestamp">): Promise<void> {
    const id = `sug_${nanoid(10)}`;
    const { data: authData } = await this.client.auth.getUser();
    const uid = authData?.user?.id ?? suggestion.userId;
    const { error } = await this.client.from("suggestions").insert({
      id,
      uid,
      message: suggestion.message,
      status: suggestion.status ?? SUGGESTION_STATUS.UNREAD,
    });
    if (error) throw error;
  }
}
