import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseTarget, LOCAL_SUPABASE_API_URL, LOCAL_SUPABASE_ANON_KEY } from "./supabaseEnv";

/**
 * Server-only Supabase client helpers. Never import this from a client
 * component — it pulls the service-role key from `process.env` (and the local
 * demo service key below, which must never reach the browser).
 *
 * Two clients available:
 *   - `getServiceClient()`: bypass-RLS access for privileged operations
 *     (invite accept, tree create, email-send lookup). Use sparingly and
 *     always validate authorization separately.
 *   - `getUserClient(accessToken)`: regular RLS-gated access on behalf of the
 *     authenticated user. Use when the operation should fail naturally if the
 *     user isn't authorized.
 *
 * Target (cloud vs local stack) follows NEXT_PUBLIC_ENV, same as the client.
 */

// Standard Supabase local-stack service-role key (default JWT secret). Public
// demo value, but kept in this server-only module out of habit — a service key
// string should never be bundled to the browser, even a well-known one.
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

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;
  const { url, serviceKey } = resolveServerConfig();
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service-role env missing. For cloud set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY; for the local stack set NEXT_PUBLIC_ENV=local."
    );
  }
  cachedServiceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

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
