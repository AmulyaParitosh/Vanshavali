/**
 * The one setup step migrations can't express: ensure the `images` storage
 * bucket exists on the active target (scripts/env.ts, driven by NEXT_PUBLIC_ENV).
 * Buckets are created through the Storage API — `storage.buckets` is owner-locked
 * on cloud, so a SQL migration can't do it.
 *
 * The bucket is public-read; uploads are gated server-side via `/api/upload`
 * (there are no storage RLS policies — the backend owns storage the same way it
 * owns the tables). Run with `npm run db:extras`.
 */

import { createClient } from "@supabase/supabase-js";
import { confirmCloudTarget, isMain, resolveTarget, targetLabel, type DbTarget } from "./env";

export async function applyExtras(target: DbTarget): Promise<void> {
  const supabase = createClient(target.supabaseUrl, target.serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.storage.createBucket("images", { public: true });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
  console.log("  ✓ images bucket");
}

if (isMain(import.meta.url)) {
  void (async () => {
    const target = resolveTarget();
    console.log(`▶ target: ${targetLabel(target)}`);
    await confirmCloudTarget(target);
    await applyExtras(target);
    console.log("Extras done.");
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
