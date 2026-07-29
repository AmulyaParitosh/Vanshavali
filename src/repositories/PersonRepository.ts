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

  /** A single person by (tree, id), or null. Used to surface the fresh record on a stale patch. */
  async find(db: Db, treeId: string, personId: string): Promise<Person | null> {
    const rows = await query<PersonRow>(db, sql("person/find.sql"), [personId, treeId]);
    return rows[0] ? rowToPerson(rows[0]) : null;
  },

  /**
   * Every person row linked to a user, across all their trees, paired with the
   * tree it lives in. Powers the one-record propagation (Spec 12 a5): edit your
   * own facts once, write them to each linked row.
   */
  async listByUser(db: Db, uid: string): Promise<{ treeId: string; person: Person }[]> {
    const rows = await query<PersonRow>(db, sql("person/list-by-user.sql"), [uid]);
    return rows.map((r) => ({ treeId: r.tree_id, person: rowToPerson(r) }));
  },

  /**
   * Optimistic-lock write: applies `person`'s data only if `baseVersion` is still
   * the current version. Returns the fresh Person on success, or null when the
   * base was stale (someone else wrote) — the service turns null into a 409.
   */
  async patch(
    db: Db,
    treeId: string,
    personId: string,
    person: Person,
    baseVersion: number
  ): Promise<Person | null> {
    const row = personToRow(person, treeId);
    const rows = await query<PersonRow>(db, sql("person/patch.sql"), [
      personId,
      treeId,
      row.data,
      baseVersion,
    ]);
    return rows[0] ? rowToPerson(rows[0]) : null;
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
