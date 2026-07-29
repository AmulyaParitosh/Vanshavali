import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Person } from "@/types/person";

/**
 * Spec 03 f4 + a3/e1 — createTree seeds the keeper's root person in the same
 * transaction, REUSING the user's own facts when they already have a person in
 * another tree, and seeding a fresh root from their account name otherwise.
 * Repos + transaction mocked → pure service logic.
 */

const ensure = vi.fn();
const findUser = vi.fn();
const insertTree = vi.fn();
const insertOwner = vi.fn();
const setPersonId = vi.fn();
const listByUser = vi.fn();
const upsert = vi.fn();

vi.mock("@/repositories/db", () => ({
  getPool: () => ({}),
  transaction: (fn: (tx: unknown) => unknown) => fn({}),
}));
vi.mock("@/repositories/UserRepository", () => ({
  UserRepository: {
    ensure: (...a: unknown[]) => ensure(...a),
    find: (...a: unknown[]) => findUser(...a),
  },
}));
vi.mock("@/repositories/TreeRepository", () => ({
  TreeRepository: { insert: (...a: unknown[]) => insertTree(...a) },
}));
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    insertOwner: (...a: unknown[]) => insertOwner(...a),
    setPersonId: (...a: unknown[]) => setPersonId(...a),
  },
}));
vi.mock("@/repositories/PersonRepository", () => ({
  PersonRepository: {
    listByUser: (...a: unknown[]) => listByUser(...a),
    upsert: (...a: unknown[]) => upsert(...a),
  },
}));

import { createTree } from "@/services/tree-service";

beforeEach(() => {
  for (const m of [ensure, findUser, insertTree, insertOwner, setPersonId, listByUser, upsert])
    m.mockReset();
  insertTree.mockResolvedValue({ id: "tree_new", name: "New", ownerUid: "u1" });
});

/** The Person passed to PersonRepository.upsert. */
function upsertedRoot(): Person {
  return upsert.mock.calls[0]![2] as Person;
}

describe("createTree — one-record reuse (a3)", () => {
  it("reuses the user's existing person facts for the new tree's root", async () => {
    listByUser.mockResolvedValue([
      {
        treeId: "tree_a",
        person: {
          id: "p_old",
          name: { official_name: "Devendra Mishra" },
          sex: "M",
          events: [{ type: "Birth", date: "1989", place: "Patna" }],
        },
      },
    ]);
    await createTree("u1", "u1@x.com", "New Tree");

    const root = upsertedRoot();
    expect(root.name.official_name).toBe("Devendra Mishra"); // facts travel
    expect(root.sex).toBe("M");
    expect(root.events).toEqual([{ type: "Birth", date: "1989", place: "Patna" }]);
    expect(root.root).toBe(true);
    expect(root.userId).toBe("u1");
    expect(root.id).not.toBe("p_old"); // a fresh row per tree — the row does not travel
    expect(findUser).not.toHaveBeenCalled(); // reuse path skips the account lookup
    // Membership is linked to the freshly-created root, in the same tree the
    // owner membership + person were written to.
    const treeIdUsed = insertOwner.mock.calls[0]![1] as string;
    expect(upsert.mock.calls[0]![1]).toBe(treeIdUsed);
    expect(setPersonId).toHaveBeenCalledWith(expect.anything(), treeIdUsed, "u1", root.id);
  });

  it("seeds a fresh root from the account name when the user has no person yet", async () => {
    listByUser.mockResolvedValue([]);
    findUser.mockResolvedValue({ name: "Ada Lovelace", email: "ada@x.com", photoURL: null });
    await createTree("u1", "ada@x.com", "New Tree");

    const root = upsertedRoot();
    expect(root.name.official_name).toBe("Ada Lovelace");
    expect(root.root).toBe(true);
    expect(root.userId).toBe("u1");
  });

  it("falls back to the email local part when the account has no name", async () => {
    listByUser.mockResolvedValue([]);
    findUser.mockResolvedValue({ name: null, email: "ada@x.com", photoURL: null });
    await createTree("u1", "ada@x.com", "New Tree");
    expect(upsertedRoot().name.official_name).toBe("ada");
  });

  it("passes the ancestral place through to the tree insert", async () => {
    listByUser.mockResolvedValue([]);
    findUser.mockResolvedValue({ name: "Ada", email: "ada@x.com", photoURL: null });
    await createTree("u1", "ada@x.com", "New Tree", "Madhubani, Bihar");
    expect(insertTree).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      "New Tree",
      "u1",
      "private",
      "Madhubani, Bihar"
    );
  });
});
