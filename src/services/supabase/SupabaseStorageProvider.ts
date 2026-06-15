import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider } from "../types";

/**
 * Supabase Storage implementation of StorageProvider.
 *
 * STATUS: Phase 1 scaffold. The Phase 7 implementation will upload to a
 * `images` bucket using tree-scoped paths: `trees/{treeId}/people/{personId}/...`.
 * Until then these methods throw NotImplementedError.
 */
export class SupabaseStorageProvider implements StorageProvider {
  // Held for the Phase 7 implementation; unused until methods are filled in.
  protected readonly client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  uploadImage(_file: File, _path: string): Promise<{ url: string; fullPath: string }> {
    throw notImplemented("uploadImage");
  }

  getDownloadURL(_path: string): Promise<string> {
    throw notImplemented("getDownloadURL");
  }
}

function notImplemented(method: string): Error {
  return new Error(
    `SupabaseStorageProvider.${method} is not yet implemented (Phase 7 — see docs/ARCHITECTURE.md).`
  );
}
