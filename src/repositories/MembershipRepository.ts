import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToTreeMembership, type TreeMemberRow } from "./mappers";
import type { TreeMembership } from "../types/tree";

/**
 * Data access for tree_members. Raw SQL lives in `sql/membership/*.sql`; this
 * module runs it and maps rows to the domain `TreeMembership`. More methods
 * (listByTree, updateRole, remove, setPersonId) land with Phase 3 — `find` is
 * here first because the authz layer needs it.
 */
export const MembershipRepository = {
  async find(db: Db, treeId: string, uid: string): Promise<TreeMembership | null> {
    const rows = await query<TreeMemberRow>(db, sql("membership/find.sql"), [treeId, uid]);
    return rows[0] ? rowToTreeMembership(rows[0]) : null;
  },

  async listByTree(db: Db, treeId: string): Promise<TreeMembership[]> {
    const rows = await query<TreeMemberRow>(db, sql("membership/list-by-tree.sql"), [treeId]);
    return rows.map(rowToTreeMembership);
  },

  async updateRole(db: Db, treeId: string, uid: string, role: string): Promise<void> {
    await query(db, sql("membership/update-role.sql"), [treeId, uid, role]);
  },

  async remove(db: Db, treeId: string, uid: string): Promise<void> {
    await query(db, sql("membership/delete.sql"), [treeId, uid]);
  },

  /** Mirror a user→person link onto their membership row's person_id. */
  async setPersonId(db: Db, treeId: string, uid: string, personId: string): Promise<void> {
    await query(db, sql("membership/set-person-id.sql"), [treeId, uid, personId]);
  },

  /** Create the owner membership row during tree creation (idempotent). */
  async insertOwner(db: Db, treeId: string, uid: string): Promise<void> {
    await query(db, sql("membership/insert-owner.sql"), [treeId, uid]);
  },

  /** Create a membership row with an explicit role (idempotent) — invite accept. */
  async insert(db: Db, treeId: string, uid: string, role: string): Promise<void> {
    await query(db, sql("membership/insert.sql"), [treeId, uid, role]);
  },
};
