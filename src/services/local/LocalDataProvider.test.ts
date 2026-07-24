import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDataProvider } from "./LocalDataProvider";
import { LOCAL_DATA_CONFIG, SUGGESTION_STATUS, TREE_ROLES } from "../../constants";

const { GLOBAL_COLLECTIONS, TREE_COLLECTIONS } = LOCAL_DATA_CONFIG;

/**
 * The LocalDataProvider talks to the local API routes via `fetch`. Tests stub
 * `fetch` with an in-memory file system keyed by (collection, treeId) so the
 * provider's full read/write logic exercises end-to-end without an HTTP server.
 *
 * This is the dev/test double for the entire data model, so a regression here
 * silently breaks every local-mode flow. Worth covering the CRUD paths and the
 * batch-save invariant.
 */

interface Db {
  global: Record<string, unknown>;
  trees: Record<string, Record<string, unknown>>;
}

let db: Db;

function reset(): void {
  db = { global: {}, trees: {} };
}

function installFetchStub(): void {
  const realFetch = globalThis.fetch;

  const stub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";

    if (!url.startsWith("/api/local/db")) {
      return realFetch(input as Request, init);
    }

    const parsed = new URL(url, "http://localhost");
    const collection = parsed.searchParams.get("collection");
    const tree = parsed.searchParams.get("tree");

    if (method === "DELETE") {
      if (tree) delete db.trees[tree];
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (method === "GET") {
      if (!collection) {
        return new Response("missing collection", { status: 400 });
      }
      const value = tree ? (db.trees[tree]?.[collection] ?? null) : (db.global[collection] ?? null);
      return new Response(JSON.stringify(value), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const body = JSON.parse(init?.body as string) as
        | { writes: Array<{ collection: string; data: unknown; tree?: string }> }
        | { collection: string; data: unknown; tree?: string };

      const writes = "writes" in body ? body.writes : [body];
      for (const w of writes) {
        if (w.tree) {
          db.trees[w.tree] = db.trees[w.tree] ?? {};
          db.trees[w.tree]![w.collection] = w.data;
        } else {
          db.global[w.collection] = w.data;
        }
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response("not supported", { status: 405 });
  };

  globalThis.fetch = stub as typeof globalThis.fetch;
}

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  reset();
  originalFetch = globalThis.fetch;
  installFetchStub();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("LocalDataProvider — TreeMetaProvider", () => {
  it("createTree seeds owner membership and empty people / families", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "My family");

    expect(meta.ownerUid).toBe("uid_owner");
    expect(meta.name).toBe("My family");

    const trees = db.global[GLOBAL_COLLECTIONS.TREES] as Record<string, unknown>;
    expect(Object.keys(trees)).toHaveLength(1);
    expect((trees[meta.id] as { ownerUid: string }).ownerUid).toBe("uid_owner");

    const treeFs = db.trees[meta.id]!;
    expect(treeFs[TREE_COLLECTIONS.PEOPLE]).toEqual([]);
    expect(treeFs[TREE_COLLECTIONS.FAMILIES]).toEqual([]);
    const members = treeFs[TREE_COLLECTIONS.MEMBERS] as Record<string, { role: string }>;
    expect(members["uid_owner"]?.role).toBe(TREE_ROLES.OWNER);
  });

  it("listMyTrees splits owned vs invited correctly", async () => {
    const provider = new LocalDataProvider();
    const mine = await provider.createTree("uid_me", "Mine");
    const theirs = await provider.createTree("uid_other", "Theirs");

    // Invite uid_me as editor on theirs.
    const membersBlob = (db.trees[theirs.id]![TREE_COLLECTIONS.MEMBERS] ?? {}) as Record<
      string,
      unknown
    >;
    membersBlob["uid_me"] = {
      treeId: theirs.id,
      uid: "uid_me",
      role: TREE_ROLES.EDITOR,
      joinedAt: Date.now(),
    };
    db.trees[theirs.id]![TREE_COLLECTIONS.MEMBERS] = membersBlob;

    const result = await provider.listMyTrees("uid_me");
    expect(result.owned.map((t) => t.id)).toEqual([mine.id]);
    expect(result.member.map((t) => t.id)).toEqual([theirs.id]);
  });

  it("getTreeMeta returns null when the tree doesn't exist", async () => {
    const provider = new LocalDataProvider();
    expect(await provider.getTreeMeta("does-not-exist")).toBeNull();
  });

  it("listMyTrees excludes an owned tree whose members file is missing (orphan)", async () => {
    // Regression for the "Setting up your tree…" stall: a tree where the global
    // trees blob still references it but the per-tree dir was removed must NOT
    // be picked as currentTreeId, otherwise the membership read returns null
    // forever.
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Real tree");

    // Inject an orphan — meta exists but no members file. Mirrors what a
    // partial cleanup looks like on disk.
    const trees = db.global[GLOBAL_COLLECTIONS.TREES] as Record<string, unknown>;
    trees["tree_orphan"] = {
      id: "tree_orphan",
      name: "Orphan",
      ownerUid: "uid_owner",
      createdAt: 1,
      visibility: "private",
    };

    const result = await provider.listMyTrees("uid_owner");
    expect(result.owned.map((t) => t.id)).toEqual([meta.id]);
    expect(result.owned.some((t) => t.id === "tree_orphan")).toBe(false);
  });

  it("deleteTree removes both the meta and the tree dir", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Doomed");
    expect(db.trees[meta.id]).toBeDefined();

    await provider.deleteTree(meta.id);
    expect(db.trees[meta.id]).toBeUndefined();
    expect(await provider.getTreeMeta(meta.id)).toBeNull();
  });
});

describe("LocalDataProvider — TreeDataProvider", () => {
  it("saveTreeData persists people and families atomically (single batch write)", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");

    const people = [
      {
        id: "p_root",
        name: { official_name: "Owner" },
        sex: "M" as const,
        root: true,
      },
    ];
    const families = [{ id: "f_1", husband: "p_root", children: [] }];

    await provider.saveTreeData(meta.id, { people, families });

    expect(db.trees[meta.id]![TREE_COLLECTIONS.PEOPLE]).toEqual(people);
    expect(db.trees[meta.id]![TREE_COLLECTIONS.FAMILIES]).toEqual(families);
  });

  it("linkUserToPerson refuses to overwrite an existing userId", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");
    await provider.saveTreeData(meta.id, {
      people: [
        {
          id: "p_1",
          name: { official_name: "Alice" },
          sex: "F",
          userId: "uid_old",
        },
      ],
      families: [],
    });

    await expect(provider.linkUserToPerson(meta.id, "p_1", "uid_new")).rejects.toThrow(
      /already linked/
    );
  });

  it("auto-provision sequence leaves membership.personId populated (redirect-loop regression)", async () => {
    // Mirrors useAuthAndData's auto-provision: createTree → saveTreeData with a
    // root person that has NO userId → linkUserToPerson. If the last step is
    // skipped or fails to set membership.personId, the tree view bounces the
    // owner to /user/profile on every visit (the reported navigation bug).
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "My family tree");
    const rootPersonId = `p_uid_owner`;
    await provider.saveTreeData(meta.id, {
      people: [{ id: rootPersonId, name: { official_name: "Me" }, sex: "M", root: true }],
      families: [],
    });
    await provider.linkUserToPerson(meta.id, rootPersonId, "uid_owner");

    const membership = await provider.getMembership(meta.id, "uid_owner");
    expect(membership?.personId).toBe(rootPersonId);

    const people = db.trees[meta.id]![TREE_COLLECTIONS.PEOPLE] as Array<{
      id: string;
      userId?: string;
    }>;
    expect(people.find((p) => p.id === rootPersonId)?.userId).toBe("uid_owner");
  });

  it("linkUserToPerson sets userId AND writes personId on the membership", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");
    await provider.saveTreeData(meta.id, {
      people: [{ id: "p_1", name: { official_name: "Owner" }, sex: "M" }],
      families: [],
    });

    await provider.linkUserToPerson(meta.id, "p_1", "uid_owner");

    const people = db.trees[meta.id]![TREE_COLLECTIONS.PEOPLE] as Array<{
      id: string;
      userId?: string;
    }>;
    expect(people.find((p) => p.id === "p_1")?.userId).toBe("uid_owner");

    const members = db.trees[meta.id]![TREE_COLLECTIONS.MEMBERS] as Record<
      string,
      { personId?: string }
    >;
    expect(members["uid_owner"]?.personId).toBe("p_1");
  });
});

describe("LocalDataProvider — MembershipProvider", () => {
  it("updateMemberRole flips owner → editor without breaking owner uniqueness", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");

    // Add a viewer first.
    const members = db.trees[meta.id]![TREE_COLLECTIONS.MEMBERS] as Record<string, unknown>;
    members["uid_viewer"] = {
      treeId: meta.id,
      uid: "uid_viewer",
      role: TREE_ROLES.VIEWER,
      joinedAt: Date.now(),
    };

    await provider.updateMemberRole(meta.id, "uid_viewer", TREE_ROLES.EDITOR);
    const after = db.trees[meta.id]![TREE_COLLECTIONS.MEMBERS] as Record<string, { role: string }>;
    expect(after["uid_viewer"]?.role).toBe(TREE_ROLES.EDITOR);
  });

  it("removeMember refuses to remove the owner", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");
    await expect(provider.removeMember(meta.id, "uid_owner")).rejects.toThrow(/owner/);
  });
});

describe("LocalDataProvider — InvitationProvider", () => {
  it("createInvite stores email lowercased and accepts moves an invite to accepted", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");

    const invite = await provider.createInvite(meta.id, "Cousin@Family.COM", "editor");
    expect(invite.email).toBe("cousin@family.com");
    expect(invite.status).toBe("pending");

    const membership = await provider.acceptInvite(invite.id, "uid_invitee");
    expect(membership.role).toBe("editor");

    const invites = db.trees[meta.id]![TREE_COLLECTIONS.INVITES] as Record<
      string,
      { status: string }
    >;
    expect(invites[invite.id]?.status).toBe("accepted");
  });

  it("acceptInvite refuses to accept a non-pending invite", async () => {
    const provider = new LocalDataProvider();
    const meta = await provider.createTree("uid_owner", "Tree");
    const invite = await provider.createInvite(meta.id, "x@y.com", "viewer");

    await provider.revokeInvite(meta.id, invite.id);

    await expect(provider.acceptInvite(invite.id, "uid_invitee")).rejects.toThrow(/revoked/);
  });

  it("acceptInvite errors when the invite id is unknown", async () => {
    const provider = new LocalDataProvider();
    await provider.createTree("uid_owner", "Tree");
    await expect(provider.acceptInvite("inv_nope", "uid_invitee")).rejects.toThrow(/not found/);
  });
});

describe("LocalDataProvider — SuggestionProvider", () => {
  it("addSuggestion + updateStatus persist via the global suggestions blob", async () => {
    const provider = new LocalDataProvider();
    await provider.addSuggestion({
      userId: "uid_sender",
      userName: "Sender",
      userEmail: "s@x.com",
      message: "hi",
      status: SUGGESTION_STATUS.UNREAD,
    });
    const stored = db.global[GLOBAL_COLLECTIONS.SUGGESTIONS] as Record<
      string,
      { message: string; status: string }
    >;
    const [id] = Object.keys(stored);
    expect(stored[id!]?.message).toBe("hi");
    expect(stored[id!]?.status).toBe(SUGGESTION_STATUS.UNREAD);

    await provider.updateSuggestionStatus(id!, SUGGESTION_STATUS.READ);
    expect(
      (db.global[GLOBAL_COLLECTIONS.SUGGESTIONS] as Record<string, { status: string }>)[id!]?.status
    ).toBe(SUGGESTION_STATUS.READ);
  });
});
