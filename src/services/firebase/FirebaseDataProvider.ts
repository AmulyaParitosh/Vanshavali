import type { 
  Database 
} from "firebase/database";
import { 
  ref, 
  get, 
  set, 
  onValue, 
  update 
} from "firebase/database";
import type { DataProvider, TreeData, UserProfile } from "../types";

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
}
