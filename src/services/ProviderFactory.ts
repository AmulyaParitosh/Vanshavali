import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import { LocalAuthProvider } from "./local/LocalAuthProvider";
import { LocalDataProvider } from "./local/LocalDataProvider";
import { LocalStorageProvider } from "./local/LocalStorageProvider";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider";
import { SupabaseDataProvider } from "./supabase/SupabaseDataProvider";
import { SupabaseStorageProvider } from "./supabase/SupabaseStorageProvider";
import type { ProviderConfig } from "./types";

type Backend = "local" | "supabase";

/**
 * Resolves the active provider implementations based on `NEXT_PUBLIC_APP_ENV`:
 *
 *   "local"    → file-backed mock providers, no network. Default for dev.
 *   "supabase" → real Supabase backend (Phase 5/6/7 work-in-progress; throws
 *                NotImplementedError until those phases land).
 *
 * Firebase support was removed in Phase 8 — the codebase no longer depends on
 * Google services. If `NEXT_PUBLIC_APP_ENV` is unset, defaults to "supabase"
 * when env vars are configured, else falls back to "local" for safe dev.
 */
export class ProviderFactory {
  private static instance: ProviderConfig | null = null;

  static getProviders(): ProviderConfig {
    if (this.instance) return this.instance;

    const backend = resolveBackend();

    switch (backend) {
      case "supabase":
        this.instance = this.createSupabaseConfig();
        break;
      case "local":
      default:
        this.instance = this.createLocalConfig();
        break;
    }
    return this.instance;
  }

  /** Test hook — discards the memoized instance. */
  static reset(): void {
    this.instance = null;
  }

  private static createSupabaseConfig(): ProviderConfig {
    const client = getSupabaseClient();
    return {
      auth: new SupabaseAuthProvider(client),
      data: new SupabaseDataProvider(client),
      storage: new SupabaseStorageProvider(client),
    };
  }

  private static createLocalConfig(): ProviderConfig {
    return {
      auth: new LocalAuthProvider(),
      data: new LocalDataProvider(),
      storage: new LocalStorageProvider(),
    };
  }
}

function resolveBackend(): Backend {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  if (env === "local") return "local";
  if (env === "supabase") return "supabase";
  return isSupabaseConfigured() ? "supabase" : "local";
}
