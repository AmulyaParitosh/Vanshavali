import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Spec 12 a6 — self-leave. The caller removes their OWN membership (self-scoped),
 * the person record is untouched, and a keeper can't leave and orphan the tree.
 * Repo mocked → pure logic.
 */

const find = vi.fn();
const remove = vi.fn();
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    find: (...a: unknown[]) => find(...a),
    remove: (...a: unknown[]) => remove(...a),
  },
}));
vi.mock("@/repositories/db", () => ({ getPool: () => ({}) }));

import { leaveTree } from "@/services/membership-service";
import { HttpError } from "@/lib/api";

beforeEach(() => {
  find.mockReset();
  remove.mockReset();
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
