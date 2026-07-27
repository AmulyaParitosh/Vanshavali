/**
 * Post-migration setup the RLS `.sql` files can't do over a direct connection,
 * applied to the active target (scripts/env.ts, driven by NEXT_PUBLIC_ENV):
 *
 *   1. GRANT the Data API roles (anon/authenticated/service_role) access to the
 *      public tables + functions. RLS still gates rows.
 *   2. Add our tables to the `supabase_realtime` publication (empty by default,
 *      so without this the realtime subscriptions get no change events).
 *   3. Storage RLS policies for the `images` bucket — LOCAL ONLY. On the local
 *      stack `postgres` can create `storage.objects` policies directly; on cloud
 *      that's owner-locked, so cloud keeps using the Storage Policies UI.
 *   4. Ensure the `images` bucket exists (via the storage API).
 *
 * On local, any failure is fatal (setup must be correct). On cloud, the
 * best-effort steps (grants, realtime) warn instead of aborting, since a hosted
 * project may already have them and connection privileges vary.
 *
 * Run standalone via `npm run db:extras`, or imported by db-setup.ts.
 */

import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { confirmCloudTarget, isMain, resolveTarget, targetLabel, type DbTarget } from "./env";

const TABLES = ["trees", "tree_members", "people", "families", "tree_invites", "suggestions"];

export async function applyExtras(target: DbTarget): Promise<void> {
  if (!target.databaseUrl) {
    throw new Error("Database URL could not be resolved for extras.");
  }
  const client = new Client({ connectionString: target.databaseUrl });
  await client.connect();

  await step(target, "Data API grants", () => applyGrants(client));
  await step(target, "realtime publication", () => applyRealtime(client));

  if (target.env === "local") {
    await step(target, "storage RLS policies", () => applyStoragePolicies(client));
  } else {
    console.log("  • storage policies: apply via Dashboard Storage UI (cloud is owner-locked)");
  }

  await client.end();

  await step(target, "images bucket", () => ensureBucket(target));

  console.log("\nExtras done.");
}

/** Run a step; on local a failure is fatal, on cloud it warns and continues. */
async function step(target: DbTarget, name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    if (target.env === "local") throw error;
    console.warn(`  ⚠ ${name}: ${(error as Error).message} (skipped on cloud)`);
  }
}

async function applyGrants(client: Client): Promise<void> {
  await client.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;`
  );
  await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;`);
  await client.query(
    `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;`
  );
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;`);
}

async function applyRealtime(client: Client): Promise<void> {
  for (const table of TABLES) {
    try {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`);
    } catch (error) {
      // 42710 = duplicate_object (already in publication). Only that is benign.
      if (!isDuplicateObject(error)) throw error;
    }
  }
}

async function applyStoragePolicies(client: Client): Promise<void> {
  const memberCheck = `
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2) AND tm.uid = auth.uid()::text
    )`;
  const editorCheck = `
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
        AND tm.role IN ('owner', 'editor')
    )`;

  // RLS is already enabled on storage.objects by the stack; ALTER TABLE would
  // need ownership we don't have. CREATE/DROP POLICY work directly on local.
  await client.query(`DROP POLICY IF EXISTS images_member_select ON storage.objects;`);
  await client.query(
    `CREATE POLICY images_member_select ON storage.objects FOR SELECT USING (${memberCheck});`
  );
  await client.query(`DROP POLICY IF EXISTS images_editor_insert ON storage.objects;`);
  await client.query(
    `CREATE POLICY images_editor_insert ON storage.objects FOR INSERT WITH CHECK (${editorCheck});`
  );
  await client.query(`DROP POLICY IF EXISTS images_editor_update ON storage.objects;`);
  await client.query(
    `CREATE POLICY images_editor_update ON storage.objects FOR UPDATE USING (${editorCheck}) WITH CHECK (${editorCheck});`
  );
  await client.query(`DROP POLICY IF EXISTS images_editor_delete ON storage.objects;`);
  await client.query(
    `CREATE POLICY images_editor_delete ON storage.objects FOR DELETE USING (${editorCheck});`
  );
}

async function ensureBucket(target: DbTarget): Promise<void> {
  const supabase = createClient(target.supabaseUrl, target.serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.storage.createBucket("images", { public: true });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

function isDuplicateObject(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: string }).code === "42710";
}

if (isMain(import.meta.url)) {
  void (async () => {
    const target = resolveTarget();
    console.log(`▶ target: ${targetLabel(target)}`);
    await confirmCloudTarget(target);
    await applyExtras(target);
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
