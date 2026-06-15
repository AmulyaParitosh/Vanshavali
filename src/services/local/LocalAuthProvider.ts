import type { AuthProvider, AuthUser } from "../types";
import { LOCAL_DATA_CONFIG } from "../../constants";

/**
 * File-backed mock auth for local dev. All sign-in flavors collapse to the
 * same `MOCK_USER.UID` — the local-mode workflow is to switch users by
 * changing `NEXT_PUBLIC_LOCAL_USER_UID`, not by sign-in form input.
 */
export class LocalAuthProvider implements AuthProvider {
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    const savedUser =
      typeof window !== "undefined" ? localStorage.getItem("local_auth_user") : null;
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  async signInWithGoogle(): Promise<void> {
    await this.signInAsMockUser();
  }

  async signInWithEmail(email: string, _password: string): Promise<void> {
    // Local mode ignores the password and resolves to the mock UID; the email
    // is recorded so the profile read shows the value the dev entered.
    await this.signInAsMockUser({ email });
  }

  async signUpWithEmail(email: string, _password: string, displayName?: string): Promise<void> {
    await this.signInAsMockUser({ email, ...(displayName ? { displayName } : {}) });
  }

  async sendPasswordReset(_email: string): Promise<void> {
    // No-op in local mode — there are no real accounts.
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("local_auth_user");
    }
    this.notifyListeners();
  }

  private async signInAsMockUser(overrides?: { email?: string; displayName?: string }) {
    const uid = LOCAL_DATA_CONFIG.MOCK_USER.UID;

    try {
      const res = await fetch(
        `/api/local/db?collection=${LOCAL_DATA_CONFIG.GLOBAL_COLLECTIONS.USERS}`
      );
      const usersData = (await res.json()) as Record<
        string,
        { email?: string; name?: string; photoURL?: string }
      >;
      const userProfile = usersData[uid];

      this.currentUser = {
        uid,
        email: overrides?.email || userProfile?.email || `${uid}@local.test`,
        displayName: overrides?.displayName || userProfile?.name || `Mock User (${uid})`,
        photoURL: userProfile?.photoURL || null,
      };
    } catch (error) {
      console.error("Local Auth Error: Failed to resolve user profile", error);
      this.currentUser = {
        uid,
        email: overrides?.email || `${uid}@local.test`,
        displayName: overrides?.displayName || `Mock User (${uid})`,
        photoURL: null,
      };
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("local_auth_user", JSON.stringify(this.currentUser));
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentUser));
  }
}
