"use client";
import { createContext, useContext } from "react";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { User } from "firebase/auth";

export interface TreeData {
  people: Person[];
  families: Family[];
}

interface AppContextType {
  treeData: TreeData | null;
  user: (User & { role: string | null }) | null;
  onSave: (data: TreeData) => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
