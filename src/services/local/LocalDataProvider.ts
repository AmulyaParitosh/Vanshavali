import type { DataProvider, TreeData, UserProfile } from "../types";
import type { Suggestion, SuggestionStatus } from "../../types/suggestion";
import type {
  TreeMeta,
  TreeMembership,
  TreeInvite,
  TreeRole,
  InvitableTreeRole,
  MyTrees,
} from "../../types/tree";
import { LOCAL_DATA_CONFIG, SUGGESTION_STATUS, TREE_ROLES } from "../../constants";

const POLL_MS = LOCAL_DATA_CONFIG.POLLING_INTERVAL;
const { GLOBAL_COLLECTIONS, TREE_COLLECTIONS } = LOCAL_DATA_CONFIG;

type UsersBlob = Record<string, UserProfile>;
type TreesBlob = Record<string, TreeMeta>;
type MembersBlob = Record<string, TreeMembership>;
type InvitesBlob = Record<string, TreeInvite>;
type SuggestionsBlob = Record<string, Suggestion>;

/**
 * File-backed mock DataProvider for local dev. Implements the multi-tenant
 * interface against `/api/local/db?collection=...&tree=...`.
 *
 * Subscriptions are 5s-polled and deduped via JSON string comparison — the
 * callback only fires when content actually changes. Each unique subscription
 * key (tree data, my-trees, etc.) shares a single poller across subscribers.
 */
export class LocalDataProvider implements DataProvider {
  // -------- Polling infrastructure --------
  private treeDataSubs = new Map<string, PolledSubscription<TreeData>>();
  private myTreesSubs = new Map<string, PolledSubscription<MyTrees>>();
  private membershipSubs = new Map<string, PolledSubscription<TreeMembership | null>>();
  private membersSubs = new Map<string, PolledSubscription<TreeMembership[]>>();
  private invitesSubs = new Map<string, PolledSubscription<TreeInvite[]>>();
  private suggestionsSub: PolledSubscription<Suggestion[]> | null = null;

  // -------- Low-level fetch / save helpers --------
  private async fetchDb<T>(collection: string, treeId?: string): Promise<T> {
    const params = new URLSearchParams({ collection });
    if (treeId) params.set("tree", treeId);
    const res = await fetch(`/api/local/db?${params.toString()}`);
    return (await res.json()) as T;
  }

  private async saveDb(collection: string, data: unknown, treeId?: string): Promise<void> {
    await fetch("/api/local/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, data, ...(treeId ? { tree: treeId } : {}) }),
    });
  }

  private async deleteTreeDir(treeId: string): Promise<void> {
    await fetch(`/api/local/db?tree=${encodeURIComponent(treeId)}`, { method: "DELETE" });
  }

  // -------- UserProvider --------

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const users = await this.fetchDb<UsersBlob>(GLOBAL_COLLECTIONS.USERS);
    return users[uid] || null;
  }

  async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const users = ((await this.fetchDb<UsersBlob>(GLOBAL_COLLECTIONS.USERS)) || {}) as UsersBlob;
    users[uid] = profile;
    await this.saveDb(GLOBAL_COLLECTIONS.USERS, users);
  }

  // -------- TreeMetaProvider --------

  async createTree(ownerUid: string, name: string): Promise<TreeMeta> {
    const trees = ((await this.fetchDb<TreesBlob>(GLOBAL_COLLECTIONS.TREES)) || {}) as TreesBlob;
    const id = `tree_${ownerUid}_${Date.now().toString(36)}`;
    const meta: TreeMeta = {
      id,
      name,
      ownerUid,
      createdAt: Date.now(),
      visibility: "private",
    };
    trees[id] = meta;
    await this.saveDb(GLOBAL_COLLECTIONS.TREES, trees);

    // Owner becomes the first member.
    const members: MembersBlob = {
      [ownerUid]: {
        treeId: id,
        uid: ownerUid,
        role: TREE_ROLES.OWNER,
        joinedAt: Date.now(),
      },
    };
    await this.saveDb(TREE_COLLECTIONS.MEMBERS, members, id);
    await this.saveDb(TREE_COLLECTIONS.PEOPLE, [], id);
    await this.saveDb(TREE_COLLECTIONS.FAMILIES, [], id);
    return meta;
  }

  async deleteTree(treeId: string): Promise<void> {
    const trees = ((await this.fetchDb<TreesBlob>(GLOBAL_COLLECTIONS.TREES)) || {}) as TreesBlob;
    delete trees[treeId];
    await this.saveDb(GLOBAL_COLLECTIONS.TREES, trees);
    await this.deleteTreeDir(treeId);
  }

  async getTreeMeta(treeId: string): Promise<TreeMeta | null> {
    const trees = ((await this.fetchDb<TreesBlob>(GLOBAL_COLLECTIONS.TREES)) || {}) as TreesBlob;
    return trees[treeId] || null;
  }

  async listMyTrees(uid: string): Promise<MyTrees> {
    const trees = ((await this.fetchDb<TreesBlob>(GLOBAL_COLLECTIONS.TREES)) || {}) as TreesBlob;
    const allTrees = Object.values(trees);

    const owned: TreeMeta[] = [];
    const member: TreeMeta[] = [];

    // A tree is included only if the user has a membership row in it. This
    // matches Supabase mode (which joins through tree_members) and self-heals
    // against orphaned trees — e.g. a tree whose per-tree files were removed
    // out-of-band, where checking ownerUid alone would otherwise lead the UI
    // to pick the orphan as currentTreeId and stall on "Setting up your tree..."
    // because the membership read keeps returning null.
    for (const tree of allTrees) {
      const members = (await this.fetchDb<MembersBlob>(
        TREE_COLLECTIONS.MEMBERS,
        tree.id
      )) as MembersBlob | null;
      if (!members || !members[uid]) continue;

      if (tree.ownerUid === uid) {
        owned.push(tree);
      } else {
        member.push(tree);
      }
    }
    return { owned, member };
  }

  subscribeToMyTrees(uid: string, callback: (trees: MyTrees) => void): () => void {
    return this.share(this.myTreesSubs, uid, () => this.listMyTrees(uid), callback);
  }

  // -------- TreeDataProvider --------

  subscribeToTreeData(treeId: string, callback: (data: TreeData) => void): () => void {
    return this.share(
      this.treeDataSubs,
      treeId,
      async () => {
        const people = (await this.fetchDb<unknown>(TREE_COLLECTIONS.PEOPLE, treeId)) || [];
        const families = (await this.fetchDb<unknown>(TREE_COLLECTIONS.FAMILIES, treeId)) || [];
        return {
          people: Array.isArray(people) ? (people as TreeData["people"]) : [],
          families: Array.isArray(families) ? (families as TreeData["families"]) : [],
        };
      },
      callback
    );
  }

  async saveTreeData(treeId: string, data: TreeData): Promise<void> {
    // Batch into a single request so the temp-file-then-rename sequence on the
    // server side commits both files together (or neither).
    await fetch("/api/local/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          { collection: TREE_COLLECTIONS.PEOPLE, data: data.people, tree: treeId },
          { collection: TREE_COLLECTIONS.FAMILIES, data: data.families, tree: treeId },
        ],
      }),
    });
    this.treeDataSubs.get(treeId)?.refreshNow();
  }

  async linkUserToPerson(treeId: string, personId: string, uid: string): Promise<void> {
    const people = (await this.fetchDb<Array<{ id: string; userId?: string }>>(
      TREE_COLLECTIONS.PEOPLE,
      treeId
    )) as Array<{ id: string; userId?: string }>;

    const personIndex = people.findIndex((p) => p.id === personId);
    if (personIndex === -1) {
      throw new Error("Person not found.");
    }
    if (people[personIndex]!.userId) {
      throw new Error("This person is already linked to a user.");
    }
    people[personIndex]!.userId = uid;
    await this.saveDb(TREE_COLLECTIONS.PEOPLE, people, treeId);

    // Also record the linkage on the membership so a single read of the
    // membership tells us "what person represents this user in this tree".
    const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, treeId)) ||
      {}) as MembersBlob;
    if (members[uid]) {
      members[uid] = { ...members[uid]!, personId };
      await this.saveDb(TREE_COLLECTIONS.MEMBERS, members, treeId);
    }

    this.treeDataSubs.get(treeId)?.refreshNow();
    this.membershipSubs.get(`${treeId}:${uid}`)?.refreshNow();
  }

  // -------- MembershipProvider --------

  async getMembership(treeId: string, uid: string): Promise<TreeMembership | null> {
    const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, treeId)) ||
      {}) as MembersBlob;
    return members[uid] || null;
  }

  subscribeToMembership(
    treeId: string,
    uid: string,
    callback: (membership: TreeMembership | null) => void
  ): () => void {
    return this.share(
      this.membershipSubs,
      `${treeId}:${uid}`,
      () => this.getMembership(treeId, uid),
      callback
    );
  }

  subscribeToMembers(treeId: string, callback: (members: TreeMembership[]) => void): () => void {
    return this.share(
      this.membersSubs,
      treeId,
      async () => {
        const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, treeId)) ||
          {}) as MembersBlob;
        return Object.values(members);
      },
      callback
    );
  }

  async updateMemberRole(treeId: string, uid: string, role: TreeRole): Promise<void> {
    const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, treeId)) ||
      {}) as MembersBlob;
    if (!members[uid]) throw new Error("Member not found.");
    members[uid] = { ...members[uid]!, role };
    await this.saveDb(TREE_COLLECTIONS.MEMBERS, members, treeId);
    this.membersSubs.get(treeId)?.refreshNow();
    this.membershipSubs.get(`${treeId}:${uid}`)?.refreshNow();
  }

  async removeMember(treeId: string, uid: string): Promise<void> {
    const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, treeId)) ||
      {}) as MembersBlob;
    if (members[uid]?.role === TREE_ROLES.OWNER) {
      throw new Error("Cannot remove the tree owner.");
    }
    delete members[uid];
    await this.saveDb(TREE_COLLECTIONS.MEMBERS, members, treeId);
    this.membersSubs.get(treeId)?.refreshNow();
    this.membershipSubs.get(`${treeId}:${uid}`)?.refreshNow();
  }

  // -------- InvitationProvider --------

  async createInvite(treeId: string, email: string, role: InvitableTreeRole): Promise<TreeInvite> {
    const invites = ((await this.fetchDb<InvitesBlob>(TREE_COLLECTIONS.INVITES, treeId)) ||
      {}) as InvitesBlob;
    const id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const invite: TreeInvite = {
      id,
      treeId,
      email: email.toLowerCase(),
      role,
      invitedBy: "", // populated by caller in a future iteration when needed
      status: "pending",
      createdAt: Date.now(),
    };
    invites[id] = invite;
    await this.saveDb(TREE_COLLECTIONS.INVITES, invites, treeId);
    this.invitesSubs.get(treeId)?.refreshNow();
    return invite;
  }

  async acceptInvite(inviteId: string, uid: string): Promise<TreeMembership> {
    // Local mode walks every tree's invites since we don't index by inviteId.
    // Acceptable for dev; Supabase will look up by primary key.
    const trees = ((await this.fetchDb<TreesBlob>(GLOBAL_COLLECTIONS.TREES)) || {}) as TreesBlob;
    for (const tree of Object.values(trees)) {
      const invites = ((await this.fetchDb<InvitesBlob>(TREE_COLLECTIONS.INVITES, tree.id)) ||
        {}) as InvitesBlob;
      const invite = invites[inviteId];
      if (!invite) continue;
      if (invite.status !== "pending") {
        throw new Error(`Invite is ${invite.status}, no longer accepts.`);
      }
      const members = ((await this.fetchDb<MembersBlob>(TREE_COLLECTIONS.MEMBERS, tree.id)) ||
        {}) as MembersBlob;
      const membership: TreeMembership = {
        treeId: tree.id,
        uid,
        role: invite.role,
        joinedAt: Date.now(),
      };
      members[uid] = membership;
      invites[inviteId] = { ...invite, status: "accepted" };
      await this.saveDb(TREE_COLLECTIONS.MEMBERS, members, tree.id);
      await this.saveDb(TREE_COLLECTIONS.INVITES, invites, tree.id);
      this.membersSubs.get(tree.id)?.refreshNow();
      this.invitesSubs.get(tree.id)?.refreshNow();
      return membership;
    }
    throw new Error("Invite not found.");
  }

  async revokeInvite(treeId: string, inviteId: string): Promise<void> {
    const invites = ((await this.fetchDb<InvitesBlob>(TREE_COLLECTIONS.INVITES, treeId)) ||
      {}) as InvitesBlob;
    if (!invites[inviteId]) throw new Error("Invite not found.");
    invites[inviteId] = { ...invites[inviteId]!, status: "revoked" };
    await this.saveDb(TREE_COLLECTIONS.INVITES, invites, treeId);
    this.invitesSubs.get(treeId)?.refreshNow();
  }

  subscribeToInvites(treeId: string, callback: (invites: TreeInvite[]) => void): () => void {
    return this.share(
      this.invitesSubs,
      treeId,
      async () => {
        const invites = ((await this.fetchDb<InvitesBlob>(TREE_COLLECTIONS.INVITES, treeId)) ||
          {}) as InvitesBlob;
        return Object.values(invites);
      },
      callback
    );
  }

  // -------- SuggestionProvider --------

  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    if (!this.suggestionsSub) {
      this.suggestionsSub = new PolledSubscription<Suggestion[]>(async () => {
        const blob = ((await this.fetchDb<SuggestionsBlob>(GLOBAL_COLLECTIONS.SUGGESTIONS)) ||
          {}) as SuggestionsBlob;
        return Object.keys(blob)
          .map((id) => ({
            ...blob[id]!,
            id,
            status: blob[id]!.status || SUGGESTION_STATUS.UNREAD,
          }))
          .sort((a, b) => b.timestamp - (a.timestamp || 0));
      });
    }
    const sub = this.suggestionsSub;
    const unsubscribe = sub.subscribe(callback);
    return () => {
      unsubscribe();
      if (sub.size === 0 && this.suggestionsSub === sub) {
        sub.stop();
        this.suggestionsSub = null;
      }
    };
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
    const suggestions = ((await this.fetchDb<SuggestionsBlob>(GLOBAL_COLLECTIONS.SUGGESTIONS)) ||
      {}) as SuggestionsBlob;
    if (!suggestions[id]) return;
    suggestions[id] = { ...suggestions[id]!, status };
    await this.saveDb(GLOBAL_COLLECTIONS.SUGGESTIONS, suggestions);
    this.suggestionsSub?.refreshNow();
  }

  async addSuggestion(suggestion: Omit<Suggestion, "id" | "timestamp">): Promise<void> {
    const suggestions = ((await this.fetchDb<SuggestionsBlob>(GLOBAL_COLLECTIONS.SUGGESTIONS)) ||
      {}) as SuggestionsBlob;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    suggestions[id] = {
      ...suggestion,
      id,
      timestamp: Date.now(),
    };
    await this.saveDb(GLOBAL_COLLECTIONS.SUGGESTIONS, suggestions);
    this.suggestionsSub?.refreshNow();
  }

  // -------- subscription sharing helper --------

  private share<T>(
    map: Map<string, PolledSubscription<T>>,
    key: string,
    fetcher: () => Promise<T>,
    callback: (value: T) => void
  ): () => void {
    let sub = map.get(key);
    if (!sub) {
      sub = new PolledSubscription<T>(fetcher);
      map.set(key, sub);
    }
    const unsubscribe = sub.subscribe(callback);
    return () => {
      unsubscribe();
      if (sub!.size === 0) {
        sub!.stop();
        map.delete(key);
      }
    };
  }
}

// ---------------------------------------------------------------------------
// PolledSubscription — a small abstraction around the "fetch + dedupe + poll"
// pattern that every subscription in this provider uses.
// ---------------------------------------------------------------------------

class PolledSubscription<T> {
  private subscribers: Set<(value: T) => void> = new Set();
  private interval: NodeJS.Timeout | null = null;
  private last: T | null = null;
  private lastSerialized: string = "";

  constructor(private fetcher: () => Promise<T>) {}

  get size() {
    return this.subscribers.size;
  }

  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.add(callback);

    // Replay cached value immediately so the new subscriber doesn't wait a poll.
    if (this.last !== null) callback(this.last);

    if (!this.interval) {
      void this.tick();
      this.interval = setInterval(() => void this.tick(), POLL_MS);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /** Force an out-of-band refresh — used by mutating ops to deliver new data immediately. */
  refreshNow(): void {
    void this.tick();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.subscribers.clear();
  }

  private async tick() {
    try {
      const value = await this.fetcher();
      const serialized = JSON.stringify(value);
      if (serialized === this.lastSerialized) return;
      this.lastSerialized = serialized;
      this.last = value;
      this.subscribers.forEach((cb) => cb(value));
    } catch (error) {
      console.error("PolledSubscription: fetch failed", error);
    }
  }
}
