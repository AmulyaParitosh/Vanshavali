import { getSupabaseClient } from "../lib/supabase";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider";
import { ApiDataProvider } from "./ApiDataProvider";
import { SupabaseStorageProvider } from "./supabase/SupabaseStorageProvider";
import type { ProviderConfig } from "./types";

/**
 * Resolves the backend provider implementations and memoizes them.
 *
 * - Auth + Storage go directly through supabase-js (Supabase Auth + Storage).
 * - Data goes through `ApiDataProvider`, which calls the `/api/*` routes
 *   (→ service → repository → raw SQL). It still receives the Supabase client
 *   for the bearer token and realtime change-pings.
 *
 * `NEXT_PUBLIC_ENV` (`local` | `prod`) only chooses *which* Supabase/Postgres
 * everything points at; that selection lives in `src/lib/supabaseEnv.ts` (and
 * `src/repositories/db.ts` for the server-side connection), not here.
 */
export class ProviderFactory {
  private static instance: ProviderConfig | null = null;

  static getProviders(): ProviderConfig {
    if (this.instance) return this.instance;
    const client = getSupabaseClient();
    this.instance = {
      auth: new SupabaseAuthProvider(client),
      data: new ApiDataProvider(client),
      storage: new SupabaseStorageProvider(client),
    };
    return this.instance;
  }
}
