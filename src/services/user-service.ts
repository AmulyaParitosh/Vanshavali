import type { UserProfile } from "./types";
import { getPool } from "../repositories/db";
import { UserRepository } from "../repositories/UserRepository";

/**
 * Global user profile (name/email/photo). Self-scoped — the routes pass the
 * caller's own uid from the bearer token, so no extra authorization is needed
 * beyond being signed in.
 */

export function getProfile(uid: string): Promise<UserProfile | null> {
  return UserRepository.find(getPool(), uid);
}

export async function upsertProfile(uid: string, profile: UserProfile): Promise<void> {
  await UserRepository.upsert(getPool(), uid, profile);
}
