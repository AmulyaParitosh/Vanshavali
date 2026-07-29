import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Spec 12 a6 — self-leave — and Spec 11 a9 — keeper hand-over. Both are pure
 * service logic here (repos + transaction mocked): self-leave removes only the
 * caller's own membership and a keeper can't orphan the tree; hand-over swaps
 * ownership + both roles in one transaction, keeper-only.
 */

const find = vi.fn();
const remove = vi.fn();
const updateRole = vi.fn();
const setOwner = vi.fn();
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    find: (...a: unknown[]) => find(...a),
    remove: (...a: unknown[]) => remove(...a),
    updateRole: (...a: unknown[]) => updateRole(...a),
  },
}));
vi.mock("@/repositories/TreeRepository", () => ({
  TreeRepository: { setOwner: (...a: unknown[]) => setOwner(...a) },
}));
vi.mock("@/repositories/db", () => ({
  getPool: () => ({}),
  transaction: (fn: (tx: unknown) => unknown) => fn({}),
}));

import { leaveTree, handOverKeeper } from "@/services/membership-service";
import { HttpError } from "@/lib/api";

beforeEach(() => {
  find.mockReset();
  remove.mockReset();
  updateRole.mockReset();
  setOwner.mockReset();
});

describe("leaveTree (a6)", () => {
  it("removes the caller's own membership when they are a plain member", async () => {
    find.mockResolvedValue({ treeId: "t1", uid: "u1", role: "editor" });
    await leaveTree("t1", "u1");
    expect(remove).toHaveBeenCalledWith(expect.anything(), "t1", "u1");
  });

  it("blocks a keeper (owner) from leaving and orphaning the tree", async () => {
    find.mockResolvedValue({ treeId: "t1", uid: "u1", role: "owner" });
    await expect(leaveTree("t1", "u1")).rejects.toBeInstanceOf(HttpError);
    expect(remove).not.toHaveBeenCalled();
  });

  it("is a no-op when the caller isn't a member", async () => {
    find.mockResolvedValue(null);
    await leaveTree("t1", "u1");
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("handOverKeeper (Spec 11 a9)", () => {
  // requireOwner + the target lookup both go through find(); branch on the uid.
  const asOwner = (actor: string) =>
    find.mockImplementation((_db: unknown, _t: string, uid: string) =>
      Promise.resolve(uid === actor ? { role: "owner" } : { role: "editor" })
    );

  it("moves ownership and both roles in one go (owner_uid, target→owner, actor→editor)", async () => {
    asOwner("keeper");
    await handOverKeeper("t1", "keeper", "member");
    expect(setOwner).toHaveBeenCalledWith(expect.anything(), "t1", "member");
    expect(updateRole).toHaveBeenCalledWith(expect.anything(), "t1", "member", "owner");
    expect(updateRole).toHaveBeenCalledWith(expect.anything(), "t1", "keeper", "editor");
  });

  it("rejects a non-keeper actor and writes nothing", async () => {
    find.mockResolvedValue({ role: "editor" }); // actor is only a writer
    await expect(handOverKeeper("t1", "writer", "member")).rejects.toBeInstanceOf(HttpError);
    expect(setOwner).not.toHaveBeenCalled();
    expect(updateRole).not.toHaveBeenCalled();
  });

  it("rejects handing over to a non-member", async () => {
    find.mockImplementation((_db: unknown, _t: string, uid: string) =>
      Promise.resolve(uid === "keeper" ? { role: "owner" } : null)
    );
    await expect(handOverKeeper("t1", "keeper", "stranger")).rejects.toBeInstanceOf(HttpError);
    expect(setOwner).not.toHaveBeenCalled();
  });

  it("rejects handing over to yourself", async () => {
    asOwner("keeper");
    await expect(handOverKeeper("t1", "keeper", "keeper")).rejects.toBeInstanceOf(HttpError);
    expect(setOwner).not.toHaveBeenCalled();
  });
});
