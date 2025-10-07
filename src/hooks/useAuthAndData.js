"use client";
import { useState, useEffect } from "react";
import { database, auth } from "../lib/firebase";
import { ref, onValue, set, get } from "firebase/database";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const ALLOWED_ROLES = ["viewer", "editor", "admin"];

export function useAuthAndData() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        let userData;
        if (snapshot.exists()) {
          userData = snapshot.val();
        } else {
          // Create new user with 'pending' role
          userData = {
            email: currentUser.email,
            name: currentUser.displayName,
            role: "pending",
          };
          await set(userRef, userData);
        }
        setUser(currentUser);
        setUserRole(userData.role);
      } else {
        setUser(null);
        setUserRole(null);
        setTreeData(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching data when user role is authorized
  useEffect(() => {
    if (userRole && ALLOWED_ROLES.includes(userRole)) {
      const dbRef = ref(database, "/");
      const unsubscribe = onValue(
        dbRef,
        (snapshot) => {
          setTreeData(snapshot.val() || {});
          setIsLoading(false);
        },
        (error) => {
          console.error("Firebase read failed:", error);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    } else if (userRole) {
      // If user has a role but it's not allowed, stop loading
      setIsLoading(false);
    }
  }, [userRole]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) =>
      console.error("Auth error:", error)
    );
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => console.error("Sign out error:", error));
  };

  const handleSaveData = (newData) => {
    if (!["editor", "admin"].includes(userRole)) {
      console.error("Permission Denied: You cannot save data.");
      return Promise.reject("Permission Denied");
    }
    const dbRef = ref(database, "/");
    return set(dbRef, newData).catch((error) => {
      console.error("Firebase write failed:", error);
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
  };
}
