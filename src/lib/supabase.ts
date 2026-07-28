import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./supabaseEnv";

/**
 * Browser-side Supabase client. Uses the public anon key — RLS policies in the
 * database (see `db/migrations/0001_initial.sql`) are what actually gate access.
 * Never expose the service-role key on the client.
 *
 * The target (cloud vs local stack) is chosen by NEXT_PUBLIC_ENV — see
 * `supabaseEnv.ts`. Both targets use this same client + provider code, which is
 * the whole point of running the local stack: local dev exercises the exact
 * path prod does.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  const config = getPublicSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "in .env for cloud (NEXT_PUBLIC_ENV=prod), or NEXT_PUBLIC_ENV=local to use the local stack. " +
        "See docs/SUPABASE-SETUP.md."
    );
  }
  cached = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
