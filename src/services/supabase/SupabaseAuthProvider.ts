import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser } from "../types";

/**
 * Supabase Auth implementation of AuthProvider.
 *
 * STATUS: Phase 1 scaffold. Methods will be filled in during Phase 6 (auth
 * migration). For now they throw `NotImplementedError` so any accidental use
 * fails loudly instead of silently sending users to Firebase.
 *
 * Supabase Auth supports Google OAuth and email/password out of the box —
 * matches the decision recorded in CLAUDE.md §Direction.
 */
export class SupabaseAuthProvider implements AuthProvider {
  // Held for the Phase 6 implementation; unused until methods are filled in.
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

  signOut(): Promise<void> {
    throw notImplemented("signOut");
  }

  // Phase 6 will add: signInWithEmail, signUpWithEmail, sendPasswordReset.
}

function notImplemented(method: string): Error {
  return new Error(
    `SupabaseAuthProvider.${method} is not yet implemented (Phase 6 — see docs/ARCHITECTURE.md).`
  );
}
