import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client helpers. Never import this from a client
 * component — it pulls the service-role key from `process.env`.
 *
 * Two clients available:
 *   - `getServiceClient()`: bypass-RLS access for privileged operations
 *     (invite accept, email-send lookup). Use sparingly and always validate
 *     authorization separately.
 *   - `getUserClient(accessToken)`: regular RLS-gated access on behalf of the
 *     authenticated user. Use when the operation should fail naturally if the
 *     user isn't authorized.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase service-role env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env."
    );
  }
  cachedServiceClient = createClient(URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

export function getUserClient(accessToken: string): SupabaseClient {
  if (!URL || !ANON_KEY) {
    throw new Error("Supabase env missing on the server.");
  }
  return createClient(URL, ANON_KEY, {
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
