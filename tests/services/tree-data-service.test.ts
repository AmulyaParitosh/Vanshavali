import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Person } from "@/types/person";

/**
 * Locks the one piece of real business logic in tree-data-service: the
 * diff in saveTreeData (upsert everything incoming, delete the rows that are
 * no longer present) and that it authorizes with requireEdit first. The
 * repositories, authz, and the transaction boundary are mocked — this is a
 * pure logic test, not a DB test.
 */

const h = vi.hoisted(() => ({
  requireEdit: vi.fn(),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  person: { listIdsByTree: vi.fn(), upsert: vi.fn(), deleteByIds: vi.fn() },
  family: { listIdsByTree: vi.fn(), upsert: vi.fn(), deleteByIds: vi.fn() },
}));

vi.mock("@/services/authz", () => ({
  requireEdit: h.requireEdit,
  requireView: vi.fn(),
}));
vi.mock("@/repositories/db", () => ({
  getPool: () => ({}),
  transaction: h.transaction,
}));
vi.mock("@/repositories/PersonRepository", () => ({ PersonRepository: h.person }));
vi.mock("@/repositories/FamilyRepository", () => ({ FamilyRepository: h.family }));
vi.mock("@/repositories/MembershipRepository", () => ({ MembershipRepository: {} }));

import { saveTreeData } from "@/services/tree-data-service";

const person = (id: string): Person =>
  ({ id, name: { official_name: id }, sex: "M" }) as unknown as Person;

beforeEach(() => {
  vi.clearAllMocks();
  h.requireEdit.mockResolvedValue("owner");
  h.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
});

describe("saveTreeData", () => {
  it("authorizes with requireEdit, upserts incoming rows, and deletes the absent ones", async () => {
    h.person.listIdsByTree.mockResolvedValue(["p1", "p2", "p3"]);
    h.family.listIdsByTree.mockResolvedValue(["f1"]);

    await saveTreeData("t1", "u1", {
      people: [person("p1"), person("p3")],
      families: [],
    });

    expect(h.requireEdit).toHaveBeenCalledWith("t1", "u1");
    expect(h.person.upsert).toHaveBeenCalledTimes(2);
    // p2 is gone from the incoming set → deleted; p1/p3 kept.
    expect(h.person.deleteByIds).toHaveBeenCalledWith(expect.anything(), "t1", ["p2"]);
    // No incoming families, one existing → f1 deleted.
    expect(h.family.deleteByIds).toHaveBeenCalledWith(expect.anything(), "t1", ["f1"]);
  });

  it("does not upsert or delete when nothing changed", async () => {
    h.person.listIdsByTree.mockResolvedValue(["p1"]);
    h.family.listIdsByTree.mockResolvedValue([]);

    await saveTreeData("t1", "u1", { people: [person("p1")], families: [] });

    expect(h.person.upsert).toHaveBeenCalledTimes(1);
    expect(h.person.deleteByIds).toHaveBeenCalledWith(expect.anything(), "t1", []);
    expect(h.family.deleteByIds).toHaveBeenCalledWith(expect.anything(), "t1", []);
  });
});
