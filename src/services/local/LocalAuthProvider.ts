import type { AuthProvider, AuthUser } from "../types";
import { LOCAL_DATA_CONFIG } from "../../constants";

export class LocalAuthProvider implements AuthProvider {
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    // Check if we have a saved user in localStorage for persistence across reloads
    const savedUser =
      typeof window !== "undefined" ? localStorage.getItem("local_auth_user") : null;
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
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
    const uid = LOCAL_DATA_CONFIG.MOCK_USER.UID;

    try {
      // Fetch users from local DB to get email and name
      const res = await fetch(`/api/local/db?collection=${LOCAL_DATA_CONFIG.COLLECTIONS.USERS}`);
      const usersData = await res.json();
      const userProfile = usersData[uid];

      if (userProfile) {
        this.currentUser = {
          uid: uid,
          email: userProfile.email || `${uid}@local.test`,
          displayName: userProfile.name || `Local User (${uid})`,
          photoURL: userProfile.photoURL || null,
        };
      } else {
        // Fallback if UID not in local users.json
        this.currentUser = {
          uid: uid,
          email: `${uid}@local.test`,
          displayName: `Mock User (${uid})`,
          photoURL: null,
        };
      }
    } catch (error) {
      console.error("Local Auth Error: Failed to resolve user profile", error);
      // Final fallback
      this.currentUser = {
        uid: uid,
        email: `${uid}@local.test`,
        displayName: `Mock User (${uid})`,
        photoURL: null,
      };
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("local_auth_user", JSON.stringify(this.currentUser));
    }
    this.notifyListeners();
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("local_auth_user");
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentUser));
  }
}
