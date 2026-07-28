"use client";
import { createContext, useContext } from "react";
import type { MyTrees, TreeMembership } from "../types/tree";
import type {
  AuthProvider,
  AuthUser,
  DataProvider,
  StorageProvider,
  TreeData,
  UserProfile,
} from "../services/types";

// Re-exported so pages can import TreeData from context without reaching into
// services/types; the definition lives there (single source).
export type { TreeData };

interface AppContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  myTrees: MyTrees | null;
  currentTreeId: string | null;
  setCurrentTreeId: (id: string | null) => void;
  membership: TreeMembership | null;
  treeData: TreeData | null;
  onSave: (data: TreeData) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Bumped after any mutation; include in subscribe effects to re-fetch (no realtime). */
  refreshNonce: number;
  handleLogout: () => void;
  dataProvider: DataProvider;
  authProvider: AuthProvider;
  storageProvider: StorageProvider;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
