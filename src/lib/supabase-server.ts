import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseTarget, LOCAL_SUPABASE_API_URL, LOCAL_SUPABASE_ANON_KEY } from "./supabaseEnv";

/**
 * Server-only Supabase helpers.
 *
 * The app's data goes through the repository layer (`src/repositories/*`, raw
 * SQL over `pg`) with authorization in the service layer. supabase-js is used
 * on the server for just two things:
 *   - `getUserFromRequest` — verify a caller's bearer token → user (every route).
 *   - `getStorageClient` — a service-role client for `/api/upload` to write to
 *     the `images` bucket (storage.objects has no policies; the service role
 *     bypasses storage RLS, same "backend owns it" model as the tables).
 *
 * Target (cloud vs local stack) follows NEXT_PUBLIC_ENV, same as the client.
 */

// Standard Supabase local-stack service-role key (default JWT secret). Public
// demo value, local-only; a real service key must never reach the browser.
const LOCAL_SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

interface ServerSupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
}

function resolveServerConfig(): ServerSupabaseConfig {
  if (getSupabaseTarget() === "local") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL ?? LOCAL_SUPABASE_API_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL ?? LOCAL_SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL ?? LOCAL_SUPABASE_SERVICE_KEY,
    };
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

/** Service-role client for privileged server operations (storage uploads). */
export function getStorageClient(): SupabaseClient {
  const { url, serviceKey } = resolveServerConfig();
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service-role env missing. For cloud set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY; for the local stack set NEXT_PUBLIC_ENV=local."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A supabase-js client bound to a user's access token — used only to verify it. */
function getUserClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = resolveServerConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase env missing on the server.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Extracts the bearer token from an Authorization header and resolves it to a
 * Supabase user. Returns null on missing/invalid token.
 */
export async function getUserFromRequest(
  request: Request
): Promise<{ uid: string; email: string | null } | null> {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const client = getUserClient(token);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return { uid: data.user.id, email: data.user.email ?? null };
  } catch (error) {
    console.error("getUserFromRequest failed", error);
    return null;
  }
}
