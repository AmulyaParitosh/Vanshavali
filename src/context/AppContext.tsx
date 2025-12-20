"use client";
import { createContext, useContext } from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { AuthUser, DataProvider, AuthProvider, StorageProvider } from "../services/types";

export interface TreeData {
  people: Person[];
  families: Family[];
}

interface AppContextType {
  treeData: TreeData | null;
  user: (AuthUser & { role: string | null }) | null;
  onSave: (data: TreeData) => Promise<void>;
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
