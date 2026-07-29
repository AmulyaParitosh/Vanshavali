import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToTreeMeta, type TreeRow } from "./mappers";
import type { TreeMeta, TreeSettingsPatch } from "../types/tree";

/**
 * Data access for the `trees` table. Owned vs member-only listing are two
 * separate queries (`list-owned.sql` / `list-member.sql`); the service composes
 * them into a MyTrees. Authorization lives in the service layer.
 */
export const TreeRepository = {
  async insert(
    db: Db,
    id: string,
    name: string,
    ownerUid: string,
    visibility: string
  ): Promise<TreeMeta> {
    const rows = await query<TreeRow>(db, sql("tree/insert.sql"), [id, name, ownerUid, visibility]);
    const row = rows[0];
    if (!row) throw new Error("tree insert returned no row");
    return rowToTreeMeta(row);
  },

  async findMeta(db: Db, treeId: string): Promise<TreeMeta | null> {
    const rows = await query<TreeRow>(db, sql("tree/find.sql"), [treeId]);
    return rows[0] ? rowToTreeMeta(rows[0]) : null;
  },

  /**
   * Patch a tree's settings (Spec 11). Only the fields present in `patch` are
   * written; the rest are coalesced to their current value, so a per-card Save
   * touches only its own columns. Returns the fresh meta, or null if the tree is gone.
   */
  async patch(db: Db, treeId: string, patch: TreeSettingsPatch): Promise<TreeMeta | null> {
    const rows = await query<TreeRow>(db, sql("tree/patch.sql"), [
      treeId,
      patch.name ?? null,
      patch.place ?? null,
      patch.nameOrder ?? null,
      patch.defaultInviteRole ?? null,
      patch.readersSeeDates ?? null,
      patch.allowOwnChildren ?? null,
    ]);
    return rows[0] ? rowToTreeMeta(rows[0]) : null;
  },

  async delete(db: Db, treeId: string): Promise<void> {
    await query(db, sql("tree/delete.sql"), [treeId]);
  },

  async listOwned(db: Db, uid: string): Promise<TreeMeta[]> {
    const rows = await query<TreeRow>(db, sql("tree/list-owned.sql"), [uid]);
    return rows.map(rowToTreeMeta);
  },

  async listMemberOnly(db: Db, uid: string): Promise<TreeMeta[]> {
    const rows = await query<TreeRow>(db, sql("tree/list-member.sql"), [uid]);
    return rows.map(rowToTreeMeta);
  },
};
