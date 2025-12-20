import { auth, database, storage } from "../lib/firebase";
import { FirebaseAuthProvider } from "./firebase/FirebaseAuthProvider";
import { FirebaseDataProvider } from "./firebase/FirebaseDataProvider";
import { FirebaseStorageProvider } from "./firebase/FirebaseStorageProvider";
import { LocalAuthProvider } from "./local/LocalAuthProvider";
import { LocalDataProvider } from "./local/LocalDataProvider";
import { LocalStorageProvider } from "./local/LocalStorageProvider";
import type { ProviderConfig } from "./types";

export class ProviderFactory {
  private static instance: ProviderConfig | null = null;

  static getProviders(): ProviderConfig {
    if (this.instance) return this.instance;

    const env = process.env.NEXT_PUBLIC_APP_ENV || 'production';

    // Currently local and production use Firebase, but we can easily swap them here
    switch (env) {
      case 'local':
        this.instance = this.createLocalConfig();
        break;
      case 'production':
      default:
        this.instance = this.createFirebaseConfig();
        break;
    }

    return this.instance;
  }

  private static createFirebaseConfig(): ProviderConfig {
    return {
      auth: new FirebaseAuthProvider(auth),
      data: new FirebaseDataProvider(database),
      storage: new FirebaseStorageProvider(storage),
    };
  }

  private static createLocalConfig(): ProviderConfig {
    return {
      auth: new LocalAuthProvider(),
      data: new LocalDataProvider(),
      storage: new LocalStorageProvider(),
    };
  }
}
