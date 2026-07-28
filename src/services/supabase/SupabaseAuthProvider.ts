import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser } from "../types";
import { formatError } from "../../lib/formatError";

/**
 * Supabase Auth implementation. Maps the supabase-js session model to our
 * AuthUser shape and exposes the v1 commitment: Google OAuth + email/password
 * + password reset.
 *
 * The auth.users table trigger in `0001_initial.sql` mirrors new auth users
 * into our `public.users` table, so we don't need to call createUserProfile
 * here (though useUserProfile does it as a safety net).
 */
export class SupabaseAuthProvider implements AuthProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    // Fire immediately with the current session so callers don't have to wait
    // for the first event after a page refresh.
    this.client.auth
      .getSession()
      .then(({ data }) => {
        callback(data.session?.user ? mapSupabaseUser(data.session.user) : null);
      })
      .catch((error) => {
        console.error("Supabase getSession failed", formatError(error));
        callback(null);
      });

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? mapSupabaseUser(session.user) : null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  async signInWithGoogle(): Promise<void> {
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : null;
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : {},
    });
    if (error) throw error;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<void> {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { name: displayName, full_name: displayName } : {},
      },
    });
    if (error) throw error;
  }

  async sendPasswordReset(email: string): Promise<void> {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;
    const { error } = await this.client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined
    );
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    // Requires an active session — the recovery link signs the user in via
    // detectSessionInUrl before /auth/reset-password renders.
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}

function mapSupabaseUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: meta.full_name || meta.name || null,
    photoURL: meta.avatar_url || meta.picture || null,
  };
}
