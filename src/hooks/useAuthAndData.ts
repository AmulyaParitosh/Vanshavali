"use client";
import { useState, useEffect, useMemo } from "react";
import { ProviderFactory } from "../services/ProviderFactory";
import type { TreeData, AuthUser } from "../services/types";

const ALLOWED_ROLES = ["viewer", "editor", "admin"];

export function useAuthAndData() {
  const { auth: authProvider, data: dataProvider, storage: storageProvider } = useMemo(() => ProviderFactory.getProviders(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = authProvider.onAuthStateChanged(async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        try {
          let userData = await dataProvider.getUserProfile(currentUser.uid);
          
          if (!userData) {
            // Create new user with 'pending' role
            userData = {
              email: currentUser.email,
              name: currentUser.displayName,
              role: "pending",
            };
            await dataProvider.createUserProfile(currentUser.uid, userData);
          }
          setUser(currentUser);
          setUserRole(userData.role);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(currentUser);
          setUserRole(null); 
          setIsLoading(false); 
        }
      } else {
        setUser(null);
        setUserRole(null);
        setTreeData(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [authProvider, dataProvider]);

  // Effect for fetching data when user role is authorized
  useEffect(() => {
    if (userRole && ALLOWED_ROLES.includes(userRole)) {
      const unsubscribe = dataProvider.subscribeToTreeData((data) => {
        setTreeData(data);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else if (userRole) {
      // If user has a role but it's not allowed, stop loading
      setIsLoading(false);
    }
  }, [userRole, dataProvider]);

  const handleLogin = () => {
    authProvider.signInWithGoogle().catch((error) =>
      console.error("Auth error:", error)
    );
  };

  const handleLogout = () => {
    authProvider.signOut().catch((error) => console.error("Sign out error:", error));
  };

  const handleSaveData = (newData: TreeData) => {
    if (!userRole || !["editor", "admin"].includes(userRole)) {
      console.error("Permission Denied: You cannot save data.");
      return Promise.reject("Permission Denied");
    }
    
    return dataProvider.saveTreeData(newData).catch((error) => {
      console.error("Save Data failed:", error);
      throw error;
    });
  };

  return {
    user,
    userRole,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave: handleSaveData,
    auth: authProvider,
    data: dataProvider,
    storage: storageProvider,
  };
}
