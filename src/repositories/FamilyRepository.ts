import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToFamily, familyToRow, type FamilyRow } from "./mappers";
import type { Family } from "../types/family";

/**
 * Data access for the `families` table. Raw SQL in `sql/family/*.sql`; rows are
 * mapped to/from the domain `Family`. Authorization lives in the service layer.
 */
export const FamilyRepository = {
  async listByTree(db: Db, treeId: string): Promise<Family[]> {
    const rows = await query<FamilyRow>(db, sql("family/list-by-tree.sql"), [treeId]);
    return rows.map(rowToFamily);
  },

  async listIdsByTree(db: Db, treeId: string): Promise<string[]> {
    const rows = await query<{ id: string }>(db, sql("family/list-ids.sql"), [treeId]);
    return rows.map((r) => r.id);
  },

  async upsert(db: Db, treeId: string, family: Family): Promise<void> {
    const row = familyToRow(family, treeId);
    await query(db, sql("family/upsert.sql"), [
      row.id,
      row.tree_id,
      row.husband_id,
      row.wife_id,
      row.children,
      row.marriage_date,
      row.marriage_place,
    ]);
  },

  async deleteByIds(db: Db, treeId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await query(db, sql("family/delete-by-ids.sql"), [treeId, ids]);
  },
};
