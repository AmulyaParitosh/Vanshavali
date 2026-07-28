import { getSupabaseClient } from "../lib/supabase";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider";
import { SupabaseDataProvider } from "./supabase/SupabaseDataProvider";
import { SupabaseStorageProvider } from "./supabase/SupabaseStorageProvider";
import type { ProviderConfig } from "./types";

/**
 * Resolves the backend provider implementations. The app always runs on
 * Supabase now — `NEXT_PUBLIC_ENV` (`local` | `prod`) only chooses *which*
 * Supabase the client points at (the local `supabase start` stack vs the cloud
 * project); that selection lives in `src/lib/supabaseEnv.ts`, not here.
 *
 * The file-backed JSON mock (`src/services/local/`) was retired as a runtime
 * mode once the local Supabase stack landed — local dev now exercises the exact
 * same provider code as prod. `LocalDataProvider` is retained only as the
 * unit-test double (tests/services/local/); nothing wires it at runtime.
 */
export class ProviderFactory {
  private static instance: ProviderConfig | null = null;

  static getProviders(): ProviderConfig {
    if (this.instance) return this.instance;
    const client = getSupabaseClient();
    this.instance = {
      auth: new SupabaseAuthProvider(client),
      data: new SupabaseDataProvider(client),
      storage: new SupabaseStorageProvider(client),
    };
    return this.instance;
  }
}
