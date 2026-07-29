import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Person } from "@/types/person";

/**
 * Spec 12 a5 — the one-record propagation. Editing own facts once writes them to
 * every row linked to the user, across all their trees, preserving each row's
 * tree-owned fields (id, userId, root). Pure fan-out: repo + transaction mocked.
 */

const listByUser = vi.fn();
const upsert = vi.fn();
vi.mock("@/repositories/db", () => ({
  transaction: (fn: (tx: unknown) => unknown) => fn({}),
  getPool: () => ({}),
}));
vi.mock("@/repositories/PersonRepository", () => ({
  PersonRepository: {
    listByUser: (...a: unknown[]) => listByUser(...a),
    upsert: (...a: unknown[]) => upsert(...a),
  },
}));

import { updateOwnRecord } from "@/services/user-record-service";

beforeEach(() => {
  listByUser.mockReset();
  upsert.mockReset();
});

const P = (id: string, extra: Partial<Person>): Person => ({
  id,
  name: { official_name: "Old" },
  sex: "M",
  userId: "u1",
  ...extra,
});

describe("updateOwnRecord", () => {
  it("writes the new own facts to every linked row, keeping id/userId/root", async () => {
    listByUser.mockResolvedValue([
      { treeId: "t1", person: P("p1", { root: true }) },
      { treeId: "t2", person: P("p2", {}) },
    ]);

    const result = await updateOwnRecord("u1", {
      name: { official_name: "New Name" },
      sex: "F",
      events: [{ type: "birth", date: "1990" }],
    });

    expect(result).toEqual({ trees: 2 });
    expect(upsert).toHaveBeenCalledTimes(2);

    const [, tree1, person1] = upsert.mock.calls[0]!;
    expect(tree1).toBe("t1");
    expect(person1).toMatchObject({
      id: "p1",
      userId: "u1",
      root: true, // tree-owned, preserved
      name: { official_name: "New Name" }, // own fact, propagated
      sex: "F",
      events: [{ type: "birth", date: "1990" }],
    });

    const [, tree2, person2] = upsert.mock.calls[1]!;
    expect(tree2).toBe("t2");
    expect(person2).toMatchObject({ id: "p2", name: { official_name: "New Name" } });
    expect(person2).not.toHaveProperty("root"); // p2 wasn't a root — stays not-root
  });

  it("is a no-op that reports zero trees when the user is linked nowhere", async () => {
    listByUser.mockResolvedValue([]);
    const result = await updateOwnRecord("u1", { name: { official_name: "X" }, sex: "M" });
    expect(result).toEqual({ trees: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });
});
