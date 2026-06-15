"use client";
import { useCallback, useEffect, useState } from "react";
import type { AuthUser, UserProvider, UserProfile } from "../services/types";
import { USER_ROLES } from "../constants";

export interface UseUserProfileResult {
  role: string | null;
  personId: string | null;
  /** True once the profile fetch/create cycle has completed for the current user. */
  isLoaded: boolean;
  /** Re-fetches the profile (e.g. after role change or person-link). */
  refresh: () => Promise<void>;
}

/**
 * Loads the user's profile from the DataProvider. If no profile exists for a
 * just-signed-in user, creates one with the `pending` role and uses the auth
 * email/name as defaults.
 *
 * Tracks `isLoaded` separately from `role`/`personId` being non-null so callers
 * can distinguish "we haven't fetched yet" from "we fetched and the value is
 * null" — the latter is a valid state (e.g. no person linked yet).
 */
export function useUserProfile(
  user: AuthUser | null,
  userProvider: UserProvider
): UseUserProfileResult {
  const [role, setRole] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPersonId(null);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    setIsLoaded(false);

    (async () => {
      try {
        let profile = await userProvider.getUserProfile(user.uid);
        if (cancelled) return;

        if (!profile) {
          profile = {
            email: user.email,
            name: user.displayName,
            role: USER_ROLES.PENDING,
          };
          await userProvider.createUserProfile(user.uid, profile);
          if (cancelled) return;
        }

        setRole(profile.role);
        setPersonId(profile.personId || null);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (!cancelled) {
          setRole(null);
          setPersonId(null);
        }
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
      const profile = await userProvider.getUserProfile(user.uid);
      if (profile) {
        setRole(profile.role);
        setPersonId(profile.personId || null);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  }, [user, userProvider]);

  return { role, personId, isLoaded, refresh };
}
