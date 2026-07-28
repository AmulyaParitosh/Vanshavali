import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToPerson, personToRow, type PersonRow } from "./mappers";
import type { Person } from "../types/person";

/**
 * Data access for the `people` table. Raw SQL in `sql/person/*.sql`; rows are
 * mapped to/from the domain `Person` via the shared mappers. No authorization
 * here — the service layer gates every call.
 */
export const PersonRepository = {
  async listByTree(db: Db, treeId: string): Promise<Person[]> {
    const rows = await query<PersonRow>(db, sql("person/list-by-tree.sql"), [treeId]);
    return rows.map(rowToPerson);
  },

  async listIdsByTree(db: Db, treeId: string): Promise<string[]> {
    const rows = await query<{ id: string }>(db, sql("person/list-ids.sql"), [treeId]);
    return rows.map((r) => r.id);
  },

  async upsert(db: Db, treeId: string, person: Person): Promise<void> {
    const row = personToRow(person, treeId);
    await query(db, sql("person/upsert.sql"), [row.id, row.tree_id, row.data, row.user_id]);
  },

  async deleteByIds(db: Db, treeId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await query(db, sql("person/delete-by-ids.sql"), [treeId, ids]);
  },

  /** Link a user to a person only if it's still unlinked. Returns whether it linked. */
  async linkUser(db: Db, treeId: string, personId: string, uid: string): Promise<boolean> {
    const rows = await query<{ id: string }>(db, sql("person/link-user.sql"), [
      treeId,
      personId,
      uid,
    ]);
    return rows.length > 0;
  },
};
