/**
 * Resolves which Supabase deployment the app targets: the user's cloud project
 * ("prod") or the local Supabase stack ("local", started via `supabase start`).
 *
 * Switch with NEXT_PUBLIC_ENV = "prod" | "local". It must be NEXT_PUBLIC_*
 * because the provider factory runs in the browser and Next.js only inlines
 * NEXT_PUBLIC_-prefixed vars there. When unset we default to cloud, so an
 * un-annotated prod/CI build targets the hosted project rather than localhost.
 *
 * This is the single backend switch — it drives both the app (here) and the
 * CLI tooling (scripts/env.ts). There is no separate JSON-mock runtime mode.
 *
 * This module holds ONLY public values (API URL + anon key). Service-role key
 * resolution lives in the server-only supabase-server.ts so a secret can never
 * end up in a client bundle.
 */

export type SupabaseTarget = "local" | "cloud";

/**
 * Standard Supabase local-stack values. The demo anon key is public — it's the
 * same on every `supabase start` that uses the default JWT secret, so it's safe
 * to ship to the browser. Override via NEXT_PUBLIC_SUPABASE_*_LOCAL if your CLI
 * mints different keys (check `npx supabase status`).
 */
export const LOCAL_SUPABASE_API_URL = "http://127.0.0.1:54321";
export const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export function getSupabaseTarget(): SupabaseTarget {
  return process.env.NEXT_PUBLIC_ENV === "local" ? "local" : "cloud";
}

/**
 * Public client config for the active target. Returns null only when targeting
 * cloud with the cloud env vars unset (local always resolves via defaults).
 */
export function getPublicSupabaseConfig(): { url: string; anonKey: string } | null {
  if (getSupabaseTarget() === "local") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL ?? LOCAL_SUPABASE_API_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL ?? LOCAL_SUPABASE_ANON_KEY,
    };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
