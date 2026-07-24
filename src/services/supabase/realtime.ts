import type { SupabaseClient } from "@supabase/supabase-js";
import { formatError } from "../../lib/formatError";

/**
 * A single Postgres-changes filter for one table on one channel.
 */
export interface ChangeFilter {
  table: string;
  /** Postgres-changes filter expression, e.g. `tree_id=eq.${treeId}`. */
  filter?: string;
}

/**
 * Wires up the "initial fetch + realtime subscribe" pattern used by every
 * tree-scoped subscription. Returns an unsubscribe function that removes the
 * channel and prevents stale fetches.
 *
 * The fetcher is called once on subscribe and again on every change to any of
 * the watched tables. Errors are logged to console but never thrown (consumers
 * shouldn't crash because a realtime tick failed).
 */
export function subscribeWithRealtime<T>(
  client: SupabaseClient,
  channelName: string,
  filters: ChangeFilter[],
  fetcher: () => Promise<T>,
  callback: (value: T) => void
): () => void {
  let cancelled = false;

  const tick = async () => {
    if (cancelled) return;
    try {
      const value = await fetcher();
      if (!cancelled) callback(value);
    } catch (error) {
      // supabase-js / PostgREST errors stash their useful fields as non-enumerable
      // properties, so a bare console.error prints `{}`. The shared formatError
      // pulls them out by name.
      console.error(`[realtime ${channelName}] fetch failed`, formatError(error));
    }
  };

  void tick();

  let channel = client.channel(channelName);
  for (const f of filters) {
    channel = channel.on(
      // The supabase-js types over-narrow this string; cast at the boundary.
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table: f.table,
        ...(f.filter ? { filter: f.filter } : {}),
      } as never,
      () => void tick()
    );
  }
  channel.subscribe();

  return () => {
    cancelled = true;
    void client.removeChannel(channel);
  };
}
