import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToUserProfile, type UserRow } from "./mappers";
import type { UserProfile } from "../services/types";

/**
 * Data access for the `users` table (global profile: name/email/photo — roles
 * live on memberships). `ensure` is the non-clobbering "make sure the row
 * exists" used during tree creation; `upsert` writes the full profile.
 */
export const UserRepository = {
  async find(db: Db, uid: string): Promise<UserProfile | null> {
    const rows = await query<UserRow>(db, sql("user/find.sql"), [uid]);
    return rows[0] ? rowToUserProfile(rows[0]) : null;
  },

  async upsert(db: Db, uid: string, profile: UserProfile): Promise<void> {
    await query(db, sql("user/upsert.sql"), [
      uid,
      profile.email ?? "",
      profile.name ?? null,
      profile.photoURL ?? null,
    ]);
  },

  async ensure(db: Db, uid: string, email: string | null): Promise<void> {
    await query(db, sql("user/ensure.sql"), [uid, email ?? ""]);
  },
};
