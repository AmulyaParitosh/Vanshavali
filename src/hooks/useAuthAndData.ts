"use client";
import { useState, useEffect, useMemo } from "react";
import { ProviderFactory } from "../services/ProviderFactory";
import type { TreeData, AuthUser } from "../services/types";
import { USER_ROLES } from "../constants";
import { canEdit, canViewTree } from "../lib/access";

export function useAuthAndData() {
  const {
    auth: authProvider,
    data: dataProvider,
    storage: storageProvider,
  } = useMemo(() => ProviderFactory.getProviders(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Handle authentication state changes.
  useEffect(() => {
    const unsubscribe = authProvider.onAuthStateChanged(async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        try {
          let userData = await dataProvider.getUserProfile(currentUser.uid);

          if (!userData) {
            userData = {
              email: currentUser.email,
              name: currentUser.displayName,
              role: USER_ROLES.PENDING,
            };
            await dataProvider.createUserProfile(currentUser.uid, userData);
          }
          setUser(currentUser);
          setUserRole(userData.role);
          setPersonId(userData.personId || null);
          if (!canViewTree(userData.role)) setIsLoading(false);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(currentUser);
          setUserRole(null);
          setPersonId(null);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setPersonId(null);
        setTreeData(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [authProvider, dataProvider]);

  // Fetch tree data once the user has a tree-viewing role.
  useEffect(() => {
    if (canViewTree(userRole)) {
      const unsubscribe = dataProvider.subscribeToTreeData((data) => {
        setTreeData(data);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
    setTreeData(null);
    return undefined;
  }, [userRole, dataProvider]);

  const handleLogin = () => {
    authProvider
      .signInWithGoogle()
      .catch((error) => console.error("Auth error:", error));
  };

  const handleLogout = () => {
    authProvider
      .signOut()
      .catch((error) => console.error("Sign out error:", error));
  };

  const handleSaveData = (newData: TreeData) => {
    if (!canEdit(userRole)) {
      console.error("Permission Denied: You cannot save data.");
      return Promise.reject(new Error("Permission Denied"));
    }
    return dataProvider.saveTreeData(newData).catch((error) => {
      console.error("Save Data failed:", error);
      throw error;
    });
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const userData = await dataProvider.getUserProfile(user.uid);
      if (userData) {
        setUser(user);
        setUserRole(userData.role);
        setPersonId(userData.personId || null);
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  };

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
