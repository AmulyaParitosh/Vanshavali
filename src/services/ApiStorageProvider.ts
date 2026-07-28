import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider } from "./types";

/**
 * Client-side StorageProvider. Uploads go through `POST /api/upload` (which
 * writes to the public `images` bucket with the service role) rather than
 * straight to Supabase Storage — the browser has no storage access, same as it
 * has no direct table access. supabase-js is used only for the bearer token.
 */
export class ApiStorageProvider implements StorageProvider {
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }> {
    const { data } = await this.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Not signed in.");

    const form = new FormData();
    form.append("file", file);
    form.append("path", path);

    // No Content-Type header — the browser sets the multipart boundary itself.
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Upload failed (HTTP ${response.status})`);
    }
    return (await response.json()) as { url: string; fullPath: string };
  }
}
