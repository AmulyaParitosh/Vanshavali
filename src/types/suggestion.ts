export type SuggestionStatus = "unread" | "read" | "archived" | "prioritized";

/**
 * Site-level feedback entry. Only the sender's uid is persisted — resolving a
 * uid to a display name/email for the admin inbox needs a server-side lookup
 * (the client has no direct DB access).
 */
export interface Suggestion {
  id: string;
  userId: string;
  message: string;
  status: SuggestionStatus;
  timestamp: number;
}
