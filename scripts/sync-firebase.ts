import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { getStorage, ref as sRef, listAll, getDownloadURL } from "firebase/storage";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import https from "https";
import { LOCAL_DATA_CONFIG } from "../src/constants";

const firebaseConfig = {
    apiKey: "AIzaSyAwASytfUZXFqF3TOKU6NCdFM5HV2egrvA",
    authDomain: "vanshavali-63059712-90741.firebaseapp.com",
    databaseURL: "https://vanshavali-63059712-90741-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vanshavali-63059712-90741",
    storageBucket: "vanshavali-63059712-90741.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const LOCAL_DB_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.DB_DIR);
const LOCAL_STORAGE_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.STORAGE_DIR);

async function downloadFile(url: string, dest: string) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${res.statusCode}`));
                return;
            }
            const fileStream = createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on("finish", () => {
                fileStream.close();
                resolve(true);
            });
        }).on("error", reject);
    });
}

async function syncStorage(prefix = "") {
    const listRef = sRef(storage, prefix);
    const res = await listAll(listRef);

    for (const item of res.items) {
        const url = await getDownloadURL(item);
        const dest = path.join(LOCAL_STORAGE_DIR, item.fullPath);
        console.log(`Downloading ${item.fullPath}...`);
        await downloadFile(url, dest);
    }

    for (const folder of res.prefixes) {
        await syncStorage(folder.fullPath);
    }
}

async function main() {
    await fs.mkdir(LOCAL_DB_DIR, { recursive: true });
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });

    // Sync Collections
    const collections = Object.values(LOCAL_DATA_CONFIG.COLLECTIONS);
    for (const col of collections) {
        console.log(`Syncing collection: ${col}...`);
        const snapshot = await get(ref(db, col));
        if (snapshot.exists()) {
            await fs.writeFile(
                path.join(LOCAL_DB_DIR, `${col}.json`),
                JSON.stringify(snapshot.val(), null, 2)
            );
        } else {
            console.log(`Collection ${col} not found or empty.`);
        }
    }

    // Sync Storage
    console.log("Syncing storage...");
    try {
        await syncStorage();
    } catch (err) {
        console.error("Storage sync failed (might be permissions):", err);
    }

    console.log("Sync complete!");
    process.exit(0);
}

main().catch(console.error);
