export type SuggestionStatus = "unread" | "read" | "archived" | "prioritized";

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: SuggestionStatus;
  timestamp: number;
}
