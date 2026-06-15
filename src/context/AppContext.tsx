"use client";
import { createContext, useContext } from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { MyTrees, TreeMembership } from "../types/tree";
import type {
  AuthProvider,
  AuthUser,
  DataProvider,
  StorageProvider,
  UserProfile,
} from "../services/types";

export interface TreeData {
  people: Person[];
  families: Family[];
}

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
