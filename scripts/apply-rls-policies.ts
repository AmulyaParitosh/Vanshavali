/**
 * Applies every SQL file under `db/migrations/` to the active target's Postgres
 * database (see scripts/env.ts — driven by NEXT_PUBLIC_ENV), in alphabetical
 * order. Each file runs in its own transaction so a mid-file failure rolls back
 * to a consistent state.
 *
 * Migrations are written idempotently (DROP POLICY IF EXISTS, ON CONFLICT,
 * etc.) so this is safe to re-run. `db/migrations/0001_initial.sql` is the
 * single source of truth for the schema: it creates the tables (CREATE TABLE
 * IF NOT EXISTS) alongside the RLS policies, triggers, and helper functions.
 *
 * Run standalone via `npm run db:apply-policies`, or imported by db-setup.ts.
 * Cloud runs prompt for confirmation (see confirmCloudTarget); local runs are
 * silent.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { confirmCloudTarget, isMain, resolveTarget, targetLabel, type DbTarget } from "./env";

export async function applyPolicies(target: DbTarget): Promise<void> {
  if (!target.databaseUrl) {
    throw new Error(
      target.env === "cloud"
        ? "DATABASE_URL is not set for the cloud target. See .env.sample."
        : "Local database URL could not be resolved."
    );
  }

  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const entries = await fs.readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();
  if (sqlFiles.length === 0) {
    console.warn(`No .sql files found in ${migrationsDir}`);
    return;
  }

  const client = new Client({ connectionString: target.databaseUrl });
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
      // `storage.objects` is owned by `supabase_storage_admin`, and recent
      // projects block direct policy DDL on it from BOTH the direct connection
      // AND the Dashboard SQL editor. On the local stack we apply storage
      // policies a different way (scripts/setup-extras.ts, direct CREATE POLICY);
      // on cloud it's the Storage Policies UI. Either way, keep going.
      if (isStorageOwnershipError(error)) {
        console.warn(`  ⚠ ${file}: skipped (storage.objects can't take direct policy DDL)`);
        if (target.env === "local") {
          console.warn(`     local storage policies are applied by db:setup's extras step.`);
        } else {
          console.warn(`     apply via Dashboard → Storage → <bucket> → Policies → New policy.`);
        }
        dashboardSkipped.push(file);
        continue;
      }
      await client.end();
      throw new Error(`Failed applying ${file}: ${(error as Error).message}`);
    }
  }

  await client.end();

  if (dashboardSkipped.length > 0 && target.env === "cloud") {
    const dashboardUrl = deriveDashboardSqlUrl(target);
    console.log("");
    console.log(`Applied — but ${dashboardSkipped.length} file(s) need the Storage UI:`);
    for (const file of dashboardSkipped) console.log(`  • db/migrations/${file}`);
    if (dashboardUrl) console.log(`Dashboard: ${dashboardUrl}`);
  }
}

function isStorageOwnershipError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  // 42501 = insufficient_privilege. Match the storage-specific messages a
  // direct-connection client hits when touching `storage.objects`.
  if (e.code !== "42501") return false;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("must be owner of table objects") || msg.includes("supabase_storage_admin");
}

function deriveDashboardSqlUrl(target: DbTarget): string | null {
  const match = target.supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? `https://supabase.com/dashboard/project/${match[1]}/sql/new` : null;
}

if (isMain(import.meta.url)) {
  void (async () => {
    const target = resolveTarget();
    console.log(`▶ target: ${targetLabel(target)}`);
    await confirmCloudTarget(target);
    await applyPolicies(target);
    console.log("Done.");
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
