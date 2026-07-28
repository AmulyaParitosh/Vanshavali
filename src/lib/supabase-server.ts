import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseTarget, LOCAL_SUPABASE_API_URL, LOCAL_SUPABASE_ANON_KEY } from "./supabaseEnv";

/**
 * Server-only Supabase auth helper.
 *
 * The app's data no longer goes through supabase-js on the server — reads and
 * writes use the repository layer (`src/repositories/*`, raw SQL over `pg`)
 * with authorization enforced in the service layer (`src/services/authz.ts`).
 * supabase-js is used here only to verify a caller's bearer token and resolve
 * it to a user (`getUserFromRequest`), which every `/api/*` route does first.
 *
 * Target (cloud vs local stack) follows NEXT_PUBLIC_ENV, same as the client.
 */

interface ServerSupabaseConfig {
  url: string;
  anonKey: string;
}

function resolveServerConfig(): ServerSupabaseConfig {
  if (getSupabaseTarget() === "local") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL ?? LOCAL_SUPABASE_API_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL ?? LOCAL_SUPABASE_ANON_KEY,
    };
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
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
