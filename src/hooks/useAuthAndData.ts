"use client";
import { useCallback } from "react";
import type { TreeData } from "../services/types";
import { canEdit, canViewTree } from "../lib/access";
import { useProviders } from "./useProviders";
import { useAuthUser } from "./useAuthUser";
import { useUserProfile } from "./useUserProfile";
import { useTreeSubscription } from "./useTreeSubscription";

/**
 * The top-level app data hook. Composes four single-responsibility hooks:
 *
 *   useProviders         → backend implementations (auth / data / storage)
 *   useAuthUser          → current AuthUser, isLoaded
 *   useUserProfile       → role, personId, refresh
 *   useTreeSubscription  → live tree data
 *
 * Exposes a flat shape for backward compatibility with `AppProvider`. New code
 * should prefer composing the smaller hooks directly when it only needs part of
 * this surface.
 */
export function useAuthAndData() {
  const { auth: authProvider, data: dataProvider, storage: storageProvider } =
    useProviders();

  const { user, isLoaded: authLoaded } = useAuthUser(authProvider);
  const {
    role: userRole,
    personId,
    isLoaded: profileLoaded,
    refresh: refreshUser,
  } = useUserProfile(user, dataProvider);
  const { treeData, isLoaded: treeLoaded } = useTreeSubscription(
    userRole,
    dataProvider
  );

  // Loading is "any required check still pending":
  //   - auth state not yet decided, OR
  //   - signed in but profile not yet fetched, OR
  //   - signed in with a tree-viewing role but data not yet delivered.
  const isLoading =
    !authLoaded ||
    (!!user && !profileLoaded) ||
    (!!user && canViewTree(userRole) && !treeLoaded);

  const handleLogin = useCallback(() => {
    authProvider
      .signInWithGoogle()
      .catch((error) => console.error("Auth error:", error));
  }, [authProvider]);

  const handleLogout = useCallback(() => {
    authProvider
      .signOut()
      .catch((error) => console.error("Sign out error:", error));
  }, [authProvider]);

  const handleSaveData = useCallback(
    (newData: TreeData): Promise<void> => {
      if (!canEdit(userRole)) {
        console.error("Permission Denied: You cannot save data.");
        return Promise.reject(new Error("Permission Denied"));
      }
      return dataProvider.saveTreeData(newData).catch((error) => {
        console.error("Save Data failed:", error);
        throw error;
      });
    },
    [userRole, dataProvider]
  );

  return {
    user,
    userRole,
    personId,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave: handleSaveData,
    refreshUser,
    auth: authProvider,
    data: dataProvider,
    storage: storageProvider,
  };
}
