import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser } from "../types";

/**
 * Supabase Auth implementation. STATUS: Phase 1 scaffold. Methods will be
 * filled in during Phase 6 (auth migration). Signatures match the multi-method
 * AuthProvider interface (Google OAuth + email/password + password reset),
 * which is the v1 commitment.
 */
export class SupabaseAuthProvider implements AuthProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  onAuthStateChanged(_callback: (user: AuthUser | null) => void): () => void {
    throw notImplemented("onAuthStateChanged");
  }

  signInWithGoogle(): Promise<void> {
    throw notImplemented("signInWithGoogle");
  }

  signInWithEmail(_email: string, _password: string): Promise<void> {
    throw notImplemented("signInWithEmail");
  }

  signUpWithEmail(_email: string, _password: string, _displayName?: string): Promise<void> {
    throw notImplemented("signUpWithEmail");
  }

  sendPasswordReset(_email: string): Promise<void> {
    throw notImplemented("sendPasswordReset");
  }

  signOut(): Promise<void> {
    throw notImplemented("signOut");
  }
}

function notImplemented(method: string): Error {
  return new Error(
    `SupabaseAuthProvider.${method} is not yet implemented (Phase 6 — see docs/ARCHITECTURE.md).`
  );
}
