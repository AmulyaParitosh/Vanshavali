import type { StorageProvider } from "../types";

export class LocalStorageProvider implements StorageProvider {
  async uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const res = await fetch("/api/local/storage", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    return res.json();
  }

  async getDownloadURL(path: string): Promise<string> {
    return `/api/local/storage?path=${encodeURIComponent(path)}`;
  }
}
