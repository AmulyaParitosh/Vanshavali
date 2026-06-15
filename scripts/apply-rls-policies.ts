/**
 * Applies the SQL migration in `db/migrations/0001_initial.sql` to the
 * Postgres database pointed at by DATABASE_URL.
 *
 * Drizzle Kit `db:push` handles the table structure, but RLS policies and
 * triggers (auth.users hook, updated_at) aren't generated from the Drizzle
 * schema — they live in the SQL file. This script runs that SQL.
 *
 * Idempotent: every CREATE uses IF NOT EXISTS or DROP-then-CREATE, so you can
 * re-run safely.
 *
 * Usage:
 *   1. Set DATABASE_URL in .env to your Supabase direct-connection URL.
 *   2. `npm run db:apply-policies`
 *
 * SAFETY: this script connects with the credentials in DATABASE_URL. That URL
 * has full DB access — only run against your own Supabase project.
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

  const sqlPath = path.join(process.cwd(), "db", "migrations", "0001_initial.sql");
  const sql = await fs.readFile(sqlPath, "utf8");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log(`Applying ${sqlPath}...`);
  try {
    await client.query(sql);
    console.log("Done. Tables, triggers, and RLS policies are in place.");
  } catch (error) {
    console.error("Failed to apply migration:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
