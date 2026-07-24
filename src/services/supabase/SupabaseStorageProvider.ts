import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider } from "../types";

const BUCKET = "images";

/**
 * Supabase Storage implementation.
 *
 * Convention: tree-scoped image paths look like
 *   `trees/{treeId}/people/{personId}/{filename}`
 * Callers build this path; the provider doesn't enforce structure because the
 * file column in the Person record holds the full URL and we don't want the
 * provider to second-guess what the caller stored.
 *
 * Storage RLS policies live alongside the database policies; for v1 the
 * `images` bucket is public-read so signed URLs aren't needed (the URLs sit
 * inside private trees, so leakage requires the URL leaking, not the bucket).
 * Re-evaluate before public launch (BACKLOG: §"Asset / storage privacy").
 */
export class SupabaseStorageProvider implements StorageProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }> {
    const { data, error } = await this.client.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      ...(file.type ? { contentType: file.type } : {}),
    });
    if (error) throw error;
    const fullPath = data?.path ?? path;
    const { data: urlData } = this.client.storage.from(BUCKET).getPublicUrl(fullPath);
    return { url: urlData.publicUrl, fullPath };
  }

  async getDownloadURL(path: string): Promise<string> {
    const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
