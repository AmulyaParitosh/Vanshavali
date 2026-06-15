import type { FirebaseStorage } from "firebase/storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { StorageProvider } from "../types";

export class FirebaseStorageProvider implements StorageProvider {
  constructor(private storage: FirebaseStorage) {}

  async uploadImage(file: File, path: string): Promise<{ url: string; fullPath: string }> {
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, fullPath: snapshot.ref.fullPath };
  }

  async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    return await getDownloadURL(storageRef);
  }
}
