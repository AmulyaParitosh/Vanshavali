import type { DataProvider, TreeData, UserProfile, AdminUser } from "../types";
import type { Suggestion, SuggestionStatus } from "../../types/suggestion";
import { LOCAL_DATA_CONFIG, USER_ROLES, SUGGESTION_STATUS } from "../../constants";

export class LocalDataProvider implements DataProvider {
  private lastDataString: string = "";

  private async fetchDb(collection: string) {
    const res = await fetch(`/api/local/db?collection=${collection}`);
    return res.json();
  }

  private async saveDb(collection: string, data: any) {
    const res = await fetch('/api/local/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, data }),
    });
    return res.json();
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const users = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS);
    return users[uid] || null;
  }

  async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const users = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS);
    users[uid] = profile;
    await this.saveDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS, users);
  }

  subscribeToTreeData(callback: (data: TreeData) => void): () => void {
    const fetchAll = async () => {
      try {
        const people = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.PEOPLE);
        const families = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.FAMILIES);
        
        const newData = { people: people || [], families: families || [] };
        const newDataString = JSON.stringify(newData);

        if (newDataString !== this.lastDataString) {
          this.lastDataString = newDataString;
          callback(newData);
        }
      } catch (error) {
        console.error("LocalDataProvider: Error polling tree data", error);
      }
    };
    fetchAll();
    
    const interval = setInterval(fetchAll, LOCAL_DATA_CONFIG.POLLING_INTERVAL); 
    return () => clearInterval(interval);
  }

  async saveTreeData(data: TreeData): Promise<void> {
    await this.saveDb(LOCAL_DATA_CONFIG.COLLECTIONS.PEOPLE, data.people);
    await this.saveDb(LOCAL_DATA_CONFIG.COLLECTIONS.FAMILIES, data.families);
  }

  async getAllUsers(): Promise<AdminUser[]> {
    const usersData = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS);
    return Object.keys(usersData).map((uid) => ({
      uid,
      ...usersData[uid],
    })) as AdminUser[];
  }

  async updateUserRole(uid: string, role: string): Promise<void> {
    const users = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS);
    if (users[uid]) {
      users[uid].role = role;
      await this.saveDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS, users);
    }
  }

  subscribeToPendingCount(callback: (count: number) => void): () => void {
    const fetchCount = async () => {
      const usersData = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.USERS);
      const count = Object.values(usersData).filter((u: any) => u.role === USER_ROLES.PENDING).length;
      callback(count);
    };
    fetchCount();
    const interval = setInterval(fetchCount, LOCAL_DATA_CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }

  subscribeToSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    const fetchSugg = async () => {
      const suggestionsData = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.SUGGESTIONS);
      const suggestionsList = Object.keys(suggestionsData).map((id) => ({
        id,
        ...suggestionsData[id],
        status: suggestionsData[id].status || SUGGESTION_STATUS.UNREAD 
      })) as Suggestion[];
      callback(suggestionsList.sort((a, b) => b.timestamp - (a.timestamp || 0)));
    };
    fetchSugg();
    const interval = setInterval(fetchSugg, LOCAL_DATA_CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }

  async updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
    const suggestions = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.SUGGESTIONS);
    if (suggestions[id]) {
      suggestions[id].status = status;
      await this.saveDb(LOCAL_DATA_CONFIG.COLLECTIONS.SUGGESTIONS, suggestions);
    }
  }

  async addSuggestion(suggestion: Omit<Suggestion, 'id' | 'timestamp'>): Promise<void> {
    const suggestions = await this.fetchDb(LOCAL_DATA_CONFIG.COLLECTIONS.SUGGESTIONS);
    const id = Date.now().toString();
    suggestions[id] = {
      ...suggestion,
      timestamp: Date.now(),
    };
    await this.saveDb('suggestions', suggestions);
  }
}
