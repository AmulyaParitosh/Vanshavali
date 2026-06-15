"use client";
import { useEffect, useState } from "react";
import type { AuthProvider, AuthUser } from "../services/types";

export interface UseAuthUserResult {
  user: AuthUser | null;
  /** True once the first auth-state callback has fired (logged-in or signed-out is decided). */
  isLoaded: boolean;
}

/**
 * Subscribes to the AuthProvider's auth-state stream and exposes the current
 * user. `isLoaded` lets callers distinguish "auth check pending" from
 * "definitely signed out" — the prior monolithic hook conflated the two.
 */
export function useAuthUser(authProvider: AuthProvider): UseAuthUserResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = authProvider.onAuthStateChanged((next) => {
      setUser(next);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [authProvider]);

  return { user, isLoaded };
}
