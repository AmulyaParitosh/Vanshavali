"use client";
import { useState, useEffect } from "react";
import { database, auth } from "../lib/firebase";
import { ref, onValue, set, get } from "firebase/database";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User
} from "firebase/auth";
import type { Person } from "../types/person";
import type { Family } from "../types/family";

const ALLOWED_ROLES = ["viewer", "editor", "admin"];

interface TreeData {
  people: Person[];
  families: Family[];
}

export function useAuthAndData() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        try {
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
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback: set user but maybe no role, or handle as error?
          // If we can't read user role, better to logout or show error.
          // For now, let's treat as pending or viewer? No, let's set user and null role.
          setUser(currentUser);
          setUserRole(null); 
          setIsLoading(false); // Stop loading even on error
        }
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
      // Fetch people and families separately to avoid permission issues on root "/"
      const peopleRef = ref(database, "people");
      const familiesRef = ref(database, "families");

      let peopleData: Person[] = [];
      let familiesData: Family[] = [];
      let peopleLoaded = false;
      let familiesLoaded = false;

      const checkLoading = () => {
        if (peopleLoaded && familiesLoaded) {
          setTreeData({ people: peopleData, families: familiesData });
          setIsLoading(false);
        }
      };

      const unsubPeople = onValue(
        peopleRef,
        (snapshot) => {
          peopleData = snapshot.val() || [];
          peopleLoaded = true;
          checkLoading();
        },
        (error) => {
          console.error("Firebase read failed (people):", error);
          peopleLoaded = true; // Mark as loaded (failed) to stop spinner
          checkLoading();
        }
      );

      const unsubFamilies = onValue(
        familiesRef,
        (snapshot) => {
          familiesData = snapshot.val() || [];
          familiesLoaded = true;
          checkLoading();
        },
        (error) => {
          console.error("Firebase read failed (families):", error);
          familiesLoaded = true; // Mark as loaded
          checkLoading();
        }
      );

      return () => {
        unsubPeople();
        unsubFamilies();
      };
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

  const handleSaveData = (newData: TreeData) => {
    if (!userRole || !["editor", "admin"].includes(userRole)) {
      console.error("Permission Denied: You cannot save data.");
      return Promise.reject("Permission Denied");
    }
    // Update people and families separately
    const updates: Record<string, any> = {};
    updates['/people'] = newData.people;
    updates['/families'] = newData.families;
    
    // We use root update to ensure atomicity if possible, but if root write is denied...
    // We should try 'update(ref(database), updates)' which writes to children paths.
    // If root write is blocked, this MIGHT fail if it's considered a write to root.
    // SAFE ALTERNATIVE: set separately? No, atomicity is important.
    // Standard Firebase 'update' at root works if you have write access to children paths!
    
    return import("firebase/database").then(({ update, ref }) => {
        return update(ref(database), updates);
    }).catch((error) => {
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
