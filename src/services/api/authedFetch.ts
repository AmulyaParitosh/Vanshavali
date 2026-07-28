import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The client provider's single door to the `/api/*` data layer. Attaches the
 * signed-in user's Supabase access token as a bearer, sends/receives JSON, and
 * surfaces the route's `{ error }` body as a thrown Error.
 *
 * supabase-js stays on the client for exactly two things now: auth (this token)
 * and realtime change-pings. All data reads/writes go through here.
 */
export async function authedFetch<T>(
  client: SupabaseClient,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const hasBody = init?.body !== undefined;
  const response = await fetch(path, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (HTTP ${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
