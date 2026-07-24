/**
 * Applies every SQL file under `db/migrations/` to the Postgres database
 * pointed at by DATABASE_URL, in alphabetical order. Each file runs in its
 * own transaction so a mid-file failure rolls back to a consistent state.
 *
 * Migrations are written idempotently (DROP POLICY IF EXISTS, ON CONFLICT,
 * etc.) so this script is safe to re-run.
 *
 * Drizzle Kit `db:push` handles the table structure for `db/schema.ts` but
 * doesn't generate RLS policies / triggers / storage policies — those live in
 * the `.sql` files and require this runner.
 *
 * Usage:
 *   1. Set DATABASE_URL in .env to your Supabase direct-connection URL.
 *   2. `npm run db:apply-policies`
 *
 * SAFETY: connects with DATABASE_URL — full DB access. Only run against your
 * own Supabase project.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. See .env.sample.");
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const entries = await fs.readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();
  if (sqlFiles.length === 0) {
    console.warn(`No .sql files found in ${migrationsDir}`);
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const dashboardSkipped: string[] = [];

  for (const file of sqlFiles) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    console.log(`Applying ${file}...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      // `storage.objects` is owned by `supabase_storage_admin` on Supabase, and
      // recent projects block direct policy DDL on it from BOTH the direct
      // connection AND the Dashboard SQL editor. The supported path is the
      // Storage Policies UI. Detect that specific error and keep going instead
      // of aborting — the file is a reference, not a runnable migration.
      if (isStorageOwnershipError(error)) {
        console.warn(`  ⚠ ${file}: cannot apply as plain SQL on Supabase`);
        console.warn(`     apply via Dashboard → Storage → <bucket> → Policies → New policy.`);
        console.warn(`     See the header comment in this file for step-by-step.`);
        dashboardSkipped.push(file);
        continue;
      }
      console.error(`  ✗ ${file}:`, error);
      process.exitCode = 1;
      await client.end();
      return;
    }
  }

  await client.end();

  if (dashboardSkipped.length > 0) {
    const dashboardUrl = deriveDashboardSqlUrl();
    console.log("");
    console.log(`Done — but ${dashboardSkipped.length} file(s) still need the dashboard:`);
    for (const file of dashboardSkipped) console.log(`  • db/migrations/${file}`);
    if (dashboardUrl) console.log(`Open: ${dashboardUrl}`);
  } else {
    console.log("Done.");
  }
}

function isStorageOwnershipError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  // 42501 = insufficient_privilege. Match the two storage-specific messages
  // direct-connection clients hit when touching `storage.objects`.
  if (e.code !== "42501") return false;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("must be owner of table objects") || msg.includes("supabase_storage_admin");
}

function deriveDashboardSqlUrl(): string | null {
  // Best-effort: pull the project ref out of NEXT_PUBLIC_SUPABASE_URL and
  // build the SQL editor link. Pure convenience; if env isn't set we just skip.
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!match) return null;
  return `https://supabase.com/dashboard/project/${match[1]}/sql/new`;
}

main();
