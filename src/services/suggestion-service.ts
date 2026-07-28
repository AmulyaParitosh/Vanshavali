import { nanoid } from "nanoid";
import type { Suggestion, SuggestionStatus } from "../types/suggestion";
import { isSiteAdmin } from "../lib/access";
import { HttpError } from "../lib/api";
import { SUGGESTION_STATUS } from "../constants";
import { getPool } from "../repositories/db";
import { SuggestionRepository } from "../repositories/SuggestionRepository";

/**
 * Site-level feedback inbox. Anyone signed in can add a suggestion; reading the
 * inbox and changing statuses is gated to the site-admin allowlist
 * (NEXT_PUBLIC_SITE_ADMIN_UIDS) — the same predicate the UI uses.
 */

function requireSiteAdmin(uid: string): void {
  if (!isSiteAdmin(uid)) throw new HttpError("Not authorized.", 403);
}

export function listSuggestions(uid: string): Promise<Suggestion[]> {
  requireSiteAdmin(uid);
  return SuggestionRepository.listAll(getPool());
}

export async function updateSuggestionStatus(
  uid: string,
  id: string,
  status: SuggestionStatus
): Promise<void> {
  requireSiteAdmin(uid);
  await SuggestionRepository.updateStatus(getPool(), id, status);
}

export async function addSuggestion(
  uid: string,
  message: string,
  status?: SuggestionStatus
): Promise<void> {
  await SuggestionRepository.insert(getPool(), {
    id: `sug_${nanoid(10)}`,
    uid,
    message,
    status: status ?? SUGGESTION_STATUS.UNREAD,
  });
}
