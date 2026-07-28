import { getSupabaseClient } from "../lib/supabase";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider";
import { ApiDataProvider } from "./ApiDataProvider";
import { ApiStorageProvider } from "./ApiStorageProvider";
import type { ProviderConfig } from "./types";

/**
 * Resolves the backend provider implementations and memoizes them.
 *
 * - Auth goes directly through supabase-js (Supabase Auth).
 * - Data goes through `ApiDataProvider`, and storage through `ApiStorageProvider`
 *   — both call the `/api/*` routes (→ service → repository / storage). They
 *   receive the Supabase client only for the bearer token.
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
      storage: new ApiStorageProvider(client),
    };
    return this.instance;
  }
}
