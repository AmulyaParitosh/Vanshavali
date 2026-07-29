import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Spec 11 — settings writes are keeper-only and server-enforced. updateTreeSettings
 * must reject a non-keeper (a1: everyone else is read-only) and validate the name
 * (non-empty after trim), never touching the repository on a rejection. Repo +
 * membership mocked → pure service logic.
 */

const findMembership = vi.fn();
const patch = vi.fn();
vi.mock("@/repositories/MembershipRepository", () => ({
  MembershipRepository: { find: (...a: unknown[]) => findMembership(...a) },
}));
vi.mock("@/repositories/TreeRepository", () => ({
  TreeRepository: { patch: (...a: unknown[]) => patch(...a) },
}));
vi.mock("@/repositories/db", () => ({ getPool: () => ({}) }));

import { updateTreeSettings } from "@/services/tree-service";
import { HttpError } from "@/lib/api";

beforeEach(() => {
  findMembership.mockReset();
  patch.mockReset();
});

describe("updateTreeSettings (Spec 11 — keeper-only, validated)", () => {
  it("lets the keeper patch one card and returns the fresh meta", async () => {
    findMembership.mockResolvedValue({ treeId: "t1", uid: "u1", role: "owner" });
    patch.mockResolvedValue({ id: "t1", name: "Mishra Parivār", nameOrder: "latin" });
    const meta = await updateTreeSettings("t1", "u1", { nameOrder: "latin" });
    expect(meta.nameOrder).toBe("latin");
    expect(patch).toHaveBeenCalledWith(expect.anything(), "t1", { nameOrder: "latin" });
  });

  it("rejects a writer (editor) — settings are keeper-only (a1)", async () => {
    findMembership.mockResolvedValue({ treeId: "t1", uid: "u2", role: "editor" });
    await expect(updateTreeSettings("t1", "u2", { name: "New" })).rejects.toBeInstanceOf(HttpError);
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects a reader (viewer)", async () => {
    findMembership.mockResolvedValue({ treeId: "t1", uid: "u3", role: "viewer" });
    await expect(updateTreeSettings("t1", "u3", { name: "New" })).rejects.toBeInstanceOf(HttpError);
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects a blank name from the keeper (non-empty after trim)", async () => {
    findMembership.mockResolvedValue({ treeId: "t1", uid: "u1", role: "owner" });
    await expect(updateTreeSettings("t1", "u1", { name: "   " })).rejects.toBeInstanceOf(HttpError);
    expect(patch).not.toHaveBeenCalled();
  });

  it("trims the name before writing", async () => {
    findMembership.mockResolvedValue({ treeId: "t1", uid: "u1", role: "owner" });
    patch.mockResolvedValue({ id: "t1", name: "Mishra Parivār" });
    await updateTreeSettings("t1", "u1", { name: "  Mishra Parivār  " });
    expect(patch).toHaveBeenCalledWith(expect.anything(), "t1", { name: "Mishra Parivār" });
  });
});
