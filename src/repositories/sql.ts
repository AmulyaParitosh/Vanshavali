import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads a raw `.sql` file from `src/repositories/sql/` once and caches its text.
 * This is the whole "no ORM" story: queries live as plain SQL on disk, a
 * repository calls `sql("person/list-by-tree.sql")` to get the text, runs it
 * through `db.query`, and maps the rows. No query builder, no codegen.
 *
 * Resolved from `process.cwd()` (the project root) so it works under `next dev`,
 * `next start`, and the tsx scripts. A bundled standalone deploy must ship the
 * `src/repositories/sql/` tree alongside the server — noted in docs; hosting is
 * parked for now.
 */

const SQL_DIR = join(process.cwd(), "src", "repositories", "sql");
const cache = new Map<string, string>();

export function sql(name: string): string {
  let text = cache.get(name);
  if (text === undefined) {
    text = readFileSync(join(SQL_DIR, name), "utf8");
    cache.set(name, text);
  }
  return text;
}
