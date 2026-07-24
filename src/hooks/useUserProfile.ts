"use client";
import { useCallback, useEffect, useState } from "react";
import type { AuthUser, UserProfile, UserProvider } from "../services/types";
import { formatError } from "../lib/formatError";

export interface UseUserProfileResult {
  profile: UserProfile | null;
  /** True once the profile fetch / create cycle has completed for the current user. */
  isLoaded: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads the user's profile from the DataProvider. On first sign-in (no profile
 * yet), creates one with the auth name + email + photo. Roles and tree-linkage
 * live elsewhere (TreeMembership), not here.
 */
export function useUserProfile(
  user: AuthUser | null,
  userProvider: UserProvider
): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    setIsLoaded(false);

    (async () => {
      try {
        let existing = await userProvider.getUserProfile(user.uid);
        if (cancelled) return;

        if (!existing) {
          existing = {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
          };
          await userProvider.createUserProfile(user.uid, existing);
          if (cancelled) return;
        }
        setProfile(existing);
      } catch (error) {
        console.error("Error fetching user profile:", formatError(error));
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userProvider]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const updated = await userProvider.getUserProfile(user.uid);
      if (updated) setProfile(updated);
    } catch (error) {
      console.error("Error refreshing user profile:", formatError(error));
    }
  }, [user, userProvider]);

  return { profile, isLoaded, refresh };
}
