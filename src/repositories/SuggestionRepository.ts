import type { Db } from "./db";
import { query } from "./db";
import { sql } from "./sql";
import { rowToSuggestion, type SuggestionRow } from "./mappers";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";

/**
 * Data access for the site-level `suggestions` inbox. `listAll` intentionally
 * returns every row — the site-admin gate lives in the service, and the pg
 * connection isn't bound by the self-only RLS the anon client sees.
 */
export const SuggestionRepository = {
  async listAll(db: Db): Promise<Suggestion[]> {
    const rows = await query<SuggestionRow>(db, sql("suggestion/list-all.sql"));
    return rows.map(rowToSuggestion);
  },

  async insert(
    db: Db,
    row: { id: string; uid: string; message: string; status: SuggestionStatus }
  ): Promise<void> {
    await query(db, sql("suggestion/insert.sql"), [row.id, row.uid, row.message, row.status]);
  },

  async updateStatus(db: Db, id: string, status: SuggestionStatus): Promise<void> {
    await query(db, sql("suggestion/update-status.sql"), [id, status]);
  },
};
