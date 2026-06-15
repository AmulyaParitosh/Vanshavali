import { auth, database, storage } from "../lib/firebase";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import { FirebaseAuthProvider } from "./firebase/FirebaseAuthProvider";
import { FirebaseDataProvider } from "./firebase/FirebaseDataProvider";
import { FirebaseStorageProvider } from "./firebase/FirebaseStorageProvider";
import { LocalAuthProvider } from "./local/LocalAuthProvider";
import { LocalDataProvider } from "./local/LocalDataProvider";
import { LocalStorageProvider } from "./local/LocalStorageProvider";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider";
import { SupabaseDataProvider } from "./supabase/SupabaseDataProvider";
import { SupabaseStorageProvider } from "./supabase/SupabaseStorageProvider";
import type { ProviderConfig } from "./types";

type Backend = "local" | "supabase" | "firebase";

/**
 * Resolves the active provider implementations based on `NEXT_PUBLIC_APP_ENV`:
 *
 *   "local"     → file-backed mock providers, no network. Default for dev.
 *   "supabase"  → real Supabase backend (Phase 5/6/7 work-in-progress; throws
 *                 NotImplementedError until those phases land).
 *   anything else → Firebase. Slated for removal once the Supabase migration
 *                 finishes; new code should not target this backend.
 */
export class ProviderFactory {
  private static instance: ProviderConfig | null = null;

  static getProviders(): ProviderConfig {
    if (this.instance) return this.instance;

    const backend = resolveBackend();

    switch (backend) {
      case "local":
        this.instance = this.createLocalConfig();
        break;
      case "supabase":
        this.instance = this.createSupabaseConfig();
        break;
      case "firebase":
      default:
        this.instance = this.createFirebaseConfig();
        break;
    }
    return this.instance;
  }

  /** Test hook — discards the memoized instance. */
  static reset(): void {
    this.instance = null;
  }

  private static createFirebaseConfig(): ProviderConfig {
    return {
      auth: new FirebaseAuthProvider(auth),
      data: new FirebaseDataProvider(database),
      storage: new FirebaseStorageProvider(storage),
    };
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
  // Default fallback for any value that's missing or "production":
  // prefer Supabase if env vars are configured, otherwise Firebase.
  if (isSupabaseConfigured()) return "supabase";
  return "firebase";
}
