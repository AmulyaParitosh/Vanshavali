import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";

export interface TreeData {
  people: Person[];
  families: Family[];
}

export interface UserProfile {
  email: string | null;
  name: string | null;
  role: string;
}

export interface AdminUser extends UserProfile {
  uid: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthProvider {
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

export interface DataProvider {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  createUserProfile(uid: string, profile: UserProfile): Promise<void>;
  subscribeToTreeData(callback: (data: TreeData) => void): () => void;
  saveTreeData(data: TreeData): Promise<void>;
  
  // Admin & Suggestions methods
  getAllUsers(): Promise<AdminUser[]>;
  updateUserRole(uid: string, role: string): Promise<void>;
  subscribeToPendingCount(callback: (count: number) => void): () => void;
  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void;
  updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void>;
  addSuggestion(suggestion: Omit<Suggestion, 'id' | 'timestamp'>): Promise<void>;
  linkUserToPerson(personId: string, uid: string): Promise<void>;
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
