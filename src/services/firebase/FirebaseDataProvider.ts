import type {
  Database
} from "firebase/database";
import {
  ref,
  get,
  set,
  onValue,
  update,
  push,
  serverTimestamp
} from "firebase/database";
import type { DataProvider, TreeData, UserProfile, AdminUser } from "../types";
import type { Suggestion, SuggestionStatus } from "../../types/suggestion";
import { USER_ROLES, SUGGESTION_STATUS } from "../../constants";

export class FirebaseDataProvider implements DataProvider {
  constructor(private db: Database) {}

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = ref(this.db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  }

  async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const userRef = ref(this.db, `users/${uid}`);
    await set(userRef, profile);
  }

  subscribeToTreeData(callback: (data: TreeData) => void): () => void {
    const peopleRef = ref(this.db, "people");
    const familiesRef = ref(this.db, "families");

    let peopleData: any[] = [];
    let familiesData: any[] = [];
    let peopleLoaded = false;
    let familiesLoaded = false;

    const checkLoading = () => {
      if (peopleLoaded && familiesLoaded) {
        callback({ people: peopleData, families: familiesData });
      }
    };

    const unsubPeople = onValue(peopleRef, (snapshot) => {
      peopleData = snapshot.val() || [];
      peopleLoaded = true;
      checkLoading();
    }, (error) => {
      console.error("Firebase read failed (people):", error);
      peopleLoaded = true;
      checkLoading();
    });

    const unsubFamilies = onValue(familiesRef, (snapshot) => {
      familiesData = snapshot.val() || [];
      familiesLoaded = true;
      checkLoading();
    }, (error) => {
      console.error("Firebase read failed (families):", error);
      familiesLoaded = true;
      checkLoading();
    });

    return () => {
      unsubPeople();
      unsubFamilies();
    };
  }

  async saveTreeData(data: TreeData): Promise<void> {
    const updates: Record<string, any> = {};
    updates['/people'] = data.people;
    updates['/families'] = data.families;
    await update(ref(this.db), updates);
  }

  async getAllUsers(): Promise<AdminUser[]> {
    const usersRef = ref(this.db, "users/");
    const snapshot = await get(usersRef);
    const usersData = snapshot.val() || {};
    return Object.keys(usersData).map((uid) => ({
      uid,
      ...usersData[uid],
    })) as AdminUser[];
  }

  async updateUserRole(uid: string, role: string): Promise<void> {
    const userRef = ref(this.db, `users/${uid}`);
    await update(userRef, { role });
  }

  subscribeToPendingCount(callback: (count: number) => void): () => void {
    const usersRef = ref(this.db, "users/");
    return onValue(usersRef, (snapshot) => {
      const data = (snapshot.val() ?? {}) as Record<string, { role?: string }>;
      const count = Object.values(data).filter(
        (u) => u?.role === USER_ROLES.PENDING
      ).length;
      callback(count);
    });
  }

  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    const suggestionsRef = ref(this.db, "suggestions/");
    return onValue(suggestionsRef, (snapshot) => {
      const suggestionsData = (snapshot.val() ?? {}) as Record<string, Omit<Suggestion, 'id'>>;
      const suggestionsList: Suggestion[] = Object.keys(suggestionsData).map((id) => {
        const entry = suggestionsData[id]!;
        return {
          ...entry,
          id,
          status: entry.status || SUGGESTION_STATUS.UNREAD,
        };
      });
      callback(suggestionsList.sort((a, b) => b.timestamp - a.timestamp));
    });
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
    const suggestionRef = ref(this.db, `suggestions/${id}`);
    await update(suggestionRef, { status });
  }

  async addSuggestion(suggestion: Omit<Suggestion, 'id' | 'timestamp'>): Promise<void> {
    const suggestionsRef = ref(this.db, "suggestions");
    await push(suggestionsRef, {
      ...suggestion,
      timestamp: serverTimestamp(),
    });
  }

  async linkUserToPerson(personId: string, uid: string): Promise<void> {
    const peopleRef = ref(this.db, "people");
    const snapshot = await get(peopleRef);
    const people = snapshot.val() || [];
    
    if (Array.isArray(people)) {
      const personIndex = people.findIndex((p: any) => p.id === personId);
      if (personIndex !== -1) {
        if (people[personIndex].userId) {
          throw new Error("This person is already linked to a user.");
        }
        const updates: Record<string, any> = {};
        updates[`people/${personIndex}/userId`] = uid;
        await update(ref(this.db), updates);
      }
    } else {
      // Handle object-based people collection if applicable
      const personRef = ref(this.db, `people/${personId}`);
      const personSnap = await get(personRef);
      if (personSnap.exists()) {
        const personData = personSnap.val();
        if (personData.userId) {
          throw new Error("This person is already linked to a user.");
        }
        await update(personRef, { userId: uid });
      } else {
        throw new Error("Person not found.");
      }
    }

    // Update user profile with personId for fast lookup
    const userRef = ref(this.db, `users/${uid}`);
    await update(userRef, { personId });
  }
}
