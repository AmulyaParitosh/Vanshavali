/**
 * Single source of truth for CLI/script backend targeting, mirroring the app's
 * `src/lib/supabaseEnv.ts` on the server side. Everything a script needs to talk
 * to the right backend — the RLS/policy applier and the extras setup — resolves
 * through here, keyed off the same `NEXT_PUBLIC_ENV` the app uses.
 *
 *   NEXT_PUBLIC_ENV=local → the local Supabase stack (`supabase start`)
 *   NEXT_PUBLIC_ENV=prod  → the cloud project (values from .env)
 *   unset                 → cloud (so an un-annotated CI/prod shell defaults safe)
 *
 * This module is script-only (loads .env, holds the local demo service key), so
 * it must never be imported from client/browser code — that's what the
 * secret-free `src/lib/supabaseEnv.ts` is for.
 */

import "dotenv/config";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import {
  getSupabaseTarget,
  LOCAL_SUPABASE_API_URL,
  LOCAL_SUPABASE_ANON_KEY,
} from "../src/lib/supabaseEnv";

const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Standard Supabase local-stack service-role key (default JWT secret). Public
// demo value, local-only. Override with SUPABASE_SERVICE_ROLE_KEY_LOCAL if your
// CLI mints a different one (`npx supabase status`).
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export interface DbTarget {
  env: "local" | "cloud";
  databaseUrl: string;
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
}

export function resolveTarget(): DbTarget {
  if (getSupabaseTarget() === "local") {
    return {
      env: "local",
      databaseUrl: process.env.LOCAL_DATABASE_URL ?? LOCAL_DATABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL ?? LOCAL_SUPABASE_API_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL ?? LOCAL_SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL ?? LOCAL_SERVICE_KEY,
    };
  }
  return {
    env: "cloud",
    databaseUrl: process.env.DATABASE_URL ?? "",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

/** Human-readable target label for logging, e.g. "LOCAL (127.0.0.1:54322)". */
export function targetLabel(t: DbTarget): string {
  if (t.env === "local") return "LOCAL (127.0.0.1:54322)";
  const ref = t.supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? "unknown-ref";
  return `CLOUD (${ref})`;
}

/**
 * Guard destructive/setup commands against accidentally hitting the cloud.
 * Local runs proceed silently. Cloud runs require typing "yes" interactively;
 * pass --yes (or set CONFIRM_CLOUD=1) for CI. A non-interactive shell without
 * that opt-in aborts rather than silently mutating prod.
 */
export async function confirmCloudTarget(t: DbTarget): Promise<void> {
  if (t.env !== "cloud") return;
  if (process.argv.includes("--yes") || process.env.CONFIRM_CLOUD === "1") return;
  if (!process.stdin.isTTY) {
    throw new Error(
      `Refusing to modify ${targetLabel(t)} in a non-interactive shell without --yes.`
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `⚠  About to modify ${targetLabel(t)}. Type "yes" to continue: `
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    throw new Error("Aborted by user.");
  }
}

/** True when `metaUrl` is the entrypoint module (so a script can expose a CLI). */
export function isMain(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}
