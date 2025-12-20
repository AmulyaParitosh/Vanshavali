import type { User } from "firebase/auth";
import type { Person } from "../types/person";
import type { Family } from "../types/family";

export interface TreeData {
  people: Person[];
  families: Family[];
}

export interface UserProfile {
  email: string | null;
  name: string | null;
  role: string;
}

export interface AuthProvider {
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

export interface DataProvider {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  createUserProfile(uid: string, profile: UserProfile): Promise<void>;
  subscribeToTreeData(callback: (data: TreeData) => void): () => void;
  saveTreeData(data: TreeData): Promise<void>;
}

export interface StorageProvider {
  uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }>;
  getDownloadURL(path: string): Promise<string>;
}

export interface ProviderConfig {
  auth: AuthProvider;
  data: DataProvider;
  storage: StorageProvider;
}
