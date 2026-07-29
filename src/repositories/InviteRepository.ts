import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToTreeInvite, type TreeInviteRow } from "./mappers";
import type { TreeInvite, InvitableTreeRole, InviteStatus } from "../types/tree";

/**
 * Data access for the `tree_invites` table. Raw SQL in `sql/invite/*.sql`.
 * Authorization (owner-only create/list/revoke, email-match on accept) lives in
 * the invite service.
 */
export const InviteRepository = {
  async insert(
    db: Db,
    invite: {
      id: string;
      treeId: string;
      email: string;
      personId?: string | null;
      role: InvitableTreeRole;
      invitedBy: string;
      expiresAt: string;
    }
  ): Promise<TreeInvite> {
    const rows = await query<TreeInviteRow>(db, sql("invite/insert.sql"), [
      invite.id,
      invite.treeId,
      invite.email,
      invite.personId ?? null,
      invite.role,
      invite.invitedBy,
      invite.expiresAt,
    ]);
    const row = rows[0];
    if (!row) throw new Error("invite insert returned no row");
    return rowToTreeInvite(row);
  },

  async find(db: Db, id: string): Promise<TreeInvite | null> {
    const rows = await query<TreeInviteRow>(db, sql("invite/find.sql"), [id]);
    return rows[0] ? rowToTreeInvite(rows[0]) : null;
  },

  async listByTree(db: Db, treeId: string): Promise<TreeInvite[]> {
    const rows = await query<TreeInviteRow>(db, sql("invite/list-by-tree.sql"), [treeId]);
    return rows.map(rowToTreeInvite);
  },

  async updateStatus(db: Db, id: string, status: InviteStatus): Promise<void> {
    await query(db, sql("invite/update-status.sql"), [id, status]);
  },
};
