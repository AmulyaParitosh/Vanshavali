import { describe, it, expect, vi } from "vitest";
import { PersonRepository } from "@/repositories/PersonRepository";
import type { Db } from "@/repositories/db";

/**
 * Repository unit tests with a fake Db (an object exposing `query`). They pin
 * the wiring the raw-SQL pattern depends on: the right .sql file is loaded, the
 * bind params go out in the right order, and rows map to domain types. The .sql
 * files themselves are read from disk (process.cwd()), so these also catch a
 * renamed/missing query file.
 */

function fakeDb(rows: unknown[]): { db: Db; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rows });
  return { db: { query } as unknown as Db, query };
}

describe("PersonRepository", () => {
  it("listByTree loads the list SQL with the tree id and maps rows to Person", async () => {
    const { db, query } = fakeDb([
      {
        id: "p1",
        tree_id: "t1",
        data: { name: { official_name: "Asha" }, sex: "F" },
        user_id: null,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ]);

    const people = await PersonRepository.listByTree(db, "t1");

    expect(people).toEqual([{ name: { official_name: "Asha" }, sex: "F", id: "p1" }]);
    const [text, params] = query.mock.calls[0]!;
    expect(text).toMatch(/from people/i);
    expect(params).toEqual(["t1"]);
  });

  it("upsert binds id, tree_id, data(jsonb), user_id in that order", async () => {
    const { db, query } = fakeDb([]);
    await PersonRepository.upsert(db, "t1", {
      id: "p1",
      name: { official_name: "Asha" },
      sex: "F",
      events: [],
      custom_fields: {},
      root: true,
    });

    const [text, params] = query.mock.calls[0]!;
    expect(text).toMatch(/insert into people/i);
    expect(params[0]).toBe("p1");
    expect(params[1]).toBe("t1");
    expect(params[2]).toMatchObject({ name: { official_name: "Asha" }, sex: "F", root: true });
    expect(params[3]).toBeNull();
  });

  it("deleteByIds is a no-op (no query) when the id list is empty", async () => {
    const { db, query } = fakeDb([]);
    await PersonRepository.deleteByIds(db, "t1", []);
    expect(query).not.toHaveBeenCalled();
  });

  it("linkUser returns true only when the atomic update matched a row", async () => {
    const linked = fakeDb([{ id: "p1" }]);
    expect(await PersonRepository.linkUser(linked.db, "t1", "p1", "u1")).toBe(true);

    const notLinked = fakeDb([]);
    expect(await PersonRepository.linkUser(notLinked.db, "t1", "p1", "u1")).toBe(false);
  });
});
