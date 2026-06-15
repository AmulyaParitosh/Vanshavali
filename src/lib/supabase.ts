import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client. Uses the public anon key — RLS policies in the
 * database (see `db/migrations/0001_initial.sql`) are what actually gate access.
 * Never expose the service-role key on the client.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env. " +
        "See CONTRIBUTING.md §1 for setup."
    );
  }
  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}

/**
 * True when the Supabase env vars are configured. ProviderFactory uses this to
 * decide whether to wire up the Supabase providers or fall back to local mode.
 */
export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey;
}
